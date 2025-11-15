// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LimitOrderBook
 * @notice Manages limit orders for KasPump tokens
 * @dev Supports limit buy and limit sell orders with automatic matching
 */
contract LimitOrderBook is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Order {
        uint256 orderId;
        address trader;
        address tokenAddress;
        bool isBuyOrder;
        uint256 price; // Price in wei per token (18 decimals)
        uint256 amount; // Amount of tokens
        uint256 filled; // Amount already filled
        uint256 timestamp;
        bool cancelled;
    }

    // Order ID counter
    uint256 public nextOrderId = 1;

    // Mapping: orderId => Order
    mapping(uint256 => Order) public orders;

    // Mapping: trader => orderIds[]
    mapping(address => uint256[]) public traderOrders;

    // Mapping: token => orderIds[] for buy orders
    mapping(address => uint256[]) public tokenBuyOrders;

    // Mapping: token => orderIds[] for sell orders
    mapping(address => uint256[]) public tokenSellOrders;

    // Platform fee (0.3% = 30 basis points)
    uint256 public platformFee = 30;
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Fee recipient
    address payable public feeRecipient;

    // Minimum order size (0.001 ETH or tokens)
    uint256 public minOrderSize = 0.001 ether;

    // Events
    event OrderCreated(
        uint256 indexed orderId,
        address indexed trader,
        address indexed tokenAddress,
        bool isBuyOrder,
        uint256 price,
        uint256 amount
    );

    event OrderFilled(
        uint256 indexed orderId,
        address indexed filler,
        uint256 amount,
        uint256 totalCost
    );

    event OrderCancelled(uint256 indexed orderId, address indexed trader);

    event OrderPartiallyFilled(
        uint256 indexed orderId,
        uint256 filledAmount,
        uint256 remainingAmount
    );

    // Custom errors
    error InvalidPrice();
    error InvalidAmount();
    error InsufficientBalance();
    error OrderNotFound();
    error NotOrderOwner();
    error OrderAlreadyCancelled();
    error OrderAlreadyFilled();
    error InsufficientOrderAmount();
    error OrderSizeTooSmall();

    constructor(address payable _feeRecipient) {
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Create a limit buy order
     * @param tokenAddress Address of the token to buy
     * @param price Price willing to pay per token (in wei)
     * @param amount Amount of tokens to buy
     */
    function createBuyOrder(
        address tokenAddress,
        uint256 price,
        uint256 amount
    ) external payable nonReentrant returns (uint256) {
        if (price == 0) revert InvalidPrice();
        if (amount == 0) revert InvalidAmount();

        uint256 totalCost = (price * amount) / 1e18;
        if (totalCost < minOrderSize) revert OrderSizeTooSmall();
        if (msg.value < totalCost) revert InsufficientBalance();

        uint256 orderId = nextOrderId++;

        orders[orderId] = Order({
            orderId: orderId,
            trader: msg.sender,
            tokenAddress: tokenAddress,
            isBuyOrder: true,
            price: price,
            amount: amount,
            filled: 0,
            timestamp: block.timestamp,
            cancelled: false
        });

        traderOrders[msg.sender].push(orderId);
        tokenBuyOrders[tokenAddress].push(orderId);

        emit OrderCreated(orderId, msg.sender, tokenAddress, true, price, amount);

        // Try to match with existing sell orders
        _matchBuyOrder(orderId);

        // Refund excess ETH
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        return orderId;
    }

    /**
     * @notice Create a limit sell order
     * @param tokenAddress Address of the token to sell
     * @param price Minimum price to accept per token (in wei)
     * @param amount Amount of tokens to sell
     */
    function createSellOrder(
        address tokenAddress,
        uint256 price,
        uint256 amount
    ) external nonReentrant returns (uint256) {
        if (price == 0) revert InvalidPrice();
        if (amount == 0) revert InvalidAmount();
        if (amount < minOrderSize) revert OrderSizeTooSmall();

        // Transfer tokens to this contract
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);

        uint256 orderId = nextOrderId++;

        orders[orderId] = Order({
            orderId: orderId,
            trader: msg.sender,
            tokenAddress: tokenAddress,
            isBuyOrder: false,
            price: price,
            amount: amount,
            filled: 0,
            timestamp: block.timestamp,
            cancelled: false
        });

        traderOrders[msg.sender].push(orderId);
        tokenSellOrders[tokenAddress].push(orderId);

        emit OrderCreated(orderId, msg.sender, tokenAddress, false, price, amount);

        // Try to match with existing buy orders
        _matchSellOrder(orderId);

        return orderId;
    }

    /**
     * @notice Cancel an order
     * @param orderId ID of the order to cancel
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];

        if (order.orderId == 0) revert OrderNotFound();
        if (order.trader != msg.sender) revert NotOrderOwner();
        if (order.cancelled) revert OrderAlreadyCancelled();
        if (order.filled >= order.amount) revert OrderAlreadyFilled();

        order.cancelled = true;

        uint256 remainingAmount = order.amount - order.filled;

        if (order.isBuyOrder) {
            // Refund remaining ETH
            uint256 refundAmount = (order.price * remainingAmount) / 1e18;
            payable(order.trader).transfer(refundAmount);
        } else {
            // Return remaining tokens
            IERC20(order.tokenAddress).safeTransfer(order.trader, remainingAmount);
        }

        emit OrderCancelled(orderId, msg.sender);
    }

    /**
     * @notice Fill a buy order (someone selling to a buy order)
     * @param orderId ID of the buy order to fill
     * @param amount Amount of tokens to sell
     */
    function fillBuyOrder(uint256 orderId, uint256 amount) external nonReentrant {
        Order storage order = orders[orderId];

        if (order.orderId == 0) revert OrderNotFound();
        if (!order.isBuyOrder) revert InvalidAmount();
        if (order.cancelled) revert OrderAlreadyCancelled();
        if (order.filled >= order.amount) revert OrderAlreadyFilled();

        uint256 remainingAmount = order.amount - order.filled;
        uint256 fillAmount = amount > remainingAmount ? remainingAmount : amount;

        if (fillAmount == 0) revert InsufficientOrderAmount();

        // Transfer tokens from seller to buyer
        IERC20(order.tokenAddress).safeTransferFrom(
            msg.sender,
            order.trader,
            fillAmount
        );

        // Calculate payment
        uint256 totalCost = (order.price * fillAmount) / 1e18;
        uint256 fee = (totalCost * platformFee) / FEE_DENOMINATOR;
        uint256 sellerReceives = totalCost - fee;

        // Update order
        order.filled += fillAmount;

        // Transfer ETH to seller
        payable(msg.sender).transfer(sellerReceives);

        // Transfer fee to platform
        feeRecipient.transfer(fee);

        emit OrderFilled(orderId, msg.sender, fillAmount, totalCost);

        if (order.filled < order.amount) {
            emit OrderPartiallyFilled(orderId, order.filled, order.amount - order.filled);
        }
    }

    /**
     * @notice Fill a sell order (someone buying from a sell order)
     * @param orderId ID of the sell order to fill
     * @param amount Amount of tokens to buy
     */
    function fillSellOrder(uint256 orderId, uint256 amount)
        external
        payable
        nonReentrant
    {
        Order storage order = orders[orderId];

        if (order.orderId == 0) revert OrderNotFound();
        if (order.isBuyOrder) revert InvalidAmount();
        if (order.cancelled) revert OrderAlreadyCancelled();
        if (order.filled >= order.amount) revert OrderAlreadyFilled();

        uint256 remainingAmount = order.amount - order.filled;
        uint256 fillAmount = amount > remainingAmount ? remainingAmount : amount;

        if (fillAmount == 0) revert InsufficientOrderAmount();

        uint256 totalCost = (order.price * fillAmount) / 1e18;
        if (msg.value < totalCost) revert InsufficientBalance();

        // Calculate fee
        uint256 fee = (totalCost * platformFee) / FEE_DENOMINATOR;
        uint256 sellerReceives = totalCost - fee;

        // Update order
        order.filled += fillAmount;

        // Transfer tokens to buyer
        IERC20(order.tokenAddress).safeTransfer(msg.sender, fillAmount);

        // Transfer ETH to seller
        payable(order.trader).transfer(sellerReceives);

        // Transfer fee to platform
        feeRecipient.transfer(fee);

        // Refund excess ETH
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit OrderFilled(orderId, msg.sender, fillAmount, totalCost);

        if (order.filled < order.amount) {
            emit OrderPartiallyFilled(orderId, order.filled, order.amount - order.filled);
        }
    }

    /**
     * @notice Match buy order with existing sell orders
     */
    function _matchBuyOrder(uint256 buyOrderId) internal {
        Order storage buyOrder = orders[buyOrderId];
        uint256[] storage sellOrders = tokenSellOrders[buyOrder.tokenAddress];

        for (uint256 i = 0; i < sellOrders.length; i++) {
            uint256 sellOrderId = sellOrders[i];
            Order storage sellOrder = orders[sellOrderId];

            // Skip if cancelled or filled
            if (sellOrder.cancelled || sellOrder.filled >= sellOrder.amount) {
                continue;
            }

            // Check price compatibility (buy price >= sell price)
            if (buyOrder.price >= sellOrder.price) {
                uint256 buyRemaining = buyOrder.amount - buyOrder.filled;
                uint256 sellRemaining = sellOrder.amount - sellOrder.filled;
                uint256 matchAmount = buyRemaining < sellRemaining
                    ? buyRemaining
                    : sellRemaining;

                // Execute trade
                uint256 totalCost = (sellOrder.price * matchAmount) / 1e18;
                uint256 fee = (totalCost * platformFee) / FEE_DENOMINATOR;
                uint256 sellerReceives = totalCost - fee;

                // Update orders
                buyOrder.filled += matchAmount;
                sellOrder.filled += matchAmount;

                // Transfer tokens from this contract to buyer
                IERC20(buyOrder.tokenAddress).safeTransfer(buyOrder.trader, matchAmount);

                // Transfer ETH to seller
                payable(sellOrder.trader).transfer(sellerReceives);

                // Transfer fee
                feeRecipient.transfer(fee);

                emit OrderFilled(sellOrderId, buyOrder.trader, matchAmount, totalCost);

                // Stop if buy order is filled
                if (buyOrder.filled >= buyOrder.amount) {
                    break;
                }
            }
        }
    }

    /**
     * @notice Match sell order with existing buy orders
     */
    function _matchSellOrder(uint256 sellOrderId) internal {
        Order storage sellOrder = orders[sellOrderId];
        uint256[] storage buyOrders = tokenBuyOrders[sellOrder.tokenAddress];

        for (uint256 i = 0; i < buyOrders.length; i++) {
            uint256 buyOrderId = buyOrders[i];
            Order storage buyOrder = orders[buyOrderId];

            // Skip if cancelled or filled
            if (buyOrder.cancelled || buyOrder.filled >= buyOrder.amount) {
                continue;
            }

            // Check price compatibility (buy price >= sell price)
            if (buyOrder.price >= sellOrder.price) {
                uint256 buyRemaining = buyOrder.amount - buyOrder.filled;
                uint256 sellRemaining = sellOrder.amount - sellOrder.filled;
                uint256 matchAmount = buyRemaining < sellRemaining
                    ? buyRemaining
                    : sellRemaining;

                // Execute trade
                uint256 totalCost = (buyOrder.price * matchAmount) / 1e18;
                uint256 fee = (totalCost * platformFee) / FEE_DENOMINATOR;
                uint256 sellerReceives = totalCost - fee;

                // Update orders
                buyOrder.filled += matchAmount;
                sellOrder.filled += matchAmount;

                // Transfer tokens from this contract to buyer
                IERC20(sellOrder.tokenAddress).safeTransfer(buyOrder.trader, matchAmount);

                // Transfer ETH to seller
                payable(sellOrder.trader).transfer(sellerReceives);

                // Transfer fee
                feeRecipient.transfer(fee);

                emit OrderFilled(buyOrderId, sellOrder.trader, matchAmount, totalCost);

                // Stop if sell order is filled
                if (sellOrder.filled >= sellOrder.amount) {
                    break;
                }
            }
        }
    }

    /**
     * @notice Get all orders for a trader
     */
    function getTraderOrders(address trader) external view returns (uint256[] memory) {
        return traderOrders[trader];
    }

    /**
     * @notice Get all buy orders for a token
     */
    function getTokenBuyOrders(address token) external view returns (uint256[] memory) {
        return tokenBuyOrders[token];
    }

    /**
     * @notice Get all sell orders for a token
     */
    function getTokenSellOrders(address token) external view returns (uint256[] memory) {
        return tokenSellOrders[token];
    }

    /**
     * @notice Get order details
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    /**
     * @notice Update platform fee (only owner)
     */
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 500, "Fee too high"); // Max 5%
        platformFee = newFee;
    }

    /**
     * @notice Update fee recipient (only owner)
     */
    function setFeeRecipient(address payable newRecipient) external onlyOwner {
        feeRecipient = newRecipient;
    }

    /**
     * @notice Update minimum order size (only owner)
     */
    function setMinOrderSize(uint256 newMinSize) external onlyOwner {
        minOrderSize = newMinSize;
    }
}
