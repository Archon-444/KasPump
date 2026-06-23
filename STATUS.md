# KasPump — Go-Live Status

**Last updated:** 2026-06-23  
**Platform:** BSC Testnet live (`TokenFactory: 0x7Af627Bf902549543701C58366d424eE59A4ee08`, deployed 2025-10-31)  
**Target:** BSC Mainnet

---

## Go-Live Gate Checklist

All items must be ✅ before mainnet deployment.

### Security (Hard Gates)
- [ ] External audit complete — Critical/High resolved, report linked in-app *(firm engaged)*
- [ ] Mainnet contracts owned by Gnosis Safe — EOA `onlyOwner` access revoked and verified on-chain
- [ ] Fee recipient is Safe-controlled (not EOA)
- [ ] Testnet Safe rehearsal completed (pause, unpause, updateFeeRecipient through Safe)
- [ ] Fuzz / invariant tests passing (`test/invariant/BondingCurveMath.t.sol`, `BondingCurveAMM.t.sol`)
- [ ] All contracts verified on BSCScan (scripts: `batch-verify-all.ts`, `auto-verify-with-retry.ts`)
- [ ] CSP `connect-src` tightened to explicit allowlist (no `wss:` or `https:` catch-alls)
- [ ] API rate limiting on Upstash Redis (comments, upload, analytics/events, push/subscribe)
- [ ] IPFS upload validates file type + size

### TypeScript & CI
- [ ] `tsc` blocking in CI — pre-existing errors must be fixed first (see TECHNICAL_DEBT.md #16)
- [ ] `next.config.js` `ignoreBuildErrors: false` — gated on same
- [x] `SECURITY_AUDIT.md` reconciled to current code — **DONE** (2026-06-23)
- [x] `TECHNICAL_DEBT.md` reconciled to current code — **DONE** (2026-06-23)
- [ ] Hardhat test suite confirmed green on clean checkout
- [ ] Vitest unit suite confirmed green on clean checkout
- [ ] Slither static analysis run, all findings triaged
- [ ] `npm audit` clean (no high/critical)

### Scalability
- [ ] Moralis holder count cache on Vercel KV (not in-memory Map)
- [ ] Subgraph deployed (Goldsky or Alchemy) — endpoint set in `NEXT_PUBLIC_SUBGRAPH_URL`
- [ ] 24h metrics populated from subgraph (not returning 0)
- [ ] WebSocket server deployed (Render or equivalent), origin pinned in CSP
- [ ] WebSocket server using Upstash Redis (not self-hosted)
- [ ] Client-side WS reconnection with exponential backoff confirmed
- [ ] RPC failover pool in `wagmi.ts` and `BlockchainListener.ts`
- [ ] Multicall batch reads on token list

### UI/UX
- [ ] Trading page: `/impeccable` audit complete, all findings closed
- [ ] Home / discovery: `/impeccable` audit complete
- [ ] Launch flow: `/impeccable` audit complete
- [ ] Portfolio: `/impeccable` audit complete
- [ ] Leaderboard: `/impeccable` audit complete
- [ ] Contrast ≥4.5:1 body, ≥3:1 large on all surfaces
- [ ] `prefers-reduced-motion` fallbacks on all animations
- [ ] Mobile flows verified (MobileNavigation → MobileTradingInterface → MobileTokenCard)
- [ ] Competitive gap list documented and top gaps closed
- [ ] Lighthouse mobile ≥90 on trading + home pages

### Launch Readiness
- [ ] Playwright E2E suite passing in CI (connect → launch → buy → sell → graduate)
- [ ] Sentry DSN confirmed active — events reaching dashboard
- [ ] Uptime monitoring configured (frontend + WS server)
- [ ] Monitoring implementation guide updated from "Planning Phase" → "Active"
- [ ] Legal pages reviewed by counsel (terms, privacy, disclaimer)
- [ ] Mainnet deploy dry-run completed on testnet — zero surprises documented
- [ ] Emergency runbook updated and rehearsed

### Rebrand (PARKED — not blocking)
- [ ] `src/config/brand.ts` created (centralized brand strings — no-regret prep)
- [ ] Name + domain + X handle confirmed and locked *(not decided)*

---

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| P0 — Reconcile & Baseline | 🔄 In Progress | Docs updated; CI gated; test runs pending |
| P1 — Security | 🔴 Not started | Audit engaged; Safe, fuzz tests, CSP todo |
| P2 — Scalability | 🔴 Not started | Subgraph, KV cache, WS deploy todo |
| P3 — UI/UX | 🔴 Not started | Per-surface impeccable audits todo |
| P4 — Launch Readiness | 🔴 Not started | E2E, monitoring, dry-run todo |
| P5 — Rebrand | ⏸ Parked | Brand strings to centralize; name not locked |

---

## Contract Deployment Status

| Contract | BSC Testnet | BSC Mainnet |
|----------|-------------|-------------|
| TokenFactory | ✅ `0x7Af627Bf902549543701C58366d424eE59A4ee08` | ❌ Not deployed |
| DexRouterRegistry | ✅ Deployed | ❌ Not deployed |
| DeterministicDeployer | ✅ Deployed | ❌ Not deployed |
| Ownership → Safe | ❌ Not transferred (EOA) | — |
| BSCScan verified | ❓ Unknown | — |

---

*For security findings, see `SECURITY_AUDIT.md`. For open work items, see `TECHNICAL_DEBT.md`.*
