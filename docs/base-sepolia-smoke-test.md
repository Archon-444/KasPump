# Base Sepolia Smoke Test Checklist

## Pre-deploy
- [ ] Confirm required `.env` values are set.
- [ ] Confirm Base Sepolia RPC is reachable.
- [ ] Confirm deployer wallet has enough Base Sepolia ETH.
- [ ] Confirm wagmi config is Base-only for this phase.
- [ ] Confirm ABI files are regenerated and committed.
- [ ] Confirm subgraph schema/mapping supports `SIGMOID`.
- [ ] Confirm `CreatorVesting` uses timestamp-based vesting (`startTime`/`endTime`).

## Deploy
- [ ] Deploy `TokenFactory`.
- [ ] Deploy/configure supporting router/mocks as needed for testnet.
- [ ] Verify factory `feeRecipient` is correct.
- [ ] Verify deterministic AMM deployment path works.

## Launch flow
- [ ] Open `/launch`.
- [ ] Connect wallet.
- [ ] Create token using Name + Ticker only.
- [ ] Create token using Name + Ticker + optional image.
- [ ] Confirm token detail page loads after creation.

## Trading flow
- [ ] Buy a small amount.
- [ ] Confirm `FeeBadge` updates from AMM fee read.
- [ ] Confirm `GraduationHUD` progress moves.
- [ ] Sell a small amount.
- [ ] Confirm preview/slippage behavior still works.
- [ ] Confirm anti-sniper banner behavior is sensible.

## Graduation flow
- [ ] Drive token to 800M sold threshold on testnet.
- [ ] Confirm overpaying graduation buy gets excess native refund.
- [ ] Confirm LP is created, or fallback state is clear when DEX path is unavailable.
- [ ] Confirm reserve ratio is near final sigmoid spot price.
- [ ] Confirm `creatorVesting` contract address is set.
- [ ] Confirm `CreatorVestingPanel` renders.

## Vesting flow
- [ ] Confirm non-creator cannot claim.
- [ ] Advance time in local fork/test harness if supported.
- [ ] Confirm creator can claim once `claimable > 0`.

## Failure checks
- [ ] Missing AMM address state.
- [ ] Failed fee read state.
- [ ] Failed vesting read state.
- [ ] Token already graduated state.
- [ ] Polluted pair / LP skipped state (if harness supports).

## Exit criteria
- [ ] No new TS regressions above 577 baseline errors.
- [ ] Solidity compile remains clean (contracts unchanged in PR 6).
- [ ] Launch → trade → graduate → vesting read works end-to-end.
