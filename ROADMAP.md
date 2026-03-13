# KasPump Roadmap — BSC Mainnet Launch

## Completed (Phases 1–4)

- Token creation, bonding curve trading (buy/sell) — real contracts
- OHLCV charts from on-chain events, holder list, trade feed with API fallback
- Token comment threads with creator badges
- Trending algorithm + King of the Hill banner
- Server-side search, shareable `/token/[address]` URLs
- User profiles at `/profile/[address]`
- Limit order UI wired into trading page
- WebSocket rewired to Socket.IO, API routes fixed, DEX graduation fixed
- UX/UI overhaul (dark theme, glassmorphism, wallet redesign)
- All navigation links audited and fixed
- Build pipeline stable on Vercel

---

## Phase 5 — Anti-Sniper Protection (Sprint 1, Days 1–3)

Goal: Prevent bots from sniping new tokens at launch. This is table-stakes for BSC — Four.meme's X Mode is their biggest UX advantage.

### 5.1 Anti-sniper sliding fee in BondingCurveAMM

**Approach:** Time-based sliding fee that starts at 99% in the first block after token creation and decays to the normal tier fee over ~60 seconds (20 blocks on BSC at 3s/block).

**Contract changes:**
- Add `launchTimestamp` (set in constructor) and `SNIPER_PROTECTION_DURATION = 60` to `BondingCurveAMM.sol`
- Modify `buyTokens()`: if `block.timestamp < launchTimestamp + SNIPER_PROTECTION_DURATION`, calculate sliding fee as `baseFee + (9900 - baseFee) * (remaining / duration)` in basis points
- Excess fee goes to `feeRecipient` (platform revenue)
- Add `SniperFeeApplied(address buyer, uint256 fee, uint256 elapsed)` event

**Frontend changes:**
- `TradingInterface.tsx`: show countdown banner "Anti-sniper protection active — fee decreasing" with timer
- `TokenCard.tsx`: show "Protected" badge for tokens < 60s old

**Files:**
- `contracts/BondingCurveAMM.sol` — add sliding fee logic
- `src/components/features/TradingInterface.tsx` — anti-sniper banner
- `src/components/features/TokenCard.tsx` — "Protected" badge

### 5.2 Configurable sniper protection per token

**Plan:**
- Add `sniperProtectionDuration` parameter to `TokenFactory.createToken()` (default 60s, max 300s)
- Pass through to `BondingCurveAMM` constructor
- Add UI toggle in launch wizard Step 3 (Curve Parameters)

---

## Phase 6 — Social Links & Lower Creation Fee (Sprint 1, Day 3–4)

### 6.1 Social links on token creation

**Problem:** Four.meme shows Twitter/Telegram/website on every token. KasPump has no social link fields.

**Contract changes:**
- Add `string twitterUrl`, `string telegramUrl`, `string websiteUrl` to `TokenConfig` struct in `TokenFactory.sol`
- Accept these in `createToken()` parameters
- Emit in `TokenCreated` event

**Frontend changes:**
- Add Twitter/Telegram/Website fields to launch wizard Step 1 (Basics)
- Display social icons on `TokenCard.tsx` and `TokenTradingPage.tsx`
- Show links in `/token/[address]` detail page

**Files:**
- `contracts/TokenFactory.sol` — extend `TokenConfig` struct and `createToken`
- `src/app/launch/page.tsx` — add social link inputs
- `src/components/features/TokenCard.tsx` — social icons
- `src/components/features/TokenTradingPage.tsx` — social links section

### 6.2 Lower creation fee

**Plan:**
- Change `CREATION_FEE` from `0.025 ether` to `0.005 ether` in `TokenFactory.sol`
- Matches Four.meme's ~0.005 BNB creation cost
- Consider making it owner-configurable: `uint256 public creationFee = 0.005 ether` with `setCreationFee()` (only lower, never raise)

---

## Phase 7 — Production Infrastructure (Sprint 2, Days 5–7)

### 7.1 Comment storage migration

**Problem:** Comments use local filesystem (`.data/comments/`). Won't persist on Vercel serverless.

**Plan:**
- Option A: Vercel KV (Redis-compatible, simplest migration)
- Option B: Vercel Postgres (more structured, supports queries)
- Migrate `/api/tokens/comments` from `fs.readFile`/`fs.writeFile` to KV `get`/`set`
- Add `COMMENTS_KV_URL` env var

**Files:**
- `src/app/api/tokens/comments/route.ts` — replace file ops with KV
- `vercel.json` — add KV binding
- `.env.example` — add `COMMENTS_KV_URL`

### 7.2 Subgraph deployment (BSC Testnet first)

**Plan:**
- Deploy existing subgraph from `subgraph/` to The Graph hosted service
- Wire `TradingChart.tsx` and `HolderList.tsx` to query subgraph for faster results
- Fallback to direct RPC queries if subgraph is unreachable

**Files:**
- `subgraph/subgraph.yaml` — verify addresses and start blocks
- `src/lib/subgraph.ts` — new GraphQL client
- `src/hooks/useTokenCandles.ts` — subgraph-first, RPC fallback

### 7.3 WebSocket server hosting

**Plan:**
- Deploy `server/` to Railway, Render, or Fly.io
- Set `NEXT_PUBLIC_WS_URL` in Vercel env vars
- Test real-time trade feed end-to-end

---

## Phase 8 — BSC Mainnet Deployment (Sprint 2, Days 8–10)

### 8.1 Contract deployment checklist

1. Verify optimizer settings (200 runs, may need lower for DeterministicDeployer size)
2. Deploy `DexRouterRegistry` with PancakeSwap V2 router config for chain 56
3. Deploy `TokenFactory` with correct fee recipient and registry
4. Deploy `LimitOrderBook` and `StopLossOrderBook`
5. Verify all contracts on BSCScan
6. Update `.env` with mainnet addresses
7. Set `NEXT_PUBLIC_DEFAULT_CHAIN_ID=56`

### 8.2 Frontend mainnet config

- Update `.env.production` with mainnet contract addresses
- Set RPC URLs to reliable endpoints (Ankr, QuickNode, or BNB Chain official)
- Enable Sentry error monitoring
- Test full flow: create token → trade → graduate → verify on PancakeSwap

### 8.3 Security checklist

- [ ] All contracts verified on BSCScan
- [ ] Owner keys in multisig (Gnosis Safe)
- [ ] Emergency pause tested
- [ ] Fee recipient set correctly
- [ ] Rate limiting on API routes
- [ ] CORS configured for production domain

---

## Phase 9 — Post-Launch Growth Features (Sprint 3)

### 9.1 Multiple trading pairs

**Plan:**
- Support USDT and CAKE as base pairs alongside BNB
- Add `basePairToken` parameter to `createToken()`
- AMM accepts either native (BNB) or ERC20 (USDT/CAKE) as input
- Price oracle for non-BNB pairs (Chainlink or PancakeSwap TWAP)

### 9.2 Stop-loss UI

**Plan:**
- Wire existing `StopLossForm.tsx` into portfolio page
- "Set stop-loss" button on each held position
- Show active stop-loss indicators on token cards

### 9.3 Trade history page

**Plan:**
- New `/history` route
- Query all AMM Trade events for connected wallet
- Filter by token, type, date range
- CSV export

### 9.4 Bot-friendly API

**Plan:**
- Documented REST API for token data, candles, trades
- WebSocket API documentation for real-time events
- Rate limit tiers (free: 60 req/min, premium: 600 req/min)
- API key system for bot operators

### 9.5 Referral / rewards program

**Plan:**
- On-chain referral tracking in TokenFactory
- Referrer gets % of creation fee
- Leaderboard of top referrers

---

## Phase 10 — Multi-Chain Expansion (Sprint 4)

### 10.1 Arbitrum deployment

- Deploy all contracts to Arbitrum One via DeterministicDeployer
- Configure Uniswap V2 router in DexRouterRegistry
- Frontend chain switcher UI

### 10.2 Base deployment

- Deploy to Base via DeterministicDeployer
- Configure BaseSwap V2 router
- Same-address verification across all 3 chains

### 10.3 Cross-chain discovery

- Aggregate tokens from all chains in the homepage feed
- Chain badge on token cards
- Gas cost comparison for same token across chains

---

## Priority Matrix

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Anti-sniper protection | Critical (trust) | 2-3 days | P0 |
| Social links on tokens | High (parity) | 0.5 day | P0 |
| Lower creation fee | High (competitive) | 0.5 day | P0 |
| Comment storage → KV | High (production) | 1 day | P0 |
| BSC Mainnet deployment | Critical (launch) | 2 days | P0 |
| Subgraph deployment | Medium (performance) | 1 day | P1 |
| WebSocket server hosting | Medium (real-time) | 1 day | P1 |
| Multiple trading pairs | High (competitive) | 3 days | P1 |
| Stop-loss UI | Medium (differentiator) | 1 day | P2 |
| Trade history page | Medium (retention) | 1 day | P2 |
| Bot API documentation | Medium (volume) | 2 days | P2 |
| Referral program | Medium (growth) | 2 days | P2 |
| Arbitrum deployment | High (expansion) | 2 days | P3 |
| Base deployment | High (expansion) | 1 day | P3 |
