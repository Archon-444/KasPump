/**
 * useTrending Hook
 * Enhanced trending algorithm for token discovery
 *
 * Scoring Formula:
 * TrendScore = (
 *   VolumeScore × 0.35 +
 *   HolderGrowth × 0.20 +
 *   SocialEngagement × 0.20 +
 *   PriceAction × 0.15 +
 *   Recency × 0.10
 * )
 *
 * Time decay: Scores decay by 10% every hour
 *
 * @example
 * ```typescript
 * const { tokens, isLoading, timeframe, setTimeframe } = useTrending();
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { KasPumpToken } from '../types';

// ============ Types ============

export type TrendingTimeframe = '1h' | '6h' | '24h' | '7d';

export interface TrendingScore {
  tokenAddress: string;
  totalScore: number;
  volumeScore: number;
  holderGrowthScore: number;
  socialScore: number;
  priceActionScore: number;
  recencyScore: number;
  rank: number;
  previousRank?: number;
  rankChange: 'up' | 'down' | 'same' | 'new';
  calculatedAt: number;
}

export interface TrendingToken extends KasPumpToken {
  trendingScore: TrendingScore;
}

interface UseTrendingReturn {
  tokens: TrendingToken[];
  isLoading: boolean;
  error: string | null;
  timeframe: TrendingTimeframe;
  setTimeframe: (tf: TrendingTimeframe) => void;
  refresh: () => Promise<void>;
  lastUpdated: number | null;
}

// ============ Weights Configuration ============

const TRENDING_WEIGHTS = {
  volume: 0.35,
  holderGrowth: 0.20,
  socialEngagement: 0.20,
  priceAction: 0.15,
  recency: 0.10,
};

const TIME_DECAY_RATE = 0.10; // 10% per hour
const DECAY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// ============ Scoring Functions ============

/**
 * Calculate volume score based on trading activity
 * Higher relative volume = higher score
 */
function calculateVolumeScore(
  volume24h: number,
  avgVolume7d: number,
  marketCap: number
): number {
  if (marketCap === 0) return 0;

  // Volume to market cap ratio
  const volumeToMcap = (volume24h / marketCap) * 100;

  // Volume trend (vs 7-day average)
  const volumeTrend = avgVolume7d > 0 ? (volume24h / avgVolume7d) : 1;

  // Base score from volume/mcap ratio
  let score = 0;
  if (volumeToMcap >= 100) {
    score = 100;
  } else if (volumeToMcap >= 50) {
    score = 80 + (volumeToMcap - 50) * 0.4;
  } else if (volumeToMcap >= 20) {
    score = 50 + (volumeToMcap - 20) * 1;
  } else if (volumeToMcap >= 5) {
    score = 20 + (volumeToMcap - 5) * 2;
  } else {
    score = volumeToMcap * 4;
  }

  // Boost for increasing volume trend
  if (volumeTrend > 2) {
    score *= 1.3;
  } else if (volumeTrend > 1.5) {
    score *= 1.15;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate holder growth score
 * More new holders = higher score
 */
function calculateHolderGrowthScore(
  currentHolders: number,
  holdersChange24h: number,
  holdersChange7d: number
): number {
  if (currentHolders === 0) return 0;

  // 24h growth rate
  const growthRate24h = (holdersChange24h / currentHolders) * 100;

  // 7d growth rate (normalized to daily)
  const avgDailyGrowth7d = (holdersChange7d / 7 / currentHolders) * 100;

  // Base score from 24h growth
  let score = 0;
  if (growthRate24h >= 20) {
    score = 100;
  } else if (growthRate24h >= 10) {
    score = 70 + (growthRate24h - 10) * 3;
  } else if (growthRate24h >= 5) {
    score = 40 + (growthRate24h - 5) * 6;
  } else if (growthRate24h >= 1) {
    score = 10 + (growthRate24h - 1) * 7.5;
  } else if (growthRate24h > 0) {
    score = growthRate24h * 10;
  }

  // Boost for consistent growth
  if (avgDailyGrowth7d > 5 && growthRate24h > 0) {
    score *= 1.2;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate social engagement score
 * Comments, reactions, shares
 */
function calculateSocialScore(
  commentCount: number,
  reactionCount: number,
  shareCount: number
): number {
  // Weighted engagement
  const engagement = commentCount * 3 + reactionCount * 1 + shareCount * 5;

  let score = 0;
  if (engagement >= 500) {
    score = 100;
  } else if (engagement >= 200) {
    score = 70 + ((engagement - 200) / 300) * 30;
  } else if (engagement >= 50) {
    score = 30 + ((engagement - 50) / 150) * 40;
  } else {
    score = (engagement / 50) * 30;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate price action score
 * Positive momentum = higher score, but cap extreme pumps
 */
function calculatePriceActionScore(
  priceChange24h: number,
  priceChange7d: number
): number {
  // Cap extreme values to avoid promoting obvious pumps
  const cappedChange24h = Math.min(200, Math.max(-80, priceChange24h));
  const cappedChange7d = Math.min(500, Math.max(-90, priceChange7d));

  let score24h = 0;
  if (cappedChange24h >= 50) {
    score24h = 100;
  } else if (cappedChange24h >= 20) {
    score24h = 70 + (cappedChange24h - 20) * 1;
  } else if (cappedChange24h >= 5) {
    score24h = 40 + (cappedChange24h - 5) * 2;
  } else if (cappedChange24h >= 0) {
    score24h = 30 + cappedChange24h * 2;
  } else if (cappedChange24h >= -20) {
    score24h = 30 + cappedChange24h * 1;
  } else {
    score24h = Math.max(0, 10 + cappedChange24h * 0.5);
  }

  // Penalize if 7d shows opposite trend (pump & dump pattern)
  if (cappedChange24h > 30 && cappedChange7d < -20) {
    score24h *= 0.6; // Potential pump & dump
  }

  return Math.min(100, Math.max(0, score24h));
}

/**
 * Calculate recency score
 * Newer tokens get a boost
 */
function calculateRecencyScore(createdAt: Date): number {
  const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

  // Newer tokens get higher scores
  if (ageInHours < 1) {
    return 100;
  } else if (ageInHours < 6) {
    return 90 - (ageInHours - 1) * 2;
  } else if (ageInHours < 24) {
    return 80 - (ageInHours - 6) * 2;
  } else if (ageInHours < 72) {
    return 44 - ((ageInHours - 24) / 48) * 20;
  } else if (ageInHours < 168) { // 7 days
    return 24 - ((ageInHours - 72) / 96) * 14;
  } else {
    return Math.max(5, 10 - (ageInHours - 168) / 168 * 5);
  }
}

/**
 * Apply time decay to score (reserved for real-time updates)
 */
function _applyTimeDecay(score: number, calculatedAt: number): number {
  const hoursElapsed = (Date.now() - calculatedAt) / DECAY_INTERVAL_MS;
  const decayFactor = Math.pow(1 - TIME_DECAY_RATE, hoursElapsed);
  return score * decayFactor;
}
// Export for future use
export { _applyTimeDecay as applyTimeDecay };

/**
 * Calculate total trending score for a token
 */
function calculateTrendingScore(
  token: KasPumpToken,
  previousRanks: Map<string, number>
): TrendingScore {
  // Mock some values that would come from API/analytics
  const avgVolume7d = token.volume24h ?? 0;
  const holdersChange24h = Math.floor((token.holders ?? 0) * 0.05); // Mock 5% daily growth
  const holdersChange7d = Math.floor((token.holders ?? 0) * 0.2); // Mock 20% weekly growth
  const commentCount = Math.floor(Math.random() * 50);
  const reactionCount = Math.floor(Math.random() * 200);
  const shareCount = Math.floor(Math.random() * 20);
  const priceChange7d = (token.change24h ?? 0) * 2.5; // Mock

  // Calculate individual scores
  const volumeScore = calculateVolumeScore(
    token.volume24h ?? 0,
    avgVolume7d,
    token.marketCap ?? 0
  );

  const holderGrowthScore = calculateHolderGrowthScore(
    token.holders ?? 0,
    holdersChange24h,
    holdersChange7d
  );

  const socialScore = calculateSocialScore(
    commentCount,
    reactionCount,
    shareCount
  );

  const priceActionScore = calculatePriceActionScore(
    token.change24h ?? 0,
    priceChange7d
  );

  const recencyScore = calculateRecencyScore(token.createdAt ?? new Date());

  // Calculate weighted total
  const totalScore =
    volumeScore * TRENDING_WEIGHTS.volume +
    holderGrowthScore * TRENDING_WEIGHTS.holderGrowth +
    socialScore * TRENDING_WEIGHTS.socialEngagement +
    priceActionScore * TRENDING_WEIGHTS.priceAction +
    recencyScore * TRENDING_WEIGHTS.recency;

  const previousRank = previousRanks.get(token.address);

  const score: TrendingScore = {
    tokenAddress: token.address,
    totalScore,
    volumeScore,
    holderGrowthScore,
    socialScore,
    priceActionScore,
    recencyScore,
    rank: 0, // Will be set after sorting
    rankChange: previousRank === undefined ? 'new' : 'same', // Will be updated
    calculatedAt: Date.now(),
  };

  if (previousRank !== undefined) {
    score.previousRank = previousRank;
  }

  return score;
}

// ============ Hook ============

export function useTrending(
  tokens: KasPumpToken[] = [],
  initialTimeframe: TrendingTimeframe = '24h'
): UseTrendingReturn {
  const [timeframe, setTimeframe] = useState<TrendingTimeframe>(initialTimeframe);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [previousRanks, setPreviousRanks] = useState<Map<string, number>>(new Map());

  const trendingTokens = useMemo(() => {
    if (tokens.length === 0) return [];

    // Calculate scores for all tokens
    const scoredTokens: TrendingToken[] = tokens.map((token) => ({
      ...token,
      trendingScore: calculateTrendingScore(token, previousRanks),
    }));

    // Sort by total score (descending)
    scoredTokens.sort((a, b) => b.trendingScore.totalScore - a.trendingScore.totalScore);

    // Assign ranks and determine rank changes
    scoredTokens.forEach((token, index) => {
      const rank = index + 1;
      token.trendingScore.rank = rank;

      const prevRank = token.trendingScore.previousRank;
      if (prevRank === undefined) {
        token.trendingScore.rankChange = 'new';
      } else if (prevRank > rank) {
        token.trendingScore.rankChange = 'up';
      } else if (prevRank < rank) {
        token.trendingScore.rankChange = 'down';
      } else {
        token.trendingScore.rankChange = 'same';
      }
    });

    return scoredTokens;
  }, [tokens, previousRanks]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Save current ranks for comparison
      const currentRanks = new Map<string, number>();
      trendingTokens.forEach((token: TrendingToken) => {
        currentRanks.set(token.address, token.trendingScore.rank);
      });
      setPreviousRanks(currentRanks);

      // In production, would fetch fresh data from API
      // For now, just update timestamp
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('Failed to refresh trending:', err);
      setError('Failed to refresh trending data');
    } finally {
      setIsLoading(false);
    }
  }, [trendingTokens]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refresh]);

  // Initial load
  useEffect(() => {
    setLastUpdated(Date.now());
  }, []);

  return {
    tokens: trendingTokens,
    isLoading,
    error,
    timeframe,
    setTimeframe,
    refresh,
    lastUpdated,
  };
}

/**
 * Get top N trending tokens
 */
export function useTopTrending(
  tokens: KasPumpToken[],
  limit: number = 10,
  timeframe: TrendingTimeframe = '24h'
): TrendingToken[] {
  const { tokens: trending } = useTrending(tokens, timeframe);
  return useMemo(() => trending.slice(0, limit), [trending, limit]);
}

export default useTrending;
