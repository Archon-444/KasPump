/**
 * Moralis API Service — Token Holder Count
 *
 * Provides holder counts for ERC20 tokens via the Moralis Deep Index API.
 * Gracefully falls back to 0 when MORALIS_API_KEY is not configured.
 *
 * Setup:
 * 1. Create a free account at https://moralis.io
 * 2. Get your API key from https://admin.moralis.io/settings
 * 3. Set MORALIS_API_KEY in your .env.local / Vercel environment
 */

const MORALIS_API_KEY = process.env.MORALIS_API_KEY || '';

const CHAIN_SLUGS: Record<number, string> = {
  56: 'bsc',
  97: 'bsc testnet',
  42161: 'arbitrum',
  8453: 'base',
};

// In-memory cache to avoid hammering the API for repeated requests
const holderCache = new Map<string, { count: number; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

export class MoralisService {
  /**
   * Check whether the Moralis API is configured and available
   */
  static isConfigured(): boolean {
    return MORALIS_API_KEY.length > 0 && MORALIS_API_KEY !== 'your_moralis_api_key_here';
  }

  /**
   * Fetch holder count for a single token.
   * Returns 0 if Moralis is not configured or the request fails.
   */
  static async getHolderCount(tokenAddress: string, chainId: number): Promise<number> {
    if (!this.isConfigured()) return 0;

    const chain = CHAIN_SLUGS[chainId];
    if (!chain) return 0;

    const cacheKey = `${chainId}:${tokenAddress.toLowerCase()}`;
    const cached = holderCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.count;
    }

    try {
      const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/owners?chain=${encodeURIComponent(chain)}`;
      const response = await fetch(url, {
        headers: { 'X-API-Key': MORALIS_API_KEY },
        signal: AbortSignal.timeout(5_000), // 5s timeout
      });

      if (!response.ok) {
        console.warn(`Moralis API returned ${response.status} for ${tokenAddress}`);
        return 0;
      }

      const data = await response.json();
      const count: number = data.total ?? data.result?.length ?? 0;

      holderCache.set(cacheKey, { count, expiresAt: Date.now() + CACHE_TTL_MS });
      return count;
    } catch (error) {
      // Network errors, timeouts, rate limits — fail silently
      console.warn('Moralis holder count fetch failed:', error);
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

    // Fetch in batches of 5 to respect rate limits
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
