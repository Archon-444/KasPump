// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./BondingCurveAMM.sol";

/**
 * @title StopLossOrderBook
 * @notice Manages stop-loss orders for KasPump tokens
 * @dev Executes automatic sells when price drops below threshold
 */
contract StopLossOrderBook is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Address for address payable;

    struct StopLossOrder {
        uint256 orderId;
        address trader;
        address tokenAddress;
        address ammAddress;
        uint256 triggerPrice; // Price threshold in wei
        uint256 amount; // Amount of tokens to sell
        uint256 minReceive; // Minimum native amount to receive (slippage protection)
        uint256 timestamp;
        bool executed;
        bool cancelled;
    }

    // Order ID counter
    uint256 public nextOrderId = 1;

    // Mapping: orderId => StopLossOrder
    mapping(uint256 => StopLossOrder) public orders;

    // Mapping: trader => orderIds[]
    mapping(address => uint256[]) public traderOrders;

    // Mapping: token => orderIds[]
    mapping(address => uint256[]) public tokenOrders;

    // Platform fee (0.3% = 30 basis points)
    uint256 public platformFee = 30;
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Fee recipient
    address payable public feeRecipient;

    // Executor rewards (0.1% = 10 basis points)
    uint256 public executorReward = 10;

    // Authorized executors (keepers/bots)
    mapping(address => bool) public authorizedExecutors;

    // Events
    event StopLossCreated(
        uint256 indexed orderId,
        address indexed trader,
        address indexed tokenAddress,
        uint256 triggerPrice,
        uint256 amount
    );

    event StopLossExecuted(
        uint256 indexed orderId,
        address indexed executor,
        uint256 amountReceived,
        uint256 executorRewardAmount
    );

    event StopLossCancelled(uint256 indexed orderId, address indexed trader);

    // Custom errors
    error InvalidPrice();
    error InvalidAmount();
    error InsufficientBalance();
    error OrderNotFound();
    error NotOrderOwner();
    error OrderAlreadyCancelled();
    error OrderAlreadyExecuted();
    error PriceAboveTrigger();
    error NotAuthorizedExecutor();
    error SlippageExceeded();
    error ZeroAddress();
    error TransferFailed();

    constructor(address payable _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
        authorizedExecutors[msg.sender] = true; // Owner is executor by default
    }

    /**
     * @notice Create a stop-loss order
     * @param tokenAddress Address of the token
     * @param ammAddress Address of the AMM for price checking
     * @param triggerPrice Price threshold (sell if price drops to or below this)
     * @param amount Amount of tokens to sell
     * @param minReceive Minimum native amount to receive (slippage protection)
     */
    function createStopLossOrder(
        address tokenAddress,
        address ammAddress,
        uint256 triggerPrice,
        uint256 amount,
        uint256 minReceive
    ) external nonReentrant returns (uint256) {
        if (triggerPrice == 0) revert InvalidPrice();
        if (amount == 0) revert InvalidAmount();
        if (minReceive == 0) revert InvalidAmount();

        // Transfer tokens to this contract for escrow
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);

        uint256 orderId = nextOrderId++;

        orders[orderId] = StopLossOrder({
            orderId: orderId,
            trader: msg.sender,
            tokenAddress: tokenAddress,
            ammAddress: ammAddress,
            triggerPrice: triggerPrice,
            amount: amount,
            minReceive: minReceive,
            timestamp: block.timestamp,
            executed: false,
            cancelled: false
        });

        traderOrders[msg.sender].push(orderId);
        tokenOrders[tokenAddress].push(orderId);

        emit StopLossCreated(orderId, msg.sender, tokenAddress, triggerPrice, amount);

        return orderId;
    }

    /**
     * @notice Cancel a stop-loss order
     * @param orderId ID of the order to cancel
     */
    function cancelStopLossOrder(uint256 orderId) external nonReentrant {
        StopLossOrder storage order = orders[orderId];

        if (order.orderId == 0) revert OrderNotFound();
        if (order.trader != msg.sender) revert NotOrderOwner();
        if (order.cancelled) revert OrderAlreadyCancelled();
        if (order.executed) revert OrderAlreadyExecuted();

        order.cancelled = true;

        // Return tokens to trader
        IERC20(order.tokenAddress).safeTransfer(order.trader, order.amount);

        emit StopLossCancelled(orderId, msg.sender);
    }

    /**
     * @notice Execute a stop-loss order (only authorized executors)
     * @param orderId ID of the order to execute
     */
    function executeStopLossOrder(uint256 orderId) external nonReentrant {
        if (!authorizedExecutors[msg.sender]) revert NotAuthorizedExecutor();

        StopLossOrder storage order = orders[orderId];

        if (order.orderId == 0) revert OrderNotFound();
        if (order.cancelled) revert OrderAlreadyCancelled();
        if (order.executed) revert OrderAlreadyExecuted();

        // Check if trigger condition is met
        BondingCurveAMM amm = BondingCurveAMM(payable(order.ammAddress));
        uint256 currentPrice = amm.getCurrentPrice();

        if (currentPrice > order.triggerPrice) revert PriceAboveTrigger();

        // Mark as executed
        order.executed = true;

        // Approve AMM to spend tokens
        IERC20(order.tokenAddress).safeIncreaseAllowance(order.ammAddress, order.amount);

        // Track balance before sell to calculate received amount
        uint256 balanceBefore = address(this).balance;

        // Execute sell on AMM (does not return value, so we track balance change)
        amm.sellTokens(order.amount, order.minReceive);

        // Calculate actual native received from balance change
        uint256 nativeReceived = address(this).balance - balanceBefore;

        if (nativeReceived < order.minReceive) revert SlippageExceeded();

        // Calculate fees and rewards
        uint256 fee = (nativeReceived * platformFee) / FEE_DENOMINATOR;
        uint256 reward = (nativeReceived * executorReward) / FEE_DENOMINATOR;
        uint256 traderReceives = nativeReceived - fee - reward;

        // Transfer funds using safe pattern (compatible with smart contract wallets)
        payable(order.trader).sendValue(traderReceives);
        feeRecipient.sendValue(fee);
        payable(msg.sender).sendValue(reward);

        emit StopLossExecuted(orderId, msg.sender, traderReceives, reward);
    }

    /**
     * @notice Batch execute multiple stop-loss orders
     * @param orderIds Array of order IDs to execute
     */
    function batchExecuteStopLoss(uint256[] calldata orderIds) external nonReentrant {
        if (!authorizedExecutors[msg.sender]) revert NotAuthorizedExecutor();

        for (uint256 i = 0; i < orderIds.length; i++) {
            try this.executeStopLossOrderInternal(orderIds[i], msg.sender) {
                // Success
            } catch {
                // Skip failed executions
                continue;
            }
        }
    }

    /**
     * @notice Internal execution function for batch processing
     * @dev Caller address is passed to properly attribute executor rewards
     */
    function executeStopLossOrderInternal(uint256 orderId, address executor) external {
        require(msg.sender == address(this), "Internal only");

        StopLossOrder storage order = orders[orderId];

        if (order.orderId == 0) revert OrderNotFound();
        if (order.cancelled) revert OrderAlreadyCancelled();
        if (order.executed) revert OrderAlreadyExecuted();

        // Check trigger condition
        BondingCurveAMM amm = BondingCurveAMM(payable(order.ammAddress));
        uint256 currentPrice = amm.getCurrentPrice();

        if (currentPrice > order.triggerPrice) revert PriceAboveTrigger();

        order.executed = true;

        IERC20(order.tokenAddress).safeIncreaseAllowance(order.ammAddress, order.amount);

        // Track balance before sell to calculate received amount
        uint256 balanceBefore = address(this).balance;

        // Execute sell on AMM (does not return value, so we track balance change)
        amm.sellTokens(order.amount, order.minReceive);

        // Calculate actual native received from balance change
        uint256 nativeReceived = address(this).balance - balanceBefore;

        uint256 fee = (nativeReceived * platformFee) / FEE_DENOMINATOR;
        uint256 reward = (nativeReceived * executorReward) / FEE_DENOMINATOR;
        uint256 traderReceives = nativeReceived - fee - reward;

        // Use safe transfer patterns (compatible with smart contract wallets)
        payable(order.trader).sendValue(traderReceives);
        feeRecipient.sendValue(fee);
        payable(executor).sendValue(reward); // Reward the executor (passed from caller)

        emit StopLossExecuted(orderId, executor, traderReceives, reward);
    }

    /**
     * @notice Check if order can be executed
     * @param orderId ID of the order
     */
    function canExecute(uint256 orderId) external view returns (bool) {
        StopLossOrder storage order = orders[orderId];

        if (order.orderId == 0 || order.cancelled || order.executed) {
            return false;
        }

        BondingCurveAMM amm = BondingCurveAMM(payable(order.ammAddress));
        uint256 currentPrice = amm.getCurrentPrice();

        return currentPrice <= order.triggerPrice;
    }

    /**
     * @notice Get executable orders for a token
     * @param tokenAddress Address of the token
     */
    function getExecutableOrders(address tokenAddress)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] storage allOrders = tokenOrders[tokenAddress];
        uint256[] memory executable = new uint256[](allOrders.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allOrders.length; i++) {
            uint256 orderId = allOrders[i];
            StopLossOrder storage order = orders[orderId];

            if (order.cancelled || order.executed) {
                continue;
            }

            BondingCurveAMM amm = BondingCurveAMM(payable(order.ammAddress));
            uint256 currentPrice = amm.getCurrentPrice();

            if (currentPrice <= order.triggerPrice) {
                executable[count] = orderId;
                count++;
            }
        }

        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = executable[i];
        }

        return result;
    }

    /**
     * @notice Get all orders for a trader
     */
    function getTraderOrders(address trader) external view returns (uint256[] memory) {
        return traderOrders[trader];
    }

    /**
     * @notice Get order details
     */
    function getOrder(uint256 orderId) external view returns (StopLossOrder memory) {
        return orders[orderId];
    }

    /**
     * @notice Authorize an executor
     */
    function authorizeExecutor(address executor) external onlyOwner {
        authorizedExecutors[executor] = true;
    }

    /**
     * @notice Revoke executor authorization
     */
    function revokeExecutor(address executor) external onlyOwner {
        authorizedExecutors[executor] = false;
    }

    /**
     * @notice Update platform fee
     */
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 500, "Fee too high"); // Max 5%
        platformFee = newFee;
    }

    /**
     * @notice Update executor reward
     */
    function setExecutorReward(uint256 newReward) external onlyOwner {
        require(newReward <= 100, "Reward too high"); // Max 1%
        executorReward = newReward;
    }

    /**
     * @notice Update fee recipient
     */
    function setFeeRecipient(address payable newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newRecipient;
    }

    /**
     * @notice Emergency withdraw (only owner, only for stuck funds)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).sendValue(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    // Receive native currency
    receive() external payable {}
}
