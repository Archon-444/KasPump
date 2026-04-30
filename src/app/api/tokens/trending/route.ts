import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BlockchainService } from '@/services/blockchain';

export const dynamic = 'force-dynamic';

interface ScoredToken {
  address: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  creator: string;
  currentPrice: number;
  marketCap: number;
  totalVolume: number;
  graduationProgress: number;
  isGraduated: boolean;
  score: number;
  ammAddress: string;
  createdAt: number; // unix seconds
}

const JUST_LAUNCHED_WINDOW_SECS = 10 * 60;       // last 10 minutes
const FADING_AGE_SECS = 24 * 60 * 60;            // older than 24h
const FADING_MAX_PROGRESS_BPS = 30;              // < 30% graduation progress

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainIdParam = searchParams.get('chainId');
    const limitParam = searchParams.get('limit');

    const chainId = BlockchainService.resolveChainId(chainIdParam ? parseInt(chainIdParam) : undefined);
    const limit = Math.min(parseInt(limitParam || '10'), 50);

    const factory = BlockchainService.getTokenFactory(chainId);
    const allTokens = await factory.getAllTokens();

    const scored: ScoredToken[] = [];

    await Promise.all(
      allTokens.map(async (tokenAddress) => {
        try {
          const [config, ammAddress] = await Promise.all([
            factory.getTokenConfig(tokenAddress),
            factory.getTokenAMM(tokenAddress),
          ]);

          if (!ammAddress || ammAddress === ethers.ZeroAddress) return;

          const amm = BlockchainService.getAMM(ammAddress, chainId);
          const info = await amm.getTradingInfo();

          const currentPrice = parseFloat(ethers.formatEther(info[1]));
          const totalVolume = parseFloat(ethers.formatEther(info[2]));
          const graduationProgress = parseFloat(ethers.formatUnits(info[3], 2));
          const isGraduated = info[4];
          const currentSupply = parseFloat(ethers.formatEther(info[0]));
          const marketCap = currentSupply * currentPrice;

          const volumeScore = Math.min(totalVolume / 10, 100) * 0.4;
          const graduationBonus = graduationProgress > 75 ? 25 : graduationProgress > 50 ? 15 : 0;
          const mcapScore = Math.min(marketCap / 100, 50) * 0.3;
          const activeBonus = !isGraduated && totalVolume > 0 ? 10 : 0;
          const score = volumeScore + graduationBonus + mcapScore + activeBonus;

          scored.push({
            address: tokenAddress,
            name: config.name,
            symbol: config.symbol,
            description: config.description,
            imageUrl: config.imageUrl,
            creator: config.creator,
            currentPrice,
            marketCap,
            totalVolume,
            graduationProgress,
            isGraduated,
            score,
            ammAddress,
            createdAt: Number(config.createdAt),
          });
        } catch {
          // Skip tokens that fail
        }
      })
    );

    scored.sort((a, b) => b.score - a.score);
    const trending = scored.slice(0, limit);
    const kingOfTheHill = trending.length > 0 ? trending[0] : null;

    const now = Math.floor(Date.now() / 1000);

    // Just Launched: created in the last 10 minutes, sorted by recency with
    // early-volume tiebreaker so a launch with traction outranks pure recency.
    const justLaunched = scored
      .filter(t => !t.isGraduated && now - t.createdAt <= JUST_LAUNCHED_WINDOW_SECS)
      .sort((a, b) => {
        if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
        return b.totalVolume - a.totalVolume;
      })
      .slice(0, 5);

    // Fading: older than 24h AND graduation progress < 30%. Without per-trade
    // timestamps in the on-chain config we approximate "no recent activity" by
    // age + low progress; a richer signal lands when trade indexing arrives.
    const fading = scored
      .filter(t =>
        !t.isGraduated &&
        now - t.createdAt >= FADING_AGE_SECS &&
        t.graduationProgress < FADING_MAX_PROGRESS_BPS
      )
      .sort((a, b) => a.graduationProgress - b.graduationProgress)
      .slice(0, 5);

    return NextResponse.json({
      trending,
      kingOfTheHill,
      justLaunched,
      aboutToGraduate: scored
        .filter(t => !t.isGraduated && t.graduationProgress >= 75)
        .sort((a, b) => b.graduationProgress - a.graduationProgress)
        .slice(0, 5),
      fading,
      totalTokens: allTokens.length,
    });
  } catch (error: any) {
    console.error('Trending API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending tokens', details: error.message },
      { status: 500 }
    );
  }
}
