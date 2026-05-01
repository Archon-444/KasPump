// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CreatorVesting — timestamp-based linear drip for the post-graduation creator
 *         token allocation.
 *
 * Plan reference: §5c of /root/.claude/plans/alright-here-s-the-glowing-wind.md.
 *
 * Behavior
 * --------
 * - Total vesting amount is fixed at construction (the 20%-of-remainder token
 *   slice from graduation).
 * - Vesting accrues linearly over time between `startTime` and `endTime`
 *   so claims drip continuously. There is no cliff in the traditional sense
 *   beyond `startTime = graduation timestamp`, which is the cliff the plan calls
 *   for: nothing is claimable before graduation completes.
 * - `claim()` is creator-only; pulled, not pushed. Re-entrancy guarded.
 *
 * Cross-chain note
 * ----------------
 * `durationSeconds` is parameterized at construction and chain-agnostic;
 * AMM currently sets it to 180 days.
 */
contract CreatorVesting is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public immutable totalAmount;
    uint256 public immutable startTime;
    uint256 public immutable endTime;

    uint256 public claimed;

    event VestingClaimed(address indexed beneficiary, uint256 amount, uint256 totalClaimed);

    error NotBeneficiary();
    error ZeroAddress();
    error InvalidDuration();
    error InvalidAmount();

    constructor(
        address _token,
        address _beneficiary,
        uint256 _totalAmount,
        uint256 _startTime,
        uint256 _durationSeconds
    ) {
        if (_token == address(0) || _beneficiary == address(0)) revert ZeroAddress();
        if (_durationSeconds == 0) revert InvalidDuration();
        if (_totalAmount == 0) revert InvalidAmount();

        token = IERC20(_token);
        beneficiary = _beneficiary;
        totalAmount = _totalAmount;
        startTime = _startTime;
        endTime = _startTime + _durationSeconds;
    }

    /// Total amount vested so far. Linear in time between
    /// startTime and endTime; zero before, totalAmount after.
    function vested() public view returns (uint256) {
        if (block.timestamp <= startTime) return 0;
        if (block.timestamp >= endTime) return totalAmount;
        // Safe: endTime > startTime by constructor invariant.
        return (totalAmount * (block.timestamp - startTime)) / (endTime - startTime);
    }

    /// Currently claimable (vested minus already-claimed).
    function claimable() public view returns (uint256) {
        uint256 v = vested();
        // claimed can only ever be <= vested; defensive subtraction.
        return v > claimed ? v - claimed : 0;
    }

    /// Pulls all currently-claimable tokens to the beneficiary.
    /// Callable only by the beneficiary; safe under re-entrancy.
    function claim() external nonReentrant {
        if (msg.sender != beneficiary) revert NotBeneficiary();
        uint256 amount = claimable();
        if (amount == 0) return;
        claimed += amount;
        token.safeTransfer(beneficiary, amount);
        emit VestingClaimed(beneficiary, amount, claimed);
    }
}
