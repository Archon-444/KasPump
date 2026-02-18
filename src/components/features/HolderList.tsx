'use client';

import React, { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Users, Copy, ExternalLink, TrendingUp, Wallet } from 'lucide-react';
import { Card } from '../ui';

import { getExplorerUrl } from '../../config/chains';
import { cn, formatCurrency, truncateAddress, copyToClipboard } from '../../utils';

export interface Holder {
  address: string;
  balance: string;
  percentage: number;
  value?: number;
}

export interface HolderListProps {
  tokenAddress: string;
  chainId?: number | undefined;
  maxHolders?: number;
  showPercentage?: boolean;
  className?: string;
}

const HolderListComponent: React.FC<HolderListProps> = ({
  tokenAddress,
  chainId,
  maxHolders = 20,
  showPercentage = true,
  className,
}) => {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    const loadHolders = async () => {
      if (!tokenAddress) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Accurate holder tracking requires:
        // 1. Querying all Transfer events from token contract
        // 2. Building balance map from event history
        // 3. This needs event indexing (subgraph/API) for efficiency

        // For now, show empty state with explanation
        // In production, implement with:
        // - Event indexer (The Graph, Alchemy, etc.)
        // - Backend API aggregating Transfer events
        // - Periodic snapshot updates

        setHolders([]);

        // Note: Could query specific known addresses if needed:
        // const tokenContract = contracts.getTokenContract(tokenAddress);
        // const balance = await tokenContract.balanceOf(address);

      } catch (error) {
        console.error('Failed to load holders:', error);
        setHolders([]);
      } finally {
        setLoading(false);
      }
    };

    loadHolders();
  }, [tokenAddress, chainId, maxHolders]);

  const handleCopyAddress = async (address: string) => {
    await copyToClipboard(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const explorerUrl = chainId ? (address: string) => getExplorerUrl(chainId, 'address', address) : null;

  if (loading) {
    return (
      <Card className={cn('glassmorphism p-6', className)}>
        <div className="flex items-center space-x-3 mb-4">
          <Users className="text-yellow-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Top Holders</h3>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-32" />
                  <div className="h-3 bg-gray-700 rounded w-24" />
                </div>
              </div>
              <div className="h-4 bg-gray-700 rounded w-20" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (holders.length === 0) {
    return (
      <Card className={cn('glassmorphism p-6', className)}>
        <div className="flex items-center space-x-3 mb-4">
          <Users className="text-yellow-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Top Holders</h3>
        </div>
        <div className="text-center py-8 text-gray-400">
          <Wallet size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Holder tracking requires event indexing</p>
          <p className="text-xs mt-2">Enable via subgraph or API service</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('glassmorphism p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Users className="text-yellow-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Top Holders</h3>
        </div>
        <span className="text-xs text-gray-400">
          {holders.length} {holders.length === 1 ? 'holder' : 'holders'}
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {holders.map((holder, index) => {
          const isCopied = copiedAddress === holder.address;
          const explorerLink = explorerUrl ? explorerUrl(holder.address) : null;

          return (
            <motion.div
              key={holder.address}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Rank Badge */}
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                  index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  index === 1 ? 'bg-gray-400/20 text-gray-400' :
                  index === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-white/5 text-gray-400'
                )}>
                  {index + 1}
                </div>

                {/* Address */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <code className="text-sm text-white font-mono truncate">
                      {truncateAddress(holder.address, 6, 4)}
                    </code>
                    <button
                      onClick={() => handleCopyAddress(holder.address)}
                      className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                      title="Copy address"
                    >
                      <Copy size={12} className={cn(
                        'transition-colors',
                        isCopied ? 'text-green-400' : 'text-gray-400 hover:text-white'
                      )} />
                    </button>
                    {explorerLink && (
                      <a
                        href={explorerLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                        title="View on explorer"
                      >
                        <ExternalLink size={12} className="text-gray-400 hover:text-yellow-400" />
                      </a>
                    )}
                  </div>
                  {showPercentage && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {holder.percentage.toFixed(2)}% of supply
                    </div>
                  )}
                </div>
              </div>

              {/* Balance */}
              <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    {parseFloat(holder.balance).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  {holder.value !== undefined && (
                    <div className="text-xs text-gray-400">
                      {formatCurrency(holder.value, '$', 2)}
                    </div>
                  )}
                </div>
                {index < 3 && (
                  <TrendingUp size={16} className={cn(
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-gray-400' :
                    'text-orange-400'
                  )} />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {holders.length >= maxHolders && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Showing top {maxHolders} holders
          </p>
        </div>
      )}
    </Card>
  );
};

// Memoize to prevent unnecessary holder list reloads
export const HolderList = memo(HolderListComponent, (prevProps, nextProps) => {
  return (
    prevProps.tokenAddress === nextProps.tokenAddress &&
    prevProps.chainId === nextProps.chainId &&
    prevProps.maxHolders === nextProps.maxHolders &&
    prevProps.showPercentage === nextProps.showPercentage
  );
});

HolderList.displayName = 'HolderList';

