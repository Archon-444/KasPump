// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LPFarming
 * @notice Staking contract for LP token farming with reward distribution
 * @dev Supports multiple pools with different reward rates
 *
 * Features:
 * - Multiple staking pools
 * - Configurable reward rates per pool
 * - Auto-compounding option
 * - Emergency withdrawal
 * - Boost multipliers for long-term stakers
 */
contract LPFarming is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct PoolInfo {
        IERC20 lpToken;           // LP token contract
        IERC20 rewardToken;       // Reward token contract
        uint256 rewardPerBlock;   // Rewards per block
        uint256 lastRewardBlock;  // Last block rewards were calculated
        uint256 accRewardPerShare; // Accumulated rewards per share (scaled by 1e12)
        uint256 totalStaked;      // Total LP tokens staked
        uint256 startBlock;       // Block when rewards start
        uint256 endBlock;         // Block when rewards end (0 = infinite)
        uint256 minStakeDuration; // Minimum stake duration for full rewards
        bool isActive;            // Whether pool is active
    }

    struct UserInfo {
        uint256 amount;           // LP tokens staked
        uint256 rewardDebt;       // Reward debt for proper accounting
        uint256 pendingRewards;   // Pending rewards to claim
        uint256 stakedAt;         // Timestamp when staked
        uint256 lastClaimAt;      // Last claim timestamp
        uint256 boostMultiplier;  // Boost multiplier (100 = 1x, 150 = 1.5x)
    }

    struct BoostTier {
        uint256 minDuration;      // Minimum stake duration in seconds
        uint256 multiplier;       // Boost multiplier (100 = 1x)
    }

    // ============ State Variables ============

    /// @notice All pools
    PoolInfo[] public pools;

    /// @notice User info per pool: poolId => user => info
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    /// @notice Boost tiers for long-term staking rewards
    BoostTier[] public boostTiers;

    /// @notice Platform fee on rewards (basis points)
    uint256 public platformFee = 100; // 1%

    /// @notice Fee recipient
    address public feeRecipient;

    /// @notice Precision for reward calculations
    uint256 private constant PRECISION = 1e12;

    /// @notice Base multiplier (100 = 1x)
    uint256 private constant BASE_MULTIPLIER = 100;

    // ============ Events ============

    event PoolCreated(
        uint256 indexed poolId,
        address lpToken,
        address rewardToken,
        uint256 rewardPerBlock
    );
    event PoolUpdated(uint256 indexed poolId, uint256 rewardPerBlock, bool isActive);
    event Staked(address indexed user, uint256 indexed poolId, uint256 amount);
    event Unstaked(address indexed user, uint256 indexed poolId, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed poolId, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed poolId, uint256 amount);
    event BoostUpdated(address indexed user, uint256 indexed poolId, uint256 multiplier);

    // ============ Constructor ============

    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;

        // Initialize default boost tiers
        boostTiers.push(BoostTier({ minDuration: 0, multiplier: 100 }));           // 1x for < 7 days
        boostTiers.push(BoostTier({ minDuration: 7 days, multiplier: 110 }));      // 1.1x for 7+ days
        boostTiers.push(BoostTier({ minDuration: 30 days, multiplier: 125 }));     // 1.25x for 30+ days
        boostTiers.push(BoostTier({ minDuration: 90 days, multiplier: 150 }));     // 1.5x for 90+ days
        boostTiers.push(BoostTier({ minDuration: 180 days, multiplier: 200 }));    // 2x for 180+ days
    }

    // ============ Pool Management ============

    /**
     * @notice Create a new staking pool
     * @param _lpToken LP token to stake
     * @param _rewardToken Token to distribute as rewards
     * @param _rewardPerBlock Rewards per block
     * @param _startBlock Block to start rewards
     * @param _endBlock Block to end rewards (0 for infinite)
     * @param _minStakeDuration Minimum stake duration
     */
    function createPool(
        address _lpToken,
        address _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _endBlock,
        uint256 _minStakeDuration
    ) external onlyOwner {
        require(_lpToken != address(0), "Invalid LP token");
        require(_rewardToken != address(0), "Invalid reward token");
        require(_startBlock >= block.number, "Start block must be future");
        require(_endBlock == 0 || _endBlock > _startBlock, "Invalid end block");

        pools.push(PoolInfo({
            lpToken: IERC20(_lpToken),
            rewardToken: IERC20(_rewardToken),
            rewardPerBlock: _rewardPerBlock,
            lastRewardBlock: _startBlock,
            accRewardPerShare: 0,
            totalStaked: 0,
            startBlock: _startBlock,
            endBlock: _endBlock,
            minStakeDuration: _minStakeDuration,
            isActive: true
        }));

        emit PoolCreated(pools.length - 1, _lpToken, _rewardToken, _rewardPerBlock);
    }

    /**
     * @notice Update pool parameters
     * @param _poolId Pool ID
     * @param _rewardPerBlock New reward rate
     * @param _isActive Whether pool is active
     */
    function updatePool(
        uint256 _poolId,
        uint256 _rewardPerBlock,
        bool _isActive
    ) external onlyOwner {
        require(_poolId < pools.length, "Invalid pool");

        _updatePoolRewards(_poolId);

        pools[_poolId].rewardPerBlock = _rewardPerBlock;
        pools[_poolId].isActive = _isActive;

        emit PoolUpdated(_poolId, _rewardPerBlock, _isActive);
    }

    // ============ Staking Functions ============

    /**
     * @notice Stake LP tokens
     * @param _poolId Pool to stake in
     * @param _amount Amount of LP tokens to stake
     */
    function stake(uint256 _poolId, uint256 _amount) external nonReentrant whenNotPaused {
        require(_poolId < pools.length, "Invalid pool");
        require(_amount > 0, "Amount must be > 0");

        PoolInfo storage pool = pools[_poolId];
        require(pool.isActive, "Pool not active");

        UserInfo storage user = userInfo[_poolId][msg.sender];

        // Update pool rewards
        _updatePoolRewards(_poolId);

        // Harvest pending rewards if user has existing stake
        if (user.amount > 0) {
            uint256 pending = _calculatePending(_poolId, msg.sender);
            if (pending > 0) {
                user.pendingRewards += pending;
            }
        }

        // Transfer LP tokens from user
        pool.lpToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Update user info
        user.amount += _amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;

        if (user.stakedAt == 0) {
            user.stakedAt = block.timestamp;
        }

        // Update boost multiplier
        _updateBoostMultiplier(_poolId, msg.sender);

        // Update pool total
        pool.totalStaked += _amount;

        emit Staked(msg.sender, _poolId, _amount);
    }

    /**
     * @notice Unstake LP tokens
     * @param _poolId Pool to unstake from
     * @param _amount Amount to unstake
     */
    function unstake(uint256 _poolId, uint256 _amount) external nonReentrant {
        require(_poolId < pools.length, "Invalid pool");

        PoolInfo storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        require(user.amount >= _amount, "Insufficient balance");
        require(_amount > 0, "Amount must be > 0");

        // Update pool rewards
        _updatePoolRewards(_poolId);

        // Calculate and store pending rewards
        uint256 pending = _calculatePending(_poolId, msg.sender);
        if (pending > 0) {
            user.pendingRewards += pending;
        }

        // Update user info
        user.amount -= _amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;

        // Reset stake time if fully unstaked
        if (user.amount == 0) {
            user.stakedAt = 0;
            user.boostMultiplier = BASE_MULTIPLIER;
        }

        // Update pool total
        pool.totalStaked -= _amount;

        // Transfer LP tokens back to user
        pool.lpToken.safeTransfer(msg.sender, _amount);

        emit Unstaked(msg.sender, _poolId, _amount);
    }

    /**
     * @notice Claim pending rewards
     * @param _poolId Pool to claim from
     */
    function claimRewards(uint256 _poolId) external nonReentrant {
        require(_poolId < pools.length, "Invalid pool");

        PoolInfo storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        // Update pool rewards
        _updatePoolRewards(_poolId);

        // Calculate total pending
        uint256 pending = _calculatePending(_poolId, msg.sender) + user.pendingRewards;
        require(pending > 0, "No rewards to claim");

        // Apply boost multiplier
        uint256 boostedRewards = (pending * user.boostMultiplier) / BASE_MULTIPLIER;

        // Calculate and deduct platform fee
        uint256 fee = (boostedRewards * platformFee) / 10000;
        uint256 userReward = boostedRewards - fee;

        // Reset pending rewards
        user.pendingRewards = 0;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;
        user.lastClaimAt = block.timestamp;

        // Transfer rewards
        if (fee > 0) {
            pool.rewardToken.safeTransfer(feeRecipient, fee);
        }
        pool.rewardToken.safeTransfer(msg.sender, userReward);

        emit RewardsClaimed(msg.sender, _poolId, userReward);
    }

    /**
     * @notice Emergency withdraw without caring about rewards
     * @param _poolId Pool to withdraw from
     */
    function emergencyWithdraw(uint256 _poolId) external nonReentrant {
        require(_poolId < pools.length, "Invalid pool");

        PoolInfo storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        uint256 amount = user.amount;
        require(amount > 0, "Nothing to withdraw");

        // Reset user info
        user.amount = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0;
        user.stakedAt = 0;
        user.boostMultiplier = BASE_MULTIPLIER;

        // Update pool total
        pool.totalStaked -= amount;

        // Transfer LP tokens
        pool.lpToken.safeTransfer(msg.sender, amount);

        emit EmergencyWithdraw(msg.sender, _poolId, amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get pending rewards for a user
     * @param _poolId Pool ID
     * @param _user User address
     * @return Pending reward amount (before boost)
     */
    function pendingReward(uint256 _poolId, address _user) external view returns (uint256) {
        require(_poolId < pools.length, "Invalid pool");

        PoolInfo storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][_user];

        uint256 accRewardPerShare = pool.accRewardPerShare;

        if (block.number > pool.lastRewardBlock && pool.totalStaked > 0) {
            uint256 blocks = _getMultiplier(pool.lastRewardBlock, block.number, pool.endBlock);
            uint256 reward = blocks * pool.rewardPerBlock;
            accRewardPerShare += (reward * PRECISION) / pool.totalStaked;
        }

        uint256 pending = ((user.amount * accRewardPerShare) / PRECISION) - user.rewardDebt;
        return pending + user.pendingRewards;
    }

    /**
     * @notice Get pool count
     * @return Number of pools
     */
    function poolCount() external view returns (uint256) {
        return pools.length;
    }

    /**
     * @notice Get user's boost multiplier
     * @param _poolId Pool ID
     * @param _user User address
     * @return Current boost multiplier
     */
    function getUserBoost(uint256 _poolId, address _user) external view returns (uint256) {
        return userInfo[_poolId][_user].boostMultiplier;
    }

    /**
     * @notice Calculate APR for a pool
     * @param _poolId Pool ID
     * @return APR in basis points (10000 = 100%)
     */
    function getPoolAPR(uint256 _poolId) external view returns (uint256) {
        require(_poolId < pools.length, "Invalid pool");

        PoolInfo storage pool = pools[_poolId];
        if (pool.totalStaked == 0) return 0;

        // Assuming ~15 second blocks, ~2,102,400 blocks per year
        uint256 blocksPerYear = 2102400;
        uint256 yearlyRewards = pool.rewardPerBlock * blocksPerYear;

        // APR = (yearlyRewards / totalStaked) * 10000
        return (yearlyRewards * 10000) / pool.totalStaked;
    }

    // ============ Internal Functions ============

    /**
     * @notice Update pool reward variables
     * @param _poolId Pool ID
     */
    function _updatePoolRewards(uint256 _poolId) internal {
        PoolInfo storage pool = pools[_poolId];

        if (block.number <= pool.lastRewardBlock) {
            return;
        }

        if (pool.totalStaked == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }

        uint256 blocks = _getMultiplier(pool.lastRewardBlock, block.number, pool.endBlock);
        uint256 reward = blocks * pool.rewardPerBlock;

        pool.accRewardPerShare += (reward * PRECISION) / pool.totalStaked;
        pool.lastRewardBlock = block.number;
    }

    /**
     * @notice Calculate pending rewards for a user
     * @param _poolId Pool ID
     * @param _user User address
     * @return Pending rewards
     */
    function _calculatePending(uint256 _poolId, address _user) internal view returns (uint256) {
        PoolInfo storage pool = pools[_poolId];
        UserInfo storage user = userInfo[_poolId][_user];

        return ((user.amount * pool.accRewardPerShare) / PRECISION) - user.rewardDebt;
    }

    /**
     * @notice Get block multiplier (handles end block)
     * @param _from Start block
     * @param _to End block
     * @param _endBlock Pool end block
     * @return Number of reward blocks
     */
    function _getMultiplier(uint256 _from, uint256 _to, uint256 _endBlock) internal pure returns (uint256) {
        if (_endBlock == 0) {
            return _to - _from;
        }
        if (_to <= _endBlock) {
            return _to - _from;
        }
        if (_from >= _endBlock) {
            return 0;
        }
        return _endBlock - _from;
    }

    /**
     * @notice Update user's boost multiplier based on stake duration
     * @param _poolId Pool ID
     * @param _user User address
     */
    function _updateBoostMultiplier(uint256 _poolId, address _user) internal {
        UserInfo storage user = userInfo[_poolId][_user];

        if (user.stakedAt == 0) {
            user.boostMultiplier = BASE_MULTIPLIER;
            return;
        }

        uint256 stakeDuration = block.timestamp - user.stakedAt;
        uint256 newMultiplier = BASE_MULTIPLIER;

        // Find applicable boost tier
        for (uint256 i = boostTiers.length; i > 0; i--) {
            if (stakeDuration >= boostTiers[i - 1].minDuration) {
                newMultiplier = boostTiers[i - 1].multiplier;
                break;
            }
        }

        if (user.boostMultiplier != newMultiplier) {
            user.boostMultiplier = newMultiplier;
            emit BoostUpdated(_user, _poolId, newMultiplier);
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Update platform fee
     * @param _fee New fee in basis points
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        platformFee = _fee;
    }

    /**
     * @notice Update fee recipient
     * @param _recipient New recipient address
     */
    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid address");
        feeRecipient = _recipient;
    }

    /**
     * @notice Update boost tiers
     * @param _durations Array of durations
     * @param _multipliers Array of multipliers
     */
    function setBoostTiers(
        uint256[] calldata _durations,
        uint256[] calldata _multipliers
    ) external onlyOwner {
        require(_durations.length == _multipliers.length, "Array mismatch");

        delete boostTiers;

        for (uint256 i = 0; i < _durations.length; i++) {
            boostTiers.push(BoostTier({
                minDuration: _durations[i],
                multiplier: _multipliers[i]
            }));
        }
    }

    /**
     * @notice Recover stuck tokens (not LP or reward tokens)
     * @param _token Token to recover
     * @param _amount Amount to recover
     */
    function recoverTokens(address _token, uint256 _amount) external onlyOwner {
        // Ensure we're not recovering staked LP tokens
        for (uint256 i = 0; i < pools.length; i++) {
            require(address(pools[i].lpToken) != _token, "Cannot recover LP token");
        }

        IERC20(_token).safeTransfer(owner(), _amount);
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
