// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CreatorVesting — per-block linear drip for the post-graduation creator
 *         token allocation.
 *
 * Plan reference: §5c of /root/.claude/plans/alright-here-s-the-glowing-wind.md.
 *
 * Behavior
 * --------
 * - Total vesting amount is fixed at construction (the 20%-of-remainder token
 *   slice from graduation).
 * - Vesting accrues linearly **per block** between `startBlock` and `endBlock`
 *   so claims drip continuously. There is no cliff in the traditional sense
 *   beyond `startBlock = graduation block`, which is the cliff the plan calls
 *   for: nothing is claimable before graduation completes.
 * - `claim()` is creator-only; pulled, not pushed. Re-entrancy guarded.
 *
 * Cross-chain note
 * ----------------
 * `durationBlocks` is parameterized at construction so the deploying AMM can
 * pass a chain-appropriate value. Phase 1 (Base, 2-second blocks):
 *   180 days · 86400 s/day / 2 s/block = 7_776_000 blocks.
 * Phase 2/3 chains (BSC ~3s, Arbitrum variable) get their own values when
 * those chains are enabled in `wagmi.ts`.
 */
contract CreatorVesting is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public immutable totalAmount;
    uint256 public immutable startBlock;
    uint256 public immutable endBlock;

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
        uint256 _startBlock,
        uint256 _durationBlocks
    ) {
        if (_token == address(0) || _beneficiary == address(0)) revert ZeroAddress();
        if (_durationBlocks == 0) revert InvalidDuration();
        if (_totalAmount == 0) revert InvalidAmount();

        token = IERC20(_token);
        beneficiary = _beneficiary;
        totalAmount = _totalAmount;
        startBlock = _startBlock;
        endBlock = _startBlock + _durationBlocks;
    }

    /// Total amount vested so far. Linear in block number between
    /// startBlock and endBlock; zero before, totalAmount after.
    function vested() public view returns (uint256) {
        if (block.number <= startBlock) return 0;
        if (block.number >= endBlock) return totalAmount;
        // Safe: endBlock > startBlock by constructor invariant.
        return (totalAmount * (block.number - startBlock)) / (endBlock - startBlock);
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
