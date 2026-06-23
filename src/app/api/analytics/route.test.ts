/**
 * Tests for /api/analytics
 * Covers rate limiting and cache headers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/analytics.service', () => ({
  AnalyticsService: {
    getPlatformMetrics: vi.fn(),
  },
}));

vi.mock('@/services/blockchain', () => ({
  BlockchainService: {
    resolveChainId: vi.fn(() => 84532),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}));

import { GET } from './route';
import { AnalyticsService } from '@/services/analytics.service';
import { rateLimit } from '@/lib/rate-limit';

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/analytics');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

const okRateLimit = {
  success: true,
  limit: 100,
  remaining: 99,
  reset: Date.now() + 60_000,
  headers: { 'X-RateLimit-Limit': '100', 'X-RateLimit-Remaining': '99' },
};

describe('GET /api/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue(okRateLimit as any);
    vi.mocked(AnalyticsService.getPlatformMetrics).mockResolvedValue({
      totalTokens: 5,
      totalVolume: 100,
      totalMarketCap: 500,
      graduatedTokens: 1,
    } as any);
  });

  it('returns metrics with cache and rate-limit headers', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.totalTokens).toBe(5);

    expect(res.headers.get('Cache-Control')).toContain('max-age=30');
    expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
  });

  it('uses the analytics rate-limit preset', async () => {
    await GET(makeRequest());
    expect(rateLimit).toHaveBeenCalledWith(expect.anything(), 'analytics');
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(rateLimit).mockResolvedValue({
      ...okRateLimit,
      success: false,
      remaining: 0,
      headers: { ...okRateLimit.headers, 'Retry-After': '42' },
    } as any);

    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.retryAfter).toBe('42');
  });

  it('returns 500 with details when the analytics service fails', async () => {
    vi.mocked(AnalyticsService.getPlatformMetrics).mockRejectedValue(new Error('rpc down'));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.details).toBe('rpc down');
  });
});
