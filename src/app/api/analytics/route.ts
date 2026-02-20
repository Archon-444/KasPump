import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/services/analytics.service';
import { BlockchainService } from '@/services/blockchain';

export const dynamic = 'force-dynamic'; // API routes are always dynamic

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainIdParam = searchParams.get('chainId');

    // 1. Resolve chain ID using our centralized service
    // This removes duplicate parsing logic from multiple route files
    const chainId = BlockchainService.resolveChainId(chainIdParam);

    // 2. Delegate business logic to domain service
    // Returns strictly typed PlatformMetrics object
    const metrics = await AnalyticsService.getPlatformMetrics(chainId);

    return NextResponse.json(metrics);
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
