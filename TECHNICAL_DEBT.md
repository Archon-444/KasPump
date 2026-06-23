# KasPump Technical Debt & Open Work

**Original Date:** 2025-11-15  
**Reconciled:** 2026-06-23  
**Status:** Reconciled against current source code. Many items listed as TODO in the original doc are shipped.

---

## What's Shipped (was listed as TODO)

| Item | Status | How it's done |
|------|--------|--------------|
| Token holder count | ✅ Shipped | `src/services/moralis.service.ts` — Moralis API integration |
| Mobile navigation | ✅ Shipped | `src/components/mobile/MobileNavigation.tsx` — wired into `AppLayout.tsx` |
| Mobile token cards | ✅ Shipped | `src/components/mobile/MobileTokenCard.tsx` — used in `src/app/page.tsx` |
| Mobile trading UI | ✅ Shipped | `src/components/mobile/MobileTradingInterface.tsx` — used in `TokenTradingPage.tsx` |
| Performance optimizations | ✅ Shipped | All 7 categories in `MOBILE_PERFORMANCE_OPTIMIZATIONS.md` |
| Transaction history | ✅ Shipped | `src/hooks/useUserTrades.ts` |
| Token search | ✅ Shipped | `src/components/features/TokenSearchFilters.tsx` |
| Copy-to-clipboard | ✅ Shipped | Present across token/wallet address displays |
| Favorite tokens | ✅ Shipped | `src/hooks/useFavorites.ts` |
| Sentry monitoring | ✅ Shipped | All 3 layers (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) |
| Analytics dashboard | ✅ Shipped | `src/app/analytics/` page exists |
| Leaderboard | ✅ Shipped | `src/app/leaderboard/` with `KingOfTheHill.tsx`, `LeaderboardTable.tsx` |
| Price alerts | ✅ Shipped | `src/hooks/usePriceAlerts.ts`, `src/app/alerts/` |
| Portfolio tracking | ✅ Shipped | `src/app/portfolio/` with hooks and components |
| Push notifications | ✅ Shipped | `src/hooks/usePushNotifications.ts`, `src/app/api/push/subscribe/` |
| Wallet balance display | ✅ Shipped | `src/hooks/useMultichainWallet.ts` |
| Share token button | ✅ Shipped | Present in token detail components |
| IPFS upload | ✅ Shipped | `src/app/api/ipfs/upload/route.ts`, `src/hooks/useIPFSUpload.ts` |

---

## 🔴 Critical — Mainnet Blockers

### 1. Gnosis Safe Ownership Transfer

**Current state:** All contracts (`TokenFactory`, `DexRouterRegistry`, `DeterministicDeployer`) owned by deployer EOA. Single private key controls pause, fee config, and router registry.

**Required:**
- Deploy Gnosis Safe (2-of-3 or 3-of-5, hardware-backed keys distinct from deployer)
- Update `scripts/deploy-deterministic.ts:137` — change `deployer.address` to `process.env.SAFE_OWNER_ADDRESS`
- Create `scripts/transfer-ownership.ts` for post-deploy ownership transfer
- Set fee recipient to a Safe-controlled address
- Rehearse pause/unpause/updateFeeRecipient through Safe on testnet before mainnet

**Files:** `scripts/deploy-deterministic.ts`, `scripts/transfer-ownership.ts` (new), `.env.local.example`

---

### 2. External Professional Audit

**Current state:** Firm engaged. Supporting materials need to be prepared.

**Required:**
- `audit-package/BRIEF.md` — threat model, design decisions
- `audit-package/COVERAGE_REPORT.md` — from `npx hardhat coverage`
- `audit-package/GAS_SNAPSHOT.md` — from hardhat-gas-reporter
- `audit-package/SLITHER_OUTPUT.md` — from `slither contracts/`
- NatSpec completion on `BondingCurveAMM.sol`, `TokenFactory.sol`, `BondingCurveMath.sol`
- Resolve all Critical/High findings; document accepted Medium/Lows

---

### 3. Fuzz / Invariant Tests

**Current state:** No invariant or fuzz tests exist. The Hardhat suite covers functional paths well but doesn't stress mathematical invariants.

**Required (Foundry):**
- `test/invariant/BondingCurveMath.t.sol` — curve monotonicity, no-free-tokens
- `test/invariant/BondingCurveAMM.t.sol` — graduation seam, refund accounting, fee-decay bounds

**Estimated effort:** 8–16 hours

---

### 4. E2E Tests (Playwright) — None Exist

**Current state:** No `playwright.config.ts`, no `e2e/` directory, no browser-based test automation.

**Required:**
- `playwright.config.ts`
- `e2e/wallet-connect.spec.ts`
- `e2e/launch-token.spec.ts`
- `e2e/trade.spec.ts` — buy → sell flow
- `e2e/graduation.spec.ts` — graduation trigger + KotH

**Add to CI as blocking gate.**

---

## 🟡 High Priority — Production Hardening

### 5. Moralis Holder Count Cache → Vercel KV

**Current state:** `src/services/moralis.service.ts` uses an in-memory `Map<string, {count, expiresAt}>`. Dies on cold starts; not shared across Vercel serverless instances.

**Fix:** Replace with `@vercel/kv` calls. `KV_REST_API_URL` already in `.env.local.example`.

**Also fix:** Silent zero on API failure → explicit Sentry alert. Distinguish "0 holders" from "lookup failed".

---

### 6. 24-Hour Metrics — Still Returns 0

**Current state:** `transactions24h`, `priceChange24h`, `volumeChange24h` are hardcoded to 0 in `src/app/api/tokens/route.ts`.

**Fix:** Deploy subgraph (see #7) and wire `TokenHourlyMetric`/`TokenDailyMetric` entities.

---

### 7. Subgraph Deployment — Hosted Service Decommissioned

**Current state:** Subgraph code in `subgraph/` is complete. However:
- The Graph hosted service was shut down mid-2024
- `subgraph/package.json` deploy scripts still target `--product hosted-service`
- `src/lib/graphql/client.ts` has dead `api.thegraph.com/subgraphs/name/...` URLs as fallbacks
- `NEXT_PUBLIC_SUBGRAPH_URL_*` env vars are not defined anywhere

**Fix:**
- Re-target deploy scripts to Goldsky or Alchemy Subgraphs
- Fix `client.ts` — remove dead fallback URLs (fail loudly on missing endpoint)
- Add `NEXT_PUBLIC_SUBGRAPH_URL` to env examples
- Proxy GraphQL queries through an API route (don't expose API key as `NEXT_PUBLIC_`)
- Deploy testnet subgraph first to validate end-to-end

---

### 8. CSP — Too Broad

**Current state:** `vercel.json` `connect-src` contains `wss:` and `https:` catch-alls.

**Fix:** Replace with an explicit allowlist (BSC/Arbitrum/Base RPCs, Moralis, IPFS, WalletConnect relay, BSCScan, WS server origin).

---

### 9. API Rate Limiting — In-Memory Store

**Current state:** `src/lib/rate-limit.ts` has a working implementation with presets BUT uses an in-memory store that resets on cold starts and doesn't share across Vercel instances. The Upstash Redis implementation is already written but commented out.

**Fix:**
1. Enable the commented-out Upstash implementation (lines 252–299 in `rate-limit.ts`)
2. Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to `.env.local.example`
3. Wire `withRateLimit()` into: `tokens/comments/route.ts` (strict), `ipfs/upload/route.ts` (upload), `analytics/events/route.ts` (analytics), `push/subscribe/route.ts` (strict)

---

### 10. WebSocket Server — No Deploy Platform

**Current state:** `server/` is production-quality code with Redis support, but has no deployed instance and uses self-hosted Redis (localhost:6379).

**Fix:**
- Choose deploy platform (Render recommended)
- `server/src/services/RedisService.ts` — add Upstash TLS support (`rediss://` URLs)
- `src/lib/websocket.ts` — add reconnection with exponential backoff + heartbeat + polling degradation
- Pin WS server origin in CSP

---

## 🟢 Medium Priority

### 11. RPC Failover Pool

**Current state:** Single RPC per network with a public-node default. `BlockchainListener.ts` uses a fixed 5s reconnect delay.

**Fix:** `src/config/wagmi.ts` — use `fallback([http(primary), http(secondary)])` wagmi transport. `BlockchainListener.ts` — exponential backoff reconnect, rotate through RPC list.

---

### 12. Multicall / Batch Reads on Token List

**Current state:** Token list page makes sequential per-token RPC calls (N+1 pattern).

**Fix:** Use Multicall3 batch reads in `src/app/api/tokens/route.ts`.

---

### 13. Edge Caching on Read-Heavy API Routes

**Fix:** Add `Cache-Control: s-maxage=30, stale-while-revalidate=60` to GET handlers in `tokens/route.ts`, `tokens/trending/route.ts`, `leaderboard/route.ts`.

---

### 14. Monitoring — Sentry Configured But "Planning Phase"

**Current state:** All 3 Sentry layers are configured in code. `MONITORING_IMPLEMENTATION_GUIDE.md` is still in "Planning Phase" — no live alerting verified.

**Fix:** Confirm `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are set in Vercel environment. Verify events reach Sentry dashboard. Add uptime monitoring (BetterStack/UptimeRobot). Update guide from "Planning Phase" → "Active".

---

### 15. IPFS Upload Route — File Validation

**Current state:** `src/app/api/ipfs/upload/route.ts` exists but needs explicit file type (image/jpeg, png, gif, webp) and size (≤5MB) validation.

---

## 🔵 Future / Post-Launch

### 16. TypeScript 6+ Compatibility

**Current state:** The lockfile installs TypeScript 5.9.3. If upgraded to TypeScript 6+, two options in `tsconfig.json` will need updating:
- `moduleResolution: "node"` → `"bundler"` (requires package export map updates)
- `baseUrl: "."` → deprecated, handle via paths only

**Not urgent.** Addressing this is gated on ensuring all dependency packages have proper TypeScript 6-compatible type declarations.

---

### 17. Brand String Centralization

**Current state:** Product name, description, and social handles are hardcoded in 4+ locations: `src/app/layout.tsx` metadata, `src/config/wagmi.ts` connector metadata, `package.json`, `subgraph/package.json`.

**Fix:** Create `src/config/brand.ts` as a single source of truth. Consume in layout.tsx and wagmi.ts. Enables a one-file rebrand when the final name is confirmed.

---

### 18. Limit Orders / Stop Loss

UI stubs exist in trading components but are not connected to any on-chain logic. This is a complex feature requiring either off-chain order book or on-chain implementation.

**Estimated effort:** 40–80 hours

---

### 19. Multi-Language Support

**Estimated effort:** 20–30 initial setup + ongoing translations

---

## 📋 Implementation Order (pre-mainnet)

1. Gnosis Safe (#1) — hardest-to-do, not code-heavy
2. Audit support materials (#2) — in parallel with all other work
3. Subgraph deploy (#7) — unblocks holder count and 24h metrics
4. Moralis → Vercel KV (#5) + 24h metrics (#6) — once subgraph is live
5. Fuzz tests (#3) — before audit freeze
6. E2E tests (#4) — before mainnet dry-run
7. CSP (#8) + Rate limiting (#9) — security hardening
8. WS server deploy (#10) + RPC failover (#11) — scalability
9. Monitoring activation (#14) — ops readiness
10. Brand centralization (#17) — no-regret prep for eventual rename

---

**Maintained by:** Development Team  
**Reconciled against:** Live source as of 2026-06-23
