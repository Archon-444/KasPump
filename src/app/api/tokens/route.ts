import { NextRequest, NextResponse } from 'next/server';

const INDEXER_BASE_URL = process.env.KASPUMP_INDEXER_URL;
const INDEXER_API_KEY = process.env.KASPUMP_INDEXER_API_KEY;

export async function GET(request: NextRequest) {
  if (!INDEXER_BASE_URL) {
    return NextResponse.json(
      {
        error: 'KasPump token indexer is not configured. Set KASPUMP_INDEXER_URL to surface live token data.',
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const limit = searchParams.get('limit');
  const cursor = searchParams.get('cursor');

  const path = address ? `/tokens/${address}` : '/tokens';
  const indexerUrl = new URL(path, INDEXER_BASE_URL);

  if (!address) {
    if (limit) {
      indexerUrl.searchParams.set('limit', limit);
    }
    if (cursor) {
      indexerUrl.searchParams.set('cursor', cursor);
    }
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
    const status = response.status === 404 ? 404 : 502;
    return NextResponse.json(
      {
        error:
          payload?.error ??
          (address
            ? 'Token not found on the KasPump indexer.'
            : 'KasPump indexer returned an unexpected response while listing tokens.'),
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
