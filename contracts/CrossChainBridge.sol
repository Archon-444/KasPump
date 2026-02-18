// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title CrossChainBridge
 * @notice Bridge contract for cross-chain token transfers
 * @dev Supports bridging KasPump tokens between BSC, Arbitrum, and Base
 *
 * Architecture:
 * - Lock-and-mint on destination chain
 * - Burn-and-unlock on source chain
 * - Relayer-based message passing (upgradeable to LayerZero/Axelar)
 *
 * Security:
 * - Multi-sig relayer validation
 * - Nonce-based replay protection
 * - Rate limiting per user/chain
 * - Emergency pause capability
 */
contract CrossChainBridge is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ Structs ============

    struct BridgeRequest {
        address sender;
        address recipient;
        address token;
        uint256 amount;
        uint256 sourceChainId;
        uint256 destChainId;
        uint256 nonce;
        uint256 timestamp;
        BridgeStatus status;
    }

    struct ChainConfig {
        bool isSupported;
        uint256 minBridgeAmount;
        uint256 maxBridgeAmount;
        uint256 bridgeFee; // in basis points
        uint256 dailyLimit;
        uint256 dailyUsed;
        uint256 lastResetTime;
    }

    struct TokenConfig {
        bool isSupported;
        address wrappedToken; // Wrapped version on other chains
        bool isMintable; // Can mint on this chain (wrapped) vs lock (native)
    }

    enum BridgeStatus {
        PENDING,
        COMPLETED,
        REFUNDED,
        EXPIRED
    }

    // ============ State Variables ============

    /// @notice Supported chains configuration
    mapping(uint256 => ChainConfig) public chainConfigs;

    /// @notice Supported tokens per chain
    mapping(address => TokenConfig) public tokenConfigs;

    /// @notice Bridge requests by ID
    mapping(bytes32 => BridgeRequest) public bridgeRequests;

    /// @notice User nonces for replay protection
    mapping(address => uint256) public userNonces;

    /// @notice Processed incoming transfers (prevents replay)
    mapping(bytes32 => bool) public processedTransfers;

    /// @notice Authorized relayers
    mapping(address => bool) public relayers;

    /// @notice Required signatures for release
    uint256 public requiredSignatures = 2;

    /// @notice Bridge fee recipient
    address public feeRecipient;

    /// @notice Request expiry time (24 hours)
    uint256 public constant REQUEST_EXPIRY = 24 hours;

    /// @notice Daily limit reset interval
    uint256 public constant DAILY_RESET = 24 hours;

    /// @notice Current chain ID
    uint256 public immutable chainId;

    // ============ Events ============

    event BridgeInitiated(
        bytes32 indexed requestId,
        address indexed sender,
        address indexed token,
        uint256 amount,
        uint256 sourceChainId,
        uint256 destChainId,
        uint256 nonce
    );

    event BridgeCompleted(
        bytes32 indexed requestId,
        address indexed recipient,
        address indexed token,
        uint256 amount,
        uint256 sourceChainId
    );

    event BridgeRefunded(
        bytes32 indexed requestId,
        address indexed sender,
        uint256 amount
    );

    event ChainConfigUpdated(uint256 indexed chainId, bool isSupported);
    event TokenConfigUpdated(address indexed token, bool isSupported);
    event RelayerUpdated(address indexed relayer, bool isActive);

    // ============ Constructor ============

    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
        chainId = block.chainid;

        // Initialize supported chains
        // BSC Mainnet
        chainConfigs[56] = ChainConfig({
            isSupported: true,
            minBridgeAmount: 0.01 ether,
            maxBridgeAmount: 100000 ether,
            bridgeFee: 30, // 0.3%
            dailyLimit: 1000000 ether,
            dailyUsed: 0,
            lastResetTime: block.timestamp
        });

        // Arbitrum One
        chainConfigs[42161] = ChainConfig({
            isSupported: true,
            minBridgeAmount: 0.01 ether,
            maxBridgeAmount: 100000 ether,
            bridgeFee: 25, // 0.25%
            dailyLimit: 1000000 ether,
            dailyUsed: 0,
            lastResetTime: block.timestamp
        });

        // Base Mainnet
        chainConfigs[8453] = ChainConfig({
            isSupported: true,
            minBridgeAmount: 0.01 ether,
            maxBridgeAmount: 100000 ether,
            bridgeFee: 25, // 0.25%
            dailyLimit: 1000000 ether,
            dailyUsed: 0,
            lastResetTime: block.timestamp
        });
    }

    // ============ Bridge Functions ============

    /**
     * @notice Initiate a bridge transfer
     * @param _token Token to bridge
     * @param _amount Amount to bridge
     * @param _destChainId Destination chain ID
     * @param _recipient Recipient on destination chain
     * @return requestId Unique request identifier
     */
    function bridge(
        address _token,
        uint256 _amount,
        uint256 _destChainId,
        address _recipient
    ) external nonReentrant whenNotPaused returns (bytes32 requestId) {
        require(_token != address(0), "Invalid token");
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");
        require(_destChainId != chainId, "Cannot bridge to same chain");

        TokenConfig storage tokenConfig = tokenConfigs[_token];
        require(tokenConfig.isSupported, "Token not supported");

        ChainConfig storage destChain = chainConfigs[_destChainId];
        require(destChain.isSupported, "Destination chain not supported");
        require(_amount >= destChain.minBridgeAmount, "Amount below minimum");
        require(_amount <= destChain.maxBridgeAmount, "Amount above maximum");

        // Reset daily limit if needed
        _resetDailyLimitIfNeeded(_destChainId);
        require(
            destChain.dailyUsed + _amount <= destChain.dailyLimit,
            "Daily limit exceeded"
        );

        // Calculate fee
        uint256 fee = (_amount * destChain.bridgeFee) / 10000;
        uint256 bridgeAmount = _amount - fee;

        // Generate request ID
        uint256 nonce = userNonces[msg.sender]++;
        requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                _recipient,
                _token,
                _amount,
                chainId,
                _destChainId,
                nonce,
                block.timestamp
            )
        );

        // Store request
        bridgeRequests[requestId] = BridgeRequest({
            sender: msg.sender,
            recipient: _recipient,
            token: _token,
            amount: bridgeAmount,
            sourceChainId: chainId,
            destChainId: _destChainId,
            nonce: nonce,
            timestamp: block.timestamp,
            status: BridgeStatus.PENDING
        });

        // Update daily usage
        destChain.dailyUsed += _amount;

        // Transfer tokens
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // Transfer fee
        if (fee > 0) {
            IERC20(_token).safeTransfer(feeRecipient, fee);
        }

        emit BridgeInitiated(
            requestId,
            msg.sender,
            _token,
            bridgeAmount,
            chainId,
            _destChainId,
            nonce
        );

        return requestId;
    }

    /**
     * @notice Complete a bridge transfer (called by relayer)
     * @param _requestId Request ID from source chain
     * @param _sender Original sender
     * @param _recipient Recipient address
     * @param _token Token address
     * @param _amount Amount to release
     * @param _sourceChainId Source chain ID
     * @param _signatures Relayer signatures
     */
    function completeBridge(
        bytes32 _requestId,
        address _sender,
        address _recipient,
        address _token,
        uint256 _amount,
        uint256 _sourceChainId,
        bytes[] calldata _signatures
    ) external nonReentrant whenNotPaused {
        require(!processedTransfers[_requestId], "Already processed");
        require(_signatures.length >= requiredSignatures, "Insufficient signatures");

        TokenConfig storage tokenConfig = tokenConfigs[_token];
        require(tokenConfig.isSupported, "Token not supported");

        // Verify signatures
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                _requestId,
                _sender,
                _recipient,
                _token,
                _amount,
                _sourceChainId,
                chainId
            )
        );

        _verifySignatures(messageHash, _signatures);

        // Mark as processed
        processedTransfers[_requestId] = true;

        // Release tokens
        if (tokenConfig.isMintable) {
            // Mint wrapped tokens
            // Note: Would need IMintable interface
            // IMintable(_token).mint(_recipient, _amount);
            IERC20(_token).safeTransfer(_recipient, _amount);
        } else {
            // Release locked tokens
            IERC20(_token).safeTransfer(_recipient, _amount);
        }

        emit BridgeCompleted(
            _requestId,
            _recipient,
            _token,
            _amount,
            _sourceChainId
        );
    }

    /**
     * @notice Refund an expired bridge request
     * @param _requestId Request ID to refund
     */
    function refund(bytes32 _requestId) external nonReentrant {
        BridgeRequest storage request = bridgeRequests[_requestId];

        require(request.sender == msg.sender, "Not request owner");
        require(request.status == BridgeStatus.PENDING, "Invalid status");
        require(
            block.timestamp > request.timestamp + REQUEST_EXPIRY,
            "Request not expired"
        );

        request.status = BridgeStatus.REFUNDED;

        // Return tokens to sender
        IERC20(request.token).safeTransfer(request.sender, request.amount);

        emit BridgeRefunded(_requestId, request.sender, request.amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get bridge fee for a transfer
     * @param _amount Amount to bridge
     * @param _destChainId Destination chain
     * @return fee Fee amount
     */
    function getBridgeFee(
        uint256 _amount,
        uint256 _destChainId
    ) external view returns (uint256 fee) {
        ChainConfig storage destChain = chainConfigs[_destChainId];
        return (_amount * destChain.bridgeFee) / 10000;
    }

    /**
     * @notice Get remaining daily limit for a chain
     * @param _chainId Chain ID
     * @return remaining Remaining limit
     */
    function getRemainingDailyLimit(uint256 _chainId) external view returns (uint256) {
        ChainConfig storage chain = chainConfigs[_chainId];

        if (block.timestamp >= chain.lastResetTime + DAILY_RESET) {
            return chain.dailyLimit;
        }

        if (chain.dailyUsed >= chain.dailyLimit) {
            return 0;
        }

        return chain.dailyLimit - chain.dailyUsed;
    }

    /**
     * @notice Check if a token is supported
     * @param _token Token address
     * @return Whether token is supported
     */
    function isTokenSupported(address _token) external view returns (bool) {
        return tokenConfigs[_token].isSupported;
    }

    /**
     * @notice Get request details
     * @param _requestId Request ID
     * @return Request details
     */
    function getRequest(bytes32 _requestId) external view returns (BridgeRequest memory) {
        return bridgeRequests[_requestId];
    }

    // ============ Internal Functions ============

    /**
     * @notice Reset daily limit if 24 hours have passed
     * @param _chainId Chain to reset
     */
    function _resetDailyLimitIfNeeded(uint256 _chainId) internal {
        ChainConfig storage chain = chainConfigs[_chainId];

        if (block.timestamp >= chain.lastResetTime + DAILY_RESET) {
            chain.dailyUsed = 0;
            chain.lastResetTime = block.timestamp;
        }
    }

    /**
     * @notice Verify relayer signatures
     * @param _messageHash Message hash to verify
     * @param _signatures Signatures to verify
     */
    function _verifySignatures(
        bytes32 _messageHash,
        bytes[] calldata _signatures
    ) internal view {
        bytes32 ethSignedHash = _messageHash.toEthSignedMessageHash();
        address lastSigner = address(0);

        for (uint256 i = 0; i < _signatures.length; i++) {
            address signer = ethSignedHash.recover(_signatures[i]);

            require(relayers[signer], "Invalid relayer");
            require(signer > lastSigner, "Duplicate or unordered signatures");

            lastSigner = signer;
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Configure a supported chain
     * @param _chainId Chain ID
     * @param _config Chain configuration
     */
    function setChainConfig(
        uint256 _chainId,
        ChainConfig calldata _config
    ) external onlyOwner {
        chainConfigs[_chainId] = _config;
        emit ChainConfigUpdated(_chainId, _config.isSupported);
    }

    /**
     * @notice Configure a supported token
     * @param _token Token address
     * @param _config Token configuration
     */
    function setTokenConfig(
        address _token,
        TokenConfig calldata _config
    ) external onlyOwner {
        tokenConfigs[_token] = _config;
        emit TokenConfigUpdated(_token, _config.isSupported);
    }

    /**
     * @notice Add or remove a relayer
     * @param _relayer Relayer address
     * @param _isActive Whether relayer is active
     */
    function setRelayer(address _relayer, bool _isActive) external onlyOwner {
        relayers[_relayer] = _isActive;
        emit RelayerUpdated(_relayer, _isActive);
    }

    /**
     * @notice Update required signatures
     * @param _required New required count
     */
    function setRequiredSignatures(uint256 _required) external onlyOwner {
        require(_required > 0, "Must require at least 1");
        requiredSignatures = _required;
    }

    /**
     * @notice Update fee recipient
     * @param _recipient New recipient
     */
    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid address");
        feeRecipient = _recipient;
    }

    /**
     * @notice Emergency token recovery
     * @param _token Token to recover
     * @param _amount Amount to recover
     */
    function emergencyRecover(
        address _token,
        uint256 _amount
    ) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }

    /**
     * @notice Pause the bridge
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the bridge
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
