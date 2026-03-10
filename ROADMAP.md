# KasPump Roadmap — pump.fun Competitor

## Current State

**Working:** Token creation, bonding curve trading (buy/sell), portfolio (on-chain), creator dashboard, settings, mobile layout.

**Broken:** WebSocket real-time feed (protocol mismatch), API routes (`/api/tokens`, `/api/analytics` — missing static methods), DEX graduation routing (registry address passed instead of router), charts (mock data), holder list (empty), recent trades feed (no data source).

**Missing:** Token comment threads, user profiles, server-side search/trending, push notifications, limit order UI, trade history page.

---

## Phase 1 — Fix Broken Core (Week 1)

Goal: Make the existing features actually work end-to-end.

### 1.1 Fix WebSocket real-time feed

**Problem:** `src/hooks/useWebSocket.ts` uses `src/lib/websocket.ts` (raw WebSocket, port 3001). Server uses Socket.IO on port 4000. A matching Socket.IO client already exists at `src/lib/websocket/client.ts` but nothing imports it.

**Plan:**
- Rewrite `src/hooks/useWebSocket.ts` to import from `src/lib/websocket/client.ts` instead of `src/lib/websocket.ts`
- Map event names: `trade:new` → `trade`, `token:created` → `token_created`, etc.
- Update `useTradeEvents`, `usePriceUpdates`, `useTokenUpdates` to use Socket.IO event names
- Add `NEXT_PUBLIC_WS_URL` env var pointing to the Socket.IO server
- Verify `RecentTradesFeed.tsx` receives live trades
- Verify `TokenTradingPage.tsx` shows real-time updates

**Files:**
- `src/hooks/useWebSocket.ts` — rewrite
- `src/lib/websocket/client.ts` — verify, possibly adjust event shapes
- `src/components/features/RecentTradesFeed.tsx` — verify integration
- `.env.example` — add `NEXT_PUBLIC_WS_URL`

### 1.2 Fix API routes (BlockchainService)

**Problem:** `TokenService` and `AnalyticsService` call `BlockchainService.getTokenFactory(chainId)` and `BlockchainService.getAMM(...)` — these static methods don't exist.

**Plan:**
- Add static factory methods to `src/services/blockchain.ts`:
  - `static getTokenFactory(chainId: number): TokenFactory`
  - `static getAMM(ammAddress: string, chainId: number): BondingCurveAMM`
  - Use chain config from `src/config/chains.ts` for RPC URLs
- Fix `AnalyticsService` property access (`virtualTokenReserves` → `_currentSupply`)
- Test `/api/tokens` and `/api/analytics` return real data

**Files:**
- `src/services/blockchain.ts` — add static methods
- `src/services/analytics.service.ts` — fix property names
- `src/services/token.service.ts` — verify after fix
- `src/app/api/tokens/route.ts` — test
- `src/app/api/analytics/route.ts` — test

### 1.3 Fix DEX graduation routing

**Problem:** `TokenFactory.deployAMM()` passes `address(dexRouterRegistry)` as `_dexRouter` to `BondingCurveAMM`. The registry doesn't implement `addLiquidityETH()`, so graduation will revert.

**Plan:**
- In `TokenFactory.sol`, resolve the actual router address from `DexRouterRegistry.getRouterConfig(block.chainid).router` before passing to AMM
- Or pass the router address directly from the registry during AMM construction
- Add a test in `test/` to verify graduation actually completes
- Redeploy contracts to testnet after fix

**Files:**
- `contracts/TokenFactory.sol` — fix router address resolution
- `contracts/BondingCurveAMM.sol` — verify `_graduateToken()` works with correct router
- `test/Graduation.test.ts` — new test

---

## Phase 2 — Real Data on Token Pages (Week 2)

Goal: Token detail pages show real charts, real trades, real holders.

### 2.1 Real OHLCV price charts

**Problem:** `TradingChart.tsx` uses `generateMockData()`. The subgraph schema already has `TokenHourlyMetric` and `TokenDailyMetric` with OHLCV fields.

**Plan:**
- Option A (subgraph): Deploy subgraph to BSC Testnet, create a GraphQL client, query `TokenHourlyMetric`/`TokenDailyMetric`
- Option B (API): Create `/api/tokens/[address]/candles` that queries AMM `Trade` events, aggregates into OHLCV buckets server-side
- Option C (hybrid): Use subgraph for historical, WebSocket for live candle updates
- Replace `generateMockData()` in `TradingChart.tsx` with real data fetcher
- Support 1h, 4h, 1d, 1w timeframes

**Files:**
- `src/lib/subgraph.ts` — new GraphQL client
- `src/hooks/useTokenCandles.ts` — new hook for OHLCV data
- `src/components/features/TradingChart.tsx` — replace mock with real data
- `subgraph/` — deploy if not already deployed

### 2.2 Holder list from on-chain data

**Problem:** `HolderList.tsx` renders empty state with "requires event indexing" message.

**Plan:**
- Option A (subgraph): Query `TokenHolder` entities (already in schema) sorted by balance
- Option B (API): Create `/api/tokens/[address]/holders` that processes `Transfer` events
- Show top holders with % of supply, whale indicator, creator badge
- Add holder count trend ("+12 today") from daily metrics

**Files:**
- `src/hooks/useTokenHolders.ts` — new hook
- `src/components/features/HolderList.tsx` — replace stub with real data
- `src/app/api/tokens/[address]/holders/route.ts` — new API route (if not using subgraph)

### 2.3 Recent trades from API fallback

**Problem:** `RecentTradesFeed` only uses WebSocket — empty if server is down.

**Plan:**
- Add initial load from `/api/tokens/[address]/trades` or subgraph `Trade` entities
- WebSocket for live updates on top of initial data
- Show trade type (buy/sell), amount, price, time, wallet address (truncated), tx link

**Files:**
- `src/hooks/useRecentTrades.ts` — new hook combining API + WebSocket
- `src/components/features/RecentTradesFeed.tsx` — use new hook
- `src/app/api/tokens/[address]/trades/route.ts` — new API route

---

## Phase 3 — Social / Viral Loop (Week 3)

Goal: Every token page has a live comment thread — the core of pump.fun's engagement.

### 3.1 Token comment threads

**Architecture decision:** Lightweight off-chain storage (not on-chain — too expensive).

**Plan:**
- **Backend:** New API routes for comments
  - `POST /api/tokens/[address]/comments` — create comment (wallet signature for auth)
  - `GET /api/tokens/[address]/comments` — list comments (paginated, newest first)
  - `DELETE /api/tokens/[address]/comments/[id]` — delete own comment
- **Storage:** JSON file, SQLite, or external DB (Vercel KV/Postgres). Start with Vercel KV for simplicity.
- **Auth:** EIP-712 message signing — wallet signs "Post comment on [token] at [timestamp]", server verifies
- **Frontend:**
  - `TokenCommentThread` component on token detail page
  - Comment input with wallet-connected auth
  - Comment list with wallet avatar, time, reply button
  - Real-time new comments via WebSocket (`comment:new` event)
- **Moderation:** Creator can delete comments on their token

**Files:**
- `src/app/api/tokens/[address]/comments/route.ts` — new
- `src/components/features/TokenCommentThread.tsx` — new
- `src/hooks/useTokenComments.ts` — new
- `server/src/handlers/CommentHandlers.ts` — WebSocket broadcast for new comments

### 3.2 Reactions / emoji on comments

**Plan:**
- Light reactions (fire, rocket, skull, etc.) on each comment
- Stored alongside comment data
- Wallet-based dedup (one reaction per wallet per comment)

### 3.3 Token creator replies (highlighted)

**Plan:**
- Comments from the token creator get a "Creator" badge
- Pinned creator post at top of thread (optional)

---

## Phase 4 — Discovery & Trending (Week 4)

Goal: Homepage drives token discovery with real-time trending.

### 4.1 Server-side trending algorithm

**Plan:**
- New API: `GET /api/tokens/trending` with scoring:
  ```
  score = volumeVelocity(1h) * 0.4
        + holderGrowthRate(1h) * 0.3
        + tradeCount(1h) * 0.2
        + recencyBonus * 0.1
  ```
- "King of the Hill" — top-scored token gets a featured banner on homepage
- "About to graduate" — tokens >80% graduation progress get a special badge
- Refresh every 30s via React Query refetch

**Files:**
- `src/app/api/tokens/trending/route.ts` — new
- `src/hooks/useTrendingTokens.ts` — new
- `src/components/features/KingOfTheHill.tsx` — new featured banner
- `src/app/page.tsx` — add King of the Hill section above token grid

### 4.2 Server-side search and pagination

**Plan:**
- Update `/api/tokens` to support:
  - `?search=` — filter by name, symbol, or address (case-insensitive)
  - `?sort=volume|marketCap|newest|trending`
  - `?cursor=` — cursor-based pagination
  - `?limit=` — page size (default 20)
- Update `useTokenQuery` to use server-side params instead of fetching 100 client-side
- Add infinite scroll on homepage

**Files:**
- `src/app/api/tokens/route.ts` — rewrite with search/sort/pagination
- `src/hooks/useTokenQuery.ts` — update to pass filters to API
- `src/app/page.tsx` — add infinite scroll

### 4.3 "New" and "Graduating" filters

**Plan:**
- "Just launched" — tokens created in last 1h, sorted by recency
- "About to graduate" — tokens >75% graduation progress
- Tab/filter in the token grid section

---

## Phase 5 — User Profiles & History (Week 5)

Goal: Every wallet has a public profile with reputation.

### 5.1 Wallet profile page

**Plan:**
- New route: `/profile/[address]`
- Sections:
  - Wallet address + ENS/BNS name (if available)
  - Tokens created (with graduation rate)
  - Tokens held (with current value)
  - Trade history (recent buys/sells)
  - Stats: total volume traded, tokens graduated, join date (first tx)
- Data from subgraph or on-chain queries

**Files:**
- `src/app/profile/[address]/page.tsx` — new
- `src/hooks/useWalletProfile.ts` — new
- `src/components/features/ProfileCard.tsx` — new
- Link from token creator name, holder list, trade feed

### 5.2 Trade history page

**Plan:**
- `/history` page for connected wallet
- All trades across all tokens, sorted by time
- Filter by token, type (buy/sell), date range
- CSV export

**Files:**
- `src/app/history/page.tsx` — new
- `src/hooks/useTradeHistory.ts` — new

### 5.3 P&L tracking

**Plan:**
- Track cost basis per token (average buy price)
- Show unrealized P&L on portfolio page
- Store in localStorage or derive from trade history

---

## Phase 6 — Advanced Features (Week 6)

Goal: Differentiate from pump.fun with features they don't have.

### 6.1 Limit order UI

**Problem:** `LimitOrderBook.sol` exists but no frontend.

**Plan:**
- New `LimitOrderPanel` component on token detail page
- Set buy/sell price and amount
- Order book visualization (bid/ask depth)
- Open orders list with cancel button
- Use `LimitOrderBook__factory` from typechain-types

**Files:**
- `src/components/trading/LimitOrderPanel.tsx` — new
- `src/hooks/useLimitOrders.ts` — new
- `src/components/trading/OrderBook.tsx` — new (bid/ask visualization)

### 6.2 Stop-loss UI

**Plan:**
- "Set stop-loss" button on positions in portfolio
- Configure trigger price and amount
- Active stop-loss indicators on token cards

**Files:**
- `src/components/trading/StopLossPanel.tsx` — expand existing `StopLossForm.tsx`
- `src/hooks/useStopLossOrders.ts` — new

### 6.3 Multi-chain token comparison

**Plan:**
- Same token deployed on multiple chains — show gas cost comparison
- "Deploy to another chain" button for creators
- Cross-chain volume aggregation

---

## Infrastructure Needs

| Need | Solution | When |
|------|----------|------|
| Subgraph deployment | Deploy to The Graph hosted service (BSC Testnet) | Phase 2 |
| Comment storage | Vercel KV or Vercel Postgres | Phase 3 |
| WebSocket server hosting | Railway, Render, or Fly.io | Phase 1 |
| Wallet auth for comments | EIP-712 signature verification | Phase 3 |
| Push notification service | Web Push API + service worker | Phase 5 |
| Contract redeployment | Hardhat deploy to BSC Testnet after graduation fix | Phase 1 |

---

## Success Metrics

| Metric | Target | How to measure |
|--------|--------|----------------|
| Token creation rate | 10+ tokens/day | Factory event count |
| Average time on token page | >2 min | Analytics |
| Comments per token | >5 in first hour | Comment API |
| Graduation rate | >10% of tokens | Contract events |
| Return visitors | >30% weekly | Analytics |
| Trading volume | $10k+/day | AMM events |
