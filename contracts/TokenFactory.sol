// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BondingCurveAMM.sol";

/**
 * @title TokenFactory
 * @dev Factory contract for deploying KRC-20 tokens with bonding curves on Kasplex L2
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
    }

    enum CurveType { LINEAR, EXPONENTIAL }

    mapping(address => bool) public isKasPumpToken;
    mapping(address => TokenConfig) public tokenConfigs;
    address[] public allTokens;
    
    // Platform configuration
    uint256 public constant PLATFORM_FEE = 50; // 0.5% in basis points
    address public feeRecipient;
    address public owner;
    
    // Events
    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        address ammAddress
    );
    
    event TokenGraduated(
        address indexed tokenAddress,
        uint256 finalSupply,
        uint256 liquidityAdded
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor(address _feeRecipient) {
        owner = msg.sender;
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Creates a new KRC-20 token with bonding curve
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
    ) public virtual payable returns (address tokenAddress, address ammAddress) {
        require(bytes(_name).length > 0 && bytes(_name).length <= 50, "Invalid name length");
        require(bytes(_symbol).length > 0 && bytes(_symbol).length <= 10, "Invalid symbol length");
        require(_totalSupply > 0 && _totalSupply <= 1e12 * 1e18, "Invalid total supply");
        require(_basePrice > 0, "Base price must be positive");
        
        // Deploy token contract
        tokenAddress = deployToken(_name, _symbol, _totalSupply);
        
        // Deploy AMM with bonding curve
        ammAddress = deployAMM(
            tokenAddress,
            _basePrice,
            _slope,
            _curveType,
            _totalSupply * 80 / 100  // 80% graduation threshold
        );

        // Seed AMM inventory with the freshly minted supply so buys can settle.
        require(
            KRC20Token(tokenAddress).transfer(ammAddress, _totalSupply),
            "AMM inventory transfer failed"
        );
        
        // Store configuration
        tokenConfigs[tokenAddress] = TokenConfig({
            name: _name,
            symbol: _symbol,
            description: _description,
            imageUrl: _imageUrl,
            totalSupply: _totalSupply,
            basePrice: _basePrice,
            slope: _slope,
            curveType: _curveType,
            graduationThreshold: _totalSupply * 80 / 100
        });
        
        isKasPumpToken[tokenAddress] = true;
        allTokens.push(tokenAddress);
        
        emit TokenCreated(tokenAddress, msg.sender, _name, _symbol, _totalSupply, ammAddress);
        
        return (tokenAddress, ammAddress);
    }

    /**
     * @dev Internal function to deploy token contract
     */
    function deployToken(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply
    ) internal virtual returns (address) {
        // Create deterministic address
        bytes32 salt = keccak256(abi.encodePacked(_name, _symbol, block.timestamp));
        
        // Deploy minimal ERC20 with Create2
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
        uint256 _graduationThreshold
    ) internal virtual returns (address) {
        BondingCurveAMM amm = new BondingCurveAMM(
            _tokenAddress,
            _basePrice,
            _slope,
            uint8(_curveType),
            _graduationThreshold,
            feeRecipient
        );
        
        return address(amm);
    }

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

    /**
     * @dev Update fee recipient (only owner)
     */
    function updateFeeRecipient(address _newRecipient) external onlyOwner {
        feeRecipient = _newRecipient;
    }
}

/**
 * @title KRC20Token
 * @dev Minimal KRC-20 token implementation for KasPump
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
        balanceOf[_factory] = _totalSupply; // Factory gets initial supply
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
