'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, ExternalLink, History } from 'lucide-react';
import { Card, Spinner } from '../ui';
import { UserTrade } from '../../hooks/useUserTrades';
import { cn, formatCurrency, formatTimeAgo } from '../../utils';
import { getExplorerUrl } from '../../config/chains';

export interface UserTradeHistoryProps {
  trades: UserTrade[];
  loading: boolean;
  className?: string;
}

export const UserTradeHistory: React.FC<UserTradeHistoryProps> = ({
  trades,
  loading,
  className,
}) => {
  if (loading) {
    return (
      <Card className={cn('glassmorphism p-6', className)}>
        <h3 className="text-lg font-semibold text-white mb-4">My Trades</h3>
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card className={cn('glassmorphism p-6', className)}>
        <h3 className="text-lg font-semibold text-white mb-4">My Trades</h3>
        <div className="text-center py-8 text-gray-400">
          <History size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recent trades found</p>
          <p className="text-xs mt-1">Your buys and sells will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('glassmorphism p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">My Trades</h3>
        <span className="text-xs text-gray-500">{trades.length} recent</span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {trades.map((trade) => (
          <div
            key={trade.txHash + trade.tokenAddress}
            className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-1.5 rounded-lg',
                trade.type === 'buy'
                  ? 'bg-green-500/[0.1] text-green-400'
                  : 'bg-red-500/[0.1] text-red-400'
              )}>
                {trade.type === 'buy' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  {trade.type === 'buy' ? 'Bought' : 'Sold'} ${trade.tokenSymbol}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(new Date(trade.timestamp))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={cn(
                  'text-sm font-medium tabular-nums',
                  trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                )}>
                  {trade.type === 'buy' ? '-' : '+'}{formatCurrency(trade.nativeAmount, 'ETH', 4)}
                </div>
                <div className="text-xs text-gray-500 tabular-nums">
                  {trade.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} tokens
                </div>
              </div>
              <a
                href={getExplorerUrl(trade.chainId, 'tx', trade.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition-colors"
                title="View transaction"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
