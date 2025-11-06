'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, TrendingUp, Clock, Zap, Award, ChevronDown } from 'lucide-react';
import { Input, Button } from '../ui';
import { cn } from '../../utils';
import { supportedChains, getChainMetadata, isTestnet } from '../../config/chains';

export interface TokenFilters {
  searchQuery: string;
  chains: number[]; // Selected chain IDs
  status: 'all' | 'active' | 'graduated' | 'new';
  volumeRange: 'all' | 'high' | 'medium' | 'low';
  sortBy: 'volume' | 'marketCap' | 'price' | 'change24h' | 'holders' | 'created';
  sortOrder: 'asc' | 'desc';
}

export interface TokenSearchFiltersProps {
  filters: TokenFilters;
  onFiltersChange: (filters: TokenFilters) => void;
  tokenCount?: number;
  className?: string;
}

export const TokenSearchFilters: React.FC<TokenSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  tokenCount,
  className
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const mainnetChains = supportedChains.filter(chain => !isTestnet(chain.id));

  const updateFilter = <K extends keyof TokenFilters>(key: K, value: TokenFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleChain = (chainId: number) => {
    const newChains = filters.chains.includes(chainId)
      ? filters.chains.filter(id => id !== chainId)
      : [...filters.chains, chainId];
    updateFilter('chains', newChains);
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      chains: [],
      status: 'all',
      volumeRange: 'all',
      sortBy: 'volume',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = filters.searchQuery || filters.chains.length > 0 || filters.status !== 'all' || filters.volumeRange !== 'all';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <Input
          placeholder="Search tokens by name, symbol, or address... (Press '/' to focus)"
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          className="pl-12 pr-4 h-12 text-lg bg-gray-800/50 border-gray-700 focus:border-purple-500 focus:ring-purple-500"
          aria-label="Search tokens"
        />
        {filters.searchQuery && (
          <button
            onClick={() => updateFilter('searchQuery', '')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            aria-label="Clear search"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Quick Filters & Sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filters */}
        <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1">
          {([
            { key: 'all', label: 'All', icon: Zap },
            { key: 'active', label: 'Active', icon: TrendingUp },
            { key: 'graduated', label: 'Graduated', icon: Award },
            { key: 'new', label: 'New', icon: Clock },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => updateFilter('status', key)}
              className={cn(
                'flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all',
                filters.status === key
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Sort:</span>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="volume">Volume</option>
            <option value="marketCap">Market Cap</option>
            <option value="price">Price</option>
            <option value="change24h">24h Change</option>
            <option value="holders">Holders</option>
            <option value="created">Newest</option>
          </select>
          <button
            onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            className={cn(
              'p-2 rounded-lg transition-all',
              'hover:bg-gray-700 text-gray-400 hover:text-white',
              filters.sortOrder === 'desc' && 'rotate-180'
            )}
            title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            'bg-gray-800 hover:bg-gray-700 text-gray-300',
            showAdvancedFilters && 'bg-purple-600 text-white'
          )}
        >
          <Filter size={16} />
          <span>Advanced</span>
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 bg-purple-500 rounded text-xs">
              {[
                filters.chains.length,
                filters.status !== 'all' ? 1 : 0,
                filters.volumeRange !== 'all' ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <X size={14} />
            <span>Clear</span>
          </button>
        )}

        {/* Token Count */}
        {tokenCount !== undefined && (
          <div className="ml-auto text-sm text-gray-400">
            {tokenCount} token{tokenCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
              {/* Chain Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Blockchains
                </label>
                <div className="flex flex-wrap gap-2">
                  {mainnetChains.map((chain) => {
                    const metadata = getChainMetadata(chain.id);
                    const isSelected = filters.chains.includes(chain.id);
                    const chainColor = metadata?.color || '#6B7280';

                    return (
                      <button
                        key={chain.id}
                        onClick={() => toggleChain(chain.id)}
                        className={cn(
                          'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                          isSelected
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        )}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: chainColor }}
                        />
                        <span>{metadata?.shortName || chain.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Volume Range */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Volume Range
                </label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'all', label: 'All' },
                    { key: 'high', label: 'High (>$10k)' },
                    { key: 'medium', label: 'Medium ($1k-$10k)' },
                    { key: 'low', label: 'Low (<$1k)' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => updateFilter('volumeRange', key)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        filters.volumeRange === key
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

TokenSearchFilters.displayName = 'TokenSearchFilters';

