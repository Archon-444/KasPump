import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BlockchainService } from '@/services/blockchain';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('address');
    const limitParam = searchParams.get('limit');
    const chainIdParam = searchParams.get('chainId');

    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json({ error: 'Valid token address required' }, { status: 400 });
    }

    const chainId = BlockchainService.resolveChainId(chainIdParam ? parseInt(chainIdParam) : undefined);
    const limit = Math.min(parseInt(limitParam || '50'), 200);

    const factory = BlockchainService.getTokenFactory(chainId);
    const ammAddress = await factory.getTokenAMM(tokenAddress);

    if (!ammAddress || ammAddress === ethers.ZeroAddress) {
      return NextResponse.json({ trades: [] });
    }

    const amm = BlockchainService.getAMM(ammAddress, chainId);

    const buyFilter = amm.filters.TokensPurchased();
    const sellFilter = amm.filters.TokensSold();

    const currentBlock = await amm.runner?.provider?.getBlockNumber() || 0;
    const fromBlock = Math.max(0, currentBlock - 10000);

    const [buyEvents, sellEvents] = await Promise.all([
      amm.queryFilter(buyFilter, fromBlock).catch(() => []),
      amm.queryFilter(sellFilter, fromBlock).catch(() => []),
    ]);

    const trades = [
      ...buyEvents.map(e => ({
        type: 'buy' as const,
        trader: (e as any).args?.buyer || '',
        nativeAmount: ethers.formatEther((e as any).args?.nativeAmount || 0),
        tokenAmount: ethers.formatEther((e as any).args?.tokenAmount || 0),
        timestamp: 0,
        txHash: e.transactionHash,
        blockNumber: e.blockNumber,
      })),
      ...sellEvents.map(e => ({
        type: 'sell' as const,
        trader: (e as any).args?.seller || '',
        nativeAmount: ethers.formatEther((e as any).args?.nativeAmount || 0),
        tokenAmount: ethers.formatEther((e as any).args?.tokenAmount || 0),
        timestamp: 0,
        txHash: e.transactionHash,
        blockNumber: e.blockNumber,
      })),
    ]
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, limit);

    return NextResponse.json({ trades });
  } catch (error: any) {
    console.error('Trades API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades', details: error.message },
      { status: 500 }
    );
  }
}
