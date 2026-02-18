// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ReferralRegistry
 * @notice Manages referral relationships and reward distribution for KasPump
 * @dev Tracks referrals, calculates rewards, and enables withdrawals
 *
 * Referral Program:
 * - Referrers earn 10% of platform fees from their referrals
 * - 30-day attribution window for new users
 * - Tiered rewards for top referrers (future enhancement)
 */
contract ReferralRegistry is Ownable, ReentrancyGuard, Pausable {

    // ============ Constants ============

    /// @notice Referral reward percentage (10% = 1000 basis points)
    uint256 public constant REFERRAL_REWARD_BPS = 1000;

    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Attribution window (30 days in seconds)
    uint256 public constant ATTRIBUTION_WINDOW = 30 days;

    /// @notice Minimum withdrawal amount (0.01 BNB)
    uint256 public constant MIN_WITHDRAWAL = 0.01 ether;

    // ============ State Variables ============

    /// @notice Maps user address to their referrer
    mapping(address => address) public referrerOf;

    /// @notice Maps user address to when they were referred
    mapping(address => uint256) public referredAt;

    /// @notice Maps referrer to their total earnings (withdrawable)
    mapping(address => uint256) public pendingRewards;

    /// @notice Maps referrer to their total earned (lifetime)
    mapping(address => uint256) public totalEarned;

    /// @notice Maps referrer to count of referred users
    mapping(address => uint256) public referralCount;

    /// @notice Maps referrer to count of active referrals (within attribution window)
    mapping(address => uint256) public activeReferralCount;

    /// @notice Total rewards distributed
    uint256 public totalRewardsDistributed;

    /// @notice Total pending rewards across all referrers
    uint256 public totalPendingRewards;

    /// @notice Authorized callers (TokenFactory, BondingCurveAMM)
    mapping(address => bool) public authorizedCallers;

    // ============ Events ============

    event ReferralRegistered(
        address indexed user,
        address indexed referrer,
        uint256 timestamp
    );

    event ReferralRewardAccrued(
        address indexed referrer,
        address indexed user,
        uint256 feeAmount,
        uint256 rewardAmount,
        string actionType
    );

    event RewardsWithdrawn(
        address indexed referrer,
        uint256 amount
    );

    event AuthorizedCallerUpdated(
        address indexed caller,
        bool authorized
    );

    // ============ Errors ============

    error AlreadyReferred();
    error SelfReferralNotAllowed();
    error InvalidReferrer();
    error NoRewardsToWithdraw();
    error WithdrawalBelowMinimum();
    error WithdrawalFailed();
    error UnauthorizedCaller();
    error ZeroAddress();

    // ============ Modifiers ============

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        _;
    }

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ External Functions ============

    /**
     * @notice Register a referral relationship
     * @param user The new user being referred
     * @param referrer The referrer's address
     */
    function registerReferral(
        address user,
        address referrer
    ) external onlyAuthorized whenNotPaused {
        if (user == address(0)) revert ZeroAddress();
        if (referrer == address(0)) revert InvalidReferrer();
        if (user == referrer) revert SelfReferralNotAllowed();
        if (referrerOf[user] != address(0)) revert AlreadyReferred();

        referrerOf[user] = referrer;
        referredAt[user] = block.timestamp;
        referralCount[referrer]++;
        activeReferralCount[referrer]++;

        emit ReferralRegistered(user, referrer, block.timestamp);
    }

    /**
     * @notice Record a referral reward when a referred user generates fees
     * @param user The user who generated the fee
     * @param feeAmount The total fee amount
     * @param actionType Type of action (e.g., "token_creation", "trade")
     * @return rewardAmount The reward amount for the referrer
     */
    function recordReferralReward(
        address user,
        uint256 feeAmount,
        string calldata actionType
    ) external payable onlyAuthorized whenNotPaused returns (uint256 rewardAmount) {
        address referrer = referrerOf[user];

        // Check if user has a referrer and is within attribution window
        if (referrer == address(0)) {
            return 0;
        }

        uint256 referralTime = referredAt[user];
        if (block.timestamp > referralTime + ATTRIBUTION_WINDOW) {
            // Attribution window expired, decrement active count if not already done
            if (activeReferralCount[referrer] > 0) {
                activeReferralCount[referrer]--;
            }
            return 0;
        }

        // Calculate reward (10% of fee)
        rewardAmount = (feeAmount * REFERRAL_REWARD_BPS) / BPS_DENOMINATOR;

        if (rewardAmount > 0) {
            pendingRewards[referrer] += rewardAmount;
            totalEarned[referrer] += rewardAmount;
            totalPendingRewards += rewardAmount;
            totalRewardsDistributed += rewardAmount;

            emit ReferralRewardAccrued(
                referrer,
                user,
                feeAmount,
                rewardAmount,
                actionType
            );
        }

        return rewardAmount;
    }

    /**
     * @notice Withdraw pending referral rewards
     */
    function withdrawRewards() external nonReentrant whenNotPaused {
        uint256 amount = pendingRewards[msg.sender];

        if (amount == 0) revert NoRewardsToWithdraw();
        if (amount < MIN_WITHDRAWAL) revert WithdrawalBelowMinimum();

        pendingRewards[msg.sender] = 0;
        totalPendingRewards -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert WithdrawalFailed();

        emit RewardsWithdrawn(msg.sender, amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get referral info for a user
     * @param user The user address
     * @return referrer The referrer address
     * @return timestamp When the referral was registered
     * @return isActive Whether the attribution window is still active
     */
    function getReferralInfo(address user) external view returns (
        address referrer,
        uint256 timestamp,
        bool isActive
    ) {
        referrer = referrerOf[user];
        timestamp = referredAt[user];
        isActive = referrer != address(0) &&
                   block.timestamp <= timestamp + ATTRIBUTION_WINDOW;
    }

    /**
     * @notice Get referrer statistics
     * @param referrer The referrer address
     * @return stats Referrer statistics
     */
    function getReferrerStats(address referrer) external view returns (
        uint256 totalReferrals,
        uint256 activeReferrals,
        uint256 pending,
        uint256 lifetime
    ) {
        totalReferrals = referralCount[referrer];
        activeReferrals = activeReferralCount[referrer];
        pending = pendingRewards[referrer];
        lifetime = totalEarned[referrer];
    }

    /**
     * @notice Check if a user was referred and referral is active
     * @param user The user address
     * @return True if user has active referral
     */
    function hasActiveReferral(address user) external view returns (bool) {
        address referrer = referrerOf[user];
        if (referrer == address(0)) return false;
        return block.timestamp <= referredAt[user] + ATTRIBUTION_WINDOW;
    }

    /**
     * @notice Calculate reward amount for a given fee
     * @param feeAmount The fee amount
     * @return The reward amount
     */
    function calculateReward(uint256 feeAmount) external pure returns (uint256) {
        return (feeAmount * REFERRAL_REWARD_BPS) / BPS_DENOMINATOR;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set authorized caller status
     * @param caller The caller address
     * @param authorized Whether caller is authorized
     */
    function setAuthorizedCaller(
        address caller,
        bool authorized
    ) external onlyOwner {
        if (caller == address(0)) revert ZeroAddress();
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerUpdated(caller, authorized);
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

    /**
     * @notice Receive function to accept BNB for rewards
     */
    receive() external payable {}
}
