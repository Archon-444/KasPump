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

  const isSniperProtected = useMemo(() => {
    const secondsSinceLaunch = (Date.now() - token.createdAt.getTime()) / 1000;
    return secondsSinceLaunch < 60;
  }, [token.createdAt]);

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
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="cursor-pointer"
    >
      <button
        onClick={onClick}
        type="button"
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-2xl"
        aria-label={`View ${token.name} (${token.symbol}) - Price: ${formatCurrency(token.price, 'BNB', 8)}, ${isPositive ? 'up' : 'down'} ${formatPercentage(token.change24h)}`}
      >
        <Card
          className={cn(
            "glassmorphism token-card-glow overflow-hidden rounded-2xl",
            "hover:border-white/[0.12]"
          )}
        >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-glow-sm">
              {token.symbol.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-base truncate">{token.name}</h3>
                {isSniperProtected && (
                  <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-yellow-500/15 text-yellow-400 rounded-md">
                    <Shield size={9} />
                    PROTECTED
                  </span>
                )}
                {isNewLaunch && !isSniperProtected && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold bg-purple-500/15 text-purple-400 rounded-md">
                    NEW
                  </span>
                )}
                {isTrending && (
                  <Flame size={13} className="flex-shrink-0 text-orange-400" />
                )}
              </div>
              <p className="text-gray-500 text-xs font-medium">${token.symbol}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <FavoriteButton
              tokenAddress={token.address}
              chainId={(token as any).chainId}
              size="sm"
            />
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold tabular-nums',
              isPositive
                ? 'bg-green-500/[0.1] text-green-400'
                : 'bg-red-500/[0.1] text-red-400'
            )}>
              {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {formatPercentage(token.change24h)}
            </div>
          </div>
        </div>

        {/* Price + Stats */}
        <div className="mb-3">
          <div className="text-lg font-bold text-white font-mono tabular-nums mb-2">
            {formatCurrency(token.price, 'BNB', 8)}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">MCap</p>
              <p className="text-white text-sm font-medium tabular-nums">
                {formatCurrency(token.marketCap, 'BNB')}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Volume</p>
              <p className="text-white text-sm font-medium tabular-nums">
                {formatCurrency(token.volume24h, 'BNB')}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Holders</p>
              <p className="text-white text-sm font-medium tabular-nums flex items-center gap-1">
                <Users size={11} className="text-gray-500" />
                {token.holders}
              </p>
            </div>
          </div>
        </div>

        {/* Graduation Progress */}
        {!token.isGraduated && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className="text-gray-500 uppercase tracking-wider font-medium">Graduation</span>
              <span className={cn(
                "font-bold tabular-nums",
                token.bondingCurveProgress >= 80 ? "text-green-400" :
                token.bondingCurveProgress >= 50 ? "text-yellow-400" :
                "text-gray-400"
              )}>
                {token.bondingCurveProgress.toFixed(1)}%
              </span>
            </div>

            <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  token.bondingCurveProgress >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-400" :
                  token.bondingCurveProgress >= 50 ? "bg-gradient-to-r from-yellow-500 to-amber-400" :
                  "bg-gradient-to-r from-gray-500 to-gray-400"
                )}
                style={{ width: `${Math.min(token.bondingCurveProgress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Graduated Badge */}
        {token.isGraduated && (
          <div className="mb-3 px-3 py-2 bg-green-500/[0.08] border border-green-500/[0.15] rounded-xl flex items-center justify-center gap-2">
            <Target className="text-green-400" size={13} />
            <span className="text-green-400 text-xs font-semibold">Graduated to DEX</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
          <div className="flex items-center text-[11px] text-gray-500">
            <Clock size={11} className="mr-1" />
            {formatTimeAgo(token.createdAt)}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-md capitalize">
              {token.curveType}
            </span>
            <HealthIcon size={12} className={cn(
              health.overall === 'excellent' ? 'text-green-400' :
              health.overall === 'good' ? 'text-blue-400' :
              health.overall === 'fair' ? 'text-yellow-400' : 'text-red-400'
            )} />
            {showActions && (
              <div className="flex gap-1">
                <button
                  className="px-2.5 py-1 bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-medium rounded-lg transition-colors"
                  onClick={(e) => { e.stopPropagation(); }}
                  aria-label={`Buy ${token.name}`}
                >
                  Buy
                </button>
                <button
                  className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-medium rounded-lg transition-colors"
                  onClick={(e) => { e.stopPropagation(); }}
                  aria-label={`Sell ${token.name}`}
                >
                  Sell
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>
      </button>
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
