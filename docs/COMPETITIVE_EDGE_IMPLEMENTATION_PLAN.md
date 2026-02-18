# KasPump Competitive Edge Features - Implementation Plan

## Overview

This document outlines the implementation plan for features that will differentiate KasPump from competitors like Pump.fun, SunPump, and Four.meme.

**Target Completion:** 2-3 weeks
**Priority:** Launch-critical features first

---

## Feature Summary

| # | Feature | Priority | Effort | Impact |
|---|---------|----------|--------|--------|
| 1 | Referral System | P0 | 3-4 days | 🔥🔥🔥 Viral Growth |
| 2 | Verification Badges | P0 | 2-3 days | 🔥🔥 Trust |
| 3 | Token Comments | P1 | 2-3 days | 🔥🔥 Engagement |
| 4 | Rug Score | P1 | 2 days | 🔥🔥 Safety |
| 5 | Trending Algorithm | P1 | 1 day | 🔥 Discovery |
| 6 | Copytrade | P2 | 3-5 days | 🔥🔥 Retention |

---

## 1. Referral System

### 1.1 Smart Contract Changes

**File:** `contracts/ReferralRegistry.sol`

```solidity
// Core functionality:
- Register referral relationships
- Track referral earnings
- Distribute referral rewards (10% of platform fees)
- 30-day attribution window
```

**Modifications to TokenFactory.sol:**
- Add referrer parameter to createToken()
- Emit referral event on token creation

**Modifications to BondingCurveAMM.sol:**
- Track referrer for each trade
- Split platform fee: 90% platform, 10% referrer

### 1.2 Frontend Components

| Component | Purpose |
|-----------|---------|
| `ReferralLink.tsx` | Generate/copy referral link |
| `ReferralDashboard.tsx` | View earnings & referred users |
| `ReferralLeaderboard.tsx` | Top referrers display |
| `useReferral.ts` | Hook for referral state management |

### 1.3 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/referral/track` | POST | Track referral attribution |
| `/api/referral/stats` | GET | Get referral statistics |
| `/api/referral/leaderboard` | GET | Get top referrers |

### 1.4 Database Schema (localStorage + on-chain)

```typescript
interface ReferralData {
  referrerAddress: string;
  referredAt: number;
  expiresAt: number; // 30 days
  source: 'link' | 'token' | 'direct';
}
```

---

## 2. Token Verification Badges

### 2.1 Badge Types

| Badge | Criteria | Visual |
|-------|----------|--------|
| 🔵 Verified Creator | KYC completed | Blue checkmark |
| 🟢 Audited | Third-party audit | Green shield |
| 🟡 Community Choice | >100 holders, >50 comments | Gold star |
| 🔴 New Launch | Created <24h ago | Red "NEW" |
| 🟣 Graduated | DEX graduation complete | Purple rocket |

### 2.2 Smart Contract

**File:** `contracts/BadgeRegistry.sol`

```solidity
// Core functionality:
- Badge assignment by admin/oracle
- Badge revocation capability
- Badge query by token address
- Event emission for badge changes
```

### 2.3 Frontend Components

| Component | Purpose |
|-----------|---------|
| `TokenBadge.tsx` | Single badge display |
| `TokenBadges.tsx` | All badges for a token |
| `BadgeTooltip.tsx` | Badge explanation on hover |
| `useBadges.ts` | Hook for badge data |

---

## 3. Token Comments & Reactions

### 3.1 Data Model

```typescript
interface Comment {
  id: string;
  tokenAddress: string;
  author: string; // wallet address
  content: string;
  createdAt: number;
  reactions: {
    rocket: number;
    fire: number;
    poop: number;
  };
  parentId?: string; // for replies
}
```

### 3.2 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/comments/[tokenAddress]` | GET | Get comments for token |
| `/api/comments` | POST | Create comment |
| `/api/comments/[id]/react` | POST | Add reaction |
| `/api/comments/[id]` | DELETE | Delete own comment |

### 3.3 Frontend Components

| Component | Purpose |
|-----------|---------|
| `CommentList.tsx` | Display comment thread |
| `CommentForm.tsx` | New comment input |
| `CommentItem.tsx` | Single comment with reactions |
| `ReactionButton.tsx` | Reaction picker |
| `useComments.ts` | Hook for comment management |

### 3.4 Storage Strategy

- **Phase 1:** localStorage + API route (serverless)
- **Phase 2:** Redis/PostgreSQL for scale
- **Moderation:** Report button, admin delete capability

---

## 4. Rug Score / Risk Indicator

### 4.1 Risk Factors

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Holder Concentration | 30% | Top 10 holders % of supply |
| Liquidity Depth | 25% | LP value / market cap |
| Creator Activity | 15% | Creator's trade history |
| Token Age | 10% | Time since creation |
| Volume Consistency | 10% | Stddev of daily volume |
| Graduation Progress | 10% | % to DEX graduation |

### 4.2 Score Bands

| Score | Label | Color |
|-------|-------|-------|
| 80-100 | Low Risk | Green |
| 60-79 | Moderate | Yellow |
| 40-59 | Elevated | Orange |
| 0-39 | High Risk | Red |

### 4.3 Frontend Components

| Component | Purpose |
|-----------|---------|
| `RiskScore.tsx` | Score display with tooltip |
| `RiskBreakdown.tsx` | Detailed factor analysis |
| `useRiskScore.ts` | Hook for risk calculation |

---

## 5. Enhanced Trending Algorithm

### 5.1 Scoring Formula

```
TrendScore = (
  VolumeScore × 0.35 +
  HolderGrowth × 0.20 +
  SocialEngagement × 0.20 +
  PriceAction × 0.15 +
  Recency × 0.10
)
```

### 5.2 Time Decay

- Scores decay by 10% every hour
- Prevents stale tokens from dominating

### 5.3 API Enhancement

Modify `/api/tokens` to support:
- `?sort=trending`
- `?timeframe=1h|6h|24h|7d`

---

## 6. Copytrade / Follow Traders

### 6.1 Data Model

```typescript
interface TraderProfile {
  address: string;
  displayName?: string;
  followers: number;
  pnl7d: number;
  pnl30d: number;
  winRate: number;
  totalTrades: number;
}

interface FollowRelation {
  follower: string;
  trader: string;
  copyEnabled: boolean;
  maxAmount: number;
  createdAt: number;
}
```

### 6.2 Frontend Components

| Component | Purpose |
|-----------|---------|
| `TraderProfile.tsx` | Trader stats display |
| `TraderLeaderboard.tsx` | Top traders list |
| `FollowButton.tsx` | Follow/unfollow action |
| `CopyTradeSettings.tsx` | Copy trade configuration |
| `useFollowTrader.ts` | Hook for follow management |

### 6.3 Copy Trade Execution

- WebSocket listener for followed trader's trades
- Automatic transaction building
- User approval flow (optional auto-execute)
- Max spend limits per trade/day

---

## Implementation Order

### Week 1: Core Viral Features
- [x] Day 1-2: Referral System (contract + hook)
- [x] Day 3: Referral Frontend Components
- [x] Day 4-5: Verification Badges

### Week 2: Engagement Features
- [x] Day 1-2: Token Comments System
- [x] Day 3: Reactions & Moderation
- [x] Day 4: Rug Score Calculator
- [x] Day 5: Trending Algorithm

### Week 3: Advanced Features
- [x] Day 1-3: Copytrade Backend
- [x] Day 4-5: Copytrade Frontend
- [x] Final: Testing & Documentation

## Implementation Status: COMPLETE

All competitive edge features have been implemented:

### Smart Contracts Created:
- `contracts/ReferralRegistry.sol` - Referral tracking and rewards
- `contracts/BadgeRegistry.sol` - Token verification badges
- `contracts/CopyTradeRegistry.sol` - Copytrade follow relationships

### Frontend Hooks Created:
- `src/hooks/useReferral.ts` - Referral link generation and tracking
- `src/hooks/useBadges.ts` - Badge fetching and automatic calculation
- `src/hooks/useComments.ts` - Comment management with reactions
- `src/hooks/useRiskScore.ts` - Risk analysis calculation
- `src/hooks/useTrending.ts` - Trending algorithm scoring
- `src/hooks/useCopyTrade.ts` - Follow traders and copy settings

### UI Components Created:
- `src/components/features/ReferralDashboard.tsx` - Full referral UI
- `src/components/features/TokenBadges.tsx` - Badge display components
- `src/components/features/TokenComments.tsx` - Comment thread UI
- `src/components/features/RiskScoreDisplay.tsx` - Risk visualization
- `src/components/features/TrendingTokens.tsx` - Trending display
- `src/components/features/CopyTrade.tsx` - Copytrade UI suite

### API Routes Created:
- `/api/referral/stats` - Referral statistics
- `/api/referral/register` - Register referrals
- `/api/comments` - Create comments
- `/api/comments/[tokenAddress]` - Get comments
- `/api/trending` - Trending tokens
- `/api/traders` - Trader leaderboard
- `/api/traders/[address]` - Trader profiles

---

## Testing Strategy

### Unit Tests
- Contract tests for ReferralRegistry, BadgeRegistry
- Hook tests for useReferral, useBadges, useComments
- Risk score calculation tests

### Integration Tests
- Referral tracking flow
- Badge display on token cards
- Comment creation and display

### E2E Tests
- Full referral journey
- Badge verification flow
- Comment interaction flow

---

## Documentation Updates

After implementation:
1. Update README.md with new features
2. Create REFERRAL_GUIDE.md
3. Create BADGE_CRITERIA.md
4. Update API documentation
5. Add feature screenshots to docs/

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Referral Conversion | 15%+ | Referred users who trade |
| Comment Engagement | 20%+ | Tokens with >5 comments |
| Badge Trust Impact | +10% | Conversion on badged tokens |
| Trending Accuracy | 80%+ | Trending tokens retain volume |

---

*Last Updated: 2025-02-18*
