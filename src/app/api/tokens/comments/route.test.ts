/**
 * Tests for /api/tokens/comments
 * Covers KV-backed storage, validation, rate limiting, and the
 * concurrency lock around the POST read-modify-write cycle.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

import { GET, POST, PATCH } from './route';
import { kv } from '@vercel/kv';

const TOKEN = '0x' + '1'.repeat(40);
const WALLET = '0x' + '2'.repeat(40);

function makeGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/tokens/comments');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/tokens/comments', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeComment(overrides: Partial<{ walletAddress: string; timestamp: number; text: string }> = {}) {
  return {
    id: `${Date.now()}-abc123`,
    tokenAddress: TOKEN.toLowerCase(),
    walletAddress: (overrides.walletAddress ?? WALLET).toLowerCase(),
    text: overrides.text ?? 'gm',
    timestamp: overrides.timestamp ?? Date.now() - 60_000,
    likes: 0,
  };
}

describe('GET /api/tokens/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(kv.get).mockResolvedValue(null);
  });

  it('rejects invalid token address', async () => {
    const res = await GET(makeGetRequest({ address: 'bad' }));
    expect(res.status).toBe(400);
  });

  it('returns empty list when no comments exist', async () => {
    const res = await GET(makeGetRequest({ address: TOKEN }));
    const body = await res.json();
    expect(body.comments).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.hasMore).toBe(false);
  });

  it('returns comments newest first with pagination', async () => {
    const comments = [
      makeComment({ timestamp: 1000 }),
      makeComment({ timestamp: 3000 }),
      makeComment({ timestamp: 2000 }),
    ];
    vi.mocked(kv.get).mockResolvedValue(comments);

    const res = await GET(makeGetRequest({ address: TOKEN, limit: '2' }));
    const body = await res.json();

    expect(body.comments).toHaveLength(2);
    expect(body.comments[0].timestamp).toBe(3000);
    expect(body.comments[1].timestamp).toBe(2000);
    expect(body.total).toBe(3);
    expect(body.hasMore).toBe(true);
  });
});

describe('POST /api/tokens/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(kv.get).mockResolvedValue(null);
    // Lock acquisition succeeds by default ('OK' is what Redis SET NX returns)
    vi.mocked(kv.set).mockResolvedValue('OK');
    vi.mocked(kv.del).mockResolvedValue(1);
  });

  it('rejects invalid token address', async () => {
    const res = await POST(makePostRequest({ tokenAddress: 'bad', walletAddress: WALLET, text: 'hi' }));
    expect(res.status).toBe(400);
  });

  it('rejects invalid wallet address', async () => {
    const res = await POST(makePostRequest({ tokenAddress: TOKEN, walletAddress: 'bad', text: 'hi' }));
    expect(res.status).toBe(400);
  });

  it('rejects empty text', async () => {
    const res = await POST(makePostRequest({ tokenAddress: TOKEN, walletAddress: WALLET, text: '   ' }));
    expect(res.status).toBe(400);
  });

  it('rejects text over 500 chars', async () => {
    const res = await POST(makePostRequest({ tokenAddress: TOKEN, walletAddress: WALLET, text: 'x'.repeat(501) }));
    expect(res.status).toBe(400);
  });

  it('creates a comment and persists it via KV', async () => {
    const res = await POST(makePostRequest({ tokenAddress: TOKEN, walletAddress: WALLET, text: 'to the moon' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.comment.text).toBe('to the moon');
    expect(body.comment.walletAddress).toBe(WALLET.toLowerCase());

    // Persisted the appended array under the comments key
    const writeCall = vi.mocked(kv.set).mock.calls.find(c => String(c[0]).startsWith('comments:'));
    expect(writeCall).toBeDefined();
    expect((writeCall![1] as any[])).toHaveLength(1);
  });

  it('acquires and releases the lock around the write', async () => {
    await POST(makePostRequest({ tokenAddress: TOKEN, walletAddress: WALLET, text: 'gm' }));

    const lockCall = vi.mocked(kv.set).mock.calls.find(c => String(c[0]).startsWith('lock:'));
    expect(lockCall).toBeDefined();
    expect(lockCall![2]).toMatchObject({ nx: true, ex: 5 });
    expect(vi.mocked(kv.del)).toHaveBeenCalledWith(expect.stringContaining('lock:'));
  });

  it('returns 409 when the lock is held by a concurrent request', async () => {
    vi.mocked(kv.set).mockImplementation(async (key: any) => {
      if (String(key).startsWith('lock:')) return null; // lock not acquired
      return 'OK';
    });

    const res = await POST(makePostRequest({ tokenAddress: TOKEN, walletAddress: WALLET, text: 'gm' }));
    expect(res.status).toBe(409);
  });

  it('rate limits a wallet posting more than 3 comments in 10 seconds', async () => {
    const recent = [
      makeComment({ timestamp: Date.now() - 1000 }),
      makeComment({ timestamp: Date.now() - 2000 }),
      makeComment({ timestamp: Date.now() - 3000 }),
    ];
    vi.mocked(kv.get).mockImplementation(async (key: any) => {
      if (String(key).startsWith('comments:')) return recent;
      return null;
    });

    const res = await POST(makePostRequest({ tokenAddress: TOKEN, walletAddress: WALLET, text: 'spam' }));
    expect(res.status).toBe(429);
    // Lock is still released after the rate-limit rejection
    expect(vi.mocked(kv.del)).toHaveBeenCalledWith(expect.stringContaining('lock:'));
  });

  it('does not rate limit a different wallet', async () => {
    const otherWallet = '0x' + '9'.repeat(40);
    const recent = [
      makeComment({ timestamp: Date.now() - 1000 }),
      makeComment({ timestamp: Date.now() - 2000 }),
      makeComment({ timestamp: Date.now() - 3000 }),
    ];
    vi.mocked(kv.get).mockImplementation(async (key: any) => {
      if (String(key).startsWith('comments:')) return recent;
      return null;
    });

    const res = await POST(makePostRequest({ tokenAddress: TOKEN, walletAddress: otherWallet, text: 'gm' }));
    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/tokens/comments (reactions)', () => {
  function makePatchRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/tokens/comments', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = () => [{ ...makeComment(), id: 'c1' }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(kv.set).mockResolvedValue('OK');
    vi.mocked(kv.del).mockResolvedValue(1);
    vi.mocked(kv.get).mockImplementation(async (key: any) => {
      if (String(key).startsWith('comments:')) return existing();
      return null;
    });
  });

  it('rejects an emoji outside the allowlist', async () => {
    const res = await PATCH(makePatchRequest({
      tokenAddress: TOKEN, walletAddress: WALLET, commentId: 'c1', emoji: '😈',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown comment id', async () => {
    const res = await PATCH(makePatchRequest({
      tokenAddress: TOKEN, walletAddress: WALLET, commentId: 'nope', emoji: '🔥',
    }));
    expect(res.status).toBe(404);
    // Lock released even on the 404 path
    expect(vi.mocked(kv.del)).toHaveBeenCalledWith(expect.stringContaining('lock:'));
  });

  it('adds a reaction and persists it', async () => {
    const res = await PATCH(makePatchRequest({
      tokenAddress: TOKEN, walletAddress: WALLET, commentId: 'c1', emoji: '🔥',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comment.reactions['🔥']).toEqual([WALLET.toLowerCase()]);

    const writeCall = vi.mocked(kv.set).mock.calls.find(c => String(c[0]).startsWith('comments:'));
    expect(writeCall).toBeDefined();
  });

  it('removes the reaction when toggled twice (same wallet)', async () => {
    const reacted = [{ ...makeComment(), id: 'c1', reactions: { '🔥': [WALLET.toLowerCase()] } }];
    vi.mocked(kv.get).mockImplementation(async (key: any) => {
      if (String(key).startsWith('comments:')) return reacted;
      return null;
    });

    const res = await PATCH(makePatchRequest({
      tokenAddress: TOKEN, walletAddress: WALLET, commentId: 'c1', emoji: '🔥',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comment.reactions['🔥']).toBeUndefined();
  });

  it('returns 409 when the lock is held', async () => {
    vi.mocked(kv.set).mockImplementation(async (key: any) => {
      if (String(key).startsWith('lock:')) return null;
      return 'OK';
    });

    const res = await PATCH(makePatchRequest({
      tokenAddress: TOKEN, walletAddress: WALLET, commentId: 'c1', emoji: '🔥',
    }));
    expect(res.status).toBe(409);
  });
});
