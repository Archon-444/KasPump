'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Coins } from 'lucide-react';
import { Card } from '../ui';
import { PortfolioStats } from '../../hooks/usePortfolio';
import { cn } from '../../utils';

export interface PortfolioStatsCardProps {
  stats: PortfolioStats;
  className?: string;
}

export const PortfolioStatsCard: React.FC<PortfolioStatsCardProps> = ({
  stats,
  className
}) => {
  const isProfit = stats.totalProfitLoss >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6', className)}
    >
      {/* Total Portfolio Value */}
      <Card className="glassmorphism">
        <div className="flex items-center justify-between mb-2">
          <div className="text-gray-400 text-sm">Total Value</div>
          <Wallet size={20} className="text-yellow-400" />
        </div>
        <div className="text-2xl font-bold text-white mb-1">
          {stats.totalValueFormatted}
        </div>
        <div className="text-xs text-gray-500">
          Across {stats.chainCount} chain{stats.chainCount !== 1 ? 's' : ''}
        </div>
      </Card>

      {/* Total P&L */}
      <Card className={cn(
        'glassmorphism',
        isProfit ? 'border-green-500/30' : 'border-red-500/30'
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-gray-400 text-sm">Total P&L</div>
          {isProfit ? (
            <TrendingUp size={20} className="text-green-400" />
          ) : (
            <TrendingDown size={20} className="text-red-400" />
          )}
        </div>
        <div className={cn(
          'text-2xl font-bold mb-1',
          isProfit ? 'text-green-400' : 'text-red-400'
        )}>
          {stats.totalProfitLossFormatted}
        </div>
        <div className={cn(
          'text-xs',
          isProfit ? 'text-green-400' : 'text-red-400'
        )}>
          {stats.totalProfitLossPercent >= 0 ? '+' : ''}{stats.totalProfitLossPercent.toFixed(2)}%
        </div>
      </Card>

      {/* Token Count */}
      <Card className="glassmorphism">
        <div className="flex items-center justify-between mb-2">
          <div className="text-gray-400 text-sm">Tokens</div>
          <Coins size={20} className="text-blue-400" />
        </div>
        <div className="text-2xl font-bold text-white mb-1">
          {stats.tokenCount}
        </div>
        <div className="text-xs text-gray-500">
          Unique tokens held
        </div>
      </Card>

      {/* Cost Basis */}
      <Card className="glassmorphism">
        <div className="flex items-center justify-between mb-2">
          <div className="text-gray-400 text-sm">Cost Basis</div>
          <Wallet size={20} className="text-gray-400" />
        </div>
        <div className="text-2xl font-bold text-white mb-1">
          {stats.totalCostBasis > 0 
            ? `$${stats.totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : 'N/A'
          }
        </div>
        <div className="text-xs text-gray-500">
          {stats.totalCostBasis > 0 ? 'Total invested' : 'No history available'}
        </div>
      </Card>
    </motion.div>
  );
};

