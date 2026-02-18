/**
 * useCopyTrade Hook
 * Follow and copy trades from successful traders
 *
 * Features:
 * - Follow/unfollow traders
 * - Copy trade settings (max amount, auto-execute)
 * - Trader leaderboard
 * - Trade notifications
 *
 * @example
 * ```typescript
 * const {
 *   following,
 *   follow,
 *   unfollow,
 *   copySettings,
 *   updateCopySettings,
 * } = useCopyTrade(address);
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';

// ============ Types ============

export interface TraderProfile {
  address: string;
  displayName?: string;
  avatar?: string;
  followers: number;
  following: number;
  pnl24h: number;
  pnl7d: number;
  pnl30d: number;
  pnlAllTime: number;
  winRate: number;
  totalTrades: number;
  avgTradeSize: number;
  avgHoldTime: number; // hours
  bestTrade: {
    tokenSymbol: string;
    pnlPercent: number;
  };
  badges: TraderBadge[];
  joinedAt: number;
  lastActiveAt: number;
}

export type TraderBadge =
  | 'whale'        // High volume trader
  | 'diamond'      // Long-term holder
  | 'sniper'       // Early buyer
  | 'consistent'   // Consistent profits
  | 'influencer'   // Many followers
  | 'verified';    // KYC verified

export interface FollowRelation {
  follower: string;
  trader: string;
  copyEnabled: boolean;
  copySettings: CopyTradeSettings;
  createdAt: number;
  lastCopiedAt?: number;
  totalCopiedTrades: number;
  totalCopiedValue: number;
}

export interface CopyTradeSettings {
  enabled: boolean;
  maxAmountPerTrade: number; // Max amount in native token
  maxDailyAmount: number;    // Max daily spend
  minTradeSize: number;      // Don't copy trades below this
  maxSlippage: number;       // Max slippage tolerance %
  autoExecute: boolean;      // Execute automatically or require approval
  copyBuysOnly: boolean;     // Only copy buys, not sells
  excludeTokens: string[];   // Tokens to exclude from copying
  notifyOnTrade: boolean;    // Push notification on trade
}

export interface PendingCopyTrade {
  id: string;
  traderAddress: string;
  traderName: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  estimatedCost: number;
  detectedAt: number;
  expiresAt: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
}

export interface TraderTrade {
  id: string;
  traderAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  value: number;
  pnl?: number;
  pnlPercent?: number;
  timestamp: number;
  txHash: string;
}

interface UseCopyTradeReturn {
  // Following
  following: FollowRelation[];
  followers: TraderProfile[];
  isFollowing: (address: string) => boolean;
  follow: (address: string) => Promise<void>;
  unfollow: (address: string) => Promise<void>;

  // Copy Trading
  copySettings: CopyTradeSettings;
  updateCopySettings: (settings: Partial<CopyTradeSettings>) => Promise<void>;
  pendingTrades: PendingCopyTrade[];
  approveTrade: (tradeId: string) => Promise<void>;
  rejectTrade: (tradeId: string) => Promise<void>;

  // Trader Data
  getTraderProfile: (address: string) => Promise<TraderProfile | null>;
  getTraderTrades: (address: string, limit?: number) => Promise<TraderTrade[]>;

  // State
  isLoading: boolean;
  error: string | null;
}

// ============ Default Settings ============

const DEFAULT_COPY_SETTINGS: CopyTradeSettings = {
  enabled: false,
  maxAmountPerTrade: 0.1,
  maxDailyAmount: 1.0,
  minTradeSize: 0.01,
  maxSlippage: 5,
  autoExecute: false,
  copyBuysOnly: false,
  excludeTokens: [],
  notifyOnTrade: true,
};

// ============ Local Storage Keys ============

const STORAGE_KEYS = {
  following: 'kaspump_following',
  copySettings: 'kaspump_copy_settings',
  pendingTrades: 'kaspump_pending_trades',
};

// ============ Mock Data ============

const MOCK_TRADERS: TraderProfile[] = [
  {
    address: '0xWhale123',
    displayName: 'CryptoWhale',
    followers: 1520,
    following: 12,
    pnl24h: 15.2,
    pnl7d: 45.8,
    pnl30d: 125.3,
    pnlAllTime: 850.5,
    winRate: 72.5,
    totalTrades: 342,
    avgTradeSize: 0.5,
    avgHoldTime: 48,
    bestTrade: { tokenSymbol: 'PEPE', pnlPercent: 1250 },
    badges: ['whale', 'consistent', 'verified'],
    joinedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    address: '0xSniper456',
    displayName: 'EarlySniperX',
    followers: 892,
    following: 5,
    pnl24h: 42.8,
    pnl7d: 156.2,
    pnl30d: 380.5,
    pnlAllTime: 2150.8,
    winRate: 68.2,
    totalTrades: 128,
    avgTradeSize: 0.25,
    avgHoldTime: 12,
    bestTrade: { tokenSymbol: 'MDOG', pnlPercent: 3500 },
    badges: ['sniper', 'diamond'],
    joinedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 30 * 60 * 1000,
  },
];

// ============ Hook ============

export function useCopyTrade(): UseCopyTradeReturn {
  const { address } = useAccount();
  const [following, setFollowing] = useState<FollowRelation[]>([]);
  const [followers, setFollowers] = useState<TraderProfile[]>([]);
  const [copySettings, setCopySettings] = useState<CopyTradeSettings>(DEFAULT_COPY_SETTINGS);
  const [pendingTrades, setPendingTrades] = useState<PendingCopyTrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (!address) return;

    try {
      const storedFollowing = localStorage.getItem(`${STORAGE_KEYS.following}_${address}`);
      if (storedFollowing) {
        setFollowing(JSON.parse(storedFollowing));
      }

      const storedSettings = localStorage.getItem(`${STORAGE_KEYS.copySettings}_${address}`);
      if (storedSettings) {
        setCopySettings({ ...DEFAULT_COPY_SETTINGS, ...JSON.parse(storedSettings) });
      }

      const storedPending = localStorage.getItem(`${STORAGE_KEYS.pendingTrades}_${address}`);
      if (storedPending) {
        setPendingTrades(JSON.parse(storedPending));
      }
    } catch (err) {
      console.error('Failed to load copy trade data:', err);
    }
  }, [address]);

  // Save following to localStorage
  useEffect(() => {
    if (!address || following.length === 0) return;
    localStorage.setItem(`${STORAGE_KEYS.following}_${address}`, JSON.stringify(following));
  }, [following, address]);

  // Save settings to localStorage
  useEffect(() => {
    if (!address) return;
    localStorage.setItem(`${STORAGE_KEYS.copySettings}_${address}`, JSON.stringify(copySettings));
  }, [copySettings, address]);

  // Check if following a trader
  const isFollowing = useCallback((traderAddress: string): boolean => {
    return following.some(f => f.trader.toLowerCase() === traderAddress.toLowerCase());
  }, [following]);

  // Follow a trader
  const follow = useCallback(async (traderAddress: string): Promise<void> => {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    if (isFollowing(traderAddress)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const relation: FollowRelation = {
        follower: address,
        trader: traderAddress,
        copyEnabled: false,
        copySettings: { ...DEFAULT_COPY_SETTINGS },
        createdAt: Date.now(),
        totalCopiedTrades: 0,
        totalCopiedValue: 0,
      };

      setFollowing(prev => [...prev, relation]);

      // In production, would also register on-chain or via API
    } catch (err) {
      console.error('Failed to follow trader:', err);
      setError('Failed to follow trader');
    } finally {
      setIsLoading(false);
    }
  }, [address, isFollowing]);

  // Unfollow a trader
  const unfollow = useCallback(async (traderAddress: string): Promise<void> => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      setFollowing(prev => prev.filter(
        f => f.trader.toLowerCase() !== traderAddress.toLowerCase()
      ));
    } catch (err) {
      console.error('Failed to unfollow trader:', err);
      setError('Failed to unfollow trader');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Update copy settings
  const updateCopySettings = useCallback(async (
    newSettings: Partial<CopyTradeSettings>
  ): Promise<void> => {
    setCopySettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Approve pending trade
  const approveTrade = useCallback(async (tradeId: string): Promise<void> => {
    setPendingTrades(prev => prev.map(trade =>
      trade.id === tradeId
        ? { ...trade, status: 'approved' as const }
        : trade
    ));

    // In production, would execute the trade
    // For now, mark as executed after a delay
    setTimeout(() => {
      setPendingTrades(prev => prev.map(trade =>
        trade.id === tradeId
          ? { ...trade, status: 'executed' as const }
          : trade
      ));
    }, 2000);
  }, []);

  // Reject pending trade
  const rejectTrade = useCallback(async (tradeId: string): Promise<void> => {
    setPendingTrades(prev => prev.map(trade =>
      trade.id === tradeId
        ? { ...trade, status: 'rejected' as const }
        : trade
    ));
  }, []);

  // Get trader profile
  const getTraderProfile = useCallback(async (
    traderAddress: string
  ): Promise<TraderProfile | null> => {
    // In production, would fetch from API/contract
    const mockTrader = MOCK_TRADERS.find(
      t => t.address.toLowerCase() === traderAddress.toLowerCase()
    );
    return mockTrader || null;
  }, []);

  // Get trader's recent trades
  const getTraderTrades = useCallback(async (
    traderAddress: string,
    limit: number = 20
  ): Promise<TraderTrade[]> => {
    // Mock trades
    return Array.from({ length: limit }, (_, i) => ({
      id: `${traderAddress}-${i}`,
      traderAddress,
      tokenAddress: `0xToken${i}`,
      tokenSymbol: ['PEPE', 'MDOG', 'KPUMP', 'SHIB'][i % 4],
      action: i % 3 === 0 ? 'sell' as const : 'buy' as const,
      amount: Math.random() * 1000000,
      price: Math.random() * 0.0001,
      value: Math.random() * 0.5,
      pnl: (Math.random() - 0.3) * 0.2,
      pnlPercent: (Math.random() - 0.3) * 100,
      timestamp: Date.now() - i * 60 * 60 * 1000,
      txHash: `0x${Math.random().toString(16).slice(2)}`,
    }));
  }, []);

  return {
    following,
    followers,
    isFollowing,
    follow,
    unfollow,
    copySettings,
    updateCopySettings,
    pendingTrades,
    approveTrade,
    rejectTrade,
    getTraderProfile,
    getTraderTrades,
    isLoading,
    error,
  };
}

/**
 * useTraderLeaderboard - Get top traders by performance
 */
export function useTraderLeaderboard(
  sortBy: 'pnl24h' | 'pnl7d' | 'pnl30d' | 'winRate' | 'followers' = 'pnl7d',
  limit: number = 20
) {
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In production, would fetch from API
    const sorted = [...MOCK_TRADERS].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      return (bValue as number) - (aValue as number);
    });

    setTraders(sorted.slice(0, limit));
    setIsLoading(false);
  }, [sortBy, limit]);

  return { traders, isLoading };
}

export default useCopyTrade;
