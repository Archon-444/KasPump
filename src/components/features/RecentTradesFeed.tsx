'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, ExternalLink, Clock } from 'lucide-react';
import { Card } from '../ui';
import { useTradeEvents, TradeEvent } from '../../hooks/useWebSocket';
import { useMultichainWallet } from '../../hooks/useMultichainWallet';
import { cn, formatCurrency, formatTimeAgo } from '../../utils';
import { getExplorerUrl } from '../../config/chains';

export interface RecentTradesFeedProps {
  tokenAddress: string;
  chainId?: number;
  maxTrades?: number;
  className?: string;
}

export const RecentTradesFeed: React.FC<RecentTradesFeedProps> = ({
  tokenAddress,
  chainId,
  maxTrades = 20,
  className
}) => {
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const wallet = useMultichainWallet();

  useTradeEvents((trade: TradeEvent) => {
    if (trade.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()) {
      setTrades(prev => {
        const newTrades = [trade, ...prev];
        const unique = newTrades.filter((t, index, self) =>
          index === self.findIndex(t2 => t2.txHash === t.txHash)
        );
        return unique.slice(0, maxTrades);
      });
    }
  });

  useEffect(() => {
    const fetchInitialTrades = async () => {
      try {
        const res = await fetch(
          `/api/tokens/trades?address=${tokenAddress}${chainId ? `&chainId=${chainId}` : ''}&limit=${maxTrades}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.trades && data.trades.length > 0) {
          setTrades(data.trades);
        }
      } catch (err) {
        console.error('Failed to fetch initial trades:', err);
      }
    };

    fetchInitialTrades();
  }, [tokenAddress, chainId, maxTrades]);

  if (trades.length === 0) {
    return (
      <Card className={cn('glassmorphism p-6', className)}>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
        <div className="text-center py-8 text-gray-400">
          <Clock size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recent trades yet</p>
          <p className="text-xs mt-1">Trades will appear here in real-time</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('glassmorphism p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
        <span className="text-xs text-gray-400">
          {trades.length} {trades.length === 1 ? 'trade' : 'trades'}
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {trades.map((trade, index) => {
            const isBuy = trade.type === 'buy';
            const isOwnTrade = wallet.address?.toLowerCase() === trade.trader?.toLowerCase();
            const explorerUrl = chainId ? getExplorerUrl(chainId, 'tx', trade.txHash) : undefined;

            return (
              <motion.div
                key={`${trade.txHash}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg transition-all',
                  isOwnTrade
                    ? 'bg-yellow-500/10 border border-yellow-500/30'
                    : 'bg-gray-800/30 hover:bg-gray-800/50'
                )}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Trade Type Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                    isBuy ? 'bg-green-500/20' : 'bg-red-500/20'
                  )}>
                    {isBuy ? (
                      <TrendingUp size={16} className="text-green-400" />
                    ) : (
                      <TrendingDown size={16} className="text-red-400" />
                    )}
                  </div>

                  {/* Trade Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        'text-sm font-semibold',
                        isBuy ? 'text-green-400' : 'text-red-400'
                      )}>
                        {isBuy ? 'Buy' : 'Sell'}
                      </span>
                      <span className="text-sm text-white">
                        {parseFloat(trade.nativeAmount || '0').toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}
                      </span>
                      {isOwnTrade && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-400 mt-0.5">
                      <span>
                        @ {formatCurrency(parseFloat(trade.price), '', 6)}
                      </span>
                      <span>•</span>
                      <span>{formatTimeAgo(new Date(trade.timestamp))}</span>
                    </div>
                  </div>
                </div>

                {/* Explorer Link */}
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 ml-2 p-1.5 hover:bg-gray-700 rounded transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink size={14} className="text-gray-400 hover:text-yellow-400" />
                  </a>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
};

