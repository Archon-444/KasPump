/**
 * Tests for /api/push/subscribe
 * Focus: subscription-shape validation and rate limiting.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({
    success: true, limit: 10, remaining: 9, reset: Date.now() + 60_000, headers: {},
  })),
}));

import { POST, DELETE } from './route';
import { rateLimit } from '@/lib/rate-limit';

function makeRequest(method: string, body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/push/subscribe', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const validSub = {
  subscription: {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    keys: { p256dh: 'key', auth: 'auth' },
  },
  userId: 'user1',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(rateLimit).mockResolvedValue({
    success: true, limit: 10, remaining: 9, reset: Date.now() + 60_000, headers: {},
  } as any);
});

describe('POST /api/push/subscribe', () => {
  it('accepts a well-formed subscription', async () => {
    const res = await POST(makeRequest('POST', validSub));
    expect(res.status).toBe(200);
  });

  it('rejects a missing endpoint', async () => {
    const res = await POST(makeRequest('POST', { subscription: { keys: { p256dh: 'k', auth: 'a' } } }));
    expect(res.status).toBe(400);
  });

  it('rejects a non-https endpoint', async () => {
    const res = await POST(makeRequest('POST', {
      subscription: { endpoint: 'http://evil.example/x', keys: { p256dh: 'k', auth: 'a' } },
    }));
    expect(res.status).toBe(400);
  });

  it('rejects a subscription missing keys', async () => {
    const res = await POST(makeRequest('POST', {
      subscription: { endpoint: 'https://fcm.googleapis.com/x' },
    }));
    expect(res.status).toBe(400);
  });

  it('rejects a non-string userId', async () => {
    const res = await POST(makeRequest('POST', { ...validSub, userId: 42 }));
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: false, limit: 10, remaining: 0, reset: Date.now() + 60_000, headers: {},
    } as any);
    const res = await POST(makeRequest('POST', validSub));
    expect(res.status).toBe(429);
  });
});

describe('DELETE /api/push/subscribe', () => {
  it('rejects a non-https endpoint', async () => {
    const res = await DELETE(makeRequest('DELETE', { endpoint: 'ftp://x' }));
    expect(res.status).toBe(400);
  });

  it('accepts a valid https endpoint', async () => {
    const res = await DELETE(makeRequest('DELETE', { endpoint: 'https://fcm.googleapis.com/x' }));
    expect(res.status).toBe(200);
  });
});
