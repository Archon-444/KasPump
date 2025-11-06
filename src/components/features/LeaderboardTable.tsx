'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { Card } from '../ui';
import { cn, formatCurrency, truncateAddress } from '../../utils';
import { getExplorerUrl } from '../../config/chains';

export interface LeaderboardToken {
  address: string;
  name: string;
  symbol: string;
  volume: number;
  marketCap: number;
  change24h: number;
  chainId: number;
}

export interface LeaderboardTableProps {
  tokens: LeaderboardToken[];
  sortBy?: 'volume' | 'marketCap' | 'change';
  className?: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  tokens,
  sortBy = 'volume',
  className
}) => {
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sortedTokens = [...tokens].sort((a, b) => {
    switch (sortBy) {
      case 'volume':
        return b.volume - a.volume;
      case 'marketCap':
        return b.marketCap - a.marketCap;
      case 'change':
        return b.change24h - a.change24h;
      default:
        return 0;
    }
  });

  if (sortedTokens.length === 0) {
    return (
      <Card className="glassmorphism">
        <div className="text-center py-8 text-gray-400">
          No tokens available for leaderboard
        </div>
      </Card>
    );
  }

  // Mobile: Show simplified card view
  if (isMobile && sortedTokens.length > 0) {
    return (
      <Card className={cn('glassmorphism overflow-hidden', className)}>
        <div className="flex items-center justify-between mb-4 p-4">
          <h3 className="text-base font-semibold text-white">Top Tokens</h3>
          <select
            value={sortBy}
            onChange={(e) => {}}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-xs min-h-[36px] touch-manipulation"
          >
            <option value="volume">Volume</option>
            <option value="marketCap">Market Cap</option>
            <option value="change">24h Change</option>
          </select>
        </div>

        <div className="space-y-2 p-4">
          {sortedTokens.slice(0, 10).map((token, index) => {
            const isPositive = token.change24h >= 0;
            return (
              <div
                key={token.address}
                className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">{token.name}</div>
                    <div className="text-xs text-gray-400">{token.symbol}</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-white">
                    {formatCurrency(token.volume, 'USD', 0)}
                  </div>
                  <div className={cn('text-xs', isPositive ? 'text-green-400' : 'text-red-400')}>
                    {isPositive ? '+' : ''}{token.change24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('glassmorphism overflow-hidden', className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Top Tokens</h3>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => {}}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs"
          >
            <option value="volume">Volume</option>
            <option value="marketCap">Market Cap</option>
            <option value="change">24h Change</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Token
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Volume
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Market Cap
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                24h Change
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTokens.slice(0, 10).map((token, index) => {
              const isPositive = token.change24h >= 0;
              const explorerUrl = getExplorerUrl(token.chainId, 'address', token.address);

              return (
                <motion.tr
                  key={token.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      index < 3 ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' : 'bg-gray-700 text-gray-400'
                    )}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {token.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{token.name}</div>
                        <div className="text-xs text-gray-400">${token.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-white font-semibold">
                      {formatCurrency(token.volume, 'USD', 0)}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-white font-semibold">
                      {formatCurrency(token.marketCap, 'USD', 0)}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className={cn(
                      'flex items-center justify-end space-x-1 font-semibold',
                      isPositive ? 'text-green-400' : 'text-red-400'
                    )}>
                      {isPositive ? (
                        <TrendingUp size={14} />
                      ) : (
                        <TrendingDown size={14} />
                      )}
                      <span>{token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%</span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

