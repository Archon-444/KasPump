import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BlockchainService } from '@/services/blockchain';

export const dynamic = 'force-dynamic';

const TIMEFRAME_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('address');
    const timeframe = searchParams.get('timeframe') || '1h';
    const chainIdParam = searchParams.get('chainId');

    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json({ error: 'Valid token address required' }, { status: 400 });
    }

    const interval = TIMEFRAME_SECONDS[timeframe];
    if (!interval) {
      return NextResponse.json({ error: 'Invalid timeframe' }, { status: 400 });
    }

    const chainId = BlockchainService.resolveChainId(chainIdParam ? parseInt(chainIdParam) : undefined);
    const factory = BlockchainService.getTokenFactory(chainId);
    const ammAddress = await factory.getTokenAMM(tokenAddress);

    if (!ammAddress || ammAddress === ethers.ZeroAddress) {
      return NextResponse.json({ candles: [] });
    }

    const amm = BlockchainService.getAMM(ammAddress, chainId);
    const provider = amm.runner?.provider;
    if (!provider) {
      return NextResponse.json({ candles: [] });
    }

    const currentBlock = await provider.getBlockNumber();
    const blocksToScan = Math.min(50000, currentBlock);
    const fromBlock = currentBlock - blocksToScan;

    const buyFilter = amm.filters.TokensPurchased();
    const sellFilter = amm.filters.TokensSold();

    const [buyEvents, sellEvents] = await Promise.all([
      amm.queryFilter(buyFilter, fromBlock).catch(() => []),
      amm.queryFilter(sellFilter, fromBlock).catch(() => []),
    ]);

    interface TradePoint {
      price: number;
      volume: number;
      blockNumber: number;
      timestamp: number;
    }

    const tradePoints: TradePoint[] = [];

    for (const e of [...buyEvents, ...sellEvents]) {
      const args = (e as any).args;
      if (!args) continue;

      const nativeAmt = parseFloat(ethers.formatEther(args.nativeAmount || args.ethAmount || 0));
      const tokenAmt = parseFloat(ethers.formatEther(args.tokenAmount || 0));
      if (tokenAmt === 0) continue;

      tradePoints.push({
        price: nativeAmt / tokenAmt,
        volume: nativeAmt,
        blockNumber: e.blockNumber,
        timestamp: 0,
      });
    }

    if (tradePoints.length === 0) {
      const info = await amm.getTradingInfo().catch(() => null);
      const currentPrice = info ? parseFloat(ethers.formatEther(info[1])) : 0;
      if (currentPrice > 0) {
        const now = Math.floor(Date.now() / 1000);
        return NextResponse.json({
          candles: [{
            time: Math.floor(now / interval) * interval,
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
            volume: 0,
          }],
        });
      }
      return NextResponse.json({ candles: [] });
    }

    tradePoints.sort((a, b) => a.blockNumber - b.blockNumber);

    const blockTimestamps = new Map<number, number>();
    const uniqueBlocks = [...new Set(tradePoints.map(t => t.blockNumber))];
    const sampleBlocks = uniqueBlocks.filter((_, i) => i % Math.max(1, Math.floor(uniqueBlocks.length / 50)) === 0 || i === uniqueBlocks.length - 1);

    await Promise.all(
      sampleBlocks.map(async (bn) => {
        const block = await provider.getBlock(bn).catch(() => null);
        if (block) blockTimestamps.set(bn, block.timestamp);
      })
    );

    for (const tp of tradePoints) {
      const closest = sampleBlocks.reduce((prev, curr) =>
        Math.abs(curr - tp.blockNumber) < Math.abs(prev - tp.blockNumber) ? curr : prev
      );
      const baseTs = blockTimestamps.get(closest);
      if (baseTs) {
        const blockDiff = tp.blockNumber - closest;
        tp.timestamp = baseTs + blockDiff * 3;
      }
    }

    const candleMap = new Map<number, Candle>();

    for (const tp of tradePoints) {
      if (tp.timestamp === 0) continue;
      const bucket = Math.floor(tp.timestamp / interval) * interval;

      const existing = candleMap.get(bucket);
      if (existing) {
        existing.high = Math.max(existing.high, tp.price);
        existing.low = Math.min(existing.low, tp.price);
        existing.close = tp.price;
        existing.volume += tp.volume;
      } else {
        candleMap.set(bucket, {
          time: bucket,
          open: tp.price,
          high: tp.price,
          low: tp.price,
          close: tp.price,
          volume: tp.volume,
        });
      }
    }

    const candles = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);

    return NextResponse.json({ candles });
  } catch (error: any) {
    console.error('Candles API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candles', details: error.message },
      { status: 500 }
    );
  }
}
