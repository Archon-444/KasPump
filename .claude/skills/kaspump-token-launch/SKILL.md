---
name: kaspump-token-launch
description: Guide users through launching tokens on the KasPump platform, including token creation, bonding curve configuration, and DEX graduation. Use this skill when helping with token economics, launch strategies, or platform features.
allowed-tools:
  - Read
  - Edit
  - Write
---

# KasPump Token Launch Skill

**Current (V2, 2026-08-13):** Launch UI is `QuickLaunchForm` — **name, ticker, optional image only**. Curve, supply (1B), graduation (800M sold), and fees are protocol-fixed (sigmoid table in `BondingCurveMath.sol`). There is no per-token `virtualKasReserves` / curve-type picker. Social URLs exist on-chain but the form does not collect them.

Use `project-conventions` if unsure. Do not revive `LaunchPad.tsx` or `tools/token-launch-wizard/`.

On-chain testnet in `deployments.json` is stale; see `STATUS.md`.

## Token Launch Overview

KasPump uses a bonding curve mechanism for fair token launches with automatic DEX graduation.

### Key Components

1. **Sigmoid bonding curve**: 31-anchor piecewise-linear table (`BondingCurveMath.sol`). Not x*y=k virtual reserves.
2. **Fixed supply**: 1,000,000,000; graduates when 800,000,000 are sold.
3. **Fees**: 1.00% → 0.10% as supply approaches graduation, plus a sniper-window surcharge.
4. **DEX graduation**: Automatic V2 LP (~70% of raised native), creator vesting, 6-month LP lock.

## Token Creation Process

### 1. Token Configuration

**User-facing (`QuickLaunchForm`):**
- `name`
- `symbol` (ticker)
- `image` (optional, IPFS)

**On-chain but not in the current form:** description, twitter/telegram/website, referrer.

### 2. Economic Parameters

Not user-configurable in V2. Do not pass `virtualKasReserves` / `virtualTokenReserves` / `basePrice` / `slope` / `curveType`.

**Protocol constants (see `QuickLaunchForm` SPECS and `BondingCurveAMM`):**
- Total supply: 1,000,000,000
- Graduates at: 800,000,000 sold
- Creation fee: 0.005 native
- Trading fee: `MAX_FEE_BPS` 100 → `MIN_FEE_BPS` 10
- Graduation split: ~70% DEX LP / 20% creator / 10% platform
- Creator tokens: 40M vest over 6 months
- LP lock: 6 months

### 3. Bonding Curve Mathematics

See `contracts/libraries/BondingCurveMath.sol`. `BONDING_CURVE_MATH.md` is the **pre-V2 linear** write-up (banner at top).

**Fee structure:**
- Trading fee: supply-decaying 1.00%–0.10%
- Sniper window: additional decaying surcharge (up to ~99%) for `sniperProtectionDuration` (default 60s)
- Platform fees: pull-payment (`withdrawPlatformFees`), not a push on every trade

## Launch Strategy Best Practices

### 1. Token Economics

Supply, curve, and graduation are protocol-fixed. Creators do not set virtual reserves or a custom curve. Marketing/community work still matters; do not promise configurable tokenomics that the contracts do not offer.

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
