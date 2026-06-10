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
    const provider = BlockchainService.getProvider(chainId);

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000);

    const tradeFilter = amm.filters.Trade();
    const events = await amm.queryFilter(tradeFilter, fromBlock).catch(() => []);

    const sorted = [...events].sort((a, b) => b.blockNumber - a.blockNumber).slice(0, limit);

    const trades = sorted.map(e => ({
      type: e.args.isBuy ? 'buy' as const : 'sell' as const,
      trader: e.args.trader,
      nativeAmount: ethers.formatEther(e.args.nativeAmount),
      tokenAmount: ethers.formatEther(e.args.tokenAmount),
      price: ethers.formatEther(e.args.newPrice),
      fee: ethers.formatEther(e.args.fee),
      timestamp: Number(e.args.timestamp) * 1000,
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
