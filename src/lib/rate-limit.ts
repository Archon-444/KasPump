/**
 * Rate Limiting Middleware
 * SECURITY: Protects API routes from DoS attacks and abuse
 *
 * Implementation: In-memory store (single instance)
 * Production: Use Redis for distributed rate limiting
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

/**
 * In-memory rate limit store
 * WARNING: Only works for single-instance deployments
 * For production with multiple instances, use Redis
 */
class InMemoryRateLimitStore {
  private cache = new Map<string, { count: number; resetAt: number }>();

  get(key: string): { count: number; resetAt: number } | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Clean up expired entries
    if (Date.now() > entry.resetAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry;
  }

  set(key: string, value: { count: number; resetAt: number }): void {
    this.cache.set(key, value);
  }

  // Periodic cleanup to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of Array.from(this.cache.entries())) {
      if (now > value.resetAt) {
        this.cache.delete(key);
      }
    }
  }
}

const store = new InMemoryRateLimitStore();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => store.cleanup(), 5 * 60 * 1000);
}

/**
 * Get client identifier from request
 * Uses IP address (with X-Forwarded-For support)
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]!.trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to request IP
  return (request as any).ip || 'unknown';
}

/**
 * Default rate limit configurations by endpoint type
 */
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

/**
 * Rate limit middleware
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration (or preset name)
 * @returns Rate limit result with success status and headers
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig | keyof typeof RateLimitPresets = 'standard'
): Promise<RateLimitResult> {
  // Resolve config from preset if string provided
  const rateLimitConfig: RateLimitConfig =
    typeof config === 'string' ? RateLimitPresets[config] : config;

  const { interval, uniqueTokenPerInterval: limit } = rateLimitConfig;

  // Get client identifier
  const identifier = getClientIdentifier(request);

  // Get current rate limit state
  const now = Date.now();
  const key = `rate-limit:${identifier}:${request.nextUrl.pathname}`;

  let current = store.get(key);

  if (!current) {
    // First request in this interval
    current = {
      count: 1,
      resetAt: now + interval,
    };
    store.set(key, current);
  } else {
    // Increment count
    current.count += 1;
    store.set(key, current);
  }

  const remaining = Math.max(0, limit - current.count);
  const success = current.count <= limit;

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': current.resetAt.toString(),
  };

  if (!success) {
    headers['Retry-After'] = Math.ceil((current.resetAt - now) / 1000).toString();
  }

  return {
    success,
    limit,
    remaining,
    reset: current.resetAt,
    headers,
  };
}

/**
 * Create a rate-limited API handler wrapper
 *
 * Usage:
 * ```typescript
 * export const POST = withRateLimit(async (request) => {
 *   // Your handler logic
 *   return NextResponse.json({ success: true });
 * }, 'strict');
 * ```
 */
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

    // Add rate limit headers to successful response
    const response = await handler(request);
    const newHeaders = new Headers(response.headers);
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}

/**
 * Redis-based rate limiting (for production)
 * Uncomment and configure when Redis is available
 */
/*
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig | keyof typeof RateLimitPresets = 'standard'
): Promise<RateLimitResult> {
  const rateLimitConfig: RateLimitConfig =
    typeof config === 'string' ? RateLimitPresets[config] : config;

  const { interval, uniqueTokenPerInterval: limit } = rateLimitConfig;
  const identifier = getClientIdentifier(request);
  const key = `rate-limit:${identifier}:${request.nextUrl.pathname}`;

  const now = Date.now();
  const resetAt = now + interval;

  // Atomic increment with Redis
  const count = await redis.incr(key);

  if (count === 1) {
    // Set expiry on first request
    await redis.pexpire(key, interval);
  }

  const remaining = Math.max(0, limit - count);
  const success = count <= limit;

  return {
    success,
    limit,
    remaining,
    reset: resetAt,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetAt.toString(),
      ...(success ? {} : { 'Retry-After': Math.ceil(interval / 1000).toString() }),
    },
  };
}
*/
