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

    const provider = amm.runner?.provider;
    const allEvents = [
      ...buyEvents.map(e => ({ e, type: 'buy' as const, trader: (e as any).args?.buyer || '' })),
      ...sellEvents.map(e => ({ e, type: 'sell' as const, trader: (e as any).args?.seller || '' })),
    ]
      .sort((a, b) => b.e.blockNumber - a.e.blockNumber)
      .slice(0, limit);

    const uniqueBlocks = [...new Set(allEvents.map(t => t.e.blockNumber))];
    const blockTimestamps = new Map<number, number>();

    if (provider) {
      await Promise.all(
        uniqueBlocks.slice(0, 50).map(async (bn) => {
          const block = await provider.getBlock(bn).catch(() => null);
          if (block) blockTimestamps.set(bn, block.timestamp);
        })
      );
    }

    const trades = allEvents.map(({ e, type, trader }) => ({
      type,
      trader,
      nativeAmount: ethers.formatEther((e as any).args?.nativeAmount || 0),
      tokenAmount: ethers.formatEther((e as any).args?.tokenAmount || 0),
      timestamp: (blockTimestamps.get(e.blockNumber) || 0) * 1000,
      txHash: e.transactionHash,
      blockNumber: e.blockNumber,
    }));

    return NextResponse.json({ trades });
  } catch (error: any) {
    console.error('Trades API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades', details: error.message },
      { status: 500 }
    );
  }
}
