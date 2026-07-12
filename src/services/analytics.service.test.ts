/**
 * Tests for AnalyticsService — bucketing, fee split, and on-chain aggregation
 * with mocked BlockchainService (leaderboard test pattern).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ethers } from 'ethers';

vi.mock('./blockchain', () => ({
  BlockchainService: {
    getTokenFactory: vi.fn(),
    getAMM: vi.fn(),
    getProvider: vi.fn(),
  },
}));

import { AnalyticsService, bucketByInterval, computeFeeSplit } from './analytics.service';
import { BlockchainService } from './blockchain';

const TOKEN_A = '0x' + 'a1'.repeat(20);
const TOKEN_B = '0x' + 'b2'.repeat(20);
const AMM_A = '0x' + 'c3'.repeat(20);
const AMM_B = '0x' + 'd4'.repeat(20);
const TRADER_1 = '0x' + '11'.repeat(20);
const TRADER_2 = '0x' + '22'.repeat(20);

const HOUR = 3600;

// Module-level caches persist across tests — use a fresh chainId per test.
let nextChainId = 90_000;
const freshChainId = () => ++nextChainId;

function tradeEvent(trader: string, volumeEth: string, feeEth: string, timestamp: number) {
  return {
    args: {
      trader,
      isBuy: true,
      nativeAmount: ethers.parseEther(volumeEth),
      tokenAmount: ethers.parseEther('1000'),
      newPrice: ethers.parseEther('0.001'),
      fee: ethers.parseEther(feeEth),
      timestamp: BigInt(timestamp),
    },
  };
}

describe('bucketByInterval', () => {
  it('buckets items into hourly intervals and zero-fills gaps', () => {
    const start = 1_700_000_000 - (1_700_000_000 % HOUR);
    const items = [
      { timestamp: start + 10 },
      { timestamp: start + 20 },
      { timestamp: start + 2 * HOUR + 5 },
    ];
    const buckets = bucketByInterval(items, HOUR, start, start + 3 * HOUR);
    expect(buckets[0]).toEqual({ time: start, count: 2 });
    expect(buckets[1]).toEqual({ time: start + HOUR, count: 0 });
    expect(buckets[2]).toEqual({ time: start + 2 * HOUR, count: 1 });
  });

  it('ignores items outside the window', () => {
    const start = HOUR * 1000;
    const buckets = bucketByInterval(
      [{ timestamp: start - 1 }, { timestamp: start + 5 * HOUR }],
      HOUR,
      start,
      start + HOUR
    );
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });
});

describe('computeFeeSplit', () => {
  it('returns null when the on-chain share is unknown', () => {
    expect(computeFeeSplit(10, null)).toBeNull();
  });

  it('splits fees exactly at 5000 bps', () => {
    expect(computeFeeSplit(10, 5000)).toEqual({
      creatorEarnings24h: 5,
      platformFees24h: 5,
    });
  });
});

describe('AnalyticsService.getPlatformMetrics', () => {
  const mockFactory = {
    getAllTokens: vi.fn(),
    getTokenAMM: vi.fn(),
    filters: { TokenCreated: vi.fn(() => ({})) },
    queryFilter: vi.fn(),
  };
  const mockProvider = { getBlockNumber: vi.fn() };
  const ammData = new Map<string, { events: unknown[]; tradingInfo: unknown[] }>();

  beforeEach(() => {
    vi.clearAllMocks();
    ammData.clear();

    vi.mocked(BlockchainService.getTokenFactory).mockReturnValue(mockFactory as any);
    vi.mocked(BlockchainService.getProvider).mockReturnValue(mockProvider as any);
    vi.mocked(BlockchainService.getAMM).mockImplementation(((address: string) => {
      const data = ammData.get(address.toLowerCase());
      return {
        filters: { Trade: vi.fn(() => ({})) },
        queryFilter: vi.fn(async () => data?.events ?? []),
        getTradingInfo: vi.fn(async () => {
          if (!data) throw new Error('no amm');
          return data.tradingInfo;
        }),
      };
    }) as any);

    mockProvider.getBlockNumber.mockResolvedValue(100_000);
    mockFactory.getAllTokens.mockResolvedValue([TOKEN_A, TOKEN_B]);
    mockFactory.getTokenAMM.mockImplementation(async (token: string) =>
      token === TOKEN_A ? AMM_A : AMM_B
    );
    mockFactory.queryFilter.mockResolvedValue([]);
  });

  function setAmm(
    amm: string,
    opts: { events?: unknown[]; supply?: string; price?: string; volume?: string; graduated?: boolean }
  ) {
    ammData.set(amm.toLowerCase(), {
      events: opts.events ?? [],
      tradingInfo: [
        ethers.parseEther(opts.supply ?? '0'),
        ethers.parseEther(opts.price ?? '0'),
        ethers.parseEther(opts.volume ?? '0'),
        0n,
        opts.graduated ?? false,
      ],
    });
  }

  it('computes lifetime aggregates in a single pass', async () => {
    setAmm(AMM_A, { supply: '100', price: '2', volume: '50', graduated: true });
    setAmm(AMM_B, { supply: '10', price: '1', volume: '30' });

    const metrics = await AnalyticsService.getPlatformMetrics(freshChainId(), 'all');

    expect(metrics.platform.totalTokens).toBe(2);
    expect(metrics.platform.graduatedTokens).toBe(1);
    expect(metrics.platform.successRate).toBe(50);
    expect(metrics.financial.totalVolume).toBe(80);
    expect(metrics.financial.totalMarketCap).toBe(210); // 100*2 + 10*1
    expect(metrics.financial.averageVolume).toBe(40);
    expect(metrics.series).toEqual([]); // 'all' needs an indexer
  });

  it('aggregates 24h activity from Trade events', async () => {
    const now = Math.floor(Date.now() / 1000);
    setAmm(AMM_A, {
      events: [
        tradeEvent(TRADER_1, '2', '0.02', now - HOUR),
        tradeEvent(TRADER_2, '1', '0.01', now - 2 * HOUR),
      ],
    });
    setAmm(AMM_B, { events: [tradeEvent(TRADER_1, '3', '0.03', now - HOUR)] });

    const metrics = await AnalyticsService.getPlatformMetrics(freshChainId(), '24h');

    expect(metrics.financial.volume24h).toBeCloseTo(6);
    expect(metrics.financial.tradingFees24h).toBeCloseTo(0.06);
    expect(metrics.platform.activeTraders24h).toBe(2);
    expect(metrics.platform.activeTokens24h).toBe(2);
    expect(metrics.scan.windowHours).toBe(24);
    // Mocked provider has no call() — CREATOR_FEE_SHARE probe fails, so the
    // split fields must be OMITTED, never defaulted.
    expect('creatorEarnings24h' in metrics.financial).toBe(false);
    expect('platformFees24h' in metrics.financial).toBe(false);
    // Hourly series covers the 24h window with the trades bucketed in.
    const tradedBuckets = metrics.series.filter((p) => (p.trades ?? 0) > 0);
    expect(tradedBuckets.length).toBe(2);
  });

  it('tolerates individual AMM failures', async () => {
    const now = Math.floor(Date.now() / 1000);
    setAmm(AMM_A, { events: [tradeEvent(TRADER_1, '2', '0.02', now - HOUR)], volume: '50' });
    // AMM_B unset — its reads throw.

    const metrics = await AnalyticsService.getPlatformMetrics(freshChainId(), '24h');

    expect(metrics.financial.volume24h).toBeCloseTo(2);
    expect(metrics.financial.totalVolume).toBe(50);
    expect(metrics.platform.totalTokens).toBe(2);
  });

  it('serves repeat calls from cache without re-querying', async () => {
    setAmm(AMM_A, { volume: '10' });
    setAmm(AMM_B, { volume: '20' });
    const chainId = freshChainId();

    await AnalyticsService.getPlatformMetrics(chainId, '24h');
    const callsAfterFirst = mockFactory.getAllTokens.mock.calls.length;
    await AnalyticsService.getPlatformMetrics(chainId, '24h');

    expect(mockFactory.getAllTokens.mock.calls.length).toBe(callsAfterFirst);
  });

  it('builds the 7d series from chunked TokenCreated scans', async () => {
    const now = Math.floor(Date.now() / 1000);
    setAmm(AMM_A, {});
    setAmm(AMM_B, {});
    // The 7d window spans multiple chunked getLogs calls; events arrive once.
    mockFactory.queryFilter.mockResolvedValueOnce([
      { args: { timestamp: BigInt(now - 86_400) } },
      { args: { timestamp: BigInt(now - 86_400) } },
      { args: { timestamp: BigInt(now - 3 * 86_400) } },
    ]);

    const metrics = await AnalyticsService.getPlatformMetrics(freshChainId(), '7d');

    expect(metrics.newTokensInWindow).toBe(3);
    expect(metrics.series.length).toBeGreaterThanOrEqual(7);
    // 7d buckets carry no volume — multi-day Trade scans need an indexer.
    expect(metrics.series.every((p) => p.volume === undefined)).toBe(true);
  });
});
