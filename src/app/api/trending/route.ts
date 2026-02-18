/**
 * Trending API Route
 * GET /api/trending - Get trending tokens sorted by trend score
 */

import { NextRequest, NextResponse } from 'next/server';

// ============ Types ============

interface TrendingToken {
  address: string;
  name: string;
  symbol: string;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  holders: number;
  trendScore: number;
  rank: number;
  previousRank?: number;
}

interface TrendingScoreFactors {
  volumeScore: number;
  holderGrowthScore: number;
  socialScore: number;
  priceActionScore: number;
  recencyScore: number;
}

// ============ Weights ============

const WEIGHTS = {
  volume: 0.35,
  holderGrowth: 0.20,
  socialEngagement: 0.20,
  priceAction: 0.15,
  recency: 0.10,
};

// ============ Mock Data Store ============

// In production, this would query a database with real-time metrics
const mockTokens: TrendingToken[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    name: 'KasPump Token',
    symbol: 'KPUMP',
    marketCap: 1500000,
    volume24h: 450000,
    priceChange24h: 25.5,
    holders: 2450,
    trendScore: 0,
    rank: 0,
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    name: 'Moon Dog',
    symbol: 'MDOG',
    marketCap: 850000,
    volume24h: 320000,
    priceChange24h: 42.3,
    holders: 1820,
    trendScore: 0,
    rank: 0,
  },
  {
    address: '0x3456789012345678901234567890123456789012',
    name: 'Pepe Pump',
    symbol: 'PPUMP',
    marketCap: 2200000,
    volume24h: 580000,
    priceChange24h: 15.2,
    holders: 3200,
    trendScore: 0,
    rank: 0,
  },
];

// Store previous ranks
const previousRanks = new Map<string, number>();

// ============ Score Calculation ============

function calculateVolumeScore(volume24h: number, marketCap: number): number {
  if (marketCap === 0) return 0;
  const ratio = (volume24h / marketCap) * 100;
  if (ratio >= 100) return 100;
  if (ratio >= 50) return 80 + (ratio - 50) * 0.4;
  if (ratio >= 20) return 50 + (ratio - 20);
  return Math.min(50, ratio * 2.5);
}

function calculateHolderGrowthScore(holders: number): number {
  // Mock: assume 5% daily growth
  const growthRate = 5;
  if (growthRate >= 20) return 100;
  if (growthRate >= 10) return 70 + growthRate * 3;
  if (growthRate >= 5) return 40 + growthRate * 6;
  return Math.min(40, growthRate * 8);
}

function calculateSocialScore(): number {
  // Mock: would aggregate comments, reactions, shares
  return Math.floor(Math.random() * 40) + 40;
}

function calculatePriceActionScore(priceChange24h: number): number {
  const capped = Math.min(100, Math.max(-50, priceChange24h));
  if (capped >= 50) return 100;
  if (capped >= 20) return 70 + (capped - 20) * 1;
  if (capped >= 5) return 40 + (capped - 5) * 2;
  if (capped >= 0) return 30 + capped * 2;
  return Math.max(0, 30 + capped);
}

function calculateRecencyScore(hoursOld: number): number {
  if (hoursOld < 1) return 100;
  if (hoursOld < 6) return 90 - (hoursOld - 1) * 2;
  if (hoursOld < 24) return 80 - (hoursOld - 6) * 2;
  if (hoursOld < 72) return 44 - ((hoursOld - 24) / 48) * 20;
  return Math.max(5, 24 - (hoursOld - 72) / 24);
}

function calculateTrendScore(token: TrendingToken): number {
  const volumeScore = calculateVolumeScore(token.volume24h, token.marketCap);
  const holderScore = calculateHolderGrowthScore(token.holders);
  const socialScore = calculateSocialScore();
  const priceScore = calculatePriceActionScore(token.priceChange24h);
  const recencyScore = calculateRecencyScore(Math.random() * 48); // Mock hours

  return (
    volumeScore * WEIGHTS.volume +
    holderScore * WEIGHTS.holderGrowth +
    socialScore * WEIGHTS.socialEngagement +
    priceScore * WEIGHTS.priceAction +
    recencyScore * WEIGHTS.recency
  );
}

// ============ GET Handler ============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Calculate trend scores
    const scoredTokens = mockTokens.map((token) => ({
      ...token,
      trendScore: calculateTrendScore(token),
      previousRank: previousRanks.get(token.address),
    }));

    // Sort by score descending
    scoredTokens.sort((a, b) => b.trendScore - a.trendScore);

    // Assign ranks
    scoredTokens.forEach((token, index) => {
      token.rank = index + 1;
    });

    // Update previous ranks for next call
    scoredTokens.forEach((token) => {
      previousRanks.set(token.address, token.rank);
    });

    // Apply limit
    const result = scoredTokens.slice(0, Math.min(limit, 100));

    return NextResponse.json({
      tokens: result,
      timeframe,
      totalCount: mockTokens.length,
      calculatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to get trending tokens:', error);
    return NextResponse.json(
      { error: 'Failed to get trending tokens' },
      { status: 500 }
    );
  }
}
