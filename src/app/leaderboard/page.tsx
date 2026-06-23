'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ArrowLeft, Crown, Trophy, Medal, ExternalLink, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Card, Spinner } from '../../components/ui';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useMultichainWallet } from '../../hooks/useMultichainWallet';
import { cn, truncateAddress, formatCurrency, copyToClipboard } from '../../utils';
import { getExplorerUrl } from '../../config/chains';
import { MobileNavigation } from '../../components/mobile';

interface LeaderboardEntry {
  address: string;
  totalVolume: number;
  trades: number;
  buys: number;
  sells: number;
  tokensTraded: number;
}

interface LeaderboardData {
  traders: LeaderboardEntry[];
  windowHours: number;
  tokensScanned: number;
  generatedAt: number;
}

const RANK_STYLES = [
  { icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/[0.08] border-yellow-500/20' },
  { icon: Trophy, color: 'text-gray-300', bg: 'bg-white/[0.05] border-white/[0.1]' },
  { icon: Medal, color: 'text-orange-400', bg: 'bg-orange-500/[0.06] border-orange-500/15' },
] as const;

export default function LeaderboardPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const wallet = useMultichainWallet();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = wallet.chainId ? `?chainId=${wallet.chainId}` : '';
      const res = await fetch(`/api/leaderboard${params}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [wallet.chainId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleCopy = async (address: string) => {
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    }
  };

  const connectedLower = wallet.address?.toLowerCase();
  const myRank = data?.traders.findIndex(t => t.address === connectedLower);

  return (
    <div className={cn('min-h-screen', isMobile && 'pb-20')}>
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </Button>
              <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
                <Trophy size={20} className="text-yellow-400" />
                Leaderboard
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLeaderboard}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-400 mb-6">
          Top traders by volume over the last {data?.windowHours ?? 24} hours
          {data && ` — across ${data.tokensScanned} tokens`}
        </p>

        {/* My rank banner */}
        {connectedLower && myRank !== undefined && myRank >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 px-4 py-3 bg-yellow-500/[0.08] border border-yellow-500/20 rounded-xl flex items-center justify-between"
          >
            <span className="text-sm text-yellow-400 font-semibold">
              Your rank: #{myRank + 1}
            </span>
            <span className="text-sm text-gray-300 tabular-nums">
              {formatCurrency(data!.traders[myRank]!.totalVolume, 'ETH', 4)} volume
            </span>
          </motion.div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <Card className="glassmorphism border-red-500/30">
            <div className="text-center py-8">
              <div className="text-red-400 mb-2">Error loading leaderboard</div>
              <div className="text-sm text-gray-400 mb-4">{error}</div>
              <Button onClick={fetchLeaderboard}>Try Again</Button>
            </div>
          </Card>
        ) : !data || data.traders.length === 0 ? (
          <Card className="glassmorphism">
            <div className="text-center py-12">
              <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No trades yet</h3>
              <p className="text-gray-400 mb-6">
                Be the first on the leaderboard — start trading to claim the crown.
              </p>
              <Button onClick={() => router.push('/')}>Browse Tokens</Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.traders.map((trader, i) => {
              const rankStyle = RANK_STYLES[i];
              const RankIcon = rankStyle?.icon;
              const isMe = trader.address === connectedLower;

              return (
                <motion.div
                  key={trader.address}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors',
                    rankStyle?.bg ?? 'bg-white/[0.02] border-white/[0.04]',
                    isMe && 'ring-1 ring-yellow-500/40'
                  )}
                >
                  {/* Rank */}
                  <div className="w-10 flex items-center justify-center flex-shrink-0">
                    {RankIcon ? (
                      <RankIcon size={20} className={rankStyle.color} />
                    ) : (
                      <span className="text-sm font-bold text-gray-500 tabular-nums">#{i + 1}</span>
                    )}
                  </div>

                  {/* Address */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-mono',
                      isMe ? 'text-yellow-400 font-semibold' : 'text-gray-200'
                    )}>
                      {truncateAddress(trader.address, 6, 4)}
                      {isMe && ' (you)'}
                    </span>
                    <button
                      onClick={() => handleCopy(trader.address)}
                      className="text-gray-500 hover:text-white transition-colors"
                      title="Copy address"
                    >
                      {copiedAddress === trader.address
                        ? <Check size={12} className="text-green-400" />
                        : <Copy size={12} />}
                    </button>
                    {wallet.chainId && (
                      <a
                        href={getExplorerUrl(wallet.chainId, 'address', trader.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-white transition-colors"
                        title="View on explorer"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-white tabular-nums">
                      {formatCurrency(trader.totalVolume, 'ETH', 4)}
                    </div>
                    <div className="text-[11px] text-gray-500 tabular-nums">
                      {trader.trades} trades · {trader.tokensTraded} tokens
                    </div>
                  </div>

                  {/* Buy/sell split — desktop only */}
                  {!isMobile && (
                    <div className="w-24 text-right flex-shrink-0">
                      <span className="text-xs text-green-400 tabular-nums">{trader.buys}B</span>
                      <span className="text-xs text-gray-600 mx-1">/</span>
                      <span className="text-xs text-red-400 tabular-nums">{trader.sells}S</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {isMobile && (
        <MobileNavigation
          currentPage="analytics"
          onNavigate={(page) => {
            if (page === 'home') router.push('/');
            else if (page === 'create') router.push('/launch');
            else if (page === 'analytics') router.push('/analytics');
          }}
        />
      )}
    </div>
  );
}
