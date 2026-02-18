/**
 * LPFarming Components
 * UI for LP token staking and farming rewards
 *
 * Components:
 * - FarmingPoolCard: Individual pool display
 * - FarmingDashboard: All pools overview
 * - StakeModal: Stake/unstake interface
 * - BoostProgress: Boost tier progress indicator
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sprout,
  TrendingUp,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Lock,
  Unlock,
  AlertTriangle,
  Info,
  RefreshCw,
  X,
} from 'lucide-react';
import { useLPFarming, FarmingPool, UserStake, BOOST_TIERS } from '../../hooks/useLPFarming';
import { formatUnits, parseUnits } from 'ethers';

// ============ Types ============

interface FarmingPoolCardProps {
  pool: FarmingPool;
  userStake?: UserStake;
  onStake: (poolId: number) => void;
  onUnstake: (poolId: number) => void;
  onClaim: (poolId: number) => void;
  isLoading?: boolean;
}

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: FarmingPool;
  userStake?: UserStake;
  mode: 'stake' | 'unstake';
  onConfirm: (amount: bigint) => Promise<void>;
  walletBalance: bigint;
}

interface BoostProgressProps {
  currentMultiplier: number;
  stakedAt: number;
  className?: string;
}

// ============ Helpers ============

function formatNumber(value: number, decimals: number = 2): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
}

function formatBigInt(value: bigint, decimals: number = 18, displayDecimals: number = 4): string {
  const formatted = formatUnits(value, decimals);
  const num = parseFloat(formatted);
  return formatNumber(num, displayDecimals);
}

function getTimeRemaining(targetSeconds: number, fromSeconds: number): string {
  const remaining = targetSeconds - (Date.now() / 1000 - fromSeconds);
  if (remaining <= 0) return 'Now';

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return 'Soon';
}

// ============ Sub-Components ============

/**
 * Boost Progress Indicator
 */
function BoostProgress({ currentMultiplier, stakedAt, className = '' }: BoostProgressProps) {
  const stakeDuration = Date.now() / 1000 - stakedAt;

  // Find current and next tier
  let currentTierIndex = 0;
  for (let i = BOOST_TIERS.length - 1; i >= 0; i--) {
    const tier = BOOST_TIERS[i];
    if (tier && stakeDuration >= tier.minDuration) {
      currentTierIndex = i;
      break;
    }
  }

  const currentTier = BOOST_TIERS[currentTierIndex];
  const nextTier = BOOST_TIERS[currentTierIndex + 1];

  // Calculate progress to next tier
  let progress = 100;
  if (nextTier && currentTier) {
    const tierDuration = nextTier.minDuration - currentTier.minDuration;
    const elapsed = stakeDuration - currentTier.minDuration;
    progress = Math.min(100, (elapsed / tierDuration) * 100);
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Boost Level</span>
        <span className="text-cyan-400 font-medium">{currentMultiplier / 100}x</span>
      </div>

      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {nextTier && currentTier && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{currentTier.label}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {getTimeRemaining(nextTier.minDuration, stakedAt)} to {nextTier.label}
          </span>
        </div>
      )}

      {!nextTier && (
        <div className="text-xs text-emerald-400 text-center">
          Max boost achieved!
        </div>
      )}
    </div>
  );
}

/**
 * APR/APY Display
 */
function APRDisplay({ apr, apy }: { apr: number; apy: number }) {
  const [showAPY, setShowAPY] = useState(false);

  return (
    <button
      onClick={() => setShowAPY(!showAPY)}
      className="flex items-center gap-1 text-emerald-400"
    >
      <TrendingUp className="w-4 h-4" />
      <span className="font-bold text-lg">{formatNumber(showAPY ? apy : apr)}%</span>
      <span className="text-xs text-gray-400">{showAPY ? 'APY' : 'APR'}</span>
      <Info className="w-3 h-3 text-gray-500" />
    </button>
  );
}

/**
 * Stake/Unstake Modal
 */
function StakeModal({
  isOpen,
  onClose,
  pool,
  userStake,
  mode,
  onConfirm,
  walletBalance,
}: StakeModalProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const maxAmount = mode === 'stake' ? walletBalance : (userStake?.amount ?? BigInt(0));
  const maxFormatted = formatUnits(maxAmount, pool.lpToken.decimals);

  const handleMax = () => {
    setAmount(maxFormatted);
  };

  const handleConfirm = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsLoading(true);
    try {
      const parsedAmount = parseUnits(amount, pool.lpToken.decimals);
      await onConfirm(parsedAmount);
      onClose();
    } catch (err) {
      console.error('Transaction failed:', err);
    } finally {
      setIsLoading(false);
    }
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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {mode === 'stake' ? (
                <Lock className="w-6 h-6 text-cyan-400" />
              ) : (
                <Unlock className="w-6 h-6 text-orange-400" />
              )}
              <h2 className="text-lg font-semibold text-white">
                {mode === 'stake' ? 'Stake LP Tokens' : 'Unstake LP Tokens'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Pool Info */}
          <div className="p-4 rounded-xl bg-white/5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Pool</span>
              <span className="text-white font-medium">{pool.lpToken.symbol}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">APR</span>
              <span className="text-emerald-400 font-medium">{formatNumber(pool.apr)}%</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Amount</span>
              <span className="text-gray-400">
                Balance: {formatBigInt(maxAmount, pool.lpToken.decimals)} {pool.lpToken.symbol}
              </span>
            </div>
            <div className="flex rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-4 py-3 bg-transparent text-white text-lg focus:outline-none"
              />
              <button
                onClick={handleMax}
                className="px-4 text-cyan-400 hover:text-cyan-300 font-medium"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Warnings */}
          {mode === 'unstake' && pool.minStakeDuration > 0 && userStake && (
            <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200/80">
                Early unstaking may result in reduced rewards. Minimum stake duration is{' '}
                {pool.minStakeDuration / 86400} days.
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
            className={`
              w-full py-4 rounded-xl font-semibold transition-all
              ${mode === 'stake'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90'
                : 'bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90'
              }
              ${isLoading || !amount ? 'opacity-50 cursor-not-allowed' : ''}
              text-white
            `}
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <>
                {mode === 'stake' ? 'Stake' : 'Unstake'} {pool.lpToken.symbol}
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Farming Pool Card
 */
export function FarmingPoolCard({
  pool,
  userStake,
  onStake,
  onUnstake,
  onClaim,
  isLoading,
}: FarmingPoolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasStake = userStake && userStake.amount > BigInt(0);
  const hasPendingRewards = userStake && userStake.pendingRewards > BigInt(0);

  return (
    <motion.div
      layout
      className="rounded-2xl border backdrop-blur-xl bg-white/[0.03] border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/20">
              <Sprout className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{pool.lpToken.symbol}</h3>
              <p className="text-sm text-gray-400">Earn {pool.rewardToken.symbol}</p>
            </div>
          </div>
          <APRDisplay apr={pool.apr} apy={pool.apy} />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">TVL</p>
            <p className="text-sm font-medium text-white">${formatNumber(pool.tvl)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Your Stake</p>
            <p className="text-sm font-medium text-white">
              {hasStake ? formatBigInt(userStake.amount, pool.lpToken.decimals) : '0'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Earned</p>
            <p className="text-sm font-medium text-emerald-400">
              {hasPendingRewards
                ? formatBigInt(userStake.pendingRewards, pool.rewardToken.decimals)
                : '0'}{' '}
              {pool.rewardToken.symbol}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onStake(pool.id)}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            Stake
          </button>

          {hasStake && (
            <button
              onClick={() => onUnstake(pool.id)}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowDownRight className="w-4 h-4" />
              Unstake
            </button>
          )}

          {hasPendingRewards && (
            <button
              onClick={() => onClaim(pool.id)}
              disabled={isLoading}
              className="py-3 px-4 rounded-xl bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors flex items-center gap-2"
            >
              <Gift className="w-4 h-4" />
              Claim
            </button>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      {hasStake && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-3 border-t border-white/5 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? (
              <>
                Hide Details <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Show Details <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 pt-0 space-y-4">
                  {/* Boost Progress */}
                  <BoostProgress
                    currentMultiplier={userStake.boostMultiplier}
                    stakedAt={userStake.stakedAt}
                  />

                  {/* Additional Stats */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/5">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Daily Earnings</p>
                      <p className="text-sm font-medium text-white">
                        ~{formatBigInt(userStake.estimatedDailyRewards, pool.rewardToken.decimals)}{' '}
                        {pool.rewardToken.symbol}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Staked Since</p>
                      <p className="text-sm font-medium text-white">
                        {new Date(userStake.stakedAt * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

/**
 * Farming Dashboard
 */
export function FarmingDashboard({ className = '' }: { className?: string }) {
  const {
    pools,
    userStakes,
    isLoadingPools,
    stake,
    unstake,
    claimRewards,
    pendingTx,
  } = useLPFarming();

  const [selectedPool, setSelectedPool] = useState<FarmingPool | null>(null);
  const [modalMode, setModalMode] = useState<'stake' | 'unstake'>('stake');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate totals
  const totals = useMemo(() => {
    let totalStaked = 0;
    let totalPending = 0;

    userStakes.forEach((stake, poolId) => {
      const pool = pools.find(p => p.id === poolId);
      if (pool) {
        // Simplified USD calculation
        totalStaked += parseFloat(formatUnits(stake.amount, pool.lpToken.decimals)) * 2.5;
        totalPending += parseFloat(formatUnits(stake.pendingRewards, pool.rewardToken.decimals)) * 0.1;
      }
    });

    return { totalStaked, totalPending };
  }, [userStakes, pools]);

  const handleOpenStake = (poolId: number) => {
    const pool = pools.find(p => p.id === poolId);
    if (pool) {
      setSelectedPool(pool);
      setModalMode('stake');
      setIsModalOpen(true);
    }
  };

  const handleOpenUnstake = (poolId: number) => {
    const pool = pools.find(p => p.id === poolId);
    if (pool) {
      setSelectedPool(pool);
      setModalMode('unstake');
      setIsModalOpen(true);
    }
  };

  const handleConfirm = async (amount: bigint) => {
    if (!selectedPool) return;

    if (modalMode === 'stake') {
      await stake(selectedPool.id, amount);
    } else {
      await unstake(selectedPool.id, amount);
    }
  };

  return (
    <div className={className}>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-sm">Total Staked Value</span>
          </div>
          <p className="text-2xl font-bold text-white">${formatNumber(totals.totalStaked)}</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Gift className="w-4 h-4" />
            <span className="text-sm">Pending Rewards</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">${formatNumber(totals.totalPending)}</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Active Pools</span>
          </div>
          <p className="text-2xl font-bold text-white">{pools.filter(p => p.isActive).length}</p>
        </div>
      </div>

      {/* Pool List */}
      {isLoadingPools ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Sprout className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No farming pools available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pools.map((pool) => {
            const stake = userStakes.get(pool.id);
            return (
              <FarmingPoolCard
                key={pool.id}
                pool={pool}
                {...(stake && { userStake: stake })}
                onStake={handleOpenStake}
                onUnstake={handleOpenUnstake}
                onClaim={claimRewards}
                isLoading={!!pendingTx}
              />
            );
          })}
        </div>
      )}

      {/* Stake/Unstake Modal */}
      {selectedPool && (() => {
        const selectedStake = userStakes.get(selectedPool.id);
        return (
          <StakeModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            pool={selectedPool}
            {...(selectedStake && { userStake: selectedStake })}
            mode={modalMode}
            onConfirm={handleConfirm}
            walletBalance={BigInt('100000000000000000000000')} // Mock 100k balance
          />
        );
      })()}
    </div>
  );
}

export default FarmingDashboard;
