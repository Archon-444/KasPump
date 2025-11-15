# KasPump Technical Debt & Future Enhancements

**Last Updated:** 2025-11-15
**Status:** Production-Ready with Known Limitations

---

## Overview

This document tracks placeholder implementations, known limitations, and future enhancements needed for KasPump. The platform is production-ready for launch, but these items should be addressed as the platform scales.

---

## 🔴 High Priority (Post-Launch)

### 1. Token Holder Count Tracking

**Location:** `src/app/api/tokens/route.ts:261-269`

**Current State:**
```typescript
async function getHolderCount(provider: ethers.JsonRpcProvider, tokenAddress: string): Promise<number> {
  try {
    // Placeholder for holder count calculation
    // In production, we'd need to track Transfer events or use indexing service
    return 0;
  } catch (error) {
    return 0;
  }
}
```

**Issue:** Always returns `0`, making holder analytics inaccurate.

**Impact:**
- Analytics dashboard shows 0 holders for all tokens
- Partnership integrations lack holder count data
- User trust may be affected by missing metrics

**Solution Options:**

#### Option A: Event Indexing (Recommended)
Use The Graph protocol or similar indexing service:

```typescript
async function getHolderCount(provider: ethers.JsonRpcProvider, tokenAddress: string): Promise<number> {
  try {
    // Query Transfer events
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const filter = tokenContract.filters.Transfer();
    const events = await tokenContract.queryFilter(filter, 0, 'latest');

    // Count unique addresses (excluding zero address)
    const holders = new Set<string>();
    for (const event of events) {
      if (event.args && event.args.to !== ethers.ZeroAddress) {
        holders.add(event.args.to);
      }
      if (event.args && event.args.from !== ethers.ZeroAddress) {
        // Check if sender still holds tokens
        const balance = await tokenContract.balanceOf(event.args.from);
        if (balance > 0n) {
          holders.add(event.args.from);
        }
      }
    }

    return holders.size;
  } catch (error) {
    console.error('Error calculating holder count:', error);
    return 0;
  }
}
```

**Pros:** Accurate, no external dependencies
**Cons:** Expensive RPC calls, slow for tokens with many transfers

#### Option B: The Graph Subgraph (Best for Scale)
Deploy a subgraph to index Transfer events:

1. Create subgraph schema
2. Deploy to The Graph network
3. Query via GraphQL

```typescript
async function getHolderCount(tokenAddress: string): Promise<number> {
  const query = `
    query {
      token(id: "${tokenAddress.toLowerCase()}") {
        holderCount
      }
    }
  `;

  const response = await fetch('https://api.thegraph.com/subgraphs/name/kaspump/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  const data = await response.json();
  return data.data.token?.holderCount || 0;
}
```

**Pros:** Fast, scalable, real-time
**Cons:** Requires subgraph deployment and maintenance

#### Option C: Moralis API (Fastest Implementation)
Use Moralis or similar service:

```typescript
async function getHolderCount(tokenAddress: string): Promise<number> {
  const response = await fetch(
    `https://deep-index.moralis.io/api/v2/erc20/${tokenAddress}/owners?chain=bsc`,
    {
      headers: { 'X-API-Key': process.env.MORALIS_API_KEY }
    }
  );

  const data = await response.json();
  return data.total || 0;
}
```

**Pros:** Instant implementation, accurate
**Cons:** Requires paid API key, external dependency

**Recommendation:** Start with Option C (Moralis) for quick launch, migrate to Option B (The Graph) as scale increases.

**Estimated Effort:**
- Option A: 2-4 hours (but slow performance)
- Option B: 8-16 hours (includes subgraph development)
- Option C: 1-2 hours (plus API key setup)

---

### 2. 24-Hour Trading Metrics

**Location:** `src/app/api/tokens/route.ts:203-206`

**Current State:**
```typescript
return {
  // ... other fields
  transactions24h: 0,
  priceChange24h: 0,
  volumeChange24h: 0
};
```

**Issue:** All 24-hour metrics return `0`, making trending/analytics incomplete.

**Impact:**
- Cannot identify trending tokens
- Missing key data for user trading decisions
- Analytics dashboard incomplete

**Solution:**

Implement time-series event tracking:

```typescript
async function get24hMetrics(ammAddress: string, provider: ethers.JsonRpcProvider) {
  try {
    const ammContract = new ethers.Contract(ammAddress, BONDING_CURVE_ABI, provider);

    // Get current block and 24h ago block
    const currentBlock = await provider.getBlockNumber();
    const blocksPerDay = 28800; // ~3 sec per block on BSC
    const startBlock = currentBlock - blocksPerDay;

    // Query trade events from last 24h
    const buyFilter = ammContract.filters.TokensPurchased();
    const sellFilter = ammContract.filters.TokensSold();

    const [buyEvents, sellEvents] = await Promise.all([
      ammContract.queryFilter(buyFilter, startBlock, currentBlock),
      ammContract.queryFilter(sellFilter, startBlock, currentBlock)
    ]);

    // Calculate metrics
    const transactions24h = buyEvents.length + sellEvents.length;

    let volume24h = 0n;
    for (const event of [...buyEvents, ...sellEvents]) {
      if (event.args) {
        volume24h += event.args.nativeAmount || 0n;
      }
    }

    // Get price 24h ago vs now
    const currentPrice = await ammContract.getCurrentPrice();
    // Would need to store historical prices or reconstruct from events
    const priceChange24h = 0; // Placeholder

    return {
      transactions24h,
      volume24h: parseFloat(ethers.formatEther(volume24h)),
      priceChange24h,
      volumeChange24h: 0 // Need previous 24h volume for comparison
    };
  } catch (error) {
    console.error('Error getting 24h metrics:', error);
    return {
      transactions24h: 0,
      volume24h: 0,
      priceChange24h: 0,
      volumeChange24h: 0
    };
  }
}
```

**Alternative:** Use The Graph subgraph with time-series aggregation.

**Estimated Effort:** 4-8 hours for event-based, 8-16 hours for subgraph

---

## 🟡 Medium Priority

### 3. Real-Time Price Feeds

**Location:** `src/components/features/TradingChart.tsx:42-43`

**Current State:** Price data loaded on component mount, no WebSocket updates.

**Enhancement:** Add WebSocket connection for live price updates:

```typescript
useEffect(() => {
  const ws = new WebSocket('wss://api.kaspump.io/price-feed');

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.token === tokenAddress) {
      setPriceData(prev => [...prev, {
        time: data.timestamp,
        value: data.price
      }]);
    }
  };

  return () => ws.close();
}, [tokenAddress]);
```

**Estimated Effort:** 4-8 hours (frontend + backend WebSocket server)

---

### 4. IPFS Metadata Storage

**Location:** Token creation flow uses URLs, not IPFS hashes

**Enhancement:** Upload token images/metadata to IPFS:

```typescript
async function uploadToIPFS(file: File, metadata: TokenMetadata) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PINATA_JWT}`
    },
    body: formData
  });

  const { IpfsHash } = await response.json();
  return `ipfs://${IpfsHash}`;
}
```

**Estimated Effort:** 3-6 hours

---

### 5. Mobile Optimization

**Status:** Desktop-first design, mobile needs refinement

**Required:**
- Touch-optimized trading interface
- Mobile-specific wallet connect flow
- Responsive chart sizing
- Bottom sheet modals for mobile

**Estimated Effort:** 16-24 hours

---

## 🟢 Low Priority / Nice-to-Have

### 6. Advanced Analytics Dashboard

**Features:**
- Platform-wide statistics
- Revenue tracking
- Token leaderboard
- Creator analytics

**Estimated Effort:** 40-60 hours

---

### 7. Limit Orders & Stop Loss

**Location:** Stub components exist in `src/components/trading/`

**Current State:** UI exists but not connected to contracts

**Enhancement:** Implement off-chain order book or on-chain limit orders

**Estimated Effort:** 40-80 hours (complex feature)

---

### 8. Multi-Language Support

**Enhancement:** i18n for global audience

**Estimated Effort:** 20-30 hours initial setup, ongoing translations

---

### 9. Advanced Trading Features

From `FEATURE_E_ADVANCED_TRADING.md`:
- Portfolio tracking
- Price alerts
- Trading bots API
- Advanced charting tools

**Estimated Effort:** 60-100 hours

---

## 📋 Recommended Implementation Order

### Phase 1: Critical Data (Week 1-2)
1. ✅ Fix Sentry dependency conflict
2. ✅ Mainnet deployment
3. 🔴 Implement holder count (Option C: Moralis)
4. 🔴 Implement 24h metrics (basic event querying)

### Phase 2: UX Polish (Week 3-4)
5. 🟡 Mobile optimization
6. 🟡 Real-time price feeds
7. 🟡 IPFS metadata storage

### Phase 3: Advanced Features (Month 2)
8. 🟢 Analytics dashboard
9. 🟢 Advanced trading features
10. 🟢 Multi-language support

### Phase 4: Scale & Optimize (Month 3+)
11. Migrate to The Graph subgraph
12. Implement caching layer (Redis)
13. Add CDN for static assets
14. Performance optimization
15. Security hardening

---

## 🔧 Quick Wins (< 2 hours each)

These can be tackled immediately:

1. **Add Wallet Balance Display**
   - Show user's BNB balance in header
   - 30 minutes

2. **Transaction History**
   - Show recent trades for current wallet
   - 1-2 hours

3. **Token Search**
   - Client-side filtering of token list
   - 1 hour

4. **Copy-to-Clipboard for Addresses**
   - One-click copy for token/wallet addresses
   - 30 minutes

5. **Share Token Button**
   - Social media sharing for tokens
   - 1 hour

6. **Favorite Tokens**
   - Local storage for user favorites
   - 1-2 hours

---

## 🎯 Success Metrics to Track

Once analytics are implemented, track:

### Technical Metrics
- Average response time (<500ms target)
- Error rate (<0.1% target)
- Contract gas costs (optimize below current)
- RPC call efficiency

### Business Metrics
- Daily active users (DAU)
- Token creation rate
- Total trading volume
- Platform revenue
- User retention (7-day, 30-day)

### User Experience Metrics
- Time to first trade
- Trading success rate
- Wallet connection success rate
- Page load time

---

## 📝 Notes

### Why These Are Acceptable for Launch

1. **Holder Count:** Not critical for initial launch when token counts are low
2. **24h Metrics:** Platform is new, trending will develop over time
3. **Real-time Feeds:** Refresh on page load is acceptable for MVP
4. **IPFS:** Traditional URLs work fine, IPFS is optimization

### When to Address

- **Holder Count:** When user complaints arise or analytics become important
- **24h Metrics:** After 1 week of mainnet operation (need data history)
- **Real-time Feeds:** When concurrent users exceed 100
- **IPFS:** When considering decentralization/permanence

---

## 🤝 Community Contributions

These items are good candidates for open-source contributions:

1. The Graph subgraph development
2. Mobile UI improvements
3. Multi-language translations
4. Advanced charting integration
5. Trading bot examples

---

**Maintained by:** Development Team
**For questions:** See INTEGRATION_STATUS.md
**Report issues:** Create GitHub issue with "Technical Debt" label
