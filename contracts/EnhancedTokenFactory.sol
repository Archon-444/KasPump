// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BondingCurveAMM.sol";

/**
 * @title Enhanced TokenFactory with Tiered Pricing
 * @dev Factory contract for deploying KRC-20 tokens with tiered pricing structure
 * Supports Basic (1%), Premium (0.5%), and Enterprise (0.25%) tiers
 */
contract TokenFactory {
    struct TokenConfig {
        string name;
        string symbol;
        string description;
        string imageUrl;
        uint256 totalSupply;
        uint256 basePrice;
        uint256 slope;
        CurveType curveType;
        uint256 graduationThreshold;
        MembershipTier tier;
        address creator;
        uint256 creationFee;
    }

    enum CurveType { LINEAR, EXPONENTIAL }
    
    enum MembershipTier { 
        BASIC,      // 1.0% fee
        PREMIUM,    // 0.5% fee + premium features
        ENTERPRISE  // 0.25% fee + enterprise features
    }

    struct UserMembership {
        MembershipTier tier;
        uint256 expiresAt;
        uint256 tokensCreated;
        uint256 totalVolume;
        bool isActive;
    }

    // Core mappings
    mapping(address => bool) public isKasPumpToken;
    mapping(address => TokenConfig) public tokenConfigs;
    mapping(address => address) public tokenToAMM; // Strategic: enables partnership integrations
    mapping(address => UserMembership) public userMemberships;
    address[] public allTokens;
    
    // Tiered pricing configuration
    uint256 public constant BASIC_FEE = 100;      // 1.0% in basis points
    uint256 public constant PREMIUM_FEE = 50;     // 0.5% in basis points
    uint256 public constant ENTERPRISE_FEE = 25;  // 0.25% in basis points
    
    // Premium membership fees (annual)
    uint256 public premiumMembershipFee = 1 ether;    // 1 KAS per year
    uint256 public enterpriseMembershipFee = 10 ether; // 10 KAS per year
    
    // Platform configuration
    address public feeRecipient;
    address public owner;
    
    // Partnership revenue sharing
    mapping(string => address) public partnerAddresses;
    mapping(string => uint256) public partnerShares; // Basis points
    
    // Premium features access
    mapping(address => mapping(string => bool)) public premiumFeatures;
    
    // Events
    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        address ammAddress,
        MembershipTier tier,
        uint256 fee
    );
    
    event TokenGraduated(
        address indexed tokenAddress,
        uint256 finalSupply,
        uint256 liquidityAdded,
        string partner
    );
    
    event MembershipUpgraded(
        address indexed user,
        MembershipTier tier,
        uint256 expiresAt
    );
    
    event PartnershipRevenueShared(
        string partner,
        address partnerAddress,
        uint256 amount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier validTier(MembershipTier tier) {
        require(tier <= MembershipTier.ENTERPRISE, "Invalid membership tier");
        _;
    }

    constructor(address _feeRecipient) {
        owner = msg.sender;
        feeRecipient = _feeRecipient;
        
        // Initialize default partnerships
        partnerAddresses["zealous_swap"] = address(0); // Will be set later
        partnerShares["zealous_swap"] = 10; // 0.1% of trading fees
    }

    /**
     * @dev Creates a new KRC-20 token with tiered pricing
     */
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _description,
        string memory _imageUrl,
        uint256 _totalSupply,
        uint256 _basePrice,
        uint256 _slope,
        CurveType _curveType
    ) external payable returns (address tokenAddress, address ammAddress) {
        require(bytes(_name).length > 0 && bytes(_name).length <= 50, "Invalid name length");
        require(bytes(_symbol).length > 0 && bytes(_symbol).length <= 10, "Invalid symbol length");
        require(_totalSupply > 0 && _totalSupply <= 1e12 * 1e18, "Invalid total supply");
        require(_basePrice > 0, "Base price must be positive");
        
        // Get user's membership tier
        MembershipTier userTier = getUserTier(msg.sender);
        uint256 creationFee = getCreationFee(userTier);
        
        require(msg.value >= creationFee, "Insufficient creation fee");
        
        // Deploy token contract
        tokenAddress = deployToken(_name, _symbol, _totalSupply);
        
        // Deploy AMM with bonding curve
        ammAddress = deployAMM(
            tokenAddress,
            _basePrice,
            _slope,
            _curveType,
            _totalSupply * 80 / 100,  // 80% graduation threshold
            userTier
        );
        
        // Store configuration with tier information
        tokenConfigs[tokenAddress] = TokenConfig({
            name: _name,
            symbol: _symbol,
            description: _description,
            imageUrl: _imageUrl,
            totalSupply: _totalSupply,
            basePrice: _basePrice,
            slope: _slope,
            curveType: _curveType,
            graduationThreshold: _totalSupply * 80 / 100,
            tier: userTier,
            creator: msg.sender,
            creationFee: creationFee
        });
        
        // Strategic: Store AMM mapping for partnerships
        tokenToAMM[tokenAddress] = ammAddress;
        isKasPumpToken[tokenAddress] = true;
        allTokens.push(tokenAddress);
        
        // Update user stats
        userMemberships[msg.sender].tokensCreated++;
        
        // Distribute creation fee
        distributeFee(creationFee, userTier);
        
        // Refund excess payment
        if (msg.value > creationFee) {
            payable(msg.sender).transfer(msg.value - creationFee);
        }
        
        emit TokenCreated(tokenAddress, msg.sender, _name, _symbol, _totalSupply, ammAddress, userTier, creationFee);
        
        return (tokenAddress, ammAddress);
    }

    /**
     * @dev Upgrade user membership tier
     */
    function upgradeMembership(MembershipTier _tier) external payable validTier(_tier) {
        require(_tier > MembershipTier.BASIC, "Cannot upgrade to basic tier");
        
        uint256 fee = _tier == MembershipTier.PREMIUM ? premiumMembershipFee : enterpriseMembershipFee;
        require(msg.value >= fee, "Insufficient membership fee");
        
        uint256 expiresAt = block.timestamp + 365 days; // 1 year membership
        
        userMemberships[msg.sender] = UserMembership({
            tier: _tier,
            expiresAt: expiresAt,
            tokensCreated: userMemberships[msg.sender].tokensCreated,
            totalVolume: userMemberships[msg.sender].totalVolume,
            isActive: true
        });
        
        // Enable premium features
        enablePremiumFeatures(msg.sender, _tier);
        
        // Send fee to platform
        payable(feeRecipient).transfer(fee);
        
        // Refund excess
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        emit MembershipUpgraded(msg.sender, _tier, expiresAt);
    }

    /**
     * @dev Get user's current membership tier
     */
    function getUserTier(address user) public view returns (MembershipTier) {
        UserMembership memory membership = userMemberships[user];
        
        if (!membership.isActive || membership.expiresAt < block.timestamp) {
            return MembershipTier.BASIC;
        }
        
        return membership.tier;
    }

    /**
     * @dev Get creation fee for tier
     */
    function getCreationFee(MembershipTier tier) public view returns (uint256) {
        if (tier == MembershipTier.PREMIUM) {
            return 0.005 ether; // 0.005 KAS (50% discount)
        } else if (tier == MembershipTier.ENTERPRISE) {
            return 0.0025 ether; // 0.0025 KAS (75% discount)
        }
        return 0.01 ether; // 0.01 KAS for basic
    }

    /**
     * @dev Get trading fee for tier (used by AMM contracts)
     */
    function getTradingFee(MembershipTier tier) external pure returns (uint256) {
        if (tier == MembershipTier.PREMIUM) {
            return PREMIUM_FEE;
        } else if (tier == MembershipTier.ENTERPRISE) {
            return ENTERPRISE_FEE;
        }
        return BASIC_FEE;
    }

    /**
     * @dev Enable premium features for user
     */
    function enablePremiumFeatures(address user, MembershipTier tier) internal {
        if (tier >= MembershipTier.PREMIUM) {
            premiumFeatures[user]["advanced_analytics"] = true;
            premiumFeatures[user]["custom_branding"] = true;
            premiumFeatures[user]["priority_support"] = true;
        }
        
        if (tier >= MembershipTier.ENTERPRISE) {
            premiumFeatures[user]["white_label"] = true;
            premiumFeatures[user]["api_access"] = true;
            premiumFeatures[user]["custom_curves"] = true;
            premiumFeatures[user]["partnership_revenue"] = true;
        }
    }

    /**
     * @dev Check if user has access to premium feature
     */
    function hasPremiumFeature(address user, string memory feature) external view returns (bool) {
        MembershipTier tier = getUserTier(user);
        return tier > MembershipTier.BASIC && premiumFeatures[user][feature];
    }

    /**
     * @dev Setup partnership revenue sharing
     */
    function setupPartner(string memory partnerName, address partnerAddress, uint256 shareInBasisPoints) external onlyOwner {
        require(shareInBasisPoints <= 100, "Partner share too high"); // Max 1%
        partnerAddresses[partnerName] = partnerAddress;
        partnerShares[partnerName] = shareInBasisPoints;
    }

    /**
     * @dev Distribute partnership revenue (called by graduated tokens)
     */
    function distributePartnershipRevenue(address tokenAddress, uint256 tradingVolume) external {
        require(tokenToAMM[tokenAddress] == msg.sender, "Only token AMM can call");
        
        TokenConfig memory config = tokenConfigs[tokenAddress];
        
        // Calculate and distribute partner shares
        for (uint i = 0; i < getPartnerCount(); i++) {
            string memory partnerName = getPartnerName(i);
            address partnerAddr = partnerAddresses[partnerName];
            uint256 share = partnerShares[partnerName];
            
            if (partnerAddr != address(0) && share > 0) {
                uint256 partnerRevenue = (tradingVolume * share) / 10000;
                if (partnerRevenue > 0) {
                    payable(partnerAddr).transfer(partnerRevenue);
                    emit PartnershipRevenueShared(partnerName, partnerAddr, partnerRevenue);
                }
            }
        }
    }

    /**
     * @dev Get AMM address for token (Strategic: enables partnership integrations)
     */
    function getTokenAMM(address tokenAddress) external view returns (address) {
        return tokenToAMM[tokenAddress];
    }

    /**
     * @dev Internal function to deploy token contract
     */
    function deployToken(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply
    ) internal returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(_name, _symbol, block.timestamp, msg.sender));
        
        bytes memory bytecode = abi.encodePacked(
            type(KRC20Token).creationCode,
            abi.encode(_name, _symbol, _totalSupply, address(this))
        );
        
        address tokenAddress;
        assembly {
            tokenAddress := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(tokenAddress) { revert(0, 0) }
        }
        
        return tokenAddress;
    }

    /**
     * @dev Internal function to deploy AMM contract
     */
    function deployAMM(
        address _tokenAddress,
        uint256 _basePrice,
        uint256 _slope,
        CurveType _curveType,
        uint256 _graduationThreshold,
        MembershipTier _tier
    ) internal returns (address) {
        BondingCurveAMM amm = new BondingCurveAMM(
            _tokenAddress,
            _basePrice,
            _slope,
            uint8(_curveType),
            _graduationThreshold,
            feeRecipient,
            uint8(_tier)  // Pass tier to AMM for fee calculation
        );
        
        return address(amm);
    }

    /**
     * @dev Distribute creation fees
     */
    function distributeFee(uint256 fee, MembershipTier tier) internal {
        // Base platform fee
        uint256 platformFee = fee * 70 / 100; // 70% to platform
        uint256 creatorBonus = fee * 20 / 100; // 20% back to creator as bonus
        uint256 partnershipFee = fee * 10 / 100; // 10% for partnerships
        
        payable(feeRecipient).transfer(platformFee);
        payable(msg.sender).transfer(creatorBonus);
        
        // Distribute partnership fees
        if (partnerAddresses["zealous_swap"] != address(0)) {
            payable(partnerAddresses["zealous_swap"]).transfer(partnershipFee);
        } else {
            payable(feeRecipient).transfer(partnershipFee);
        }
    }

    // Helper functions for partnership management
    function getPartnerCount() internal pure returns (uint256) {
        return 1; // Currently just Zealous Swap, expandable
    }

    function getPartnerName(uint256 index) internal pure returns (string memory) {
        if (index == 0) return "zealous_swap";
        return "";
    }

    /**
     * @dev Get all created tokens
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    /**
     * @dev Get token configuration with tier information
     */
    function getTokenConfig(address _tokenAddress) external view returns (TokenConfig memory) {
        return tokenConfigs[_tokenAddress];
    }

    /**
     * @dev Get user membership details
     */
    function getUserMembership(address user) external view returns (UserMembership memory) {
        return userMemberships[user];
    }

    /**
     * @dev Update fee recipient (only owner)
     */
    function updateFeeRecipient(address _newRecipient) external onlyOwner {
        feeRecipient = _newRecipient;
    }

    /**
     * @dev Update membership fees (only owner)
     */
    function updateMembershipFees(uint256 _premiumFee, uint256 _enterpriseFee) external onlyOwner {
        premiumMembershipFee = _premiumFee;
        enterpriseMembershipFee = _enterpriseFee;
    }
}

/**
 * @title Enhanced KRC20Token
 * @dev KRC-20 token with tier tracking for premium features
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

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        address _factory
    ) {
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        factory = _factory;
        balanceOf[_factory] = _totalSupply;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        
        emit Transfer(from, to, value);
        return true;
    }
}