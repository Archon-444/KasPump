import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/services/analytics.service';
import { BlockchainService } from '@/services/blockchain';
import { rateLimit } from '@/lib/rate-limit';
import { ANALYTICS_TIMEFRAMES, type AnalyticsTimeframe } from '@/types/analytics';

export const dynamic = 'force-dynamic'; // API routes are always dynamic

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting — 100 requests per minute
  const rateLimitResult = await rateLimit(request, 'analytics');
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.headers['Retry-After'] },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const chainIdParam = searchParams.get('chainId');
    const timeframeParam = searchParams.get('timeframe');

    // 1. Resolve chain ID using our centralized service
    const chainId = BlockchainService.resolveChainId(
      chainIdParam ? parseInt(chainIdParam, 10) : undefined
    );

    if (timeframeParam !== null && !(ANALYTICS_TIMEFRAMES as readonly string[]).includes(timeframeParam)) {
      return NextResponse.json(
        { error: `Invalid timeframe. Expected one of: ${ANALYTICS_TIMEFRAMES.join(', ')}` },
        { status: 400, headers: rateLimitResult.headers }
      );
    }
    const timeframe = (timeframeParam ?? '24h') as AnalyticsTimeframe;

    // 2. Delegate business logic to domain service
    const metrics = await AnalyticsService.getPlatformMetrics(chainId, timeframe);

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        ...rateLimitResult.headers,
      }
    });
  } catch (error: any) {
    console.error('Analytics API Error:', error);

    // 3. Proper error handling
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics data',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
