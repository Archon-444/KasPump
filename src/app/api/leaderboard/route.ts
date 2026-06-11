import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BlockchainService } from '@/services/blockchain';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export interface LeaderboardEntry {
  address: string;
  totalVolume: number;
  trades: number;
  buys: number;
  sells: number;
  tokensTraded: number;
}

interface LeaderboardResponse {
  traders: LeaderboardEntry[];
  windowHours: number;
  tokensScanned: number;
  generatedAt: number;
}

const BLOCKS_PER_DAY: Record<number, number> = {
  56: 28_800,
  97: 28_800,
  42161: 345_600,
  421614: 345_600,
  8453: 43_200,
  84532: 43_200,
};

// Aggregating Trade events across every AMM is RPC-heavy — cache hard.
const cache = new Map<string, { data: LeaderboardResponse; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TOKENS_SCANNED = 50;

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.headers['Retry-After'] },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const chainIdParam = searchParams.get('chainId');
    const limitParam = searchParams.get('limit');

    const chainId = BlockchainService.resolveChainId(chainIdParam ? parseInt(chainIdParam) : undefined);
    const limit = Math.min(parseInt(limitParam || '25'), 100);

    const cacheKey = `leaderboard:${chainId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(
        { ...cached.data, traders: cached.data.traders.slice(0, limit) },
        { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', ...rateLimitResult.headers } }
      );
    }

    const factory = BlockchainService.getTokenFactory(chainId);
    const provider = BlockchainService.getProvider(chainId);

    const [allTokens, currentBlock] = await Promise.all([
      factory.getAllTokens(),
      provider.getBlockNumber(),
    ]);

    const blocksPerDay = BLOCKS_PER_DAY[chainId] || 43_200;
    const fromBlock = Math.max(0, currentBlock - blocksPerDay);
    const tokensToScan = allTokens.slice(-MAX_TOKENS_SCANNED); // newest tokens

    // trader -> aggregate stats
    const stats = new Map<string, LeaderboardEntry & { tokens: Set<string> }>();

    await Promise.all(
      tokensToScan.map(async (tokenAddress) => {
        try {
          const ammAddress = await factory.getTokenAMM(tokenAddress);
          if (!ammAddress || ammAddress === ethers.ZeroAddress) return;

          const amm = BlockchainService.getAMM(ammAddress, chainId);
          const events = await amm.queryFilter(amm.filters.Trade(), fromBlock, currentBlock);

          for (const event of events) {
            const trader = event.args.trader.toLowerCase();
            const volume = parseFloat(ethers.formatEther(event.args.nativeAmount));

            let entry = stats.get(trader);
            if (!entry) {
              entry = { address: trader, totalVolume: 0, trades: 0, buys: 0, sells: 0, tokensTraded: 0, tokens: new Set() };
              stats.set(trader, entry);
            }
            entry.totalVolume += volume;
            entry.trades += 1;
            if (event.args.isBuy) entry.buys += 1;
            else entry.sells += 1;
            entry.tokens.add(tokenAddress.toLowerCase());
          }
        } catch {
          // Skip tokens whose AMM reads fail — partial leaderboard beats none
        }
      })
    );

    const traders: LeaderboardEntry[] = Array.from(stats.values())
      .map(({ tokens, ...entry }) => ({ ...entry, tokensTraded: tokens.size }))
      .sort((a, b) => b.totalVolume - a.totalVolume);

    const data: LeaderboardResponse = {
      traders,
      windowHours: 24,
      tokensScanned: tokensToScan.length,
      generatedAt: Date.now(),
    };

    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(
      { ...data, traders: traders.slice(0, limit) },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', ...rateLimitResult.headers } }
    );
  } catch (error: any) {
    console.error('Leaderboard API Error:', error);
    return NextResponse.json(
      { error: 'Failed to build leaderboard', details: error.message },
      { status: 500 }
    );
  }
}
