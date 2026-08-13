# KasPump Smart Contract Security Audit Report

**Original AI Self-Review Date:** 2025-01-15  
**Last reconciled:** 2026-08-13 against `contracts/` on `master` (`daad3c2`)  
**Status:** Historical findings from the 2025-01-15 review are resolved. July 2026 PRs (#75, #82, #84) closed the remaining *code* mainnet blockers from GitHub issue #74. Process gates (external audit, Safe ownership, fuzz tests, fresh testnet deploy) remain. See `STATUS.md`.

This document is **not** a professional audit.

---

## Executive Summary (2026-08-13)

**Current code risk (self-review):** LOW-MEDIUM — known CRITICAL/HIGH implementation bugs from the 2025 review and the July 2026 tracker are fixed in source.

**On-chain risk:** HIGH until current bytecode is deployed. The live BSC Testnet factory (`0x7Af627…`, 2025-10-31) does not include V2, `AMMDeployer`, or the July security fixes.

**Mainnet deployment gates:**
- ⏳ External audit — **IN PROGRESS** (firm engaged; no `audit-package/` in repo)
- ❌ Gnosis Safe ownership transfer — NOT DONE (scripts exist, unused)
- ❌ Fuzz / invariant tests — NOT WRITTEN
- ❌ Current bytecode on testnet — NOT DEPLOYED
- ❌ BSCScan verification of current bytecode — N/A until redeploy

**Safe for testnet (current source, once redeployed):** ✅ Yes  
**Safe for mainnet:** ⛔ No — pending audit, Safe, fuzz tests, and a matching testnet smoke

---

## MAINNET BLOCKERS (still open — process, not unfixed code)

### ❌ BLOCKER #1: Single-EOA Contract Ownership

Testnet contracts are owned by the deployer EOA. `scripts/transfer-ownership.ts` and `SAFE_OWNER_ADDRESS` in `scripts/deploy-deterministic.ts` are the intended path. Rehearse on a **fresh** testnet deploy before mainnet.

### ❌ BLOCKER #2: External Professional Audit

Only this AI reconciliation exists in-repo. Prepare `audit-package/` (BRIEF, coverage, gas snapshot, Slither) against the bytecode you will freeze.

### ❌ BLOCKER #3: Fuzz / Invariant Tests

No Foundry suite. Hardhat covers functional paths (`BondingCurveAMM`, `BondingCurveSigmoid`, `Graduation`, `DEXIntegration`) but does not stress mathematical invariants.

### ❌ BLOCKER #4: Stale testnet deployment

Master is not what is on chain 97. Redeploy before any audit freeze or mainnet dry-run.

---

## CODE BLOCKERS FROM ISSUE #74 — RESOLVED (July 2026)

These were open in `SECURITY_AUDIT.md` on 2026-06-23 and in GitHub #74. They are **fixed in source**:

| Finding | Fix |
|---------|-----|
| AMM `onlyOwner` stranded on factory | `AMMDeployer.deployAMM` calls `transferOwnership(ammAdmin)` |
| `emergencyWithdraw` under-reserved trader funds | Reserves `curveNativeBalance + totalGraduationFunds +` accrued fees |
| `feeRecipient.sendValue` on every trade could brick markets | Platform fees accumulate; `withdrawPlatformFees` is the pull path |
| Graduation hard-abort on pre-seeded pair | Slippage-bounded `addLiquidityETH`; `retryGraduationLiquidity()` |
| TokenFactory > 24 KB (EIP-170) | AMM creation bytecode moved to `AMMDeployer` (factory ~12.2 KB) |

---

## RESOLVED FINDINGS (historical record)

All findings below were present in the original 2025-01-15 AI review and remain resolved.

### ✅ CRITICAL #1–2: Reentrancy in buy/sell — RESOLVED

`nonReentrant` + CEI on `buyTokens`, `sellTokens`, withdrawal entrypoints, `CreatorVesting.claim`, `TokenFactory.createToken`.

### ✅ HIGH #1: Constructor Parameter Mismatch — RESOLVED

`BondingCurveAMM` constructor: `(token, tokenCreator, feeRecipient, membershipTier, dexRouter, sniperProtectionDuration, referrer)`.

### ✅ HIGH #2–4: Validation, SafeERC20, precision — RESOLVED

Zero-address checks; `Address.sendValue` / `SafeERC20`; fixed-point math in `BondingCurveMath.sol`.

### ✅ HIGH #5: Incomplete Graduation Logic — RESOLVED

`_graduateToken` adds V2 DEX liquidity, locks LP, splits 70/20/10, pull-payments. Dust-griefing retry added 2026-07.

### ✅ MEDIUM #1–8 — RESOLVED

CREATE2 salt includes `block.prevrandao` + chainid; Pausable on factory and AMM; sigmoid-only V2 curve; partnership-revenue function removed; constants/events/custom errors.

---

## LOW SEVERITY & INFORMATIONAL

### NatSpec

Public/external functions on `BondingCurveAMM` and `TokenFactory` have `@notice` / `@param` / `@return` coverage sufficient for an audit package; keep it complete on any new surface.

### No Upgrade Mechanism

Contracts are not upgradeable. Deliberate — document in the audit brief.

### Token-creation spam

`CREATION_FEE = 0.005 ether`. No per-address cooldown. Acceptable anti-spam for launch; revisit if spam appears.

### Sniper window

Buys and sells in the sniper window pay a decaying surcharge (up to ~99%). Frontend must always pass `minOut` from a quote that includes the live surcharge (issue #74 medium — document, don't "fix" the fee).

---

## TESTING STATUS

| Test Category | Status | Notes |
|---|---|---|
| Reentrancy scenarios | ✅ Covered | `test/BondingCurveAMM.test.ts` |
| Buy/sell with edge values | ✅ Covered | same |
| Graduation threshold + refunds | ✅ Covered | `test/Graduation.test.ts` |
| Sigmoid curve math | ✅ Covered | `test/BondingCurveSigmoid.test.ts` |
| DEX integration | ✅ Covered | `test/DEXIntegration.test.ts` (revived vs current constructors) |
| Quarantined tests | ✅ Cleared | PR #85; no `it.skip` remaining |
| Fuzz / invariant tests | ❌ Missing | Blocker #3 |
| Gas snapshot | ❌ Not recorded | Needed for audit package |
| Slither | ❌ Not in repo | Needed for audit package |

---

## DISCLAIMER

The original 2025-01-15 review was AI-generated and is not a substitute for a professional audit. This document is a code-reconciliation against current source.

**Last reconciled:** 2026-08-13
