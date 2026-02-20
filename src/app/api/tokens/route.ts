import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from '@/services/token.service';
import { BlockchainService } from '@/services/blockchain';
import { rateLimit } from '@/lib/rate-limit';
import { TokenFilterParamsSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - 60 requests per minute
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.headers['Retry-After'] },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    // SECURITY: Validate query parameters
    const parseResult = TokenFilterParamsSchema.safeParse({
      search: searchParams.get('search'),
      chainId: searchParams.get('chainId'),
      creator: searchParams.get('creator'),
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize') || searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { pageSize, offset, chainId: chainIdParam } = parseResult.data;
    const chainId = BlockchainService.resolveChainId(chainIdParam);
    const address = searchParams.get('address');

    // 1. Fetch single token if address provided
    if (address) {
      const tokenData = await TokenService.getTokenDetails(chainId, address);
      if (!tokenData) {
        return NextResponse.json({ error: 'Token not found' }, { status: 404 });
      }
      return NextResponse.json(tokenData);
    }

    // 2. Fetch paginated list
    const result = await TokenService.getTokens(chainId, pageSize, offset);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Tokens API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token data', details: error.message },
      { status: 500 }
    );
  }
}
