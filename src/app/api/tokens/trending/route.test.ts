/**
 * Tests for /api/tokens/trending
 * Focus: RPC fan-out is rate-limited and bounded (MAX_TOKENS_SCANNED).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ethers } from 'ethers';

vi.mock('@/services/blockchain', () => ({
  BlockchainService: {
    resolveChainId: vi.fn(() => 84532),
    getTokenFactory: vi.fn(),
    getAMM: vi.fn(),
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

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/tokens/trending');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

const addr = (n: number) => '0x' + n.toString(16).padStart(40, '0');

describe('GET /api/tokens/trending', () => {
  const getTradingInfo = vi.fn(async () => [
    ethers.parseEther('1000'), // supply
    ethers.parseEther('0.001'), // price
    ethers.parseEther('5'), // volume
    500n, // graduation progress (bps, /100 -> 5%)
    false, // isGraduated
  ]);
  const mockFactory = {
    getAllTokens: vi.fn(),
    getTokenConfig: vi.fn(async () => ({
      name: 'T', symbol: 'T', description: '', imageUrl: '', creator: addr(9),
      createdAt: BigInt(Math.floor(Date.now() / 1000)),
    })),
    getTokenAMM: vi.fn(async () => addr(0xaaaa)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(BlockchainService.getTokenFactory).mockReturnValue(mockFactory as any);
    vi.mocked(BlockchainService.getAMM).mockReturnValue({ getTradingInfo } as any);
    vi.mocked(rateLimit).mockResolvedValue({
      success: true, limit: 120, remaining: 119, reset: Date.now() + 60_000, headers: {},
    } as any);
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: false, limit: 120, remaining: 0, reset: Date.now() + 60_000, headers: {},
    } as any);
    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
  });

  it('caps the RPC fan-out at MAX_TOKENS_SCANNED and reports the true total', async () => {
    // 400 tokens available; only the newest 250 should be scored.
    const tokens = Array.from({ length: 400 }, (_, i) => addr(i + 1));
    mockFactory.getAllTokens.mockResolvedValue(tokens);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalTokens).toBe(400);
    expect(body.tokensScanned).toBe(250);
    // One config read per scanned token, not per total token.
    expect(mockFactory.getTokenConfig).toHaveBeenCalledTimes(250);
  });

  it('scans all tokens when under the cap', async () => {
    mockFactory.getAllTokens.mockResolvedValue([addr(1), addr(2), addr(3)]);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.tokensScanned).toBe(3);
    expect(mockFactory.getTokenConfig).toHaveBeenCalledTimes(3);
  });

  it('sets a CDN cache header', async () => {
    mockFactory.getAllTokens.mockResolvedValue([addr(1)]);
    const res = await GET(makeRequest());
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=30');
  });
});
