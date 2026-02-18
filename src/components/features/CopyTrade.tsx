/**
 * CopyTrade Components
 * UI for following traders and copying their trades
 *
 * Components:
 * - TraderProfile: Display trader stats and follow button
 * - TraderLeaderboard: Top traders list
 * - CopyTradeSettings: Configure copy trade options
 * - PendingTradesModal: Approve/reject pending copy trades
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Users,
  TrendingUp,
  TrendingDown,
  Copy,
  Settings,
  Bell,
  BellOff,
  Check,
  X,
  ChevronRight,
  Trophy,
  Target,
  Clock,
  Zap,
  Shield,
  Award,
  Star,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import {
  useCopyTrade,
  useTraderLeaderboard,
  TraderProfile as TraderProfileType,
  TraderBadge,
  CopyTradeSettings as CopyTradeSettingsType,
  PendingCopyTrade,
} from '../../hooks/useCopyTrade';

// ============ Types ============

interface TraderProfileCardProps {
  trader: TraderProfileType;
  showActions?: boolean;
  variant?: 'full' | 'compact' | 'mini';
  onViewProfile?: () => void;
  className?: string;
}

interface TraderLeaderboardProps {
  sortBy?: 'pnl24h' | 'pnl7d' | 'pnl30d' | 'winRate' | 'followers';
  limit?: number;
  onSelectTrader?: (trader: TraderProfileType) => void;
  className?: string;
}

interface CopyTradeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CopyTradeSettingsType;
  onSave: (settings: CopyTradeSettingsType) => void;
}

interface PendingTradesListProps {
  trades: PendingCopyTrade[];
  onApprove: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
  className?: string;
}

// ============ Config ============

const BADGE_CONFIG: Record<TraderBadge, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  whale: { icon: Zap, label: 'Whale', color: 'text-blue-400 bg-blue-400/10' },
  diamond: { icon: Star, label: 'Diamond Hands', color: 'text-cyan-400 bg-cyan-400/10' },
  sniper: { icon: Target, label: 'Sniper', color: 'text-purple-400 bg-purple-400/10' },
  consistent: { icon: TrendingUp, label: 'Consistent', color: 'text-emerald-400 bg-emerald-400/10' },
  influencer: { icon: Users, label: 'Influencer', color: 'text-pink-400 bg-pink-400/10' },
  verified: { icon: Shield, label: 'Verified', color: 'text-yellow-400 bg-yellow-400/10' },
};

const SORT_OPTIONS = [
  { value: 'pnl24h', label: '24H PnL' },
  { value: 'pnl7d', label: '7D PnL' },
  { value: 'pnl30d', label: '30D PnL' },
  { value: 'winRate', label: 'Win Rate' },
  { value: 'followers', label: 'Followers' },
] as const;

// ============ Helper Components ============

function TraderBadgeDisplay({ badge }: { badge: TraderBadge }) {
  const config = BADGE_CONFIG[badge];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.color}`}
      title={config.label}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
}

function PnLDisplay({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function StatBox({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
      <Icon className="w-4 h-4 text-gray-400" />
      <div>
        <div className="text-sm font-medium text-white">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// ============ TraderProfileCard ============

export function TraderProfileCard({
  trader,
  showActions = true,
  variant = 'full',
  onViewProfile,
  className = '',
}: TraderProfileCardProps) {
  const { isFollowing, follow, unfollow, isLoading } = useCopyTrade();
  const following = isFollowing(trader.address);

  const handleFollowClick = async () => {
    if (following) {
      await unfollow(trader.address);
    } else {
      await follow(trader.address);
    }
  };

  // Mini variant - just avatar and name
  if (variant === 'mini') {
    return (
      <button
        onClick={onViewProfile}
        className={`flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors ${className}`}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-white">{trader.displayName || trader.address.slice(0, 8)}</div>
          <div className="text-xs text-emerald-400">+{trader.pnl7d.toFixed(1)}% 7d</div>
        </div>
      </button>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 ${className}`}>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{trader.displayName || trader.address.slice(0, 10)}</span>
            {trader.badges.includes('verified') && (
              <Shield className="w-4 h-4 text-yellow-400" />
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
            <span>{trader.followers} followers</span>
            <span>{trader.winRate.toFixed(0)}% win rate</span>
          </div>
        </div>

        <PnLDisplay value={trader.pnl7d} label="7D" />

        {showActions && (
          <button
            onClick={handleFollowClick}
            disabled={isLoading}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all
              ${following
                ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
              }
            `}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 bg-white/[0.03] border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {trader.displayName || trader.address.slice(0, 12)}
            </h3>
            <p className="text-sm text-gray-500 font-mono">{trader.address.slice(0, 6)}...{trader.address.slice(-4)}</p>
            <div className="flex items-center gap-2 mt-2">
              {trader.badges.slice(0, 3).map((badge) => (
                <TraderBadgeDisplay key={badge} badge={badge} />
              ))}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2">
            <button
              onClick={handleFollowClick}
              disabled={isLoading}
              className={`
                px-6 py-2 rounded-xl font-medium transition-all
                ${following
                  ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                }
              `}
            >
              {following ? 'Unfollow' : 'Follow'}
            </button>
            {following && (
              <button className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
                <Copy className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* PnL Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-white/5">
        <PnLDisplay value={trader.pnl24h} label="24H" />
        <PnLDisplay value={trader.pnl7d} label="7D" />
        <PnLDisplay value={trader.pnl30d} label="30D" />
        <PnLDisplay value={trader.pnlAllTime} label="All Time" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatBox icon={Users} value={trader.followers} label="Followers" />
        <StatBox icon={Target} value={`${trader.winRate.toFixed(0)}%`} label="Win Rate" />
        <StatBox icon={TrendingUp} value={trader.totalTrades} label="Trades" />
        <StatBox icon={Clock} value={`${trader.avgHoldTime}h`} label="Avg Hold" />
      </div>

      {/* Best Trade */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-gray-400">Best Trade</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-white">${trader.bestTrade.tokenSymbol}</span>
            <span className="ml-2 text-emerald-400 font-medium">
              +{trader.bestTrade.pnlPercent.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* View Profile Button */}
      {onViewProfile && (
        <button
          onClick={onViewProfile}
          className="w-full mt-4 py-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          View Full Profile
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============ TraderLeaderboard ============

export function TraderLeaderboard({
  sortBy = 'pnl7d',
  limit = 10,
  onSelectTrader,
  className = '',
}: TraderLeaderboardProps) {
  const [currentSort, setCurrentSort] = useState(sortBy);
  const { traders, isLoading } = useTraderLeaderboard(currentSort, limit);

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Top Traders</h2>
        </div>

        {/* Sort Selector */}
        <select
          value={currentSort}
          onChange={(e) => setCurrentSort(e.target.value as typeof currentSort)}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Leaderboard List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {traders.map((trader, index) => (
            <motion.div
              key={trader.address}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => onSelectTrader?.(trader)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all text-left"
              >
                {/* Rank */}
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                  ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-yellow-900' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900' :
                    'bg-white/10 text-gray-400'}
                `}>
                  {index + 1}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">
                      {trader.displayName || trader.address.slice(0, 10)}
                    </span>
                    {trader.badges.includes('verified') && (
                      <Shield className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{trader.followers} followers</span>
                    <span>{trader.winRate.toFixed(0)}% win</span>
                  </div>
                </div>

                {/* Performance */}
                <div className="text-right">
                  <div className={`text-lg font-bold ${trader[currentSort] >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {typeof trader[currentSort] === 'number'
                      ? `${trader[currentSort] >= 0 ? '+' : ''}${(trader[currentSort] as number).toFixed(1)}${currentSort !== 'followers' ? '%' : ''}`
                      : trader[currentSort]
                    }
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ CopyTradeSettingsModal ============

export function CopyTradeSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: CopyTradeSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md mx-4 rounded-2xl bg-gray-900 border border-white/10 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Copy Trade Settings</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div>
                <div className="font-medium text-white">Enable Copy Trading</div>
                <div className="text-sm text-gray-400">Automatically copy trades</div>
              </div>
              <button
                onClick={() => setLocalSettings(s => ({ ...s, enabled: !s.enabled }))}
                className={`w-12 h-6 rounded-full transition-colors ${localSettings.enabled ? 'bg-purple-500' : 'bg-white/10'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${localSettings.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Max Amount Per Trade */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Max Amount Per Trade (ETH)</label>
              <input
                type="number"
                value={localSettings.maxAmountPerTrade}
                onChange={(e) => setLocalSettings(s => ({ ...s, maxAmountPerTrade: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                step="0.01"
                min="0"
              />
            </div>

            {/* Max Daily Amount */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Max Daily Amount (ETH)</label>
              <input
                type="number"
                value={localSettings.maxDailyAmount}
                onChange={(e) => setLocalSettings(s => ({ ...s, maxDailyAmount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                step="0.1"
                min="0"
              />
            </div>

            {/* Max Slippage */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Max Slippage (%)</label>
              <input
                type="number"
                value={localSettings.maxSlippage}
                onChange={(e) => setLocalSettings(s => ({ ...s, maxSlippage: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                step="0.5"
                min="0"
                max="50"
              />
            </div>

            {/* Auto Execute */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div>
                <div className="font-medium text-white">Auto Execute</div>
                <div className="text-sm text-gray-400">Execute without confirmation</div>
              </div>
              <button
                onClick={() => setLocalSettings(s => ({ ...s, autoExecute: !s.autoExecute }))}
                className={`w-12 h-6 rounded-full transition-colors ${localSettings.autoExecute ? 'bg-purple-500' : 'bg-white/10'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${localSettings.autoExecute ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Copy Buys Only */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div>
                <div className="font-medium text-white">Copy Buys Only</div>
                <div className="text-sm text-gray-400">Don't copy sell orders</div>
              </div>
              <button
                onClick={() => setLocalSettings(s => ({ ...s, copyBuysOnly: !s.copyBuysOnly }))}
                className={`w-12 h-6 rounded-full transition-colors ${localSettings.copyBuysOnly ? 'bg-purple-500' : 'bg-white/10'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${localSettings.copyBuysOnly ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div>
                <div className="font-medium text-white flex items-center gap-2">
                  {localSettings.notifyOnTrade ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  Trade Notifications
                </div>
                <div className="text-sm text-gray-400">Get notified on copied trades</div>
              </div>
              <button
                onClick={() => setLocalSettings(s => ({ ...s, notifyOnTrade: !s.notifyOnTrade }))}
                className={`w-12 h-6 rounded-full transition-colors ${localSettings.notifyOnTrade ? 'bg-purple-500' : 'bg-white/10'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${localSettings.notifyOnTrade ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200/80">
              Copy trading involves risk. Past performance does not guarantee future results. Only invest what you can afford to lose.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Save Settings
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============ PendingTradesList ============

export function PendingTradesList({
  trades,
  onApprove,
  onReject,
  className = '',
}: PendingTradesListProps) {
  const pendingTrades = trades.filter(t => t.status === 'pending');

  if (pendingTrades.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        No pending trades
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {pendingTrades.map((trade) => (
        <motion.div
          key={trade.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5"
        >
          <div className={`p-2 rounded-lg ${trade.action === 'buy' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            {trade.action === 'buy' ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{trade.tokenSymbol}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${trade.action === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {trade.action.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              From: {trade.traderName}
            </div>
          </div>

          <div className="text-right">
            <div className="font-medium text-white">{trade.estimatedCost.toFixed(4)} ETH</div>
            <div className="text-xs text-gray-500">
              Expires: {new Date(trade.expiresAt).toLocaleTimeString()}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onApprove(trade.id)}
              className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={() => onReject(trade.id)}
              className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default TraderLeaderboard;
