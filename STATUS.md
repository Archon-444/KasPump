# KasPump — Go-Live Status

**Last updated:** 2026-08-13  
**Reconciled against:** `master` at `daad3c2` (through PR #97)  
**Strategy:** Launch is **frozen**. See [STRATEGY.md](./STRATEGY.md). Mainnet is not the current goal.

This file is the **code/ops inventory** (what exists, what is still unsafe to ship). It is not permission to ship. Product direction lives in STRATEGY.md until the decision log there is filled.

Canonical tracker for “what is true in the repo.” Historical write-ups live in `docs/archive/` and must not be treated as current. GitHub issues **#74** and **#83** are stale (their items shipped in PRs #75–#97) and should be closed.

---

## Go-Live Gate Checklist

All remaining open items must be done before a public mainnet launch. Items marked ✅ shipped in code (June–July 2026).

### Security (Hard Gates)

- [ ] External audit complete — Critical/High resolved, report linked in-app *(firm engaged; no `audit-package/` in repo yet)*
- [x] NatSpec on public/external fns in `BondingCurveAMM.sol` and `TokenFactory.sol`
- [ ] Mainnet contracts owned by Gnosis Safe — EOA `onlyOwner` access revoked and verified on-chain
- [ ] Fee recipient is Safe-controlled (not EOA)
- [ ] Testnet Safe rehearsal completed (pause, unpause, `updateFeeRecipient` through Safe)
- [ ] Fuzz / invariant tests passing (`test/invariant/` — **not written**; no Foundry config)
- [ ] All contracts verified on BSCScan after the **current** bytecode is deployed
- [x] CSP `connect-src` tightened to an explicit allowlist (`vercel.json`)
- [x] API rate limiting on Vercel KV (comments, push, token RPC-fanout routes)
- [x] Mandatory EIP-191 signatures on comment POSTs; author derived from signature
- [x] IPFS upload validates file type (jpeg/png/gif/webp) + size (≤5MB)
- [x] AMM ownership: `AMMDeployer` transfers each AMM to the platform admin (PR #75 / #84)
- [x] `emergencyWithdraw` reserves `curveNativeBalance` + `totalGraduationFunds` + accrued fees (PR #75)
- [x] `feeRecipient` uses pull-payment (`withdrawPlatformFees`) so a reverting recipient cannot brick trades (PR #75)
- [x] Graduation dust-griefing: no hard-abort on pre-seeded pairs; `retryGraduationLiquidity()` (PR #82)
- [x] TokenFactory under EIP-170: AMM creation bytecode extracted to `AMMDeployer` (PR #84). Measured deployed sizes (2026-08-13): TokenFactory 12.2 KB, AMMDeployer 20.8 KB, BondingCurveAMM 19.2 KB, DeterministicDeployer 15.0 KB

### TypeScript & CI

- [ ] `tsc` blocking in CI — pre-existing errors must be fixed first (see TECHNICAL_DEBT.md #16)
- [ ] `next.config.js` `ignoreBuildErrors: false` — gated on the same
- [x] Vitest + Hardhat + Playwright E2E run as blocking CI steps (`.github/workflows/ci.yml`; PRs only, not `push` to master)
- [ ] Slither static analysis run, all findings triaged
- [x] `npm audit` (June 2026): Next.js 16.2.9; 0 critical remaining at that pass

### Scalability

- [x] Moralis holder count with Vercel KV cache (60s TTL, in-memory fallback for dev)
- [ ] Subgraph deployed (Goldsky or Alchemy — The Graph hosted service is gone) — `NEXT_PUBLIC_SUBGRAPH_URL_*` unset
- [x] 24h metrics: `TokenService.get24hMetrics` scans recent Trade events (RPC); subgraph would be the durable source
- [ ] WebSocket server deployed (Render or equivalent), origin pinned in CSP (`connect-src` has no production `wss://` host today)
- [x] WebSocket server `RedisService.ts`: TLS auto-enabled for `rediss://` (Upstash)
- [x] Client-side WS reconnection with backoff + polling fallback
- [x] RPC failover: `fallback([primary, secondary])` in `src/config/wagmi.ts`
- [ ] RPC failover in `server/src/services/BlockchainListener.ts` (still a single URL per chain)
- [x] Multicall batch reads on the token list

### UI/UX

July 2026 closed the high-severity UX correctness items from issue #74 (error surfacing, fabricated metrics, wrong-network banner, mobile confirm, reduced-motion, onboarding, quote honesty). Formal `/impeccable` surface audits and Lighthouse ≥90 are still open.

- [x] Wrong-network guard / switch banner
- [x] `prefers-reduced-motion` honoured app-wide (`AppProviders.tsx`)
- [x] Mobile trade confirmation + dialog/toast accessibility
- [x] First-visit trader onboarding + PWA install banner mounted
- [x] Parsed contract errors reach the user; no `Math.random()` market-cap/holders on trading/analytics
- [ ] Contrast ≥4.5:1 body, ≥3:1 large on all surfaces (not audited)
- [ ] Lighthouse mobile ≥90 on trading + home (not measured)
- [ ] Competitive gap list: remaining gaps are growth features (see ROADMAP.md), not launch blockers

### Launch Readiness

- [x] Playwright E2E: wallet-connect, launch-token, trade, graduation specs in CI
- [ ] Sentry DSN confirmed active — events reaching dashboard
- [ ] Uptime monitoring configured (frontend + WS server)
- [ ] Monitoring guide updated from "Planning Phase" → "Active"
- [ ] Legal pages reviewed by counsel (`/terms`, `/privacy`, `/disclaimer` exist as templates)
- [ ] **Current** contracts redeployed to BSC Testnet and a full create → trade → graduate smoke pass recorded
- [ ] Emergency runbook rehearsed through the Safe (see `EMERGENCY_RUNBOOK.md`)

### Rebrand (PARKED — not blocking)

- [x] `src/config/brand.ts` created (consumed by layout + wagmi)
- [ ] Name + domain + X handle confirmed and locked *(not decided)*

---

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| P0 — Reconcile & Baseline | ✅ Done for code; docs refreshed 2026-08-13 | CI gates unit / Hardhat / E2E / build |
| P1 — Security | 🔄 In Progress | Contract code gates from #74 shipped; Safe + audit + fuzz remaining |
| P2 — Scalability | 🔄 In Progress | KV, WS backoff, RPC failover, multicall shipped; subgraph + WS host remaining |
| P3 — UI/UX | 🔄 In Progress | High-severity correctness shipped July 2026; a11y contrast / Lighthouse still open |
| P4 — Launch Readiness | 🔄 In Progress | E2E in CI; monitoring, legal, **fresh testnet deploy** remaining |
| P5 — Rebrand | ⏸ Parked | Brand strings centralized; name not locked |

---

## Contract Deployment Status

Current **source** (must be what you deploy next) includes `TokenFactory`, `AMMDeployer`, `BondingCurveAMM`, `DexRouterRegistry`, `DeterministicDeployer`, `CreatorVesting`.

| Contract | BSC Testnet (`deployments.json`) | Matches master? | BSC Mainnet |
|----------|----------------------------------|-----------------|-------------|
| TokenFactory | `0x7Af627Bf902549543701C58366d424eE59A4ee08` (2025-10-31) | ❌ No — pre-V2 / pre-`AMMDeployer` | ❌ Not deployed |
| DexRouterRegistry | ✅ Deployed with that factory | ❌ Same vintage | ❌ Not deployed |
| DeterministicDeployer | `0x943D9f1D05586435282dc2F978612d6526138c79` | ❌ Same vintage | ❌ Not deployed |
| AMMDeployer | ❌ Not in `deployments.json` | — | ❌ Not deployed |
| Ownership → Safe | ❌ Still EOA `0xEFec…D667` | — | — |
| BscScan verified | ❓ Unknown for the 2025 bytecode | — | — |

**Do not smoke-test master against the October 2025 factory.** Redeploy with `scripts/deploy.ts` or `scripts/deploy-deterministic.ts` (both now deploy and wire `AMMDeployer`), then update `deployments.json` and `NEXT_PUBLIC_*`.

`DexConfig.sol` has V2 routers for BSC (56/97), Arbitrum (42161), Base (8453). **No Kasplex (202555) or Igra (38833) row.** Native KRC-20 cannot use this AMM. Kas L2s are **strategy-closed** (wKAS ethos) — do not add those rows “just in case.” See [STRATEGY.md](./STRATEGY.md).

---

## What is next

**Not a mainnet sequence.** Direction: [STRATEGY.md](./STRATEGY.md).

Until that decision log is filled: no public launch, no feature work except what a chosen wedge’s proof requires. The list below is **inventory of leftover engineering**, not a schedule.

Kas is closed as home for this product. Remaining chain question is Base vs Arc vs mothball — not a Kasplex deploy.

*For security findings, see `SECURITY_AUDIT.md`. For remaining engineering debt, see `TECHNICAL_DEBT.md`.*
