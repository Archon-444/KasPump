// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CopyTradeRegistry
 * @notice Registry for tracking follower relationships and copy trade settings
 * @dev On-chain registry for social trading features
 */
contract CopyTradeRegistry is Ownable, ReentrancyGuard, Pausable {
    // ============ Structs ============

    struct TraderProfile {
        string displayName;
        uint256 followers;
        uint256 following;
        uint256 totalTrades;
        uint256 totalVolume;
        uint256 joinedAt;
        uint256 lastActiveAt;
        bool isVerified;
    }

    struct FollowRelation {
        address follower;
        address trader;
        bool copyEnabled;
        uint256 maxAmountPerTrade;
        uint256 maxDailyAmount;
        uint256 dailySpent;
        uint256 lastDailyReset;
        uint256 createdAt;
        bool isActive;
    }

    struct CopyTradeExecution {
        address follower;
        address trader;
        address token;
        bool isBuy;
        uint256 amount;
        uint256 price;
        uint256 timestamp;
        bytes32 originalTxHash;
    }

    // ============ State Variables ============

    /// @notice Trader profiles
    mapping(address => TraderProfile) public traderProfiles;

    /// @notice Followers of each trader: trader => follower[]
    mapping(address => address[]) public traderFollowers;

    /// @notice Traders a user follows: follower => trader[]
    mapping(address => address[]) public userFollowing;

    /// @notice Follow relationships: follower => trader => relation
    mapping(address => mapping(address => FollowRelation)) public followRelations;

    /// @notice Copy trade executions
    CopyTradeExecution[] public copyExecutions;

    /// @notice Minimum follow duration to copy (prevents flash follow attacks)
    uint256 public minFollowDuration = 1 hours;

    /// @notice Maximum number of traders a user can follow
    uint256 public maxFollowLimit = 50;

    /// @notice Platform fee on copy trades (basis points)
    uint256 public copyTradeFee = 50; // 0.5%

    // ============ Events ============

    event ProfileCreated(address indexed trader, string displayName);
    event ProfileUpdated(address indexed trader, string displayName);
    event TraderVerified(address indexed trader);
    event TraderUnverified(address indexed trader);

    event Followed(address indexed follower, address indexed trader, uint256 timestamp);
    event Unfollowed(address indexed follower, address indexed trader, uint256 timestamp);
    event CopyEnabled(address indexed follower, address indexed trader, uint256 maxAmount);
    event CopyDisabled(address indexed follower, address indexed trader);

    event CopyTradeExecuted(
        address indexed follower,
        address indexed trader,
        address token,
        bool isBuy,
        uint256 amount,
        uint256 price
    );

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Profile Management ============

    /**
     * @notice Create or update trader profile
     * @param displayName Display name for the profile
     */
    function setProfile(string calldata displayName) external {
        TraderProfile storage profile = traderProfiles[msg.sender];

        if (profile.joinedAt == 0) {
            // New profile
            profile.joinedAt = block.timestamp;
            emit ProfileCreated(msg.sender, displayName);
        } else {
            emit ProfileUpdated(msg.sender, displayName);
        }

        profile.displayName = displayName;
        profile.lastActiveAt = block.timestamp;
    }

    /**
     * @notice Verify a trader (admin only)
     * @param trader Address to verify
     */
    function verifyTrader(address trader) external onlyOwner {
        traderProfiles[trader].isVerified = true;
        emit TraderVerified(trader);
    }

    /**
     * @notice Remove verification from a trader (admin only)
     * @param trader Address to unverify
     */
    function unverifyTrader(address trader) external onlyOwner {
        traderProfiles[trader].isVerified = false;
        emit TraderUnverified(trader);
    }

    // ============ Follow Management ============

    /**
     * @notice Follow a trader
     * @param trader Address of trader to follow
     */
    function follow(address trader) external whenNotPaused {
        require(trader != msg.sender, "Cannot follow yourself");
        require(trader != address(0), "Invalid trader address");
        require(!followRelations[msg.sender][trader].isActive, "Already following");
        require(userFollowing[msg.sender].length < maxFollowLimit, "Follow limit reached");

        // Create follow relation
        followRelations[msg.sender][trader] = FollowRelation({
            follower: msg.sender,
            trader: trader,
            copyEnabled: false,
            maxAmountPerTrade: 0,
            maxDailyAmount: 0,
            dailySpent: 0,
            lastDailyReset: block.timestamp,
            createdAt: block.timestamp,
            isActive: true
        });

        // Update arrays
        traderFollowers[trader].push(msg.sender);
        userFollowing[msg.sender].push(trader);

        // Update counts
        traderProfiles[trader].followers++;
        traderProfiles[msg.sender].following++;

        emit Followed(msg.sender, trader, block.timestamp);
    }

    /**
     * @notice Unfollow a trader
     * @param trader Address of trader to unfollow
     */
    function unfollow(address trader) external {
        require(followRelations[msg.sender][trader].isActive, "Not following");

        // Deactivate relation
        followRelations[msg.sender][trader].isActive = false;
        followRelations[msg.sender][trader].copyEnabled = false;

        // Update counts
        if (traderProfiles[trader].followers > 0) {
            traderProfiles[trader].followers--;
        }
        if (traderProfiles[msg.sender].following > 0) {
            traderProfiles[msg.sender].following--;
        }

        // Note: We don't remove from arrays to save gas, just mark as inactive
        emit Unfollowed(msg.sender, trader, block.timestamp);
    }

    /**
     * @notice Enable copy trading for a followed trader
     * @param trader Address of trader to copy
     * @param maxAmountPerTrade Maximum amount per trade
     * @param maxDailyAmount Maximum daily amount
     */
    function enableCopyTrade(
        address trader,
        uint256 maxAmountPerTrade,
        uint256 maxDailyAmount
    ) external {
        FollowRelation storage relation = followRelations[msg.sender][trader];
        require(relation.isActive, "Not following this trader");
        require(
            block.timestamp >= relation.createdAt + minFollowDuration,
            "Must follow for minimum duration before copying"
        );
        require(maxAmountPerTrade > 0, "Max amount must be > 0");
        require(maxDailyAmount >= maxAmountPerTrade, "Daily must be >= per trade");

        relation.copyEnabled = true;
        relation.maxAmountPerTrade = maxAmountPerTrade;
        relation.maxDailyAmount = maxDailyAmount;

        emit CopyEnabled(msg.sender, trader, maxAmountPerTrade);
    }

    /**
     * @notice Disable copy trading for a trader
     * @param trader Address of trader
     */
    function disableCopyTrade(address trader) external {
        FollowRelation storage relation = followRelations[msg.sender][trader];
        require(relation.copyEnabled, "Copy not enabled");

        relation.copyEnabled = false;

        emit CopyDisabled(msg.sender, trader);
    }

    /**
     * @notice Update copy trade settings
     * @param trader Address of trader
     * @param maxAmountPerTrade New max amount per trade
     * @param maxDailyAmount New max daily amount
     */
    function updateCopySettings(
        address trader,
        uint256 maxAmountPerTrade,
        uint256 maxDailyAmount
    ) external {
        FollowRelation storage relation = followRelations[msg.sender][trader];
        require(relation.isActive, "Not following");
        require(relation.copyEnabled, "Copy not enabled");

        relation.maxAmountPerTrade = maxAmountPerTrade;
        relation.maxDailyAmount = maxDailyAmount;
    }

    // ============ Copy Trade Execution ============

    /**
     * @notice Record a copy trade execution (called by authorized executor)
     * @param follower Address of follower
     * @param trader Address of trader being copied
     * @param token Token being traded
     * @param isBuy Whether it's a buy or sell
     * @param amount Amount traded
     * @param price Price at execution
     * @param originalTxHash Hash of original trader transaction
     */
    function recordCopyExecution(
        address follower,
        address trader,
        address token,
        bool isBuy,
        uint256 amount,
        uint256 price,
        bytes32 originalTxHash
    ) external onlyOwner nonReentrant {
        FollowRelation storage relation = followRelations[follower][trader];
        require(relation.copyEnabled, "Copy not enabled for this relation");

        // Reset daily spent if new day
        if (block.timestamp >= relation.lastDailyReset + 1 days) {
            relation.dailySpent = 0;
            relation.lastDailyReset = block.timestamp;
        }

        uint256 tradeValue = (amount * price) / 1e18;
        require(tradeValue <= relation.maxAmountPerTrade, "Exceeds max per trade");
        require(
            relation.dailySpent + tradeValue <= relation.maxDailyAmount,
            "Exceeds daily limit"
        );

        // Update daily spent
        relation.dailySpent += tradeValue;

        // Record execution
        copyExecutions.push(CopyTradeExecution({
            follower: follower,
            trader: trader,
            token: token,
            isBuy: isBuy,
            amount: amount,
            price: price,
            timestamp: block.timestamp,
            originalTxHash: originalTxHash
        }));

        // Update trader stats
        traderProfiles[trader].totalTrades++;
        traderProfiles[trader].totalVolume += tradeValue;
        traderProfiles[trader].lastActiveAt = block.timestamp;

        emit CopyTradeExecuted(follower, trader, token, isBuy, amount, price);
    }

    // ============ View Functions ============

    /**
     * @notice Get followers of a trader
     * @param trader Trader address
     * @return Array of follower addresses
     */
    function getFollowers(address trader) external view returns (address[] memory) {
        return traderFollowers[trader];
    }

    /**
     * @notice Get traders a user follows
     * @param user User address
     * @return Array of trader addresses
     */
    function getFollowing(address user) external view returns (address[] memory) {
        return userFollowing[user];
    }

    /**
     * @notice Get active follower count
     * @param trader Trader address
     * @return Count of active followers
     */
    function getActiveFollowerCount(address trader) external view returns (uint256) {
        uint256 count = 0;
        address[] memory followers = traderFollowers[trader];
        for (uint256 i = 0; i < followers.length; i++) {
            if (followRelations[followers[i]][trader].isActive) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Check if user can copy trade from trader
     * @param follower Follower address
     * @param trader Trader address
     * @return canCopy Whether copy is enabled and valid
     * @return remainingDaily Remaining daily allowance
     */
    function canCopyTrade(
        address follower,
        address trader
    ) external view returns (bool canCopy, uint256 remainingDaily) {
        FollowRelation memory relation = followRelations[follower][trader];

        if (!relation.isActive || !relation.copyEnabled) {
            return (false, 0);
        }

        if (block.timestamp < relation.createdAt + minFollowDuration) {
            return (false, 0);
        }

        uint256 spent = relation.dailySpent;
        if (block.timestamp >= relation.lastDailyReset + 1 days) {
            spent = 0;
        }

        return (true, relation.maxDailyAmount - spent);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update minimum follow duration
     * @param duration New duration in seconds
     */
    function setMinFollowDuration(uint256 duration) external onlyOwner {
        minFollowDuration = duration;
    }

    /**
     * @notice Update maximum follow limit
     * @param limit New limit
     */
    function setMaxFollowLimit(uint256 limit) external onlyOwner {
        maxFollowLimit = limit;
    }

    /**
     * @notice Update copy trade fee
     * @param fee New fee in basis points
     */
    function setCopyTradeFee(uint256 fee) external onlyOwner {
        require(fee <= 500, "Fee too high"); // Max 5%
        copyTradeFee = fee;
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
