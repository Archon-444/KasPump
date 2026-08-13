# KasPump Technical Debt & Open Work

**Original Date:** 2025-11-15  
**Reconciled:** 2026-08-13 against `master` (`daad3c2`)  
**Status:** Current. Items marked shipped were verified in source, not just prior docs. Canonical go-live list: `STATUS.md`.

---

## What's Shipped

| Item | Status | How it's done |
|------|--------|---------------|
| Token holder count | ✅ Shipped | `src/services/moralis.service.ts` + Vercel KV cache |
| Mobile navigation / cards / trading | ✅ Shipped | `src/components/mobile/*` wired into layout and trading page |
| Transaction history | ✅ Shipped | `src/hooks/useUserTrades.ts` |
| Token search, favorites, share, copy | ✅ Shipped | respective hooks/components |
| Sentry scaffolding | ✅ Shipped | client/server/edge configs (DSN live-ness not confirmed) |
| Analytics dashboard | ✅ Mostly real | PR #81 de-faked `/analytics`; leftover placeholders called out in UI |
| Leaderboard / King of the Hill | ✅ Shipped | `src/app/leaderboard/` |
| Price alerts (in-tab) | ✅ Shipped | `src/hooks/usePriceAlerts.ts` |
| Portfolio tracking | ✅ Shipped | `src/app/portfolio/` |
| IPFS upload | ✅ Shipped | size/type validated server-side |
| Comments | ✅ KV + signatures | `@vercel/kv`; EIP-191 required; thread bounded |
| CSP allowlist | ✅ Shipped | `vercel.json` `connect-src` |
| Rate limiting | ✅ KV | `src/lib/rate-limit.ts` uses `kv.incr` |
| AMM admin surface | ✅ Shipped | `AMMDeployer` transfers ownership to platform admin |
| Graduation dust-griefing | ✅ Shipped | no pair hard-abort; `retryGraduationLiquidity()` |
| TokenFactory EIP-170 | ✅ Shipped | factory 12.2 KB deployed; AMM bytecode in `AMMDeployer` |
| Hardhat tests in CI | ✅ Shipped | quarantines removed (PR #85) |
| Playwright E2E in CI | ✅ Shipped | |
| Brand centralization | ✅ Shipped | `src/config/brand.ts` |
| `prefers-reduced-motion` | ✅ Shipped | `AppProviders.tsx` |
| PWA install banner + onboarding | ✅ Shipped | PR #95 |
| Uniswap V3 scaffolding | ✅ Removed | PR #91 — V2 `addLiquidityETH` only |

### Partial

| Item | Status | Remaining |
|------|--------|-----------|
| Push notifications | ⚠️ Partial | `api/push/subscribe` still does not persist subscriptions to a durable store; alerts fire in an open tab only |
| 24h metrics | ⚠️ RPC fallback | `TokenService.get24hMetrics` is real, but expensive and incomplete vs a subgraph |
| Social links | ⚠️ On-chain only | `TokenFactory` stores twitter/telegram/website; `QuickLaunchForm` does not collect them |
| Limit / stop-loss | ⚠️ UI stubs | No `LimitOrderBook.sol` / `StopLossOrderBook.sol` in `contracts/` |

---

## 🔴 Critical — Mainnet Blockers

### 1. Gnosis Safe Ownership Transfer

**Current state:** Testnet factory still owned by deployer EOA. Scripts exist (`scripts/transfer-ownership.ts`, `SAFE_OWNER_ADDRESS` in `scripts/deploy-deterministic.ts`) but have not been executed.

**Required:**
- Deploy a Gnosis Safe (2-of-3 or 3-of-5, hardware-backed keys distinct from deployer)
- Rehearse pause / unpause / `updateFeeRecipient` on **fresh** testnet contracts
- Set fee recipient to a Safe-controlled address
- Repeat on mainnet after deploy

### 2. External Professional Audit

**Current state:** Firm engaged per prior status. No `audit-package/` in the repo.

**Required:**
- `audit-package/BRIEF.md`, coverage, gas snapshot, Slither output
- Resolve Critical/High; document accepted Medium/Low
- Freeze bytecode after the next testnet deploy

### 3. Fuzz / Invariant Tests

**Current state:** No Foundry project (`foundry.toml` absent). Hardhat covers functional paths.

**Required:**
- `test/invariant/BondingCurveMath.t.sol` — monotonicity, no-free-tokens
- `test/invariant/BondingCurveAMM.t.sol` — graduation seam, refund accounting, fee-decay bounds

### 4. Redeploy Current Bytecode to Testnet

**Current state:** `deployments.json` chain 97 is the 2025-10-31 factory. Master has V2 sigmoid, `AMMDeployer`, and the July 2026 security fixes.

**Required:** Deploy with `scripts/deploy.ts` or `deploy-deterministic.ts`, verify, update env + `deployments.json`, then a full create/trade/graduate smoke.

### 5. E2E Tests — keep green

Playwright specs exist and gate CI. They use mocked wallet state; they do not replace the on-chain smoke in #4.

---

## 🟡 High Priority — Production Hardening

### 6. Subgraph Deployment

**Current state:** `subgraph/` is complete. Deploy scripts still target `--product hosted-service` (decommissioned). `NEXT_PUBLIC_SUBGRAPH_URL_*` are unset; `src/lib/graphql/client.ts` fails loudly if missing.

**Fix:** Deploy to Goldsky or Alchemy Subgraphs; proxy queries through an API route; point env at the new endpoint.

### 7. WebSocket Server Hosting

**Current state:** `server/` is production-quality; no deployed instance. CSP has no production WS origin.

**Fix:** Host on Render (or equivalent), set `NEXT_PUBLIC_WS_URL`, pin origin in `vercel.json` `connect-src`.

### 8. Monitoring Activation

Sentry configs exist. `MONITORING_IMPLEMENTATION_GUIDE.md` is still planning-phase. Confirm DSNs in Vercel and that events arrive. Add uptime checks for frontend + WS.

### 9. RPC Failover in the WS Listener

`src/config/wagmi.ts` uses fallback transports. `server/src/services/BlockchainListener.ts` still uses a single RPC URL per chain.

---

## 🟢 Medium Priority

### 10. Social links in QuickLaunchForm

On-chain fields exist; the V2 launch UI is name/ticker/image only. Add optional Twitter/Telegram/Website inputs if product wants Four.meme parity.

### 11. Persist push subscriptions

`api/push/subscribe` needs a durable store before push can work with the tab closed.

### 12. Edge caching

Some GET handlers already set `s-maxage=30, stale-while-revalidate=60`. Extend to remaining read-heavy routes if needed.

---

## 🔵 Future / Post-Launch

### 16. Pre-Existing TypeScript Errors

CI `type-check` is `continue-on-error`; `next.config.js` has `ignoreBuildErrors: true`. ~284 `error TS` lines as of July 2026 (hooks/tests). Don't add new errors; burn down with `/type-debt`. Make `tsc` blocking only at zero.

### 18. Limit Orders / Stop Loss

UI stubs in `src/components/trading/` are not connected to on-chain logic. Contracts for these do not exist. Do not document them as shipped.

### 19. Multi-Language Support

Not started.

### 20. Multi-chain mainnet (Arbitrum, Base)

Frontend chain configs exist. No mainnet (or current testnet) deploys on those chains.

---

## Implementation order (pre-mainnet)

1. Redeploy current contracts to BSC Testnet (#4)
2. Gnosis Safe rehearsal (#1)
3. Audit package + fuzz tests (#2, #3)
4. Subgraph + WS host (#6, #7)
5. Monitoring activation (#8)
6. Mainnet deploy of audited bytecode

---

**Maintained by:** Development Team  
**Reconciled against:** Live source as of 2026-08-13
