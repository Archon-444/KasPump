/**
 * Traders API Route
 * GET /api/traders - Get trader leaderboard
 * GET /api/traders/[address] - Get trader profile
 */

import { NextRequest, NextResponse } from 'next/server';

// ============ Types ============

interface TraderProfile {
  address: string;
  displayName?: string;
  followers: number;
  following: number;
  pnl24h: number;
  pnl7d: number;
  pnl30d: number;
  pnlAllTime: number;
  winRate: number;
  totalTrades: number;
  avgTradeSize: number;
  avgHoldTime: number;
  bestTrade: {
    tokenSymbol: string;
    pnlPercent: number;
  };
  badges: string[];
  joinedAt: number;
  lastActiveAt: number;
  isVerified: boolean;
}

// ============ Mock Data ============

const mockTraders: TraderProfile[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    displayName: 'CryptoWhale',
    followers: 1520,
    following: 12,
    pnl24h: 15.2,
    pnl7d: 45.8,
    pnl30d: 125.3,
    pnlAllTime: 850.5,
    winRate: 72.5,
    totalTrades: 342,
    avgTradeSize: 0.5,
    avgHoldTime: 48,
    bestTrade: { tokenSymbol: 'PEPE', pnlPercent: 1250 },
    badges: ['whale', 'consistent', 'verified'],
    joinedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 2 * 60 * 60 * 1000,
    isVerified: true,
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    displayName: 'EarlySniperX',
    followers: 892,
    following: 5,
    pnl24h: 42.8,
    pnl7d: 156.2,
    pnl30d: 380.5,
    pnlAllTime: 2150.8,
    winRate: 68.2,
    totalTrades: 128,
    avgTradeSize: 0.25,
    avgHoldTime: 12,
    bestTrade: { tokenSymbol: 'MDOG', pnlPercent: 3500 },
    badges: ['sniper', 'diamond'],
    joinedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 30 * 60 * 1000,
    isVerified: false,
  },
  {
    address: '0x3456789012345678901234567890123456789012',
    displayName: 'DiamondHands',
    followers: 2341,
    following: 8,
    pnl24h: -2.5,
    pnl7d: 28.4,
    pnl30d: 89.2,
    pnlAllTime: 520.1,
    winRate: 65.8,
    totalTrades: 567,
    avgTradeSize: 0.8,
    avgHoldTime: 168,
    bestTrade: { tokenSymbol: 'SHIB', pnlPercent: 890 },
    badges: ['diamond', 'influencer', 'verified'],
    joinedAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 1 * 60 * 60 * 1000,
    isVerified: true,
  },
  {
    address: '0x4567890123456789012345678901234567890123',
    displayName: 'DeFiGuru',
    followers: 654,
    following: 15,
    pnl24h: 8.9,
    pnl7d: 32.1,
    pnl30d: 78.5,
    pnlAllTime: 445.2,
    winRate: 71.2,
    totalTrades: 234,
    avgTradeSize: 0.35,
    avgHoldTime: 24,
    bestTrade: { tokenSymbol: 'DOGE', pnlPercent: 650 },
    badges: ['consistent'],
    joinedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 4 * 60 * 60 * 1000,
    isVerified: false,
  },
];

// ============ GET Handler ============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'pnl7d';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Sort traders
    const validSortFields = ['pnl24h', 'pnl7d', 'pnl30d', 'pnlAllTime', 'winRate', 'followers', 'totalTrades'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'pnl7d';

    const sortedTraders = [...mockTraders].sort((a, b) => {
      const aValue = a[sortField as keyof TraderProfile];
      const bValue = b[sortField as keyof TraderProfile];
      return (bValue as number) - (aValue as number);
    });

    // Paginate
    const paginatedTraders = sortedTraders.slice(offset, offset + limit);

    return NextResponse.json({
      traders: paginatedTraders,
      total: mockTraders.length,
      sortBy: sortField,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to get traders:', error);
    return NextResponse.json(
      { error: 'Failed to get traders' },
      { status: 500 }
    );
  }
}
