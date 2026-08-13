# KasPump Competitive Analysis: vs BSC & Solana Launchpads

**Original date:** April 2026  
**Reconciled:** 2026-08-13 against current KasPump source  
**Purpose:** Competitive gaps. **Do not treat the April feature matrix as a description of shipped KasPump code.**

> **Code vs this doc (KasPump column only):**
> - Curve is **sigmoid only**, not “linear + exponential”. Launch UI is name/ticker/image (`QuickLaunchForm`), not a 5-step wizard.
> - Creation fee is **0.005 BNB** (matches Four.meme). Social URLs exist **on-chain**; the launch form does not collect them.
> - **No** `LimitOrderBook.sol` / `StopLossOrderBook.sol`. Trading UI stubs are not a live order book.
> - Fees decay **1.00% → 0.10%** with supply (plus a sniper-window surcharge), not a static 1.0/0.5/0.25 membership menu as the primary UX.
> - Anti-sniper sliding fee **is** in `BondingCurveAMM`.
> - Mainnet: **not live**. Testnet factory in `deployments.json` is a 2025-10-31 deploy and does not match master.
> - Creator share remains graduation-time (plus vesting), not Pump.fun-style ongoing trade-fee split.
>
> Competitor numbers below are from the April 2026 research pass and were **not** re-verified on 2026-08-13.

**Status:** Pre-mainnet. Launch blockers are operational (see `STATUS.md`), not “add limit orders first”.

---

## Executive Summary

KasPump is a technically sophisticated multi-chain token launchpad (frontend + registry ready; **BSC mainnet not live**). Shipped differentiators vs April 2026 notes: sigmoid curve, anti-sniper sliding fee, automated V2 graduation + LP lock. It does **not** ship on-chain limit/stop-loss. It trails Pump.fun / Four.meme on **creator ongoing revenue share**, **referral/points**, and **live mainnet presence**.

**Top 3 Advantages (in code):** Anti-sniper window, automated DEX graduation with LP lock, multi-chain frontend/registry  
**Top 3 Gaps:** Not on mainnet, no creator per-trade fee share, no referral/points product

---

## Feature Comparison Matrix

### Chain Support & Deployment

| Feature | KasPump | Pump.fun (SOL) | Four.meme (BSC) | GraFun (BSC) |
|---------|---------|----------------|------------------|--------------|
| Primary Chain | BSC, Arbitrum, Base | Solana | BSC | BSC |
| Multi-chain | Yes (3 EVM chains) | Planned (BSC, Base, ETH, Monad) | No | No |
| Mainnet Live | Testnet only | Yes | Yes | Yes |
| Users | Pre-launch | 11.9M+ tokens created | 812K+ daily users | 13K+ tokens |
| Revenue | $0 | $800M+ cumulative | 33K+ BNB cumulative | N/A |

### Token Creation

| Feature | KasPump | Pump.fun | Four.meme | GraFun |
|---------|---------|----------|-----------|--------|
| Creation Fee | 0.005 BNB (~$3) | FREE | 0.005 BNB (~$3) | 0.0005 BNB (~$0.30) |
| Social Links | On-chain fields; launch form does not collect them | Yes | Yes | Yes |
| Image/Logo | IPFS upload | Yes | Yes | Yes |
| Curve Types | Sigmoid (protocol-fixed) | Standard bonding curve | Creator-configurable | Fair Curve |
| Creation Wizard | 3-field QuickLaunch | Simple form | Simple form | Simple form |

### Bonding Curve & Math

| Feature | KasPump | Pump.fun | Four.meme | GraFun |
|---------|---------|----------|-----------|--------|
| Curve Type | Fixed sigmoid (31-anchor table) | Fixed bonding curve | x*y=k (configurable) | Fair Curve (anti-rug) |
| Math Precision | Piecewise-linear anchors on-chain | Standard | Standard | Standard |
| Gas Efficiency | viaIR + optimizer runs=100 | Solana (cheap) | Standard EVM | Standard EVM |
| Price Impact Display | Yes (color-coded warnings) | Yes | Basic | Basic |

### Trading Fees

| Feature | KasPump | Pump.fun | Four.meme | GraFun |
|---------|---------|----------|-----------|--------|
| Fee Model | Supply-decaying bps (1.00%→0.10%) + sniper surcharge | Dynamic (market-cap based) | Flat | Flat |
| Basic Fee | 1.0% at supply 0 | 0.95% (<$300K mcap) | 1.0% | 1.0% |
| Best Fee | 0.10% floor near graduation | 0.05% (high mcap) | 1.0% | 1.0% |
| Dynamic Adjustment | Yes (vs supply / graduation) | Yes (Project Ascend) | No | No |
| Fee Recipient | Platform only | Platform + Creator | Platform | Platform |

### Anti-Bot & Sniper Protection

| Feature | KasPump | Pump.fun | Four.meme | GraFun |
|---------|---------|----------|-----------|--------|
| Anti-Sniper | 99% sliding fee (60s) | Basic | Creator same-tx buy | 60% early buyer fee |
| Rate Limiting | 60s creation cooldown | N/A | N/A | N/A |
| Configurable Duration | Yes (up to 300s) | No | No | No |
| Protection Strength | **Strongest** | Weak | Moderate | Moderate |

### Graduation & DEX Integration

| Feature | KasPump | Pump.fun | Four.meme | GraFun |
|---------|---------|----------|-----------|--------|
| Graduation Trigger | 80% supply sold | Bonding curve filled | ~24 BNB raised | 38.75 BNB raised |
| Target DEX | PancakeSwap/Uniswap/BaseSwap | PumpSwap (native) | PancakeSwap V2 | PancakeSwap V3 |
| LP Lock Duration | 6 months | N/A (native DEX) | Burned | N/A |
| Creator Share | 20% at graduation | 50% ongoing trades | N/A | N/A |
| Platform Share | 10% at graduation | 50% ongoing trades | N/A | N/A |
| DEX Liquidity | 70% of funds | Automatic (PumpSwap) | Auto-seeded | Auto-seeded |

### Advanced Trading (KasPump Differentiator)

| Feature | KasPump | Pump.fun | Four.meme | GraFun |
|---------|---------|----------|-----------|--------|
| Limit Orders | UI stubs only (no contract) | Third-party bots only | No | No |
| Stop-Loss | UI stubs only (no contract) | Third-party bots only | No | No |
| Order Book | No | No | No | No |
| Keeper Bot System | No | No | No | No |
| Charts | TradingView-style OHLCV | Basic | Basic | Basic |

### Creator Incentives

| Feature | KasPump | Pump.fun | Four.meme | GraFun |
|---------|---------|----------|-----------|--------|
| Revenue Sharing | 20% at graduation only | 50% of ongoing trade fees | Points/airdrops | None |
| Creator Dashboard | Yes | Basic | Basic | No |
| Creator Badges | Yes (on-chain verified) | No | No | No |
| Accelerator Program | No | No | Yes (influencer/marketing) | No |
| Multi-wallet Revenue | No | Yes (up to 10 wallets) | No | No |

### Social & Gamification

| Feature | KasPump | Pump.fun | Four.meme | GraFun |
|---------|---------|----------|-----------|--------|
| King of the Hill | Yes | Yes (original) | No | No |
| Leaderboard | Yes (volume, mcap, change) | Yes (traders, influencers) | Yes (projects) | No |
| Token Comments | Yes (with creator badges) | Yes | No | No |
| User Profiles | Yes | Basic | Basic | No |
| Points System | No | PUMP token rewards | Yes (airdrop eligible) | No |
| Referral Program | No | No | Yes | No |
| Social Sharing | Yes (Twitter, Web Share) | Yes | Yes | Basic |

### Platform Token & Ecosystem

| Feature | KasPump | Pump.fun | Four.meme | GraFun |
|---------|---------|----------|-----------|--------|
| Platform Token | None | PUMP (governance) | Hinted (FOUR) | None |
| Exchange Integration | None | Standalone | Binance Wallet TGE | None |
| API for Bots | Planned | Yes | Third-party | No |
| Mobile App | PWA | Web + Mobile v2.0 | Web | Web |

---

## KasPump Competitive Advantages

### 1. Multi-Chain from Day 1
KasPump supports BSC, Arbitrum, and Base with deterministic deployment (same contract addresses). Competitors are single-chain. Pump.fun has only signaled multi-chain intent via DNS registrations — no confirmed launch dates.
- `contracts/DexRouterRegistry.sol` — chain-specific DEX routing
- `contracts/DeterministicDeployer.sol` — CREATE2 cross-chain consistency

### 2. Native On-Chain Limit Orders — NOT SHIPPED

April 2026 text claimed `contracts/LimitOrderBook.sol`. That file is not in the tree. UI stubs in `src/components/trading/` are not wired. Do not sell this as a live advantage.

### 3. Native On-Chain Stop-Loss — NOT SHIPPED

Same: no `StopLossOrderBook.sol`. Backlog only.

### 4. Strongest Anti-Sniper Protection

99% sliding fee decaying over configurable duration (default 60s, cap 300s). This **is** in `BondingCurveAMM`.

### 5. Bonding curve: sigmoid only

V2 removed per-token linear/exponential choice. Math is a 31-anchor piecewise-linear sigmoid in `BondingCurveMath.sol`.

### 6. Supply-decaying trading fee

`MAX_FEE_BPS` 100 → `MIN_FEE_BPS` 10 as supply approaches graduation, plus sniper surcharge. Membership tier still exists on the AMM constructor but is not the user-facing fee story.

### 7. 6-Month LP Lock
Anti-rug protection via time-locked LP tokens. Stronger than Four.meme's burn approach for creator accountability.

### 8. Comprehensive Trading UI
TradingView-style charts, portfolio tracking, risk indicators, price alerts, real-time WebSocket updates — more complete than any competitor's trading interface.

---

## Critical Gaps & Threat Assessment

### CRITICAL — Must fix before mainnet

**Gap 1: No Creator Revenue Sharing on Ongoing Trades**
- **Impact:** Pump.fun shares 50% of trading fees with creators (0.05% of all volume). This is their #1 creator acquisition tool. KasPump only gives creators 20% at graduation — a one-time event.
- **Risk:** Creators will launch on Pump.fun for the ongoing income stream.
- **Fix:** Add per-trade creator fee (e.g., split platform fee: 50% platform / 50% creator) in `BondingCurveAMM.sol` buyTokens/sellTokens.

**Gap 2: No Pump.fun-style market-cap fee schedule**
- **Impact:** Pump.fun's Project Ascend adjusts fees by market cap. KasPump already decays fees with **bonding-curve supply** (1.00% → 0.10%). Remaining gap is market-cap-based (USD) scheduling, not “static 1% forever”.
- **Fix (optional):** USD/mcap oracle schedule on top of the existing bps decay.

**Gap 3: No Referral/Points System**
- **Impact:** Four.meme's referral program and points system drive organic user acquisition. No equivalent exists in KasPump.
- **Risk:** Zero organic growth mechanism at launch.
- **Fix:** Add on-chain referral tracking in `TokenFactory.sol`, referral fee split from creation fee, extend `LeaderboardTable` for referrer rankings.

### HIGH — Should fix before mainnet

**Gap 4: Pump.fun Multi-Chain Expansion**
- **Impact:** Pump.fun has registered subdomains for BSC, Base, Ethereum, Monad. If they launch on BSC, KasPump's multi-chain advantage evaporates.
- **Risk:** Pump.fun's brand recognition + existing user base would dominate BSC.
- **Mitigation:** Ship to BSC mainnet ASAP to establish presence before Pump.fun arrives.

**Gap 5: No Platform/Governance Token**
- **Impact:** PUMP token drives user engagement and trading incentives. No equivalent for KasPump.
- **Risk:** Cannot compete on user incentives without a token.
- **Note:** Requires legal review. Consider as fast-follow post-mainnet.

### MEDIUM — Nice to have at launch

**Gap 6: No Binance Ecosystem Integration**
- **Impact:** Four.meme's Binance Wallet TGE integration gives it distribution advantage.
- **Mitigation:** Focus on wallet integrations already built (RainbowKit, WalletConnect).

**Gap 7: No Creator Accelerator Program**
- **Impact:** Four.meme offers influencer partnerships and marketing support.
- **Mitigation:** Can be built operationally post-launch without code changes.

---

## Strategic Recommendations (Priority Order)

| # | Action | Impact | Effort | Priority |
|---|--------|--------|--------|----------|
| 1 | Add creator revenue sharing (per-trade) | Critical | 2-3 days | P0 |
| 2 | Optional USD/mcap fee overlay | Medium | 2 days | P2 |
| 3 | Referral program UI (on-chain hook exists) | High | 2-3 days | P1 |
| 4 | Ship to BSC mainnet (see STATUS.md) | Critical | process + audit | P0 |
| 5 | Explore platform token (design phase) | High | 1 week | P1 |
| 6 | Build points/rewards system (off-chain) | High | 2-3 days | P1 |
| 7 | Add creator accelerator program | Medium | Operational | P2 |
| 8 | Pursue Binance Wallet integration | Medium | Partnership | P2 |

---

## Competitive Landscape Risks

1. **Pump.fun BSC expansion** — DNS registrations for bsc.pump.fun, base.pump.fun, eth.pump.fun signal imminent multi-chain launch. Their $800M+ revenue and 11.9M tokens give them massive brand advantage.

2. **Four.meme's Binance backing** — Direct Binance Wallet integration and institutional support give Four.meme a distribution moat on BSC that is difficult to replicate.

3. **Market saturation** — The launchpad space is crowded. Differentiation through anti-sniper fees and automated graduation is real; limit/stop-loss is **not** a shipped moat.

4. **Race to zero fees** — Pump.fun removed creation fees entirely. GraFun charges 0.0005 BNB. KasPump is at 0.005 BNB, in line with Four.meme.

---

## Sources

- [Four.meme Official](https://four.meme)
- [Pump.fun Wikipedia](https://en.wikipedia.org/wiki/Pump.fun)
- [BNB Chain Launchpad Comparison - DWF Labs](https://www.dwf-labs.com/research/461-comparison-of-bnb-chain-memecoin-launchpads-grafun-vs-four-meme-vs-flap)
- [PumpSwap Revenue Sharing - The Block](https://www.theblock.co/post/354038/pumpswap-revenue-tokens)
- [Pump.fun Multi-Chain Signals - BanklessTimes](https://www.banklesstimes.com/articles/2026/03/12/pump-fun-signals-multichain-on-subdomains-for-base-bsc-monad-and-ethereum/)
- [Pump.fun $1B Revenue - The Block](https://www.theblock.co/post/393358/pump-fun-becomes-solanas-first-1b-revenue-platform-as-ethereum-base-bsc-and-monad-subdomains-hint-at-cross-chain-move)
- [Best Memecoin Launchpads 2026 - Bitget](https://web3.bitget.com/en/academy/best-memecoin-launchpads-in-2025-which-platforms-offer-the-easiest-way-to-launch-a-meme-token)
- [Four.meme Features Overview - Medium](https://medium.com/@four.meme/four-meme-an-overview-of-current-features-and-future-plans-so-far-8f22478acc42)
- [Pump.fun Creator Revenue - CoinDesk](https://www.coindesk.com/markets/2025/05/13/pumpfun-launches-revenue-sharing-for-coin-creators-in-push-to-incentivize-long-term-activity)
- [PumpSwap Review 2026 - CryptoAdventure](https://cryptoadventure.com/pumpswap-review-2026-pump-funs-solana-amm-bonding-curve-graduation-and-trader-risk/)
