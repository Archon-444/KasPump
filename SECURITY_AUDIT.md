# KasPump Smart Contract Security Audit Report

**Original AI Self-Review Date:** 2025-01-15
**Reconciliation Date:** 2026-06-23
**Status:** Reconciled against current source code. All findings from the 2025-01-15 review are resolved in the current codebase. See §MAINNET BLOCKERS for what remains before production.

---

## Executive Summary (current as of 2026-06-23)

**Current Risk Level: LOW-MEDIUM**

All CRITICAL and HIGH severity issues identified in the original review have been addressed in the current code. The platform is live on BSC Testnet and has been running without incident. The remaining blockers are operational/process items, not code correctness issues.

**Mainnet deployment gates:**
- ⏳ External audit by professional firm — **IN PROGRESS** (firm engaged)
- ❌ Gnosis Safe ownership transfer — NOT DONE (single EOA still owns contracts)
- ❌ Fuzz / invariant tests — NOT WRITTEN (critical for a bonding-curve product)
- ❌ BSCScan contract verification — scripts exist, run status unknown

**Safe for testnet:** ✅ Yes — platform is live on BSC Testnet  
**Safe for mainnet:** ⛔ No — pending audit completion, Safe ownership, fuzz tests

---

## MAINNET BLOCKERS (open items)

### ❌ BLOCKER #1: Single-EOA Contract Ownership

**Current state:**  
`TokenFactory`, `DexRouterRegistry`, and `DeterministicDeployer` are all owned by the deployer EOA (`0xEFec…D667` on BSC Testnet, confirmed via `eth_getCode` returning `0x`). A single private key controls `pause`, `unpause`, `updateFeeRecipient`, and `updateDexRouterRegistry`. This is unacceptable on mainnet.

**Required fix:**  
- Deploy a Gnosis Safe (2-of-3 or 3-of-5, hardware-backed signers distinct from the deployer hot key)
- Update `scripts/deploy-deterministic.ts:137` to transfer ownership to `process.env.SAFE_OWNER_ADDRESS` instead of `deployer.address`
- Set `feeRecipient` to a Safe-controlled address, not an EOA
- Rehearse `pause`, `unpause`, `updateFeeRecipient` via the Safe on testnet — confirm EOA can no longer call `onlyOwner` afterward

**Estimated effort:** 2–4 hours (script + rehearsal)

---

### ❌ BLOCKER #2: External Professional Audit

**Current state:** Only an AI self-review exists (this document). Firm is now engaged.

**Required:**  
- Resolve all Critical/High findings from the professional audit
- Document accepted Mediums/Lows with rationale
- Re-audit deltas if the firm requires
- Add audit badge + report link to the UI once complete

**Supporting materials to prepare:**
- `audit-package/BRIEF.md` — threat model, design decisions, known issues (soft-launch refund, graduation clamp, fee decay)
- `audit-package/COVERAGE_REPORT.md` — from `npx hardhat coverage`
- `audit-package/GAS_SNAPSHOT.md` — from hardhat-gas-reporter
- `audit-package/SLITHER_OUTPUT.md` — from `slither contracts/`
- NatSpec completion on `BondingCurveAMM.sol`, `TokenFactory.sol`, `BondingCurveMath.sol`

---

### ❌ BLOCKER #3: Fuzz / Invariant Tests

**Current state:** No invariant or fuzz tests exist in `contracts/`. The Hardhat test suite (4 files, 1491 lines) covers functional paths well but does not stress mathematical invariants.

**Required (Foundry-based):**
- `test/invariant/BondingCurveMath.t.sol` — curve monotonicity, no-free-tokens, total-supply bound
- `test/invariant/BondingCurveAMM.t.sol` — graduation seam price continuity, refund accounting (soft-launch overpayment + graduation overpayment), fee-decay bounds within [0, MAX_FEE]

**Estimated effort:** 8–16 hours

---

## RESOLVED FINDINGS (historical record)

All findings below were present in the original 2025-01-15 AI review and are now resolved in the current codebase.

---

### ✅ CRITICAL #1: Reentrancy in buyTokens() — RESOLVED

**Original location:** `BondingCurveAMM.sol:76-115`  
**Fix:** `nonReentrant` modifier applied. CEI pattern enforced. Uses `SafeERC20` for token transfers.  
**Current code:** `BondingCurveAMM.sol` — `buyTokens()` has `nonReentrant + whenNotPaused`; state updates before external calls.

---

### ✅ CRITICAL #2: Reentrancy in sellTokens() — RESOLVED

**Original location:** `BondingCurveAMM.sol:120-158`  
**Fix:** `nonReentrant` modifier applied. CEI pattern enforced.  
**Current code:** `BondingCurveAMM.sol` — `sellTokens()` has `nonReentrant + whenNotPaused`.

**Full nonReentrant coverage:**
- `buyTokens()` — nonReentrant + whenNotPaused
- `sellTokens()` — nonReentrant + whenNotPaused
- `withdrawGraduationFunds()` — nonReentrant
- `withdrawCreatorFees()` — nonReentrant
- `withdrawReferrerFees()` — nonReentrant
- `withdrawLPTokens()` — nonReentrant
- `CreatorVesting.claim()` — nonReentrant
- `TokenFactory.createToken()` — nonReentrant + whenNotPaused

---

### ✅ HIGH #1: Constructor Parameter Mismatch — RESOLVED

**Original:** EnhancedTokenFactory passed 7 params; BondingCurveAMM only accepted 6.  
**Fix:** BondingCurveAMM constructor now accepts 7 params: `(token, tokenCreator, feeRecipient, membershipTier, dexRouter, sniperProtectionDuration, referrer)`. Parameter alignment is correct.

---

### ✅ HIGH #2: Missing Input Validation — RESOLVED

**Fix:** Comprehensive zero-address checks in all constructors and critical functions. Parameter validation throughout.

---

### ✅ HIGH #3: Unsafe External Calls — RESOLVED

**Fix:** Uses `Address.sendValue()` (OpenZeppelin) and `SafeERC20` patterns for all external value transfers. Fee recipient calls use safe patterns.

---

### ✅ HIGH #4: Integer Division Precision Loss — RESOLVED

**Fix:** `BondingCurveMath.sol` uses proper fixed-point arithmetic with a `PRECISION` constant throughout. Multiplication before division enforced.

---

### ✅ HIGH #5: Incomplete Graduation Logic — RESOLVED

**Fix:** Full DEX integration implemented. `_graduateToken()` now: adds liquidity to PancakeSwap V2, locks LP tokens for 6 months, distributes creator/platform funds. `LiquidityAdded` and `LPTokensLocked` events emitted. No funds can be permanently stuck.

---

### ✅ MEDIUM #1: CREATE2 Salt Predictability — RESOLVED

**Fix:** Salt uses `keccak256(abi.encodePacked(msg.sender, nonce, block.prevrandao, chainid))`.

---

### ✅ MEDIUM #2: No Pause Mechanism — RESOLVED

**Fix:** Both `TokenFactory` and `BondingCurveAMM` inherit OpenZeppelin `Pausable`. `pause()` and `unpause()` are `onlyOwner`. Note: currently owner is a single EOA — see BLOCKER #1.

---

### ✅ MEDIUM #3: Exponential Curve Not Implemented — RESOLVED

**Fix:** Standardized sigmoid curve implemented via `BondingCurveMath.sol` using a 31-point anchor table with linear interpolation between anchors. Curve type parameter accepted and used correctly.

---

### ✅ MEDIUM #4: No Access Control on distributePartnershipRevenue — RESOLVED

**Fix:** `distributePartnershipRevenue` removed in V2. The platform now uses a standardized `tokenToAMM` mapping with validation for all revenue routing.

---

### ✅ MEDIUM #5–8: Gas Optimization & Code Quality — RESOLVED

**Fix:** Constants used instead of magic numbers. Events added for all significant state changes. Structured custom errors adopted. Redundant SLOADs eliminated via local variable caching.

---

## LOW SEVERITY & INFORMATIONAL (still applicable)

### NatSpec Documentation
Several public/external functions in `BondingCurveAMM.sol`, `TokenFactory.sol`, and `BondingCurveMath.sol` are missing `@param`, `@return`, and `@notice` tags. Complete NatSpec is required as part of the professional audit package.

### No Upgrade Mechanism
Contracts are not upgradeable (no proxy pattern). This is a deliberate design choice — immutability is the trust story. Document it explicitly in the audit brief.

### Rate Limiting on Token Creation
No on-chain rate limiting for `createToken()`. Spam tokens are currently cheap. Consider a minimum creation fee or per-address cooldown if spam becomes a problem post-launch.

---

## TESTING STATUS

| Test Category | Status | Notes |
|---|---|---|
| Reentrancy scenarios | ✅ Covered | `BondingCurveAMM.test.ts` |
| Buy/sell with edge values | ✅ Covered | `BondingCurveAMM.test.ts` |
| Graduation threshold | ✅ Covered | `Graduation.test.ts` |
| Overpayment refunds | ✅ Covered | `Graduation.test.ts` |
| Sigmoid curve math | ✅ Covered | `BondingCurveSigmoid.test.ts` |
| DEX integration | ✅ Covered | `DEXIntegration.test.ts` |
| Fuzz / invariant tests | ❌ Missing | See BLOCKER #3 |
| Gas snapshot | ❌ Not recorded | Needed for audit package |

---

## DISCLAIMER

The original 2025-01-15 review was AI-generated and is not a substitute for a professional audit. A professional audit is now in progress. This document represents a code-reconciliation of that original review against the current source; it is not itself a security audit.

---

**Last reconciled:** 2026-06-23 against current `contracts/` source
