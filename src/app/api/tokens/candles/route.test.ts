/**
 * Tests for /api/tokens/candles
 * Regression coverage for the Trade event fix — the route previously queried
 * non-existent TokensPurchased/TokensSold events and always returned empty data.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ethers } from 'ethers';

vi.mock('@/services/blockchain', () => ({
  BlockchainService: {
    resolveChainId: vi.fn(() => 84532),
    getTokenFactory: vi.fn(),
    getAMM: vi.fn(),
    getProvider: vi.fn(),
  },
}));

import { GET } from './route';
import { BlockchainService } from '@/services/blockchain';

const TOKEN = '0x' + '1'.repeat(40);
const AMM = '0x' + '2'.repeat(40);
const TRADER = '0x' + '3'.repeat(40);

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/tokens/candles');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function makeTradeEvent(overrides: Partial<{
  isBuy: boolean;
  nativeAmount: bigint;
  tokenAmount: bigint;
  newPrice: bigint;
  timestamp: number;
  blockNumber: number;
}> = {}) {
  return {
    args: {
      trader: TRADER,
      isBuy: overrides.isBuy ?? true,
      nativeAmount: overrides.nativeAmount ?? ethers.parseEther('1'),
      tokenAmount: overrides.tokenAmount ?? ethers.parseEther('1000'),
      newPrice: overrides.newPrice ?? ethers.parseEther('0.001'),
      fee: ethers.parseEther('0.01'),
      timestamp: BigInt(overrides.timestamp ?? Math.floor(Date.now() / 1000)),
    },
    blockNumber: overrides.blockNumber ?? 100,
    transactionHash: '0x' + 'a'.repeat(64),
  };
}

describe('GET /api/tokens/candles', () => {
  const mockFactory = { getTokenAMM: vi.fn() };
  const mockAmm = {
    filters: { Trade: vi.fn(() => ({})) },
    queryFilter: vi.fn(),
    getTradingInfo: vi.fn(),
  };
  const mockProvider = { getBlockNumber: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(BlockchainService.getTokenFactory).mockReturnValue(mockFactory as any);
    vi.mocked(BlockchainService.getAMM).mockReturnValue(mockAmm as any);
    vi.mocked(BlockchainService.getProvider).mockReturnValue(mockProvider as any);
    mockFactory.getTokenAMM.mockResolvedValue(AMM);
    mockProvider.getBlockNumber.mockResolvedValue(100_000);
    mockAmm.queryFilter.mockResolvedValue([]);
    mockAmm.getTradingInfo.mockResolvedValue([0n, 0n, 0n, 0n, false]);
  });

  it('rejects missing token address', async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects invalid token address', async () => {
    const res = await GET(makeRequest({ address: 'not-an-address' }));
    expect(res.status).toBe(400);
  });

  it('rejects invalid timeframe', async () => {
    const res = await GET(makeRequest({ address: TOKEN, timeframe: '3w' }));
    expect(res.status).toBe(400);
  });

  it('returns empty candles when token has no AMM', async () => {
    mockFactory.getTokenAMM.mockResolvedValue(ethers.ZeroAddress);
    const res = await GET(makeRequest({ address: TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candles).toEqual([]);
  });

  it('queries the Trade event filter (not TokensPurchased/TokensSold)', async () => {
    await GET(makeRequest({ address: TOKEN }));
    expect(mockAmm.filters.Trade).toHaveBeenCalled();
  });

  it('builds candles from Trade events using newPrice and timestamp', async () => {
    const now = Math.floor(Date.now() / 1000);
    mockAmm.queryFilter.mockResolvedValue([
      makeTradeEvent({ timestamp: now - 120, newPrice: ethers.parseEther('0.001'), nativeAmount: ethers.parseEther('1') }),
      makeTradeEvent({ timestamp: now - 60, newPrice: ethers.parseEther('0.002'), nativeAmount: ethers.parseEther('2') }),
    ]);

    const res = await GET(makeRequest({ address: TOKEN, timeframe: '1h' }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.candles.length).toBeGreaterThan(0);
    const candle = body.candles[body.candles.length - 1];
    // Both trades fall into the same 1h bucket: open from first, close from second
    expect(candle.close).toBeCloseTo(0.002);
    expect(candle.volume).toBeCloseTo(3);
  });

  it('aggregates high/low across trades in the same bucket', async () => {
    const now = Math.floor(Date.now() / 1000);
    const bucket = Math.floor(now / 3600) * 3600;
    mockAmm.queryFilter.mockResolvedValue([
      makeTradeEvent({ timestamp: bucket + 10, newPrice: ethers.parseEther('0.001') }),
      makeTradeEvent({ timestamp: bucket + 20, newPrice: ethers.parseEther('0.005') }),
      makeTradeEvent({ timestamp: bucket + 30, newPrice: ethers.parseEther('0.003') }),
    ]);

    const res = await GET(makeRequest({ address: TOKEN, timeframe: '1h' }));
    const body = await res.json();
    const candle = body.candles.find((c: any) => c.time === bucket);

    expect(candle).toBeDefined();
    expect(candle.open).toBeCloseTo(0.001);
    expect(candle.high).toBeCloseTo(0.005);
    expect(candle.low).toBeCloseTo(0.001);
    expect(candle.close).toBeCloseTo(0.003);
  });

  it('skips trades with zero price or timestamp', async () => {
    mockAmm.queryFilter.mockResolvedValue([
      makeTradeEvent({ newPrice: 0n }),
      makeTradeEvent({ timestamp: 0 }),
    ]);
    mockAmm.getTradingInfo.mockResolvedValue([0n, 0n, 0n, 0n, false]);

    const res = await GET(makeRequest({ address: TOKEN }));
    const body = await res.json();
    expect(body.candles).toEqual([]);
  });

  it('falls back to a flat candle from current price when no trades exist', async () => {
    mockAmm.queryFilter.mockResolvedValue([]);
    mockAmm.getTradingInfo.mockResolvedValue([0n, ethers.parseEther('0.004'), 0n, 0n, false]);

    const res = await GET(makeRequest({ address: TOKEN }));
    const body = await res.json();

    expect(body.candles).toHaveLength(1);
    expect(body.candles[0].open).toBeCloseTo(0.004);
    expect(body.candles[0].volume).toBe(0);
  });
});
