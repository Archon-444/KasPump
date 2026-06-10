/**
 * Tests for /api/tokens/trades
 * Regression coverage for the Trade event fix.
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
  const url = new URL('http://localhost/api/tokens/trades');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function makeTradeEvent(isBuy: boolean, blockNumber: number) {
  return {
    args: {
      trader: TRADER,
      isBuy,
      nativeAmount: ethers.parseEther('1'),
      tokenAmount: ethers.parseEther('1000'),
      newPrice: ethers.parseEther('0.001'),
      fee: ethers.parseEther('0.01'),
      timestamp: BigInt(1_750_000_000),
    },
    blockNumber,
    transactionHash: '0x' + 'a'.repeat(64),
  };
}

describe('GET /api/tokens/trades', () => {
  const mockFactory = { getTokenAMM: vi.fn() };
  const mockAmm = {
    filters: { Trade: vi.fn(() => ({})) },
    queryFilter: vi.fn(),
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
  });

  it('rejects invalid token address', async () => {
    const res = await GET(makeRequest({ address: 'nope' }));
    expect(res.status).toBe(400);
  });

  it('returns empty trades when token has no AMM', async () => {
    mockFactory.getTokenAMM.mockResolvedValue(ethers.ZeroAddress);
    const res = await GET(makeRequest({ address: TOKEN }));
    const body = await res.json();
    expect(body.trades).toEqual([]);
  });

  it('maps Trade events to typed buy/sell records', async () => {
    mockAmm.queryFilter.mockResolvedValue([
      makeTradeEvent(true, 100),
      makeTradeEvent(false, 101),
    ]);

    const res = await GET(makeRequest({ address: TOKEN }));
    const body = await res.json();

    expect(body.trades).toHaveLength(2);
    // Sorted newest block first
    expect(body.trades[0].blockNumber).toBe(101);
    expect(body.trades[0].type).toBe('sell');
    expect(body.trades[1].type).toBe('buy');
    expect(body.trades[0].trader).toBe(TRADER);
    expect(parseFloat(body.trades[0].nativeAmount)).toBeCloseTo(1);
    expect(parseFloat(body.trades[0].price)).toBeCloseTo(0.001);
    expect(body.trades[0].timestamp).toBe(1_750_000_000 * 1000);
  });

  it('respects the limit parameter', async () => {
    mockAmm.queryFilter.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => makeTradeEvent(true, 100 + i))
    );

    const res = await GET(makeRequest({ address: TOKEN, limit: '3' }));
    const body = await res.json();
    expect(body.trades).toHaveLength(3);
    // Newest first
    expect(body.trades[0].blockNumber).toBe(109);
  });
});
