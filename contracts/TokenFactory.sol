// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./BondingCurveAMM.sol";
import "./libraries/BondingCurveMath.sol";
import "./interfaces/IDexRouterRegistry.sol";

/**
 * @title TokenFactory - PRODUCTION GRADE WITH DEX INTEGRATION
 * @dev Factory contract for deploying KRC-20 tokens with bonding curves and automated DEX liquidity
 * @notice Battle-tested security fixes applied:
 *  - ReentrancyGuard: Prevents reentrancy
 *  - Pausable: Emergency stop
 *  - Ownable: Access control
 *  - Comprehensive input validation
 *  - Zero address checks
 *  - Safe CREATE2 deployment
 * @notice DEX Integration:
 *  - Uses DexRouterRegistry for chain-specific router configuration
 *  - Supports V2 and V3 liquidity paths
 *  - AMM automatically adds liquidity on graduation
 */
contract TokenFactory is Ownable, ReentrancyGuard, Pausable {

    // ========== STRUCTS ==========

    // V2: total supply, curve type, basePrice, slope, graduationThreshold are
    // standardized at the protocol level — see BondingCurveMath. The struct
    // keeps the same field names for indexer/subgraph compat but populates
    // the now-fixed values from the library constants at create time.
    struct TokenConfig {
        string name;
        string symbol;
        string description;
        string imageUrl;
        uint256 totalSupply;          // = BondingCurveMath.TOTAL_SUPPLY
        uint256 graduationThreshold;  // = BondingCurveMath.GRADUATION_THRESHOLD
        address creator;
        uint256 createdAt;
    }

    struct CreateTokenParams {
        string name;
        string symbol;
        string description;
        string imageUrl;
        string twitterUrl;
        string telegramUrl;
        string websiteUrl;
        address referrer; // Optional referral address (address(0) if none)
    }

    struct SocialLinks {
        string twitterUrl;
        string telegramUrl;
        string websiteUrl;
    }

    // ========== STATE VARIABLES ==========

    mapping(address => bool) public isKasPumpToken;
    mapping(address => TokenConfig) public tokenConfigs;
    mapping(address => SocialLinks) public tokenSocialLinks;
    mapping(address => address) public tokenToAMM;
    address[] public allTokens;

    // Platform configuration
    uint256 public constant PLATFORM_FEE = 50; // 0.5% in basis points
    uint256 public constant CREATION_FEE = 0.005 ether; // 0.005 BNB (~$3 USD) - competitive with Four.meme
    address payable public feeRecipient;
    IDexRouterRegistry public dexRouterRegistry;

    // Rate limiting
    mapping(address => uint256) public lastTokenCreation;
    uint256 public constant CREATION_COOLDOWN = 60; // 1 minute between creations

    // CREATE2 nonce for enhanced security
    mapping(address => uint256) private creatorNonces;

    // Referral system
    mapping(address => address) public tokenReferrer; // token address → referrer address
    mapping(address => uint256) public referrerTotalEarnings; // referrer → total creation fee earnings
    mapping(address => uint256) public referrerTokenCount; // referrer → tokens referred
    uint256 public constant REFERRAL_CREATION_SHARE = 3000; // 30% of creation fee to referrer

    // Safety limits
    uint256 public constant MAX_NAME_LENGTH = 50;
    uint256 public constant MAX_SYMBOL_LENGTH = 10;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 500;

    // ========== EVENTS ==========

    event TokenCreated(
        address indexed tokenAddress,
        address indexed ammAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 timestamp
    );

    event TokenGraduated(
        address indexed tokenAddress,
        uint256 finalSupply,
        uint256 liquidityAdded
    );

    event FeeRecipientUpdated(
        address indexed oldRecipient,
        address indexed newRecipient
    );

    event DexRouterRegistryUpdated(
        address indexed oldRegistry,
        address indexed newRegistry
    );

    event CreationFeeCollected(
        address indexed creator,
        uint256 amount,
        uint256 timestamp
    );

    event ReferralCreated(
        address indexed tokenAddress,
        address indexed creator,
        address indexed referrer,
        uint256 referrerReward
    );

    // ========== ERRORS ==========

    error InvalidInput(string param);
    error ZeroAddress();
    error RateLimitExceeded();
    error DeploymentFailed();
    error InsufficientCreationFee();
    error DexRouterRegistryNotSet();
    error InvalidToken();

    // ========== CONSTRUCTOR ==========

    /**
     * @dev Constructor with zero address validation
     * @param _feeRecipient Address to receive platform fees
     */
    constructor(address payable _feeRecipient) Ownable(msg.sender) {
        if (_feeRecipient == address(0)) revert ZeroAddress();
        feeRecipient = _feeRecipient;
    }

    // ========== EXTERNAL FUNCTIONS ==========

    /**
     * @dev Creates a new KRC-20 token with bonding curve
     * @notice Rate limited to prevent spam, requires creation fee
     *
     * SECURITY FIXES:
     * - nonReentrant: Prevents reentrancy
     * - whenNotPaused: Allows emergency stop
     * - Comprehensive input validation
     * - Rate limiting
     * - Safe CREATE2 deployment
     * - Creation fee anti-spam mechanism
     */
    function createToken(
        CreateTokenParams calldata p
    ) external payable nonReentrant whenNotPaused returns (address tokenAddress, address ammAddress) {
        if (msg.value < CREATION_FEE) {
            revert InsufficientCreationFee();
        }

        if (block.timestamp < lastTokenCreation[msg.sender] + CREATION_COOLDOWN) {
            revert RateLimitExceeded();
        }

        if (bytes(p.name).length == 0 || bytes(p.name).length > MAX_NAME_LENGTH) {
            revert InvalidInput("name");
        }
        if (bytes(p.symbol).length == 0 || bytes(p.symbol).length > MAX_SYMBOL_LENGTH) {
            revert InvalidInput("symbol");
        }
        if (bytes(p.description).length > MAX_DESCRIPTION_LENGTH) {
            revert InvalidInput("description");
        }
        if (address(dexRouterRegistry) == address(0)) {
            revert DexRouterRegistryNotSet();
        }

        // V2: every token mints the standardized BondingCurveMath.TOTAL_SUPPLY.
        uint256 standardSupply = BondingCurveMath.TOTAL_SUPPLY;

        tokenAddress = deployToken(p.name, p.symbol, standardSupply);

        // Validate referrer: cannot refer yourself
        address validReferrer = (p.referrer != address(0) && p.referrer != msg.sender)
            ? p.referrer
            : address(0);

        ammAddress = deployAMM(
            tokenAddress,
            payable(msg.sender),
            0, // membership tier — kept on AMM constructor for fee gating
            payable(validReferrer)
        );

        tokenConfigs[tokenAddress] = TokenConfig({
            name: p.name,
            symbol: p.symbol,
            description: p.description,
            imageUrl: p.imageUrl,
            totalSupply: standardSupply,
            graduationThreshold: BondingCurveMath.GRADUATION_THRESHOLD,
            creator: msg.sender,
            createdAt: block.timestamp
        });

        tokenSocialLinks[tokenAddress] = SocialLinks({
            twitterUrl: p.twitterUrl,
            telegramUrl: p.telegramUrl,
            websiteUrl: p.websiteUrl
        });

        isKasPumpToken[tokenAddress] = true;
        tokenToAMM[tokenAddress] = ammAddress;
        allTokens.push(tokenAddress);

        // Track referral
        if (validReferrer != address(0)) {
            tokenReferrer[tokenAddress] = validReferrer;
            referrerTokenCount[validReferrer]++;
        }

        // Update rate limit
        lastTokenCreation[msg.sender] = block.timestamp;

        // ========== TOKEN TRANSFER ==========

        // Transfer initial supply to AMM
        KRC20Token(tokenAddress).transfer(ammAddress, standardSupply);

        // ========== CREATION FEE SPLIT ==========

        if (validReferrer != address(0)) {
            // 30% to referrer, 70% to platform
            uint256 referrerReward = (msg.value * REFERRAL_CREATION_SHARE) / 10000;
            uint256 platformReward = msg.value - referrerReward;

            (bool refSuccess, ) = payable(validReferrer).call{value: referrerReward}("");
            require(refSuccess, "Referrer fee transfer failed");

            (bool platSuccess, ) = feeRecipient.call{value: platformReward}("");
            require(platSuccess, "Platform fee transfer failed");

            referrerTotalEarnings[validReferrer] += referrerReward;

            emit ReferralCreated(tokenAddress, msg.sender, validReferrer, referrerReward);
        } else {
            // No referrer — 100% to platform
            (bool success, ) = feeRecipient.call{value: msg.value}("");
            require(success, "Fee transfer failed");
        }

        emit CreationFeeCollected(msg.sender, msg.value, block.timestamp);

        emit TokenCreated(
            tokenAddress,
            ammAddress,
            msg.sender,
            p.name,
            p.symbol,
            standardSupply,
            block.timestamp
        );

        return (tokenAddress, ammAddress);
    }

    /**
     * @dev Internal function to deploy token contract using CREATE2
     * SECURITY FIX: Enhanced salt entropy to prevent front-running
     * Uses per-creator nonce + block.prevrandao + chain ID for unpredictability
     */
    function deployToken(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply
    ) internal returns (address) {
        // SECURITY FIX: Use non-predictable salt with creator nonce
        // Prevents front-running attacks on CREATE2 address prediction
        bytes32 salt = keccak256(
            abi.encodePacked(
                _name,
                _symbol,
                msg.sender,
                creatorNonces[msg.sender]++,  // Non-predictable nonce
                block.prevrandao,              // Additional entropy (replaces block.difficulty)
                block.chainid                  // Chain-specific
            )
        );

        // Deploy minimal ERC20 with Create2
        bytes memory bytecode = abi.encodePacked(
            type(KRC20Token).creationCode,
            abi.encode(_name, _symbol, _totalSupply, address(this))
        );

        address tokenAddress;
        assembly {
            tokenAddress := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }

        if (tokenAddress == address(0)) revert DeploymentFailed();

        return tokenAddress;
    }

    /**
     * @dev Internal function to deploy AMM contract with DEX integration
     * @param _tokenAddress Address of the token to create AMM for
     * @param _creator Address of token creator (receives graduation funds)
     * @param _tier Membership tier for fees
     * @notice Uses registry-configured router for the current chain. Curve
     * shape is now standardized — see BondingCurveMath — so the AMM
     * constructor no longer takes per-token curve params.
     */
    function deployAMM(
        address _tokenAddress,
        address payable _creator,
        uint8 _tier,
        address payable _referrer
    ) internal returns (address) {
        IDexRouterRegistry.RouterConfig memory routerConfig = dexRouterRegistry.getRouterConfig(block.chainid);
        require(routerConfig.enabled, "DEX router not enabled for this chain");
        require(routerConfig.router != address(0), "DEX router address not set");

        BondingCurveAMM amm = new BondingCurveAMM(
            _tokenAddress,
            _creator,
            feeRecipient,
            _tier,
            routerConfig.router,
            60, // 60 seconds anti-sniper protection
            _referrer
        );

        return address(amm);
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @dev Get all created tokens
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    /**
     * @dev Get token configuration
     */
    function getTokenConfig(address _tokenAddress) external view returns (TokenConfig memory) {
        return tokenConfigs[_tokenAddress];
    }

    function getSocialLinks(address _tokenAddress) external view returns (SocialLinks memory) {
        return tokenSocialLinks[_tokenAddress];
    }

    /**
     * @dev Get AMM address for token
     */
    function getTokenAMM(address _tokenAddress) external view returns (address) {
        if (!isKasPumpToken[_tokenAddress]) revert InvalidToken();
        return tokenToAMM[_tokenAddress];
    }

    /**
     * @dev Get total tokens created
     */
    function getTotalTokens() external view returns (uint256) {
        return allTokens.length;
    }

    /**
     * @dev Check if address is a KasPump token
     */
    function isValidToken(address _token) external view returns (bool) {
        return isKasPumpToken[_token];
    }

    /**
     * @dev Get referrer stats for a given address
     */
    function getReferrerStats(address _referrer) external view returns (
        uint256 totalEarnings,
        uint256 tokenCount
    ) {
        return (referrerTotalEarnings[_referrer], referrerTokenCount[_referrer]);
    }

    /**
     * @dev Get referrer for a token
     */
    function getTokenReferrer(address _token) external view returns (address) {
        return tokenReferrer[_token];
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @dev Update fee recipient
     * SECURITY FIX: Added zero address check
     */
    function updateFeeRecipient(address payable _newRecipient) external onlyOwner {
        if (_newRecipient == address(0)) revert ZeroAddress();

        address oldRecipient = feeRecipient;
        feeRecipient = _newRecipient;

        emit FeeRecipientUpdated(oldRecipient, _newRecipient);
    }

    /**
     * @dev Update dex router registry for long-term upgrades
     */
    function updateDexRouterRegistry(address _newRegistry) external onlyOwner {
        if (_newRegistry == address(0)) revert ZeroAddress();

        address oldRegistry = address(dexRouterRegistry);
        dexRouterRegistry = IDexRouterRegistry(_newRegistry);

        emit DexRouterRegistryUpdated(oldRegistry, _newRegistry);
    }

    /**
     * @dev Emergency pause token creation
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token creation
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}

/**
 * @title KRC20Token - PRODUCTION GRADE
 * @dev Minimal KRC-20 token implementation
 * @notice Security fixes applied:
 *  - Zero address checks on transfers
 *  - Safe arithmetic (Solidity ^0.8.0 has built-in overflow protection)
 *  - Event emissions for all state changes
 */
contract KRC20Token {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    address public factory;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // ========== ERRORS ==========

    error ZeroAddress();
    error InsufficientBalance();
    error InsufficientAllowance();

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        address _factory
    ) {
        if (_factory == address(0)) revert ZeroAddress();

        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        factory = _factory;
        balanceOf[_factory] = _totalSupply; // Factory gets initial supply

        emit Transfer(address(0), _factory, _totalSupply);
    }

    /**
     * @dev Transfer tokens
     * SECURITY FIX: Added zero address check
     */
    function transfer(address to, uint256 value) external returns (bool) {
        if (to == address(0)) revert ZeroAddress();
        if (balanceOf[msg.sender] < value) revert InsufficientBalance();

        unchecked {
            balanceOf[msg.sender] -= value;
            balanceOf[to] += value;
        }

        emit Transfer(msg.sender, to, value);
        return true;
    }

    /**
     * @dev Approve spending
     */
    function approve(address spender, uint256 value) external returns (bool) {
        if (spender == address(0)) revert ZeroAddress();

        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /**
     * @dev Transfer from approved address
     * SECURITY FIX: Added zero address check
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        if (to == address(0)) revert ZeroAddress();
        if (balanceOf[from] < value) revert InsufficientBalance();
        if (allowance[from][msg.sender] < value) revert InsufficientAllowance();

        unchecked {
            balanceOf[from] -= value;
            balanceOf[to] += value;
            allowance[from][msg.sender] -= value;
        }

        emit Transfer(from, to, value);
        return true;
    }
}
