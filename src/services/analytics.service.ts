import { ethers } from 'ethers';
import { BlockchainService } from './blockchain';
import type {
  AnalyticsData,
  AnalyticsTimeframe,
  GrowthPoint,
} from '../types/analytics';

// Back-compat alias: the API route and tests referred to PlatformMetrics.
export type PlatformMetrics = AnalyticsData;

const BLOCKS_PER_DAY: Record<number, number> = {
  56: 28_800,
  97: 28_800,
  42161: 345_600,
  421614: 345_600,
  8453: 43_200,
  84532: 43_200,
};

// Factory deployment blocks (deployments.json) — floor for event scans.
const FACTORY_DEPLOY_BLOCK: Record<number, number> = {
  97: 70_735_503,
};

// getLogs providers commonly cap ranges at 50k blocks.
const MAX_BLOCK_RANGE = 49_999;
const MAX_TOKENS_SCANNED = 50;
const CACHE_TTL_MS = 5 * 60 * 1000;

const HOUR = 3_600;
const DAY = 86_400;

interface LifetimeAggregates {
  totalTokens: number;
  graduatedTokens: number;
  successRate: number;
  totalVolume: number;
  totalMarketCap: number;
  averageVolume: number;
  averageMarketCap: number;
}

interface ActivityScan {
  volume24h: number;
  tradingFees24h: number;
  creatorFeeBps: number | null;
  trades24h: number;
  activeTraders24h: number;
  activeTokens24h: number;
  hourlyBuckets: GrowthPoint[];
  tokensScanned: number;
  partial: boolean;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return Promise.resolve(hit.data as T);
  }
  return compute().then((data) => {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  });
}

/** Exported for tests. Buckets timestamped items into fixed intervals. */
export function bucketByInterval(
  items: { timestamp: number }[],
  intervalSec: number,
  windowStart: number,
  windowEnd: number
): { time: number; count: number }[] {
  const buckets: { time: number; count: number }[] = [];
  const firstBucket = Math.floor(windowStart / intervalSec) * intervalSec;
  for (let t = firstBucket; t <= windowEnd; t += intervalSec) {
    buckets.push({ time: t, count: 0 });
  }
  for (const item of items) {
    if (item.timestamp < windowStart || item.timestamp > windowEnd) continue;
    const idx = Math.floor((item.timestamp - firstBucket) / intervalSec);
    const bucket = buckets[idx];
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

/** Exported for tests. Splits total fees when the on-chain share is known. */
export function computeFeeSplit(
  tradingFees: number,
  creatorFeeBps: number | null
): { creatorEarnings24h: number; platformFees24h: number } | null {
  if (creatorFeeBps === null) return null;
  const creatorEarnings24h = (tradingFees * creatorFeeBps) / 10_000;
  return {
    creatorEarnings24h,
    platformFees24h: tradingFees - creatorEarnings24h,
  };
}

export class AnalyticsService {
  /**
   * Platform metrics computed from on-chain data. Windowed metrics (24h) come
   * from a bounded Trade-event scan over the newest AMMs; lifetime aggregates
   * from per-token trading info; the time series from factory TokenCreated
   * events. Everything is cached for 5 minutes per chain.
   */
  static async getPlatformMetrics(
    chainId: number,
    timeframe: AnalyticsTimeframe = '24h'
  ): Promise<AnalyticsData> {
    try {
      const [lifetime, activity, series] = await Promise.all([
        cached(`lifetime:${chainId}`, () => this.getLifetimeAggregates(chainId)),
        cached(`activity:${chainId}`, () => this.scanActivity(chainId)),
        timeframe === 'all'
          ? Promise.resolve<GrowthPoint[]>([])
          : cached(`created:${chainId}:${timeframe}`, () =>
              this.getTokenCreationSeries(chainId, timeframe)
            ),
      ]);

      const mergedSeries =
        timeframe === '24h' ? this.mergeHourly(series, activity.hourlyBuckets) : series;

      const feeSplit = computeFeeSplit(activity.tradingFees24h, activity.creatorFeeBps);

      return {
        timestamp: new Date().toISOString(),
        timeframe,
        chainId,
        platform: {
          totalTokens: lifetime.totalTokens,
          graduatedTokens: lifetime.graduatedTokens,
          successRate: lifetime.successRate,
          activeTokens24h: activity.activeTokens24h,
          activeTraders24h: activity.activeTraders24h,
        },
        financial: {
          totalVolume: lifetime.totalVolume,
          totalMarketCap: lifetime.totalMarketCap,
          averageVolume: lifetime.averageVolume,
          averageMarketCap: lifetime.averageMarketCap,
          volume24h: activity.volume24h,
          tradingFees24h: activity.tradingFees24h,
          ...(feeSplit ?? {}),
        },
        series: mergedSeries,
        newTokensInWindow: mergedSeries.reduce((sum, p) => sum + p.tokensCreated, 0),
        scan: {
          tokensScanned: activity.tokensScanned,
          windowHours: 24,
          partial: activity.partial,
        },
      };
    } catch (error) {
      console.error(`Analytics Error [Chain ${chainId}]:`, error);
      throw error;
    }
  }

  // --- Sub-computations ---

  private static async getLifetimeAggregates(chainId: number): Promise<LifetimeAggregates> {
    const factory = BlockchainService.getTokenFactory(chainId);
    const allTokens = await factory.getAllTokens();
    const totalTokens = allTokens.length;

    let totalVolume = 0;
    let totalMarketCap = 0;
    let graduatedTokens = 0;

    // Single pass per token: one getTokenAMM + one getTradingInfo.
    await Promise.all(
      allTokens.map(async (token) => {
        try {
          const ammAddress = await factory.getTokenAMM(token);
          if (ammAddress === ethers.ZeroAddress) return;

          const amm = BlockchainService.getAMM(ammAddress, chainId);
          // [currentSupply, currentPrice, totalVolume, graduationProgress, isGraduated]
          const info = await amm.getTradingInfo();
          totalVolume += parseFloat(ethers.formatEther(info[2]));
          totalMarketCap +=
            parseFloat(ethers.formatEther(info[0])) * parseFloat(ethers.formatEther(info[1]));
          if (info[4]) graduatedTokens += 1;
        } catch {
          // Partial aggregates beat a failed page.
        }
      })
    );

    return {
      totalTokens,
      graduatedTokens,
      successRate: totalTokens > 0 ? (graduatedTokens / totalTokens) * 100 : 0,
      totalVolume,
      totalMarketCap,
      averageVolume: totalTokens > 0 ? totalVolume / totalTokens : 0,
      averageMarketCap: totalTokens > 0 ? totalMarketCap / totalTokens : 0,
    };
  }

  private static async scanActivity(chainId: number): Promise<ActivityScan> {
    const factory = BlockchainService.getTokenFactory(chainId);
    const provider = BlockchainService.getProvider(chainId);

    const [allTokens, currentBlock] = await Promise.all([
      factory.getAllTokens(),
      provider.getBlockNumber(),
    ]);

    const blocksPerDay = BLOCKS_PER_DAY[chainId] || 43_200;
    const fromBlock = Math.max(0, currentBlock - blocksPerDay);
    const tokensToScan = allTokens.slice(-MAX_TOKENS_SCANNED);

    let volumeWei = 0n;
    let feesWei = 0n;
    let trades24h = 0;
    const traders = new Set<string>();
    const activeAmms = new Set<string>();
    const nowSec = Math.floor(Date.now() / 1000);
    const windowStart = nowSec - 24 * HOUR;
    const hourAgg = new Map<number, { volume: bigint; trades: number; traders: Set<string> }>();
    let creatorFeeBps: number | null = null;
    let probed = false;

    await Promise.all(
      tokensToScan.map(async (tokenAddress) => {
        try {
          const ammAddress = await factory.getTokenAMM(tokenAddress);
          if (!ammAddress || ammAddress === ethers.ZeroAddress) return;

          const amm = BlockchainService.getAMM(ammAddress, chainId);
          const events = await amm.queryFilter(amm.filters.Trade(), fromBlock, currentBlock);

          // The stale checked-in typechain types predate the fee-split
          // getters, so probe CREATOR_FEE_SHARE via a one-fragment contract;
          // deployed AMMs may legitimately not have it.
          if (!probed && events.length > 0) {
            probed = true;
            try {
              const probe = new ethers.Contract(
                ammAddress,
                ['function CREATOR_FEE_SHARE() view returns (uint256)'],
                provider
              );
              const share = (await probe.CREATOR_FEE_SHARE!()) as bigint;
              creatorFeeBps = Number(share);
            } catch {
              creatorFeeBps = null;
            }
          }

          for (const event of events) {
            const ts = Number(event.args.timestamp);
            if (ts < windowStart) continue;
            volumeWei += event.args.nativeAmount;
            feesWei += event.args.fee;
            trades24h += 1;
            traders.add(event.args.trader.toLowerCase());
            activeAmms.add(ammAddress.toLowerCase());

            const hourStart = Math.floor(ts / HOUR) * HOUR;
            let agg = hourAgg.get(hourStart);
            if (!agg) {
              agg = { volume: 0n, trades: 0, traders: new Set() };
              hourAgg.set(hourStart, agg);
            }
            agg.volume += event.args.nativeAmount;
            agg.trades += 1;
            agg.traders.add(event.args.trader.toLowerCase());
          }
        } catch {
          // Skip AMMs whose reads fail — partial metrics beat none.
        }
      })
    );

    const firstHour = Math.floor(windowStart / HOUR) * HOUR;
    const hourlyBuckets: GrowthPoint[] = [];
    for (let t = firstHour; t <= nowSec; t += HOUR) {
      const agg = hourAgg.get(t);
      hourlyBuckets.push({
        time: t,
        tokensCreated: 0, // filled by mergeHourly from the creation series
        volume: agg ? parseFloat(ethers.formatEther(agg.volume)) : 0,
        trades: agg ? agg.trades : 0,
        activeTraders: agg ? agg.traders.size : 0,
      });
    }

    return {
      volume24h: parseFloat(ethers.formatEther(volumeWei)),
      tradingFees24h: parseFloat(ethers.formatEther(feesWei)),
      creatorFeeBps,
      trades24h,
      activeTraders24h: traders.size,
      activeTokens24h: activeAmms.size,
      hourlyBuckets,
      tokensScanned: tokensToScan.length,
      partial: allTokens.length > tokensToScan.length,
    };
  }

  private static async getTokenCreationSeries(
    chainId: number,
    timeframe: '24h' | '7d'
  ): Promise<GrowthPoint[]> {
    const factory = BlockchainService.getTokenFactory(chainId);
    const provider = BlockchainService.getProvider(chainId);

    const currentBlock = await provider.getBlockNumber();
    const blocksPerDay = BLOCKS_PER_DAY[chainId] || 43_200;
    const days = timeframe === '24h' ? 1 : 7;
    const floor = FACTORY_DEPLOY_BLOCK[chainId] ?? 0;
    const fromBlock = Math.max(floor, currentBlock - days * blocksPerDay);

    // Chunk getLogs — providers cap ranges around 50k blocks.
    const timestamps: { timestamp: number }[] = [];
    for (let start = fromBlock; start <= currentBlock; start += MAX_BLOCK_RANGE + 1) {
      const end = Math.min(start + MAX_BLOCK_RANGE, currentBlock);
      const events = await factory.queryFilter(factory.filters.TokenCreated(), start, end);
      for (const event of events) {
        // TokenCreated carries its own timestamp arg — no getBlock calls.
        timestamps.push({ timestamp: Number(event.args.timestamp) });
      }
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const windowStart = nowSec - days * DAY;
    const intervalSec = timeframe === '24h' ? HOUR : DAY;
    return bucketByInterval(timestamps, intervalSec, windowStart, nowSec).map(
      ({ time, count }) => ({ time, tokensCreated: count })
    );
  }

  private static mergeHourly(
    creationSeries: GrowthPoint[],
    activityBuckets: GrowthPoint[]
  ): GrowthPoint[] {
    const created = new Map(creationSeries.map((p) => [p.time, p.tokensCreated]));
    return activityBuckets.map((p) => ({
      ...p,
      tokensCreated: created.get(p.time) ?? 0,
    }));
  }
}
