# KasPump — Go-Live Status

**Last updated:** 2026-06-23  
**Platform:** BSC Testnet live (`TokenFactory: 0x7Af627Bf902549543701C58366d424eE59A4ee08`, deployed 2025-10-31)  
**Target:** BSC Mainnet

---

## Go-Live Gate Checklist

All items must be ✅ before mainnet deployment.

### Security (Hard Gates)
- [ ] External audit complete — Critical/High resolved, report linked in-app *(firm engaged)*
- [x] NatSpec (`@notice`/`@param`/`@return`) added to all public/external fns in `BondingCurveAMM.sol` and `TokenFactory.sol` — **DONE** (2026-06-23)
- [ ] Mainnet contracts owned by Gnosis Safe — EOA `onlyOwner` access revoked and verified on-chain
- [ ] Fee recipient is Safe-controlled (not EOA)
- [ ] Testnet Safe rehearsal completed (pause, unpause, updateFeeRecipient through Safe)
- [ ] Fuzz / invariant tests passing (`test/invariant/BondingCurveMath.t.sol`, `BondingCurveAMM.t.sol`)
- [ ] All contracts verified on BSCScan (scripts: `batch-verify-all.ts`, `auto-verify-with-retry.ts`)
- [x] CSP `connect-src` tightened to explicit allowlist — **DONE** (2026-06-23, `vercel.json`)
- [x] API rate limiting on Vercel KV (comments POST/PATCH, push/subscribe POST) — **DONE** (2026-06-23)
- [x] Zod validation on all comment routes (CommentPostSchema + CommentReactionSchema replacing manual validation) — **DONE** (2026-06-23)
- [x] IPFS upload validates file type (jpeg/png/gif/webp) + size (≤5MB) — **DONE** (2026-06-23)

### TypeScript & CI
- [ ] `tsc` blocking in CI — pre-existing errors must be fixed first (see TECHNICAL_DEBT.md #16)
- [ ] `next.config.js` `ignoreBuildErrors: false` — gated on same
- [x] `SECURITY_AUDIT.md` reconciled to current code — **DONE** (2026-06-23)
- [x] `TECHNICAL_DEBT.md` reconciled to current code — **DONE** (2026-06-23)
- [x] Vitest unit suite: **462/462 passed** on clean run — **DONE** (2026-06-23)
- [ ] Hardhat test suite confirmed green on clean checkout — blocked by network egress restriction on binaries.soliditylang.org
- [ ] Slither static analysis run, all findings triaged
- [x] `npm audit` run — Next.js upgraded 16.0.1→16.2.9 (fixes critical CVEs); 0 critical remaining (vitest UI server vuln non-exploitable in CI); wagmi/viem/rainbowkit transitive `ws` highs: npm audit incorrectly suggests downgrade as fix — **DONE** (2026-06-23)

### Scalability
- [x] Moralis holder count cache on Vercel KV (60s TTL, in-memory fallback for dev) — **DONE** (2026-06-23)
- [ ] Subgraph deployed (Goldsky or Alchemy) — endpoint set in `NEXT_PUBLIC_SUBGRAPH_URL`
- [ ] 24h metrics populated from subgraph (not returning 0)
- [ ] WebSocket server deployed (Render or equivalent), origin pinned in CSP
- [x] WebSocket server `RedisService.ts`: TLS auto-enabled for `rediss://` URL (Upstash) — **DONE** (2026-06-23)
- [x] Client-side WS reconnection: exponential backoff (2s→4s→8s→16s→30s cap), degraded polling fallback — **DONE** (2026-06-23)
- [x] RPC failover: `fallback([primary, secondary])` transport per chain in `wagmi.ts` — **DONE** (2026-06-23)
- [ ] RPC failover in `BlockchainListener.ts`
- [x] Multicall batch reads on token list (`BlockchainService.multicall3` + `TokenService.getTokens` rewrite) — **DONE** (2026-06-23)

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
- [x] Playwright E2E suite created: wallet-connect, launch-token, trade, graduation specs + CI gate — **DONE** (2026-06-23)
- [x] E2E selectors fixed to match actual DOM (WalletSelectModal portal, QuickLaunchForm placeholders, sr-only file input) — **DONE** (2026-06-23)
- [x] E2E suite passing in CI — all 17 tests green against the CI-built production server (`npx next start`, `PLAYWRIGHT_BASE_URL=http://localhost:3000`) — **DONE** (2026-06-24). Root causes fixed: `AmbientBackground` swallowed the launch form (no `children` prop); `e.g. DOGE` placeholder locator needed `exact: true`; wagmi connectors slimmed to `injected` only to avoid SDK event-loop stalls in CI.
- [ ] Sentry DSN confirmed active — events reaching dashboard
- [ ] Uptime monitoring configured (frontend + WS server)
- [ ] Monitoring implementation guide updated from "Planning Phase" → "Active"
- [ ] Legal pages reviewed by counsel (terms, privacy, disclaimer)
- [ ] Mainnet deploy dry-run completed on testnet — zero surprises documented
- [ ] Emergency runbook updated and rehearsed

### Rebrand (PARKED — not blocking)
- [x] `src/config/brand.ts` created (consumed by layout.tsx + wagmi.ts) — **DONE** (2026-06-23)
- [ ] Name + domain + X handle confirmed and locked *(not decided)*

---

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| P0 — Reconcile & Baseline | 🔄 In Progress | Docs updated; CI gated; test runs pending |
| P1 — Security | 🔄 In Progress | CSP ✅, rate limiting ✅, IPFS ✅; Safe + fuzz tests + audit support remaining |
| P2 — Scalability | 🔄 In Progress | KV cache ✅, WS backoff ✅, RPC failover ✅; subgraph + WS server + multicall remaining |
| P3 — UI/UX | 🔴 Not started | Per-surface impeccable audits todo |
| P4 — Launch Readiness | 🔄 In Progress | Brand ✅, E2E suite ✅; monitoring, dry-run remaining |
| P5 — Rebrand | ⏸ Parked | Brand strings centralized; name not locked |

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
