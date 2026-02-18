/**
 * TrendingTokens Component
 * Displays tokens ranked by trending score with timeframe selection
 *
 * Features:
 * - Timeframe selection (1h, 6h, 24h, 7d)
 * - Rank changes (up/down/new)
 * - Score breakdown on hover
 * - Auto-refresh
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Clock,
  RefreshCw,
  ChevronRight,
  Flame,
  Users,
  MessageCircle,
  DollarSign,
  Timer,
} from 'lucide-react';
import { useTrending, TrendingTimeframe, TrendingToken, TrendingScore } from '../../hooks/useTrending';
import { KasPumpToken } from '../../types';

// ============ Types ============

interface TrendingTokensProps {
  tokens: KasPumpToken[];
  limit?: number;
  showTimeframeSelector?: boolean;
  variant?: 'full' | 'compact' | 'mini';
  onTokenClick?: (token: TrendingToken) => void;
  className?: string;
}

interface TrendingRowProps {
  token: TrendingToken;
  index: number;
  onClick?: () => void;
  variant: 'full' | 'compact' | 'mini';
}

interface ScoreBreakdownProps {
  score: TrendingScore;
}

// ============ Config ============

const TIMEFRAME_OPTIONS: { value: TrendingTimeframe; label: string }[] = [
  { value: '1h', label: '1H' },
  { value: '6h', label: '6H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
];

const RANK_CHANGE_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  same: Minus,
  new: Sparkles,
};

const RANK_CHANGE_COLORS = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  same: 'text-gray-500',
  new: 'text-purple-400',
};

// ============ Sub-Components ============

/**
 * Score Breakdown Tooltip
 */
function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  const factors = [
    { name: 'Volume', value: score.volumeScore, icon: DollarSign, weight: '35%' },
    { name: 'Holders', value: score.holderGrowthScore, icon: Users, weight: '20%' },
    { name: 'Social', value: score.socialScore, icon: MessageCircle, weight: '20%' },
    { name: 'Price', value: score.priceActionScore, icon: Flame, weight: '15%' },
    { name: 'Recency', value: score.recencyScore, icon: Timer, weight: '10%' },
  ];

  return (
    <div className="absolute z-50 top-full mt-2 left-0 w-64 p-3 rounded-xl bg-gray-900/95 border border-white/10 backdrop-blur-xl shadow-xl">
      <div className="text-xs font-medium text-gray-400 mb-2">Score Breakdown</div>
      <div className="space-y-2">
        {factors.map((factor) => (
          <div key={factor.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <factor.icon className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-300">{factor.name}</span>
              <span className="text-[10px] text-gray-500">({factor.weight})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                  style={{ width: `${factor.value}%` }}
                />
              </div>
              <span className="text-xs text-white w-8 text-right">
                {Math.round(factor.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-white/10 flex justify-between">
        <span className="text-xs text-gray-400">Total Score</span>
        <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
          {Math.round(score.totalScore)}
        </span>
      </div>
    </div>
  );
}

/**
 * Rank Badge
 */
function RankBadge({ rank }: { rank: number }) {
  const getBadgeStyle = () => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-amber-600 text-yellow-900';
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900';
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900';
    return 'bg-white/10 text-gray-400';
  };

  return (
    <div
      className={`
        w-7 h-7 rounded-lg flex items-center justify-center
        text-xs font-bold ${getBadgeStyle()}
      `}
    >
      {rank}
    </div>
  );
}

/**
 * Rank Change Indicator
 */
function RankChangeIndicator({ change, previousRank }: { change: TrendingScore['rankChange']; previousRank?: number }) {
  const Icon = RANK_CHANGE_ICONS[change];
  const color = RANK_CHANGE_COLORS[change];

  return (
    <div className={`flex items-center gap-0.5 ${color}`}>
      <Icon className="w-3 h-3" />
      {change === 'new' && <span className="text-[10px]">NEW</span>}
      {previousRank !== undefined && change !== 'same' && change !== 'new' && (
        <span className="text-[10px]">{Math.abs(previousRank)}</span>
      )}
    </div>
  );
}

/**
 * Trending Row
 */
function TrendingRow({ token, index, onClick, variant }: TrendingRowProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { trendingScore } = token;

  // Mini variant - just rank, name, score
  if (variant === 'mini') {
    return (
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={onClick}
        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
      >
        <span className="text-xs font-bold text-gray-500 w-4">{trendingScore.rank}</span>
        <span className="flex-1 text-sm text-white truncate">{token.name}</span>
        <span className="text-xs text-cyan-400">{Math.round(trendingScore.totalScore)}</span>
      </motion.button>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left"
      >
        <RankBadge rank={trendingScore.rank} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{token.name}</span>
            <span className="text-xs text-gray-500">{token.symbol}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs ${token.change24h && token.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {token.change24h !== undefined && token.change24h >= 0 ? '+' : ''}{token.change24h?.toFixed(1)}%
            </span>
            <RankChangeIndicator
              change={trendingScore.rankChange}
              {...(trendingScore.previousRank !== undefined && { previousRank: trendingScore.previousRank })}
            />
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            {Math.round(trendingScore.totalScore)}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-500" />
      </motion.button>
    );
  }

  // Full variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
      onMouseEnter={() => setShowBreakdown(true)}
      onMouseLeave={() => setShowBreakdown(false)}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all text-left"
      >
        <RankBadge rank={trendingScore.rank} />

        {/* Token Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{token.name}</span>
            <span className="text-sm text-gray-500">{token.symbol}</span>
            <RankChangeIndicator
              change={trendingScore.rankChange}
              {...(trendingScore.previousRank !== undefined && { previousRank: trendingScore.previousRank })}
            />
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
            <span>${(token.marketCap ?? 0).toLocaleString()}</span>
            <span>{token.holders ?? 0} holders</span>
          </div>
        </div>

        {/* Score Bars */}
        <div className="hidden md:flex items-center gap-1 w-40">
          {[
            { value: trendingScore.volumeScore, color: 'bg-cyan-500' },
            { value: trendingScore.holderGrowthScore, color: 'bg-green-500' },
            { value: trendingScore.socialScore, color: 'bg-purple-500' },
            { value: trendingScore.priceActionScore, color: 'bg-yellow-500' },
            { value: trendingScore.recencyScore, color: 'bg-pink-500' },
          ].map((bar, i) => (
            <div key={i} className="flex-1 h-8 bg-white/5 rounded overflow-hidden">
              <div
                className={`w-full ${bar.color} rounded`}
                style={{ height: `${bar.value}%` }}
              />
            </div>
          ))}
        </div>

        {/* Price Change */}
        <div className="text-right w-20">
          <div className={`text-sm font-medium ${token.change24h && token.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {token.change24h !== undefined && token.change24h >= 0 ? '+' : ''}{token.change24h?.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500">24h</div>
        </div>

        {/* Total Score */}
        <div className="w-16 text-center">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            {Math.round(trendingScore.totalScore)}
          </div>
          <div className="text-[10px] text-gray-500 uppercase">Score</div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-500" />
      </button>

      {/* Score Breakdown Tooltip */}
      <AnimatePresence>
        {showBreakdown && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          >
            <ScoreBreakdown score={trendingScore} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ Main Component ============

export function TrendingTokens({
  tokens,
  limit = 10,
  showTimeframeSelector = true,
  variant = 'full',
  onTokenClick,
  className = '',
}: TrendingTokensProps) {
  const {
    tokens: trendingTokens,
    isLoading,
    timeframe,
    setTimeframe,
    refresh,
    lastUpdated,
  } = useTrending(tokens, '24h');

  const displayTokens = trendingTokens.slice(0, limit);

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Trending</h2>
            {lastUpdated && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Selector */}
          {showTimeframeSelector && (
            <div className="flex rounded-lg bg-white/5 p-0.5">
              {TIMEFRAME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeframe(option.value)}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-md transition-all
                    ${timeframe === option.value
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh trending"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Token List */}
      {isLoading && displayTokens.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : displayTokens.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No trending tokens yet
        </div>
      ) : (
        <div className={variant === 'full' ? 'space-y-2' : 'space-y-1'}>
          {displayTokens.map((token, index) => (
            <TrendingRow
              key={token.address}
              token={token}
              index={index}
              onClick={() => onTokenClick?.(token)}
              variant={variant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * TrendingMini - Small trending widget for sidebars
 */
export function TrendingMini({
  tokens,
  limit = 5,
  onTokenClick,
  className = '',
}: {
  tokens: KasPumpToken[];
  limit?: number;
  onTokenClick?: (token: TrendingToken) => void;
  className?: string;
}) {
  return (
    <TrendingTokens
      tokens={tokens}
      limit={limit}
      showTimeframeSelector={false}
      variant="mini"
      {...(onTokenClick && { onTokenClick })}
      className={className}
    />
  );
}

export default TrendingTokens;
