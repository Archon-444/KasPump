'use client';

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Clock, Flame, Shield, Zap, Target, Activity } from 'lucide-react';
import { KasPumpToken, TokenCardProps } from '../../types';
import { Card, Badge, Progress } from '../ui';
import { FavoriteButton } from './FavoriteButton';
import { formatCurrency, formatPercentage, formatTimeAgo, cn } from '../../utils';

// Health scoring system
type LaunchHealth = 'excellent' | 'good' | 'fair' | 'risky';

interface HealthMetrics {
  overall: LaunchHealth;
  volumeScore: number;
  holderScore: number;
  stabilityScore: number;
  liquidityScore: number;
}

const calculateHealthMetrics = (token: KasPumpToken): HealthMetrics => {
  // Volume score (based on 24h volume relative to market cap)
  const volumeToMcapRatio = token.marketCap > 0 ? (token.volume24h / token.marketCap) * 100 : 0;
  const volumeScore =
    volumeToMcapRatio > 50 ? 100 :
    volumeToMcapRatio > 20 ? 80 :
    volumeToMcapRatio > 10 ? 60 :
    volumeToMcapRatio > 5 ? 40 : 20;

  // Holder score (more holders = healthier)
  const holderScore =
    token.holders > 1000 ? 100 :
    token.holders > 500 ? 80 :
    token.holders > 100 ? 60 :
    token.holders > 50 ? 40 : 20;

  // Stability score (lower volatility = better)
  const absChange = Math.abs(token.change24h);
  const stabilityScore =
    absChange < 5 ? 100 :
    absChange < 15 ? 80 :
    absChange < 30 ? 60 :
    absChange < 50 ? 40 : 20;

  // Liquidity score (based on graduation progress as proxy)
  const liquidityScore = token.isGraduated ? 100 : token.bondingCurveProgress;

  // Overall health calculation
  const avgScore = (volumeScore + holderScore + stabilityScore + liquidityScore) / 4;
  const overall: LaunchHealth =
    avgScore >= 80 ? 'excellent' :
    avgScore >= 60 ? 'good' :
    avgScore >= 40 ? 'fair' : 'risky';

  return { overall, volumeScore, holderScore, stabilityScore, liquidityScore };
};

const TokenCardComponent: React.FC<TokenCardProps> = ({
  token,
  onClick,
  showActions = false
}) => {
  const isPositive = token.change24h >= 0;
  const health = useMemo(() => calculateHealthMetrics(token), [token]);

  // Check if token is new (created within last 24 hours)
  const isNewLaunch = useMemo(() => {
    const hoursSinceLaunch = (Date.now() - token.createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceLaunch < 24;
  }, [token.createdAt]);

  // Check if token is trending (high volume relative to market cap)
  const isTrending = useMemo(() => {
    const volumeToMcapRatio = token.marketCap > 0 ? (token.volume24h / token.marketCap) * 100 : 0;
    return volumeToMcapRatio > 30;
  }, [token.volume24h, token.marketCap]);

  // Get health badge color and icon
  const healthConfig = useMemo(() => {
    switch (health.overall) {
      case 'excellent':
        return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Shield, label: 'Healthy' };
      case 'good':
        return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Activity, label: 'Active' };
      case 'fair':
        return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Zap, label: 'Moderate' };
      case 'risky':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Flame, label: 'Volatile' };
    }
  }, [health.overall]);

  const HealthIcon = healthConfig.icon;

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
        {/* Status Badges Row */}
        <div className="flex flex-wrap gap-2 mb-3">
          {isNewLaunch && (
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Zap size={10} className="mr-1" />
              New Launch
            </Badge>
          )}
          {isTrending && (
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              <Flame size={10} className="mr-1" />
              Trending
            </Badge>
          )}
          <Badge variant="secondary" className={healthConfig.color}>
            <HealthIcon size={10} className="mr-1" />
            {healthConfig.label}
          </Badge>
        </div>

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

        {/* Enhanced Graduation Progress */}
        {!token.isGraduated && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center text-gray-400">
                <Target size={12} className="mr-1" />
                <span>Graduation Progress</span>
              </div>
              <span className={cn(
                "font-semibold",
                token.bondingCurveProgress >= 80 ? "text-green-400" :
                token.bondingCurveProgress >= 50 ? "text-yellow-400" :
                "text-gray-400"
              )}>
                {token.bondingCurveProgress.toFixed(1)}%
              </span>
            </div>

            {/* Multi-color progress bar with milestones */}
            <div className="relative">
              <Progress
                value={token.bondingCurveProgress}
                className="h-3"
              />
              {/* Milestone markers */}
              <div className="absolute top-0 left-0 w-full h-3 flex justify-between px-px pointer-events-none">
                <div className="w-px h-full bg-gray-600" style={{ marginLeft: '24%' }} />
                <div className="w-px h-full bg-gray-600" style={{ marginLeft: '24%' }} />
                <div className="w-px h-full bg-gray-600" style={{ marginLeft: '24%' }} />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs mt-2">
              <div className="flex items-center gap-1">
                {token.bondingCurveProgress >= 80 ? (
                  <>
                    <span className="text-green-400">⚡ Near graduation!</span>
                  </>
                ) : token.bondingCurveProgress >= 50 ? (
                  <>
                    <span className="text-yellow-400">🔥 Halfway there</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500">Bonding curve</span>
                  </>
                )}
              </div>
              <span className="text-gray-500">
                {(100 - token.bondingCurveProgress).toFixed(0)}% to DEX
              </span>
            </div>
          </div>
        )}

        {/* Graduated Badge with Enhanced Styling */}
        {token.isGraduated && (
          <div className="mb-4">
            <Badge variant="success" className="w-full justify-center py-2 bg-green-500/20 border-green-500/30">
              <div className="flex items-center gap-2">
                <Target className="text-green-400" size={14} />
                <span className="text-green-400 font-semibold">🎉 Graduated to DEX</span>
              </div>
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
                  aria-label={`Buy ${token.name}`}
                >
                  Buy
                </button>
                <button
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors btn-glow-red"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle sell
                  }}
                  aria-label={`Sell ${token.name}`}
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
    prevProps.token.volume24h === nextProps.token.volume24h &&
    prevProps.token.holders === nextProps.token.holders &&
    prevProps.token.marketCap === nextProps.token.marketCap &&
    prevProps.token.isGraduated === nextProps.token.isGraduated &&
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
