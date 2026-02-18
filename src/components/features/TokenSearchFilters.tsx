'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, TrendingUp, Clock, Zap, Award, ChevronDown } from 'lucide-react';
import { Input } from '../ui';
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
      {/* Search Bar with Glow Effect */}
      <div className="input-glow-wrapper">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <Input
            placeholder="Search tokens by name, symbol, or address..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="pl-12 pr-12 h-12 text-base bg-[#111]/80 border-white/10 rounded-xl focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 focus:shadow-[0_0_20px_rgba(234,179,8,0.15)] placeholder:text-gray-500 transition-all duration-300"
            aria-label="Search tokens"
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilter('searchQuery', '')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters & Sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filters (Pill Style) */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
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
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                filters.status === key
                  ? 'bg-white/10 text-white shadow-sm border border-white/5'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <Icon size={12} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Sort:</span>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:ring-1 focus:ring-yellow-500/30 focus:border-yellow-500/50 focus:shadow-[0_0_12px_rgba(234,179,8,0.15)] transition-all duration-200"
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
              'p-1.5 rounded-lg transition-all duration-200',
              'hover:bg-white/5 text-gray-400 hover:text-white',
              filters.sortOrder === 'desc' && 'rotate-180'
            )}
            title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
            showAdvancedFilters
              ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
              : 'bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
          )}
        >
          <Filter size={14} />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 bg-yellow-500 text-gray-900 rounded text-[10px] font-bold">
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
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <X size={12} />
            <span>Clear</span>
          </button>
        )}

        {/* Token Count */}
        {tokenCount !== undefined && (
          <div className="ml-auto text-xs text-gray-500 font-medium">
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
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
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
                            ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                            : 'bg-white/5 text-gray-300 border border-white/5 hover:bg-white/10'
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
                          ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                          : 'bg-white/5 text-gray-300 border border-white/5 hover:bg-white/10'
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

