/**
 * Trader Profile API Route
 * GET /api/traders/[address] - Get specific trader profile
 * GET /api/traders/[address]/trades - Get trader's recent trades
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// ============ Types ============

interface TraderTrade {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  value: number;
  pnl?: number;
  pnlPercent?: number;
  timestamp: number;
  txHash: string;
}

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

const mockProfiles: Record<string, TraderProfile> = {
  '0x1234567890123456789012345678901234567890': {
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
};

const tokenSymbols = ['PEPE', 'MDOG', 'KPUMP', 'SHIB', 'DOGE', 'FLOKI'];
const tokenNames = ['Pepe Token', 'Moon Dog', 'KasPump', 'Shiba Inu', 'Dogecoin', 'Floki'];

function generateMockTrades(address: string, count: number): TraderTrade[] {
  return Array.from({ length: count }, (_, i) => {
    const tokenIndex = i % tokenSymbols.length;
    const isBuy = Math.random() > 0.4;
    const pnl = (Math.random() - 0.3) * 0.5;
    const pnlPercent = (Math.random() - 0.3) * 100;
    const symbol = tokenSymbols[tokenIndex] ?? 'UNKNOWN';
    const name = tokenNames[tokenIndex] ?? 'Unknown Token';

    return {
      id: `${address}-${Date.now()}-${i}`,
      tokenAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
      tokenSymbol: symbol,
      tokenName: name,
      action: isBuy ? 'buy' : 'sell',
      amount: Math.random() * 1000000,
      price: Math.random() * 0.0001,
      value: Math.random() * 0.5,
      ...(isBuy ? {} : { pnl, pnlPercent }),
      timestamp: Date.now() - i * 60 * 60 * 1000,
      txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
    };
  });
}

// ============ GET Handler ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(request.url);
    const includeTrades = searchParams.get('includeTrades') === 'true';
    const tradesLimit = parseInt(searchParams.get('tradesLimit') || '20', 10);

    // Validate address
    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address' },
        { status: 400 }
      );
    }

    // Get profile
    const normalizedAddress = address.toLowerCase();
    let profile = mockProfiles[normalizedAddress];

    // Generate mock profile if not found
    if (!profile) {
      profile = {
        address: normalizedAddress,
        displayName: `Trader ${address.slice(0, 6)}`,
        followers: Math.floor(Math.random() * 500),
        following: Math.floor(Math.random() * 20),
        pnl24h: (Math.random() - 0.3) * 50,
        pnl7d: (Math.random() - 0.2) * 100,
        pnl30d: (Math.random() - 0.1) * 200,
        pnlAllTime: (Math.random()) * 500,
        winRate: 50 + Math.random() * 30,
        totalTrades: Math.floor(Math.random() * 200) + 10,
        avgTradeSize: Math.random() * 0.5,
        avgHoldTime: Math.floor(Math.random() * 72) + 1,
        bestTrade: {
          tokenSymbol: tokenSymbols[Math.floor(Math.random() * tokenSymbols.length)] ?? 'UNKNOWN',
          pnlPercent: Math.floor(Math.random() * 1000) + 100,
        },
        badges: [],
        joinedAt: Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000,
        lastActiveAt: Date.now() - Math.floor(Math.random() * 24) * 60 * 60 * 1000,
        isVerified: false,
      };
    }

    const response: {
      profile: TraderProfile;
      trades?: TraderTrade[];
    } = { profile: profile as TraderProfile };

    // Include trades if requested
    if (includeTrades) {
      response.trades = generateMockTrades(normalizedAddress, tradesLimit);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to get trader profile:', error);
    return NextResponse.json(
      { error: 'Failed to get trader profile' },
      { status: 500 }
    );
  }
}
