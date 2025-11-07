'use client';

import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Heart,
  Share2,
  ExternalLink,
  ChevronRight,
  Zap
} from 'lucide-react';
import { KasPumpToken } from '../../types';
import { formatCurrency, formatPercentage, formatTimeAgo, cn } from '../../utils';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { Badge, Progress } from '../ui';

export interface MobileTokenCardProps {
  token: KasPumpToken;
  onClick?: (token: KasPumpToken) => void;
  onQuickTrade?: (token: KasPumpToken, type: 'buy' | 'sell') => void;
  className?: string;
  showQuickActions?: boolean;
}

export const MobileTokenCard: React.FC<MobileTokenCardProps> = ({
  token,
  onClick,
  onQuickTrade,
  className,
  showQuickActions = true
}) => {
  const [liked, setLiked] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isPositive = token.change24h >= 0;
  const haptic = useHapticFeedback();

  const handlePanEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      // Swipe right - Quick buy
      haptic.trigger('success');
      onQuickTrade?.(token, 'buy');
    } else if (info.offset.x < -threshold) {
      // Swipe left - Show actions
      haptic.trigger('selection');
      setShowActions(true);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    haptic.trigger(liked ? 'light' : 'success');
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (navigator.share) {
      navigator.share({
        title: `${token.name} (${token.symbol})`,
        text: `Check out ${token.name} on KasPump!`,
        url: `https://kaspump.io/token/${token.address}`
      });
    }
  };

  const handleQuickAction = (type: 'buy' | 'sell', e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickTrade?.(token, type);
    setShowActions(false);
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -150, right: 150 }}
      dragElastic={0.3}
      onPanEnd={handlePanEnd}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative bg-gray-800/40 backdrop-blur-sm rounded-2xl overflow-hidden',
        'border border-gray-700/30 hover:border-yellow-500/30 transition-all duration-300',
        className
      )}
      onClick={() => onClick?.(token)}
    >
      {/* Swipe Actions Background */}
      <div className="absolute inset-y-0 left-0 w-20 bg-green-600/20 flex items-center justify-center">
        <TrendingUp className="text-green-400" size={24} />
        <span className="text-xs text-green-400 mt-1">Buy</span>
      </div>
      
      <div className="absolute inset-y-0 right-0 w-20 bg-yellow-600/20 flex items-center justify-center">
        <Share2 className="text-yellow-400" size={24} />
        <span className="text-xs text-yellow-400 mt-1">More</span>
      </div>

      {/* Main Card Content */}
      <div className="relative z-10 bg-gray-800/60 backdrop-blur-sm p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
              {token.symbol.slice(0, 2)}
            </div>
            <div>
              <h3 className="font-bold text-white text-lg leading-tight">{token.name}</h3>
              <p className="text-gray-400 text-sm">${token.symbol}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={isPositive ? 'success' : 'danger'} className="text-xs">
              <div className="flex items-center space-x-1">
                {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                <span>{formatPercentage(token.change24h)}</span>
              </div>
            </Badge>
            
            <button
              onClick={handleLike}
              className={cn(
                'p-1 rounded-full transition-colors',
                liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
              )}
            >
              <Heart size={16} className={liked ? 'fill-current' : ''} />
            </button>
          </div>
        </div>

        {/* Price Display */}
        <div className="mb-4">
          <div className="text-2xl font-mono font-bold text-white mb-1">
            {formatCurrency(token.price, 'BNB', 8)}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Market Cap</span>
              <div className="text-white font-medium">{formatCurrency(token.marketCap, 'BNB')}</div>
            </div>
            <div>
              <span className="text-gray-400">24h Volume</span>
              <div className="text-white font-medium">{formatCurrency(token.volume24h, 'BNB')}</div>
            </div>
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
              className="h-2 mb-1"
            />
            <div className="text-xs text-gray-500">
              {(100 - token.bondingCurveProgress).toFixed(1)}% until AMM
            </div>
          </div>
        )}

        {/* Graduated Badge */}
        {token.isGraduated && (
          <div className="mb-4">
            <Badge variant="success" className="w-full justify-center py-2">
              🎉 Graduated to AMM
            </Badge>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              <Users size={12} />
              <span>{token.holders}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock size={12} />
              <span>{formatTimeAgo(token.createdAt)}</span>
            </div>
          </div>

          {showQuickActions && (
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => handleQuickAction('buy', e)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium transition-colors"
              >
                Buy
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight size={16} />
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Overlay */}
      {showActions && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center z-20"
        >
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => handleQuickAction('buy', e)}
              className="flex flex-col items-center space-y-2 p-4 bg-green-600 rounded-xl text-white"
            >
              <TrendingUp size={24} />
              <span className="text-sm font-medium">Buy</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => handleQuickAction('sell', e)}
              className="flex flex-col items-center space-y-2 p-4 bg-red-600 rounded-xl text-white"
            >
              <TrendingDown size={24} />
              <span className="text-sm font-medium">Sell</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="flex flex-col items-center space-y-2 p-4 bg-yellow-600 rounded-xl text-white"
            >
              <Share2 size={24} />
              <span className="text-sm font-medium">Share</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(false);
              }}
              className="flex flex-col items-center space-y-2 p-4 bg-gray-600 rounded-xl text-white"
            >
              <ExternalLink size={24} />
              <span className="text-sm font-medium">View</span>
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Swipe Hint */}
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
        <div className="w-8 h-1 bg-gray-600 rounded-full opacity-30" />
      </div>
    </motion.div>
  );
};

// Compact Mobile Token Card for lists
export interface CompactMobileTokenCardProps {
  token: KasPumpToken;
  onClick?: (token: KasPumpToken) => void;
  rank?: number;
  className?: string;
}

export const CompactMobileTokenCard: React.FC<CompactMobileTokenCardProps> = ({
  token,
  onClick,
  rank,
  className
}) => {
  const isPositive = token.change24h >= 0;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick?.(token)}
      className={cn(
        'flex items-center space-x-3 p-3 bg-gray-800/30 rounded-xl',
        'border border-gray-700/30 hover:border-yellow-500/30',
        'transition-all duration-200 cursor-pointer',
        className
      )}
    >
      {/* Rank */}
      {rank && (
        <div className="w-6 text-center">
          <span className="text-sm font-bold text-gray-400">#{rank}</span>
        </div>
      )}

      {/* Token Icon */}
      <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
        {token.symbol.slice(0, 2)}
      </div>

      {/* Token Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-white truncate">{token.name}</h4>
            <p className="text-sm text-gray-400">{token.symbol}</p>
          </div>
          
          <div className="text-right">
            <div className="text-white font-mono text-sm">
              {formatCurrency(token.price, 'BNB', 6)}
            </div>
            <div className={cn(
              'text-xs font-medium',
              isPositive ? 'text-green-400' : 'text-red-400'
            )}>
              {formatPercentage(token.change24h)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          // Handle quick buy
        }}
        className="p-2 bg-green-600 text-white rounded-lg"
      >
        <Zap size={16} />
      </motion.button>
    </motion.div>
  );
};