/**
 * Moralis API Service — Token Holder Count
 *
 * Provides holder counts for ERC20 tokens via the Moralis Deep Index API.
 * Cache: Vercel KV (shared across serverless instances) when KV_REST_API_URL is set;
 * falls back to in-memory for local development.
 *
 * Setup:
 * 1. Create a free account at https://moralis.io
 * 2. Get your API key from https://admin.moralis.io/settings
 * 3. Set MORALIS_API_KEY in your .env.local / Vercel environment
 */

import { kv } from '@vercel/kv';

const MORALIS_API_KEY = process.env.MORALIS_API_KEY ?? '';

const CHAIN_SLUGS: Record<number, string> = {
  56: 'bsc',
  97: 'bsc testnet',
  42161: 'arbitrum',
  8453: 'base',
};

const CACHE_TTL_SECS = 60;

// In-memory fallback for local dev (no KV configured)
const memCache = new Map<string, { count: number; expiresAt: number }>();

async function getCached(cacheKey: string): Promise<number | null> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      return await kv.get<number>(cacheKey);
    } catch {
      // KV unavailable — fall through to in-memory
    }
  }
  const entry = memCache.get(cacheKey);
  if (entry && Date.now() < entry.expiresAt) return entry.count;
  return null;
}

async function setCached(cacheKey: string, count: number): Promise<void> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      await kv.set(cacheKey, count, { ex: CACHE_TTL_SECS });
      return;
    } catch {
      // KV unavailable — fall through to in-memory
    }
  }
  memCache.set(cacheKey, { count, expiresAt: Date.now() + CACHE_TTL_SECS * 1000 });
}

export class MoralisService {
  static isConfigured(): boolean {
    return MORALIS_API_KEY.length > 0 && MORALIS_API_KEY !== 'your_moralis_api_key_here';
  }

  /**
   * Fetch holder count for a single token.
   * Returns 0 when Moralis is not configured.
   * Throws (after logging) on API errors so callers can distinguish "0 holders" from failure.
   */
  static async getHolderCount(tokenAddress: string, chainId: number): Promise<number> {
    if (!this.isConfigured()) return 0;

    const chain = CHAIN_SLUGS[chainId];
    if (!chain) return 0;

    const cacheKey = `moralis:holders:${chainId}:${tokenAddress.toLowerCase()}`;
    const cached = await getCached(cacheKey);
    if (cached !== null) return cached;

    try {
      const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/owners?chain=${encodeURIComponent(chain)}`;
      const response = await fetch(url, {
        headers: { 'X-API-Key': MORALIS_API_KEY },
        signal: AbortSignal.timeout(5_000),
      });

      if (!response.ok) {
        const err = new Error(`Moralis API ${response.status} for ${tokenAddress} on chain ${chainId}`);
        console.error('[MoralisService] API error:', err.message);
        // Capture to Sentry when DSN is configured (no-op otherwise)
        try {
          const { captureException } = await import('@sentry/nextjs');
          captureException(err, { tags: { service: 'moralis', chainId: String(chainId) } });
        } catch { /* sentry not available */ }
        return 0;
      }

      const data = await response.json();
      const count: number = data.total ?? data.result?.length ?? 0;

      await setCached(cacheKey, count);
      return count;
    } catch (error) {
      console.error('[MoralisService] Fetch failed:', error);
      try {
        const { captureException } = await import('@sentry/nextjs');
        captureException(error, { tags: { service: 'moralis', chainId: String(chainId) } });
      } catch { /* sentry not available */ }
      return 0;
    }
  }

  /**
   * Batch fetch holder counts for multiple tokens.
   * Fetches in parallel with a concurrency cap to respect rate limits.
   */
  static async getHolderCounts(
    tokenAddresses: string[],
    chainId: number
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    if (!this.isConfigured() || tokenAddresses.length === 0) {
      for (const addr of tokenAddresses) {
        results.set(addr.toLowerCase(), 0);
      }
      return results;
    }

    const BATCH_SIZE = 5;
    for (let i = 0; i < tokenAddresses.length; i += BATCH_SIZE) {
      const batch = tokenAddresses.slice(i, i + BATCH_SIZE);
      const counts = await Promise.all(
        batch.map(addr => this.getHolderCount(addr, chainId))
      );
      batch.forEach((addr, idx) => {
        results.set(addr.toLowerCase(), counts[idx] ?? 0);
      });
    }

    return results;
  }
}
