// Canonical analytics types. Every field here is computed from on-chain data
// or explicitly windowed — no estimated/guessed values. Fields that can only
// be known when the chain exposes them (fee split) are optional and omitted
// rather than defaulted.

export type AnalyticsTimeframe = '24h' | '7d' | 'all';
export const ANALYTICS_TIMEFRAMES: readonly AnalyticsTimeframe[] = ['24h', '7d', 'all'];

export interface GrowthPoint {
  time: number; // unix seconds, bucket start
  tokensCreated: number; // factory TokenCreated events — always real
  // Present only on 24h hourly buckets (multi-day Trade scans across all AMMs
  // exceed serverless RPC budgets until the subgraph is deployed).
  volume?: number; // native units
  trades?: number;
  activeTraders?: number;
}

export interface AnalyticsData {
  timestamp: string;
  timeframe: AnalyticsTimeframe;
  chainId: number;
  platform: {
    totalTokens: number; // lifetime
    graduatedTokens: number; // lifetime
    successRate: number; // %
    activeTokens24h: number; // AMMs with >=1 Trade in the scan window
    activeTraders24h: number; // unique trader addresses in the scan window
  };
  financial: {
    totalVolume: number; // lifetime, native units
    totalMarketCap: number;
    averageVolume: number;
    averageMarketCap: number;
    volume24h: number; // sum of Trade.nativeAmount in the scan window
    tradingFees24h: number; // sum of Trade.fee — exact, not estimated
    // Split of tradingFees24h, present only when CREATOR_FEE_SHARE() is
    // readable on the deployed AMMs (older deployments predate the split).
    creatorEarnings24h?: number;
    platformFees24h?: number;
  };
  series: GrowthPoint[]; // [] for 'all' — full history needs an indexer
  newTokensInWindow: number;
  scan: { tokensScanned: number; windowHours: 24; partial: boolean };
}

export interface LeaderboardEntry {
  address: string;
  totalVolume: number;
  trades: number;
  buys: number;
  sells: number;
  tokensTraded: number;
}
