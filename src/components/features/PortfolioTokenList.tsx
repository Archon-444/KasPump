'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { PortfolioToken } from '../../hooks/usePortfolio';
import { Card, Button } from '../ui';
import { formatCurrency, formatPercentage, cn } from '../../utils';
import { getChainById, getChainMetadata } from '../../config/chains';
import Link from 'next/link';

export interface PortfolioTokenListProps {
  tokens: PortfolioToken[];
  onTokenClick?: (token: PortfolioToken) => void;
  className?: string;
}

type SortField = 'value' | 'balance' | 'profitLoss' | 'chain' | 'name';
type SortDirection = 'asc' | 'desc';

export const PortfolioTokenList: React.FC<PortfolioTokenListProps> = ({
  tokens,
  onTokenClick,
  className
}) => {
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterChain, setFilterChain] = useState<number | 'all'>('all');

  // Get unique chains from tokens
  const uniqueChains = useMemo(() => {
    const chains = new Map<number, string>();
    tokens.forEach(token => {
      if (!chains.has(token.chainId)) {
        chains.set(token.chainId, token.chainName);
      }
    });
    return Array.from(chains.entries()).map(([chainId, name]) => ({
      chainId,
      name,
    }));
  }, [tokens]);

  // Filter tokens by chain
  const filteredTokens = useMemo(() => {
    return filterChain === 'all'
      ? tokens
      : tokens.filter(token => token.chainId === filterChain);
  }, [tokens, filterChain]);

  // Sort tokens
  const sortedTokens = useMemo(() => {
    const sorted = [...filteredTokens].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'balance':
          comparison = a.balance - b.balance;
          break;
        case 'profitLoss':
          comparison = (a.profitLoss || 0) - (b.profitLoss || 0);
          break;
        case 'chain':
          comparison = a.chainName.localeCompare(b.chainName);
          break;
        case 'name':
          comparison = a.token.symbol.localeCompare(b.token.symbol);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredTokens, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortButton: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <button
      onClick={() => handleSort(field)}
      className={cn(
        'flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors',
        sortField === field && 'text-yellow-400'
      )}
    >
      <span>{label}</span>
      <ArrowUpDown size={12} />
    </button>
  );

  if (tokens.length === 0) {
    return (
      <Card className="glassmorphism text-center py-12">
        <div className="text-gray-400 mb-4">No tokens in portfolio</div>
        <div className="text-sm text-gray-500">
          Your tokens will appear here once you start trading
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter and Sort Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Chain Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Chain:</span>
          <select
            value={filterChain}
            onChange={(e) => setFilterChain(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-500"
          >
            <option value="all">All Chains</option>
            {uniqueChains.map(({ chainId, name }) => (
              <option key={chainId} value={chainId}>{name}</option>
            ))}
          </select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-4 text-xs">
          <span className="text-gray-400">Sort by:</span>
          <div className="flex items-center space-x-3">
            <SortButton field="value" label="Value" />
            <SortButton field="balance" label="Balance" />
            <SortButton field="profitLoss" label="P&L" />
            <SortButton field="chain" label="Chain" />
          </div>
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-2">
        {sortedTokens.map((portfolioToken, index) => {
          const chainMetadata = getChainMetadata(portfolioToken.chainId);
          const chainConfig = getChainById(portfolioToken.chainId);
          const isProfit = (portfolioToken.profitLoss || 0) >= 0;
          const hasPnL = portfolioToken.profitLoss !== undefined;

          return (
            <motion.div
              key={`${portfolioToken.chainId}-${portfolioToken.token.address}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: 4 }}
              className="cursor-pointer"
              onClick={() => onTokenClick?.(portfolioToken)}
            >
              <Card className="glassmorphism hover:border-yellow-500/30 transition-all duration-300">
                <div className="flex items-center justify-between p-4">
                  {/* Token Info */}
                  <div className="flex items-center space-x-4 flex-1">
                    <div 
                      className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ 
                        border: `2px solid ${chainMetadata?.color || '#6B7280'}` 
                      }}
                    >
                      {portfolioToken.token.symbol.slice(0, 2)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-white truncate">
                          {portfolioToken.token.symbol}
                        </h3>
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: chainMetadata?.color || '#6B7280' }}
                          title={portfolioToken.chainName}
                        />
                      </div>
                      <div className="text-sm text-gray-400">
                        {portfolioToken.balanceFormatted} {portfolioToken.token.symbol}
                      </div>
                    </div>
                  </div>

                  {/* Value and P&L */}
                  <div className="flex items-center space-x-6 text-right">
                    <div>
                      <div className="text-lg font-semibold text-white">
                        {portfolioToken.valueFormatted}
                      </div>
                      <div className="text-xs text-gray-500">
                        @ {formatCurrency(portfolioToken.token.price, '', 6)} each
                      </div>
                    </div>

                    {hasPnL && (
                      <div className={cn(
                        'flex items-center space-x-1',
                        isProfit ? 'text-green-400' : 'text-red-400'
                      )}>
                        {isProfit ? (
                          <TrendingUp size={16} />
                        ) : (
                          <TrendingDown size={16} />
                        )}
                        <div>
                          <div className="font-semibold">
                            {formatCurrency(portfolioToken.profitLoss!, 'USD', 2)}
                          </div>
                          {portfolioToken.profitLossPercent !== undefined && (
                            <div className="text-xs">
                              {portfolioToken.profitLossPercent >= 0 ? '+' : ''}
                              {formatPercentage(portfolioToken.profitLossPercent)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

