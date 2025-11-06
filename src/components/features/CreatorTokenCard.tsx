'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ExternalLink, Users, DollarSign, Award, Activity } from 'lucide-react';
import { Card } from '../ui';
import { CreatorToken } from '../../hooks/useCreatorTokens';
import { cn, formatCurrency, formatPercentage, truncateAddress } from '../../utils';
import { getChainMetadata, getExplorerUrl } from '../../config/chains';
import Link from 'next/link';

export interface CreatorTokenCardProps {
  token: CreatorToken;
  onClick?: (token: CreatorToken) => void;
  className?: string;
}

export const CreatorTokenCard: React.FC<CreatorTokenCardProps> = ({
  token,
  onClick,
  className
}) => {
  const chainMetadata = getChainMetadata(token.chainId);
  const chainColor = chainMetadata?.color || '#6B7280';
  const explorerUrl = getExplorerUrl(token.chainId, 'address', token.address);
  const isPositiveChange = (token.change24h || 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={className}
    >
      <Card
        className={cn(
          'glassmorphism p-6 transition-all duration-300',
          'hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10',
          onClick && 'cursor-pointer'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div
              className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
              style={{ border: `2px solid ${chainColor}` }}
            >
              {token.symbol.slice(0, 2)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{token.name}</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">${token.symbol}</span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: chainColor }}
                  title={token.chainName}
                />
                <span className="text-xs text-gray-500">{token.chainName}</span>
              </div>
            </div>
          </div>
          {token.isGraduated && (
            <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs font-semibold text-green-400">
              <Award size={12} className="inline mr-1" />
              Graduated
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Market Cap</div>
            <div className="text-lg font-semibold text-white">
              {formatCurrency(token.marketCap, 'USD', 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Price</div>
            <div className="text-lg font-semibold text-white">
              ${token.price.toFixed(6)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1 flex items-center">
              <Activity size={12} className="mr-1" />
              Volume
            </div>
            <div className="text-sm font-semibold text-white">
              {formatCurrency(token.totalVolume || 0, 'USD', 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1 flex items-center">
              <Users size={12} className="mr-1" />
              Holders
            </div>
            <div className="text-sm font-semibold text-white">
              {token.holders || 0}
            </div>
          </div>
        </div>

        {/* Earnings */}
        {token.totalEarnings !== undefined && token.totalEarnings > 0 && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign size={16} className="text-green-400" />
                <span className="text-xs text-gray-400">Total Earnings</span>
              </div>
              <span className="text-sm font-semibold text-green-400">
                {formatCurrency(token.totalEarnings, 'USD', 2)}
              </span>
            </div>
          </div>
        )}

        {/* Bonding Curve Progress */}
        {!token.isGraduated && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Graduation Progress</span>
              <span>{formatPercentage(token.bondingCurveProgress)}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${token.bondingCurveProgress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 pt-4 border-t border-gray-700">
          <Link
            href={`/tokens/${token.address}?chain=${token.chainId}`}
            className="flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
              View Token
            </button>
          </Link>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

