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
}

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
          });
        } catch {
          // Skip tokens that fail
        }
      })
    );

    scored.sort((a, b) => b.score - a.score);
    const trending = scored.slice(0, limit);
    const kingOfTheHill = trending.length > 0 ? trending[0] : null;

    return NextResponse.json({
      trending,
      kingOfTheHill,
      aboutToGraduate: scored
        .filter(t => !t.isGraduated && t.graduationProgress >= 75)
        .sort((a, b) => b.graduationProgress - a.graduationProgress)
        .slice(0, 5),
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
