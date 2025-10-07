import { NextRequest, NextResponse } from 'next/server';

const INDEXER_BASE_URL = process.env.KASPUMP_INDEXER_URL;
const INDEXER_API_KEY = process.env.KASPUMP_INDEXER_API_KEY;

export async function GET(request: NextRequest) {
  if (!INDEXER_BASE_URL) {
    return NextResponse.json(
      {
        error: 'KasPump analytics indexer is not configured. Set KASPUMP_INDEXER_URL to enable live metrics.',
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') ?? '24h';
  const metric = searchParams.get('metric');

  const indexerUrl = new URL('/analytics', INDEXER_BASE_URL);
  indexerUrl.searchParams.set('timeframe', timeframe);
  if (metric) {
    indexerUrl.searchParams.set('metric', metric);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (INDEXER_API_KEY) {
    headers['x-api-key'] = INDEXER_API_KEY;
  }

  const response = await fetch(indexerUrl, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const payload = await safeParseJson(response);

  if (!response.ok) {
    const status = response.status === 404 ? 502 : response.status;
    return NextResponse.json(
      {
        error:
          payload?.error ??
          'KasPump analytics indexer returned an unexpected response. Check the indexer service logs.',
      },
      { status },
    );
  }

  return NextResponse.json(payload);
}

async function safeParseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse indexer response JSON', error);
    return undefined;
  }
}
