'use client';

import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { Card } from '../ui';
import { cn, formatCurrency, truncateAddress } from '../../utils';
import type { LeaderboardEntry } from '../../types/analytics';

export interface TopTradersCardProps {
  chainId?: number;
  className?: string;
}

export const TopTradersCard: React.FC<TopTradersCardProps> = ({ chainId, className }) => {
  const [traders, setTraders] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setError(null);
        const params = new URLSearchParams({ limit: '10' });
        if (chainId !== undefined) params.set('chainId', String(chainId));
        const response = await fetch(`/api/leaderboard?${params}`);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        const data = await response.json();
        if (!cancelled) setTraders(data.traders ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      }
    };
    load();
    return () => { cancelled = true; };
  }, [chainId]);

  return (
    <Card className={cn('glassmorphism', className)}>
      <div className="flex items-center space-x-2 mb-4">
        <Trophy className="text-yellow-400" size={18} />
        <h3 className="text-lg font-semibold text-white">Top Traders (24h)</h3>
      </div>

      {error && (
        <div className="text-center py-8 text-sm text-red-400">{error}</div>
      )}

      {!error && traders === null && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500" />
        </div>
      )}

      {!error && traders !== null && traders.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">
          No trades in the last 24 hours.
        </div>
      )}

      {!error && traders !== null && traders.length > 0 && (
        <div className="space-y-2">
          {traders.map((trader, index) => (
            <div
              key={trader.address}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03]"
            >
              <div className="flex items-center space-x-3">
                <span className={cn(
                  'w-6 text-sm font-semibold tabular-nums',
                  index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-500'
                )}>
                  {index + 1}
                </span>
                <span className="text-sm text-white font-mono">
                  {truncateAddress(trader.address)}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-gray-400 tabular-nums">
                  {trader.trades} trade{trader.trades === 1 ? '' : 's'}
                </span>
                <span className="text-white font-semibold tabular-nums">
                  {formatCurrency(trader.totalVolume, 'BNB', 3)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
