import { NextResponse } from 'next/server';

export async function GET() {
  const docs = {
    name: 'KasPump API',
    version: '1.0.0',
    description: 'REST API for KasPump token launcher. Use these endpoints for bot integrations, analytics, and automated trading.',
    baseUrl: 'https://kaspump.io/api',
    rateLimit: {
      default: '60 requests/minute',
      note: 'Rate limits are per IP. Contact us for higher limits.',
    },
    endpoints: {
      tokens: {
        list: {
          method: 'GET',
          path: '/api/tokens',
          description: 'List tokens with server-side search and pagination',
          params: {
            chainId: { type: 'number', optional: true, default: 97, description: 'Chain ID (56=BSC, 97=BSC Testnet, 42161=Arbitrum, 8453=Base)' },
            search: { type: 'string', optional: true, description: 'Search by name, symbol, or address' },
            limit: { type: 'number', optional: true, default: 20, max: 100 },
            offset: { type: 'number', optional: true, default: 0 },
            creator: { type: 'address', optional: true, description: 'Filter by creator wallet address' },
          },
          response: '{ tokens: TokenDetails[], pagination: { total, offset, limit, hasMore } }',
        },
        detail: {
          method: 'GET',
          path: '/api/tokens?address={tokenAddress}',
          description: 'Get full details for a single token',
          response: 'TokenDetails',
        },
        trending: {
          method: 'GET',
          path: '/api/tokens/trending',
          description: 'Get trending tokens ranked by volume, graduation progress, and activity',
          params: {
            chainId: { type: 'number', optional: true },
            limit: { type: 'number', optional: true, default: 10, max: 50 },
          },
          response: '{ trending: ScoredToken[], kingOfTheHill: ScoredToken | null, aboutToGraduate: ScoredToken[], totalTokens: number }',
        },
      },
      trades: {
        recent: {
          method: 'GET',
          path: '/api/tokens/trades',
          description: 'Get recent trades for a token from on-chain events',
          params: {
            address: { type: 'address', required: true },
            chainId: { type: 'number', optional: true },
            limit: { type: 'number', optional: true, default: 50, max: 200 },
          },
          response: '{ trades: Trade[] }',
        },
      },
      candles: {
        ohlcv: {
          method: 'GET',
          path: '/api/tokens/candles',
          description: 'Get OHLCV candle data for charting',
          params: {
            address: { type: 'address', required: true },
            timeframe: { type: 'string', optional: true, default: '1h', enum: ['1m', '5m', '15m', '1h', '4h', '1d'] },
            chainId: { type: 'number', optional: true },
          },
          response: '{ candles: { time, open, high, low, close, volume }[] }',
        },
      },
      holders: {
        list: {
          method: 'GET',
          path: '/api/tokens/holders',
          description: 'Get top token holders with balances and percentage of supply',
          params: {
            address: { type: 'address', required: true },
            chainId: { type: 'number', optional: true },
            limit: { type: 'number', optional: true, default: 20, max: 50 },
          },
          response: '{ holders: { address, balance, percentage }[], totalHolders: number }',
        },
      },
      comments: {
        list: {
          method: 'GET',
          path: '/api/tokens/comments',
          description: 'Get comments for a token thread',
          params: {
            address: { type: 'address', required: true },
            limit: { type: 'number', optional: true, default: 50 },
            offset: { type: 'number', optional: true, default: 0 },
          },
        },
        post: {
          method: 'POST',
          path: '/api/tokens/comments',
          description: 'Post a comment (requires wallet address, optional signature)',
          body: {
            tokenAddress: 'address (required)',
            walletAddress: 'address (required)',
            text: 'string, max 500 chars (required)',
            signature: 'string (optional, EIP-191 personal_sign)',
            isCreator: 'boolean (optional)',
          },
        },
      },
      analytics: {
        platform: {
          method: 'GET',
          path: '/api/analytics',
          description: 'Get platform-wide metrics (total tokens, volume, market cap)',
          params: {
            chainId: { type: 'number', optional: true },
          },
        },
      },
    },
    websocket: {
      url: 'wss://ws.kaspump.io (or NEXT_PUBLIC_WS_URL)',
      protocol: 'Socket.IO',
      events: {
        'trade:new': 'New trade executed on bonding curve',
        'token:created': 'New token launched',
        'token:graduated': 'Token graduated to DEX',
        'liquidity:added': 'Liquidity added to DEX pair',
      },
      subscribe: {
        'subscribe:token': '{ tokenAddress }',
        'subscribe:network': '{ network }',
      },
    },
    contracts: {
      bscTestnet: {
        chainId: 97,
        TokenFactory: 'See NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY env var',
        note: 'Contracts use CreateTokenParams struct for token creation',
      },
      bscMainnet: {
        chainId: 56,
        status: 'Not yet deployed',
      },
    },
  };

  return NextResponse.json(docs, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
