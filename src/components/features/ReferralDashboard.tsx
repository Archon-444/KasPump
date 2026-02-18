/**
 * ReferralDashboard Component
 * Displays referral statistics, earnings, and referral link
 *
 * Features:
 * - Referral link with copy button
 * - Statistics display (total/active referrals, earnings)
 * - Withdraw rewards functionality
 * - Leaderboard preview
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  DollarSign,
  Copy,
  Check,
  ExternalLink,
  TrendingUp,
  Gift,
  Share2,
  Wallet,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useReferral } from '../../hooks/useReferral';
import { cn } from '../../utils';

interface ReferralDashboardProps {
  className?: string;
}

export function ReferralDashboard({ className }: ReferralDashboardProps) {
  const {
    referralCode,
    referralLink,
    copyReferralLink,
    isCopied,
    stats,
    isLoadingStats,
    withdrawRewards,
    isWithdrawing,
    withdrawError,
  } = useReferral();

  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleCopy = async () => {
    await copyReferralLink();
  };

  const handleShare = (platform: 'twitter' | 'telegram') => {
    const text = encodeURIComponent(
      `🚀 Join me on KasPump - the next-gen token launchpad!\n\nCreate & trade meme coins with low fees on BSC, Arbitrum & Base.\n\n👉 Use my referral link for bonus rewards:`
    );
    const url = encodeURIComponent(referralLink);

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    };

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const formatReward = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(4);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-yellow-400" />
            Referral Program
          </h2>
          <p className="text-gray-400 mt-1">
            Earn 10% of platform fees from your referrals
          </p>
        </div>
      </div>

      {/* Referral Link Card */}
      <div className="glow-card-wrapper">
        <div className="glow-card-inner p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-400" />
              Your Referral Link
            </h3>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              Code: {referralCode}
            </span>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none"
              />
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                'px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2',
                isCopied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'
              )}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>

            {/* Share Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="px-4 py-3 rounded-xl font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <button
                      onClick={() => handleShare('twitter')}
                      className="w-full px-4 py-3 text-left text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Share on X
                    </button>
                    <button
                      onClick={() => handleShare('telegram')}
                      className="w-full px-4 py-3 text-left text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                      </svg>
                      Share on Telegram
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Share this link with friends. You&apos;ll earn 10% of all platform fees they generate for 30 days!
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Referrals */}
        <div className="glow-card-wrapper">
          <div className="glow-card-inner p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Referrals</p>
                <p className="text-xl font-bold text-white">
                  {isLoadingStats ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stats?.totalReferrals ?? 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Referrals */}
        <div className="glow-card-wrapper">
          <div className="glow-card-inner p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Active (30d)</p>
                <p className="text-xl font-bold text-white">
                  {isLoadingStats ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stats?.activeReferrals ?? 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Rewards */}
        <div className="glow-card-wrapper">
          <div className="glow-card-inner p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Wallet className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Pending</p>
                <p className="text-xl font-bold text-white">
                  {isLoadingStats ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {formatReward(stats?.pendingRewards ?? '0')}
                      <span className="text-sm text-gray-400 ml-1">BNB</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lifetime Earnings */}
        <div className="glow-card-wrapper">
          <div className="glow-card-inner p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Lifetime</p>
                <p className="text-xl font-bold text-white">
                  {isLoadingStats ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {formatReward(stats?.lifetimeEarnings ?? '0')}
                      <span className="text-sm text-gray-400 ml-1">BNB</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw Section */}
      {stats && parseFloat(stats.pendingRewards) > 0 && (
        <div className="glow-card-wrapper">
          <div className="glow-card-inner p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Withdraw Rewards
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  You have {formatReward(stats.pendingRewards)} BNB available
                </p>
              </div>
              <button
                onClick={withdrawRewards}
                disabled={isWithdrawing || parseFloat(stats.pendingRewards) < 0.01}
                className={cn(
                  'px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2',
                  isWithdrawing
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                )}
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    Withdraw
                  </>
                )}
              </button>
            </div>

            {withdrawError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {withdrawError}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-4">
              Minimum withdrawal: 0.01 BNB. Rewards are sent directly to your connected wallet.
            </p>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="glow-card-wrapper">
        <div className="glow-card-inner p-6">
          <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                1
              </div>
              <div>
                <p className="text-white font-medium">Share Your Link</p>
                <p className="text-sm text-gray-400">
                  Send your unique referral link to friends
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                2
              </div>
              <div>
                <p className="text-white font-medium">They Trade</p>
                <p className="text-sm text-gray-400">
                  Your referrals create tokens and trade
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                3
              </div>
              <div>
                <p className="text-white font-medium">You Earn</p>
                <p className="text-sm text-gray-400">
                  Get 10% of platform fees for 30 days
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReferralDashboard;
