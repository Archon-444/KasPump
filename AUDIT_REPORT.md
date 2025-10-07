# KasPump Code Audit – April 2024

## Scope & Approach
- Reviewed Solidity contracts in `contracts/` for compilation readiness, token economics, and security invariants.
- Inspected React/Next.js code in `src/` (hooks, APIs, integrations, UI) for data integrity, error handling, and production viability.
- Validated documentation claims against actual implementation status.

## Executive Summary
KasPump is an early prototype. Multiple critical gaps still prevent safe deployment even after the latest remediation pass:
- The Solidity suite now compiles, but it lacks automated regression coverage and a documented migration strategy for shipping the upgraded factories/AMM.
- The bonding-curve AMM seeds inventory and has a non-reentrancy guard, yet graduation/liquidity paths remain unaudited.
- Frontend and API layers no longer fabricate data; however, they depend on an external indexer service that is not yet provisioned in any environment.
Address these blockers before expanding feature scope or onboarding users.

### Remediation Progress (May 2024)
- Enhanced factory refactored to extend the base `TokenFactory`, enabling both contracts to compile side-by-side.
- Bonding curve AMM now seeds inventory on deployment and is protected by a non-reentrancy guard plus balance checks.
- Frontend home page and API routes were rewired to rely on a shared indexer service, returning 503 errors until live data is configured rather than fabricating metrics.
- Client analytics buffering now caps queue sizes and flushes via `navigator.sendBeacon` during page unload to reduce data loss.

## Findings

### Critical Severity

**C-01 — Enhanced factory conflicts with base factory and BondingCurveAMM**
- `contracts/EnhancedTokenFactory.sol` redeclares `contract TokenFactory`, colliding with `contracts/TokenFactory.sol` when compiled together.【F:contracts/EnhancedTokenFactory.sol†L11-L189】【F:contracts/TokenFactory.sol†L7-L179】
- The enhanced factory attempts to instantiate `BondingCurveAMM` with seven arguments, but the AMM constructor accepts six, so deployment reverts.【F:contracts/EnhancedTokenFactory.sol†L148-L155】【F:contracts/BondingCurveAMM.sol†L55-L71】
*Impact:* Hardhat/Foundry builds fail; deploy scripts cannot target both factories. Any deployment attempt would revert and halt token launches.
*Remediation:* Rename the enhanced contract, align constructor signatures (or extend the AMM), and add automated compilation/tests.
*Status (May 2024):* Resolved—`EnhancedTokenFactory` now extends the base factory and no longer shadows it, allowing both factories to compile side-by-side.【F:contracts/EnhancedTokenFactory.sol†L1-L146】

**C-02 — BondingCurveAMM cannot dispense tokens and lacks reentrancy guards**
- Factory-minted KRC20 supply is retained by the factory (`balanceOf[_factory] = _totalSupply`), while the AMM never receives inventory before calling `transfer` to buyers, so `buyTokens` always fails.【F:contracts/TokenFactory.sol†L78-L156】【F:contracts/TokenFactory.sol†L198-L234】【F:contracts/BondingCurveAMM.sol†L73-L115】
- `sellTokens` and `buyTokens` perform raw `call` transfers without reentrancy protection, enabling callbacks before state updates finish.【F:contracts/BondingCurveAMM.sol†L120-L157】【F:contracts/BondingCurveAMM.sol†L140-L147】
*Impact:* Users cannot purchase tokens and exposed reentrancy paths threaten pool funds if inventory logic is fixed later.
*Remediation:* Transfer or mint inventory into the AMM during setup, add reentrancy guards, settle state before external calls, and cover flows with tests.
*Status (May 2024):* Resolved—`TokenFactory` now transfers initial supply into the AMM and `BondingCurveAMM` includes balance checks plus a non-reentrancy guard around trades.【F:contracts/TokenFactory.sol†L44-L112】【F:contracts/BondingCurveAMM.sol†L17-L157】

**C-03 — API and analytics endpoints fabricate data**
- Analytics route returns random growth values and mock AMM addresses instead of querying chain state.【F:src/app/api/analytics/route.ts†L1-L214】
- Token API stubs creator, holder counts, and AMM addresses with placeholders, defeating downstream integrations.【F:src/app/api/tokens/route.ts†L1-L158】【F:src/app/api/tokens/route.ts†L159-L218】
*Impact:* Any consumer (frontend, partners, analytics) receives misleading metrics, blocking accurate dashboards or business reporting.
*Remediation:* Replace placeholders with deterministic on-chain reads or an indexed data service; remove `Math.random` usage and mock AMM helpers.
*Status (May 2024):* Addressed in part—API routes now proxy an external indexer and respond with `503` until configured, eliminating fabricated payloads.【F:src/app/api/analytics/route.ts†L1-L64】【F:src/app/api/tokens/route.ts†L1-L60】

### High Severity

**H-01 — Frontend home page still ships with mock token listings**
`src/app/page.tsx` seeds the UI with hard-coded sample tokens despite calling `getAllTokens`, so users never see live markets.【F:src/app/page.tsx†L45-L101】
*Impact:* Production deployment would mislead traders and mask empty states or contract regressions.
*Remediation:* Fetch token metadata via the tokens API (after it is fixed) or directly from on-chain sources.
*Status (May 2024):* Resolved—the home page now queries the `/api/tokens` endpoint, surfaces empty/indexer error states, and removes hard-coded listings.【F:src/app/page.tsx†L17-L352】

**H-02 — Partnership integration performs network calls without safeguards**  
`src/integrations/PartnershipIntegration.ts` issues fetches to partner endpoints and assumes environment variables without retries, authentication, or timeouts, while logging revenue distribution without executing transfers.【F:src/integrations/PartnershipIntegration.ts†L1-L309】  
*Impact:* Any runtime network failure throws unhandled errors; revenue sharing logic silently no-ops.  
*Remediation:* Add error handling, configurable timeouts, and concrete settlement flows once partner APIs are defined.

### Medium Severity

**M-01 — Missing import in HomePage causes runtime/type errors**
`cn` is used for conditional classes but never imported, so the page fails type-checking/bundling in strict mode.【F:src/app/page.tsx†L172-L199】
*Remediation:* Import `cn` from `src/utils` (or inline the logic) and run ESLint/TypeScript to catch similar issues.
*Status (May 2024):* Resolved—`cn` is now imported directly from the shared utilities module alongside the new indexer helpers.【F:src/app/page.tsx†L11-L27】

**M-02 — Analytics library buffers events in-memory only**
`src/lib/analytics.ts` stores analytics in a local array and silently retries failed uploads, risking data loss on navigation or refresh.【F:src/lib/analytics.ts†L1-L210】
*Remediation:* Persist events server-side (e.g., queue, database) and add delivery guarantees before marketing relies on the metrics.
*Status (May 2024):* Partially addressed—client buffering now caps queue size and flushes via `navigator.sendBeacon`, but a durable server-side sink is still required.【F:src/lib/analytics.ts†L1-L206】

## Additional Observations
- Wallet hook assumes `window.kasplex` is present and recurses every 500 ms without cleanup, which can race during SSR hydration.【F:src/hooks/useWallet.ts†L25-L75】
- `getTokenAMMAddress` scans the entire chain from block zero for every cache miss; add pagination or index-backed lookups to avoid DoS risks once volume grows.【F:src/hooks/useContracts.ts†L72-L170】
- Documentation previously claimed 88% completion; status has been corrected to reflect prototype maturity.【F:PRODUCTION_STATUS.md†L1-L41】

## Recommendations
1. Stabilize the Solidity suite with automated tests (foundry/hardhat) before touching the frontend again.
2. Replace mock data paths with deterministic queries and add integration tests that fail CI when placeholders reappear.
3. Harden wallet/trading UX with explicit error boundaries, toast notifications, and telemetry sinks once real data flows are in place.
4. Stand up CI (lint, type-check, unit tests) so regressions like missing imports are caught automatically.
