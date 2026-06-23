/**
 * Tests for /api/leaderboard
 * Trader aggregation from Trade events across AMMs.
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

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({
    success: true,
    limit: 120,
    remaining: 119,
    reset: Date.now() + 60_000,
    headers: { 'X-RateLimit-Limit': '120' },
  })),
}));

import { GET } from './route';
import { BlockchainService } from '@/services/blockchain';
import { rateLimit } from '@/lib/rate-limit';

const TOKEN_A = '0x' + 'a1'.repeat(20);
const TOKEN_B = '0x' + 'b2'.repeat(20);
const AMM_A = '0x' + 'c3'.repeat(20);
const AMM_B = '0x' + 'd4'.repeat(20);
const WHALE = '0x' + '11'.repeat(20);
const SHRIMP = '0x' + '22'.repeat(20);

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/leaderboard');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function tradeEvent(trader: string, isBuy: boolean, volumeEth: string) {
  return {
    args: {
      trader,
      isBuy,
      nativeAmount: ethers.parseEther(volumeEth),
      tokenAmount: ethers.parseEther('1000'),
      newPrice: ethers.parseEther('0.001'),
      fee: 0n,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    },
    blockNumber: 100,
    transactionHash: '0x' + 'e'.repeat(64),
  };
}

describe('GET /api/leaderboard', () => {
  const mockFactory = { getAllTokens: vi.fn(), getTokenAMM: vi.fn() };
  const mockProvider = { getBlockNumber: vi.fn() };
  const ammEvents = new Map<string, unknown[]>();

  beforeEach(() => {
    vi.clearAllMocks();
    ammEvents.clear();

    vi.mocked(BlockchainService.getTokenFactory).mockReturnValue(mockFactory as any);
    vi.mocked(BlockchainService.getProvider).mockReturnValue(mockProvider as any);
    vi.mocked(BlockchainService.getAMM).mockImplementation(((address: string) => ({
      filters: { Trade: vi.fn(() => ({})) },
      queryFilter: vi.fn(async () => ammEvents.get(address.toLowerCase()) ?? []),
    })) as any);
    // Different chain per test run defeats the module-level cache
    vi.mocked(BlockchainService.resolveChainId).mockReturnValue(80000 + Math.floor(Math.random() * 10000));

    mockProvider.getBlockNumber.mockResolvedValue(100_000);
    mockFactory.getAllTokens.mockResolvedValue([TOKEN_A, TOKEN_B]);
    mockFactory.getTokenAMM.mockImplementation(async (token: string) =>
      token === TOKEN_A ? AMM_A : AMM_B
    );
  });

  it('aggregates volume per trader across tokens, sorted descending', async () => {
    ammEvents.set(AMM_A.toLowerCase(), [
      tradeEvent(WHALE, true, '5'),
      tradeEvent(SHRIMP, true, '1'),
    ]);
    ammEvents.set(AMM_B.toLowerCase(), [
      tradeEvent(WHALE, false, '3'),
    ]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.traders).toHaveLength(2);
    expect(body.traders[0].address).toBe(WHALE.toLowerCase());
    expect(body.traders[0].totalVolume).toBeCloseTo(8);
    expect(body.traders[0].trades).toBe(2);
    expect(body.traders[0].buys).toBe(1);
    expect(body.traders[0].sells).toBe(1);
    expect(body.traders[0].tokensTraded).toBe(2);
    expect(body.traders[1].address).toBe(SHRIMP.toLowerCase());
    expect(body.tokensScanned).toBe(2);
  });

  it('returns empty traders when there are no trades', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.traders).toEqual([]);
  });

  it('skips tokens whose AMM lookups fail', async () => {
    mockFactory.getTokenAMM.mockImplementation(async (token: string) => {
      if (token === TOKEN_A) throw new Error('rpc error');
      return AMM_B;
    });
    ammEvents.set(AMM_B.toLowerCase(), [tradeEvent(WHALE, true, '2')]);

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.traders).toHaveLength(1);
    expect(body.traders[0].totalVolume).toBeCloseTo(2);
  });

  it('respects the limit parameter', async () => {
    ammEvents.set(AMM_A.toLowerCase(), [
      tradeEvent(WHALE, true, '5'),
      tradeEvent(SHRIMP, true, '1'),
      tradeEvent('0x' + '33'.repeat(20), true, '2'),
    ]);

    const res = await GET(makeRequest({ limit: '2' }));
    const body = await res.json();
    expect(body.traders).toHaveLength(2);
    expect(body.traders[0].totalVolume).toBeCloseTo(5);
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: false,
      limit: 120,
      remaining: 0,
      reset: Date.now(),
      headers: { 'Retry-After': '30' },
    } as any);

    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
  });

  it('sets cache headers', async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get('Cache-Control')).toContain('max-age=60');
  });
});
