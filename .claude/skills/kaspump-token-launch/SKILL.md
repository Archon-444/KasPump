---
name: kaspump-token-launch
description: Guide users through launching tokens on the KasPump platform, including token creation, bonding curve configuration, and DEX graduation. Use this skill when helping with token economics, launch strategies, or platform features.
allowed-tools:
  - Read
  - Edit
  - Write
---

# KasPump Token Launch Skill

This skill provides comprehensive guidance for launching tokens on the KasPump platform.

## Token Launch Overview

KasPump uses a bonding curve mechanism for fair token launches with automatic DEX graduation.

### Key Components

1. **Bonding Curve**: Price increases as more tokens are purchased
2. **Initial Supply**: Platform mints initial supply for curve
3. **Virtual Liquidity**: Determines starting price and curve steepness
4. **DEX Graduation**: Automatic migration to DEX at market cap threshold

## Token Creation Process

### 1. Token Configuration

**Required Parameters:**
- `name`: Token name (e.g., "My Token")
- `symbol`: Token ticker (e.g., "MTK")
- `description`: Token description
- `imageUrl`: Token logo/image URL (IPFS recommended)
- `twitter`: Twitter handle (optional)
- `telegram`: Telegram link (optional)
- `website`: Website URL (optional)

### 2. Economic Parameters

**Bonding Curve Settings:**
- `virtualKasReserves`: Virtual KAS/BNB/ETH reserves (affects starting price)
- `virtualTokenReserves`: Virtual token reserves (affects curve steepness)
- `graduationThreshold`: Market cap for DEX migration (default: varies by chain)

**Example Configuration:**
```typescript
const tokenConfig = {
  name: "MyToken",
  symbol: "MTK",
  description: "Community-driven token",
  imageUrl: "ipfs://...",
  virtualKasReserves: ethers.parseEther("30"),  // 30 BNB
  virtualTokenReserves: ethers.parseEther("1073000000"),  // 1.073B tokens
  graduationThreshold: ethers.parseEther("50")  // 50 BNB market cap
}
```

### 3. Bonding Curve Mathematics

The platform uses a constant product formula:

```
k = virtualKasReserves * virtualTokenReserves
price = virtualKasReserves / virtualTokenReserves
```

**Price Calculation:**
- Starting price: `virtualKasReserves / virtualTokenReserves`
- Price increases as tokens are bought
- Price decreases as tokens are sold (with 1% fee)

**Fee Structure:**
- Trading fee: 1% on all trades
- Creator fee: Optional % to token creator
- Platform fee: Taken from trading fees

## Launch Strategy Best Practices

### 1. Token Economics

**Supply Allocation:**
- Bonding curve: 80-90% of total supply
- Team/Marketing: 10-20% (locked recommended)
- Never dump team allocation on community

**Pricing Strategy:**
- Set realistic virtual reserves for target starting price
- Consider graduation threshold based on chain
- Higher virtual reserves = higher starting price

### 2. Marketing & Community

**Pre-Launch:**
- Build community on Twitter/Telegram
- Create compelling narrative and use case
- Design professional logo and branding
- Prepare website and documentation

**Launch Day:**
- Coordinate launch timing with community
- Monitor initial trading activity
- Engage with buyers and community
- Address questions and concerns

**Post-Launch:**
- Maintain active communication
- Execute roadmap milestones
- Build utility and value proposition
- Plan for DEX graduation event

### 3. Technical Considerations

**Image Hosting:**
- Use IPFS for decentralized, permanent storage
- Recommended services: Pinata, NFT.Storage
- Optimize images: 512x512px, PNG/JPG, <1MB

**Social Links:**
- Verify all URLs are correct before launch
- Use official handles and domains
- Update links if social accounts change

**Network Selection:**
- BSC: Lower fees, larger user base
- Arbitrum: Lower fees, Ethereum ecosystem
- Base: Growing ecosystem, Coinbase integration

## DEX Graduation

### Graduation Process

When market cap reaches threshold:

1. **Automatic Trigger**: Contract detects graduation condition
2. **Liquidity Migration**: Bonding curve reserves moved to DEX
3. **LP Creation**: Liquidity pool created on PancakeSwap/Uniswap
4. **LP Burning**: LP tokens burned (permanent liquidity)
5. **Trading Continues**: Token now trades on DEX

### Post-Graduation

- Token has permanent liquidity on DEX
- No more bonding curve restrictions
- Standard DEX trading mechanics apply
- Consider CEX listings and partnerships

## Common Issues & Solutions

### Issue: High Slippage

**Cause**: Large trade relative to liquidity
**Solution**:
- Split large trades into smaller chunks
- Adjust slippage tolerance in UI
- Wait for more liquidity to build

### Issue: Transaction Fails

**Cause**: Insufficient gas, slippage, or balance
**Solution**:
- Check wallet balance
- Increase gas limit
- Increase slippage tolerance
- Verify token approval

### Issue: Price Not Updating

**Cause**: Frontend caching or RPC delay
**Solution**:
- Refresh page
- Check blockchain explorer for actual price
- Verify RPC connection

### Issue: Can't Sell Tokens

**Cause**: Token approval or liquidity
**Solution**:
- Approve token spending first
- Check if token has graduated
- Verify sufficient liquidity for trade

## Monitoring & Analytics

### Key Metrics to Track

- **Trading Volume**: Daily/weekly trade activity
- **Holder Count**: Number of unique holders
- **Market Cap**: Current valuation
- **Liquidity**: Available liquidity for trading
- **Price**: Current and historical price data

### Tools

- **Platform Analytics**: Built-in KasPump charts and stats
- **Block Explorers**: BSCScan, Arbiscan, BaseScan
- **DexTools/DexScreener**: After DEX graduation
- **Social Analytics**: Twitter/Telegram engagement

## Support Resources

- **Documentation**: See project README and docs
- **Testing Guide**: `TESTING_GUIDE.md`
- **Deployment Guide**: `DEPLOYMENT_QUICKSTART.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Economic Model**: `ECONOMIC_MODEL_CHANGES.md`

## Example Token Launch Checklist

- [ ] Design token concept and branding
- [ ] Create and test token logo (IPFS)
- [ ] Set up social media accounts
- [ ] Determine token economics (supply, pricing)
- [ ] Test on testnet first
- [ ] Build initial community
- [ ] Launch token on mainnet
- [ ] Promote launch on social media
- [ ] Monitor initial trading
- [ ] Engage with community
- [ ] Execute roadmap
- [ ] Plan for DEX graduation
- [ ] Continue building utility
