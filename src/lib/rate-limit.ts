/**
 * Rate Limiting Middleware
 * SECURITY: Protects API routes from DoS attacks and abuse
 *
 * Store: Vercel KV (shared across serverless instances) when KV_REST_API_URL +
 * KV_REST_API_TOKEN are set; falls back to in-memory for local development.
 *
 * Usage:
 * ```typescript
 * import { rateLimit } from '@/lib/rate-limit';
 *
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit(request);
 *   if (!rateLimitResult.success) {
 *     return NextResponse.json(
 *       { error: 'Too many requests' },
 *       { status: 429, headers: rateLimitResult.headers }
 *     );
 *   }
 *   // ... handle request
 * }
 * ```
 */

import { kv } from '@vercel/kv';
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
}

class InMemoryRateLimitStore {
  private cache = new Map<string, { count: number; resetAt: number }>();

  get(key: string): { count: number; resetAt: number } | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.resetAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry;
  }

  set(key: string, value: { count: number; resetAt: number }): void {
    this.cache.set(key, value);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.resetAt) {
        this.cache.delete(key);
      }
    }
  }
}

const memStore = new InMemoryRateLimitStore();

if (typeof setInterval !== 'undefined') {
  setInterval(() => memStore.cleanup(), 5 * 60 * 1000);
}

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return request.ip ?? 'unknown';
}

export const RateLimitPresets = {
  // Strict: 10 requests per minute (for write operations)
  strict: {
    interval: 60 * 1000,
    uniqueTokenPerInterval: 10,
  },

  // Standard: 60 requests per minute (for normal API calls)
  standard: {
    interval: 60 * 1000,
    uniqueTokenPerInterval: 60,
  },

  // Relaxed: 120 requests per minute (for read-heavy operations)
  relaxed: {
    interval: 60 * 1000,
    uniqueTokenPerInterval: 120,
  },

  // Upload: 5 uploads per minute (for file uploads)
  upload: {
    interval: 60 * 1000,
    uniqueTokenPerInterval: 5,
  },

  // Analytics: 100 events per minute
  analytics: {
    interval: 60 * 1000,
    uniqueTokenPerInterval: 100,
  },
} as const;

async function checkLimitKV(key: string, interval: number): Promise<number> {
  const count = await kv.incr(key);
  // Set expiry on first request in the window. Best-effort: if expire fails,
  // the key will eventually expire via Redis LRU or the next deployment restart.
  if (count === 1) {
    await kv.expire(key, Math.ceil(interval / 1000));
  }
  return count;
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig | keyof typeof RateLimitPresets = 'standard'
): Promise<RateLimitResult> {
  const rateLimitConfig: RateLimitConfig =
    typeof config === 'string' ? RateLimitPresets[config] : config;

  const { interval, uniqueTokenPerInterval: limit } = rateLimitConfig;
  const identifier = getClientIdentifier(request);
  const now = Date.now();
  const key = `rate-limit:${identifier}:${request.nextUrl.pathname}`;

  let count: number;
  let resetAt: number;

  const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

  if (hasKV) {
    try {
      count = await checkLimitKV(key, interval);
      resetAt = now + interval; // approximate — accurate to within one interval window
    } catch {
      // KV unavailable — degrade gracefully to in-memory
      const entry = memStore.get(key) ?? { count: 0, resetAt: now + interval };
      entry.count += 1;
      memStore.set(key, entry);
      count = entry.count;
      resetAt = entry.resetAt;
    }
  } else {
    let current = memStore.get(key);
    if (!current) {
      current = { count: 1, resetAt: now + interval };
      memStore.set(key, current);
    } else {
      current.count += 1;
      memStore.set(key, current);
    }
    count = current.count;
    resetAt = current.resetAt;
  }

  const remaining = Math.max(0, limit - count);
  const success = count <= limit;

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetAt.toString(),
  };

  if (!success) {
    headers['Retry-After'] = Math.ceil((resetAt - now) / 1000).toString();
  }

  return {
    success,
    limit,
    remaining,
    reset: resetAt,
    headers,
  };
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<Response>,
  config: RateLimitConfig | keyof typeof RateLimitPresets = 'standard'
) {
  return async (request: NextRequest): Promise<Response> => {
    const rateLimitResult = await rateLimit(request, config);

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.headers['Retry-After'],
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...rateLimitResult.headers,
          },
        }
      );
    }

    const response = await handler(request);
    const newHeaders = new Headers(response.headers);
    Object.entries(rateLimitResult.headers).forEach(([k, v]) => {
      newHeaders.set(k, v);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}
