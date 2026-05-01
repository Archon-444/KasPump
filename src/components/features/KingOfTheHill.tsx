'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, TrendingUp, Target, Flame, Hourglass } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { cn, formatCurrency } from '../../utils';

interface TrendingToken {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string;
  currentPrice: number;
  marketCap: number;
  totalVolume: number;
  graduationProgress: number;
  isGraduated: boolean;
  score: number;
}

interface TrendingResponse {
  kingOfTheHill: TrendingToken | null;
  justLaunched: TrendingToken[];
  aboutToGraduate: TrendingToken[];
  fading: TrendingToken[];
  totalTokens: number;
}

export const KingOfTheHill: React.FC<{ className?: string }> = ({ className }) => {
  const router = useRouter();

  const { data, isLoading } = useQuery<TrendingResponse>({
    queryKey: ['trending'],
    queryFn: async () => {
      const res = await fetch('/api/tokens/trending?limit=10');
      if (!res.ok) throw new Error('Failed to fetch trending');
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const king = data?.kingOfTheHill;
  const justLaunched = data?.justLaunched || [];
  const graduating = data?.aboutToGraduate || [];
  const fading = data?.fading || [];

  if (isLoading || !king) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* King of the Hill Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/[0.06] via-orange-500/[0.04] to-transparent cursor-pointer group"
        onClick={() => router.push(`/token/${king.address}`)}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex items-center gap-4 p-4">
          <div className="flex-shrink-0 relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-glow-sm">
              {king.symbol.slice(0, 2)}
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-sm">
              <Crown size={10} className="text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                King of the Hill
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold truncate">{king.name}</span>
              <span className="text-gray-500 text-xs">${king.symbol}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-white font-mono text-sm font-semibold tabular-nums">
                {formatCurrency(king.currentPrice, 'BNB', 8)}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Price</div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-white font-mono text-sm font-semibold tabular-nums">
                {formatCurrency(king.totalVolume, 'BNB')}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Volume</div>
            </div>
            <TrendingUp size={16} className="text-yellow-400" />
          </div>
        </div>
      </motion.div>

      {/* Just Launched Ribbon — last 10 minutes, sorted by recency × early volume */}
      {justLaunched.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {justLaunched.map((token) => (
            <motion.button
              key={token.address}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => router.push(`/token/${token.address}`)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-500/15 bg-orange-500/[0.04] hover:bg-orange-500/[0.08] transition-all flex-shrink-0"
              title="Just Launched"
            >
              <Flame size={12} className="text-orange-400" />
              <span className="text-xs font-medium text-white whitespace-nowrap">{token.symbol}</span>
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                New
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {/* About to Graduate Ribbon */}
      {graduating.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {graduating.map((token) => (
            <motion.button
              key={token.address}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => router.push(`/token/${token.address}`)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-green-500/15 bg-green-500/[0.04] hover:bg-green-500/[0.08] transition-all flex-shrink-0"
              title="About to Graduate"
            >
              <Target size={12} className="text-green-400" />
              <span className="text-xs font-medium text-white whitespace-nowrap">{token.symbol}</span>
              <span className="text-[10px] font-bold text-green-400 tabular-nums">
                {token.graduationProgress.toFixed(0)}%
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Fading Ribbon — softer framing than "Dying": low recent activity, could be a comeback play */}
      {fading.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {fading.map((token) => (
            <motion.button
              key={token.address}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => router.push(`/token/${token.address}`)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-500/15 bg-gray-500/[0.04] hover:bg-gray-500/[0.08] transition-all flex-shrink-0"
              title="Low recent activity — could be a comeback play."
            >
              <Hourglass size={12} className="text-gray-400" />
              <span className="text-xs font-medium text-white whitespace-nowrap">{token.symbol}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Fading
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};
