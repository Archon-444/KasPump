# KasPump Remediation Strategy

This plan outlines the staged remediation work required to close the April 2024 audit findings without destabilising the existing prototype. Each workstream lists the rationale, downstream impact, safeguards, and concrete tasks.

## 1. Smart Contracts Hardening

### Objectives
* Restore a compilable contract suite that supports both the legacy and enhanced token factories.
* Ensure the bonding-curve AMM can safely custody inventory and settle trades without reentrancy risk.

### Strategy & Safeguards
1. **Factory Alignment**
   - Rename and refactor the enhanced factory to extend the base factory rather than shadowing it. This preserves backwards compatibility for any tooling that still targets `TokenFactory` while unlocking premium-tier logic.
   - Mark extensibility points (`createToken`, deployment helpers) as `virtual` in the base factory so downstream upgrades can override behaviour in a controlled manner.
   - Add unit tests that deploy both factories in the same compilation unit to prevent future namespace collisions.
2. **AMM Inventory & Guards**
   - Transfer the freshly minted token supply from the factory into the AMM on creation, and assert that the AMM has sufficient balance before selling tokens to traders.
   - Introduce a minimal non-reentrancy guard and ensure all state mutations happen before external value transfers.
   - Emit explicit error reasons when inventory transfers fail so deployment scripts fail fast.

### Tasks
* [x] Restructure `EnhancedTokenFactory.sol` into `contract EnhancedTokenFactory is TokenFactory` and adjust constructor/creation flow.
* [x] Mark base factory hooks as `virtual` and fund the AMM with inventory during deployment.
* [x] Add reentrancy protection and balance assertions to the AMM.
* [ ] Create Hardhat tests that deploy both factories and exercise token creation/swap happy paths.
* [ ] Wire deployment scripts to pick the appropriate factory by tier and validate revert reasons in CI.

## 2. Data Integrity & APIs

### Objectives
* Eliminate fabricated analytics and token metadata responses that could mislead operators or partners.
* Establish a consistent failure mode while backend indexing is under development.

### Strategy & Safeguards
1. **Fail Loudly Until Real Data Exists**
   - Replace randomised analytics with deterministic responses that either proxy real indexer data or surface an actionable 503 error.
   - Gate indexer usage behind environment flags so staging can still run with mocked fixtures when explicitly enabled.
2. **Frontend Cohesion**
   - The home page should consume the same API responses; if the backend is unavailable, show an empty-state message instead of seeded sample tokens.
   - Fix missing utility imports (`cn`) to keep builds green and prevent runtime crashes.
3. **Analytics Delivery**
   - Persist buffered analytics events via `navigator.sendBeacon` (or fetch) before unload to avoid losing data during navigation.
   - Add retries with backoff, but cap the in-memory queue to protect memory usage.

### Tasks
* [x] Replace analytics/token API responses with deterministic indexer-aware handlers and explicit `503` fallbacks.
* [x] Update the home page to rely solely on API data and surface empty states.
* [x] Import the `cn` helper to restore type safety.
* [x] Flush buffered analytics events via `sendBeacon`/`fetch` with capped queue size.
* [ ] Implement the actual indexer client once backend endpoints are finalised.
* [ ] Extend API routes with caching and pagination once real data flows.

## 3. Operational Readiness

### Objectives
* Keep operators informed about current capabilities and blockers.
* Sequence remaining work so that contract, backend, and frontend changes can be released coherently.

### Strategy & Safeguards
1. **Documentation Discipline**
   - Update production status docs as remediation milestones land, highlighting any feature gates that remain disabled.
   - Document rollout prerequisites (contract redeploys, environment variables, migration scripts) to avoid inconsistent staging environments.
2. **Testing & Monitoring**
   - Integrate linting/type-checking into CI immediately after contract fixes merge.
   - Schedule end-to-end smoke tests once live data is plumbed through the APIs.

### Tasks
* [ ] Add CI jobs for lint (`npm run lint`), type-check (`npm run type-check`), and Hardhat test execution.
* [ ] Draft runbooks for redeploying factories and migrating AMM liquidity once contracts are upgraded.

## Timeline Considerations

1. **Week 1** – Land contract refactors, re-run audits locally, and publish updated ABIs.
2. **Week 2** – Stand up deterministic API layer backed by the indexer stub, update frontend to new responses, and ship analytics delivery improvements.
3. **Week 3** – Implement CI coverage, exercise integration tests, and prepare staging rollout with documented procedures.

This phased plan ensures that the riskiest contract defects are addressed first, preventing downstream frontend/API work from resting on unstable infrastructure while keeping stakeholders informed at every milestone.
