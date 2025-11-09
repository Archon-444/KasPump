'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Clock } from 'lucide-react';
import { KasPumpToken, TokenCardProps } from '../../types';
import { Card, Badge, Progress } from '../ui';
import { FavoriteButton } from './FavoriteButton';
import { formatCurrency, formatPercentage, formatTimeAgo, cn } from '../../utils';

const TokenCardComponent: React.FC<TokenCardProps> = ({
  token,
  onClick,
  showActions = false
}) => {
  const isPositive = token.change24h >= 0;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer gpu-accelerated"
    >
      <div onClick={onClick}>
        <Card 
          className={cn(
            "glassmorphism token-card-glow overflow-hidden transition-all duration-300",
            "hover:border-yellow-500/30 hover:shadow-lg hover:shadow-yellow-500/10"
          )}
        >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg gpu-accelerated">
              {token.symbol.slice(0, 2)}
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">{token.name}</h3>
              <p className="text-gray-400 text-sm">${token.symbol}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <FavoriteButton
              tokenAddress={token.address}
              chainId={(token as any).chainId}
              size="sm"
            />
            <Badge variant={isPositive ? 'success' : 'danger'}>
              <div className="flex items-center space-x-1">
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{formatPercentage(token.change24h)}</span>
              </div>
            </Badge>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
          {token.description || 'No description available'}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-gray-400 text-xs">Price</p>
            <p className="text-white font-semibold">
              {formatCurrency(token.price, 'BNB', 8)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Market Cap</p>
            <p className="text-white font-semibold">
              {formatCurrency(token.marketCap, 'BNB')}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">24h Volume</p>
            <p className="text-white font-semibold">
              {formatCurrency(token.volume24h, 'BNB')}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Holders</p>
            <p className="text-white font-semibold flex items-center">
              <Users size={14} className="mr-1" />
              {token.holders}
            </p>
          </div>
        </div>

        {/* Bonding Curve Progress */}
        {!token.isGraduated && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Graduation Progress</span>
              <span>{token.bondingCurveProgress.toFixed(1)}%</span>
            </div>
            <Progress 
              value={token.bondingCurveProgress} 
              className="h-2"
            />
            <div className="text-xs text-gray-500 mt-1">
              {token.isGraduated ? 'Graduated to AMM' : 'Trading on bonding curve'}
            </div>
          </div>
        )}

        {/* Graduated Badge */}
        {token.isGraduated && (
          <div className="mb-4">
            <Badge variant="success" className="w-full justify-center">
              🎉 Graduated to AMM
            </Badge>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <div className="flex items-center text-xs text-gray-400">
            <Clock size={12} className="mr-1" />
            {formatTimeAgo(token.createdAt)}
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="text-xs">
              {token.curveType}
            </Badge>
            {showActions && (
              <div className="flex space-x-1">
                <button
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors btn-glow-green"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle buy
                  }}
                >
                  Buy
                </button>
                <button
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors btn-glow-red"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle sell
                  }}
                >
                  Sell
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>
      </div>
    </motion.div>
  );
};

// Memoize TokenCard to prevent unnecessary re-renders in token lists/grids
export const TokenCard = memo(TokenCardComponent, (prevProps, nextProps) => {
  // Only re-render if token data or handlers actually changed
  return (
    prevProps.token.address === nextProps.token.address &&
    prevProps.token.price === nextProps.token.price &&
    prevProps.token.change24h === nextProps.token.change24h &&
    prevProps.token.bondingCurveProgress === nextProps.token.bondingCurveProgress &&
    prevProps.showActions === nextProps.showActions &&
    prevProps.onClick === nextProps.onClick
  );
});

TokenCard.displayName = 'TokenCard';

// Simplified token card for loading states
export const TokenCardSkeleton: React.FC = () => {
  return (
    <Card className="glassmorphism animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-700/50 rounded-full" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-700/50 rounded w-24" />
            <div className="h-3 bg-gray-700/50 rounded w-16" />
          </div>
        </div>
        <div className="h-6 bg-gray-700/50 rounded w-16" />
      </div>
      
      <div className="h-4 bg-gray-700/50 rounded w-full mb-2" />
      <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-4" />
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <div className="h-3 bg-gray-700/50 rounded w-12 mb-1" />
            <div className="h-4 bg-gray-700/50 rounded w-20" />
          </div>
        ))}
      </div>
      
      <div className="h-2 bg-gray-700/50 rounded w-full mb-2" />
      <div className="h-3 bg-gray-700/50 rounded w-32" />
    </Card>
  );
};

// Token list component for displaying multiple tokens
export const TokenList: React.FC<{
  tokens: KasPumpToken[];
  loading?: boolean;
  onTokenClick?: (token: KasPumpToken) => void;
  showActions?: boolean;
}> = ({ tokens, loading = false, onTokenClick, showActions = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <TokenCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card className="text-center py-12 glassmorphism">
        <div className="text-gray-400 mb-4">No tokens found</div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tokens.map((token, index) => (
        <motion.div
          key={token.address}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
        >
          <TokenCard
            token={token}
            onClick={() => onTokenClick?.(token)}
            showActions={showActions}
          />
        </motion.div>
      ))}
    </div>
  );
};
