'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, Zap, Users, Rocket } from 'lucide-react';
import { TokenCard } from '../components/features/TokenCard';
import { TokenListSkeleton, EmptyState } from '../components/features/LoadingStates';
import dynamic from 'next/dynamic';
import { TokenSearchFilters, TokenFilters } from '../components/features/TokenSearchFilters';
import { MobileTokenCard } from '../components/mobile';
import { Button } from '../components/ui';
import {
  AmbientBackground,
  GlowCard,
  GlowButton,
  AnimatedBadge,
  GradientText,
} from '../components/ui/enhanced';
import { useRouter } from 'next/navigation';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useIsMobile } from '../hooks/useIsMobile';
import { KasPumpToken } from '../types';
import { cn } from '../utils';
import { useTokenQuery } from '../hooks/useTokenQuery';

// Lazy load heavy components
const TokenTradingPage = dynamic(
  () => import('../components/features/TokenTradingPage').then((mod) => mod.TokenTradingPage),
  {
    loading: () => <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div></div>,
    ssr: false,
  }
);

const TokenCarousel = dynamic(
  () => import('../components/features/TokenCarousel').then((mod) => mod.TokenCarousel),
  {
    loading: () => <div className="h-64 flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading trending tokens...</div></div>,
    ssr: false,
  }
);

export default function DiscoverPage() {
  const [selectedToken, setSelectedToken] = useState<KasPumpToken | null>(null);
  const [filters, setFilters] = useState<TokenFilters>({
    searchQuery: '',
    chains: [],
    status: 'all',
    volumeRange: 'all',
    sortBy: 'volume',
    sortOrder: 'desc',
  });

  const router = useRouter();
  const isMobile = useIsMobile();

  // Optimized Data Fetching using React Query
  // Fetches 100 tokens to allow for client-side sorting/filtering on this batch
  // Future optimization: Move all filtering/sorting to the API
  const { data, isLoading, refetch, isRefetching } = useTokenQuery({
    limit: 100, 
    search: filters.searchQuery // Server-side search optimization
  });

  const tokens = data?.tokens || [];

  // Pull-to-refresh support
  const { elementRef: pullRefreshRef, isPulling, pullProgress } = usePullToRefresh({
    onRefresh: refetch,
    enabled: isMobile,
  });

  // Client-side filtering/sorting (applied to the fetched batch)
  const filteredTokens = useMemo(() => {
    let filtered = [...tokens];

    // Status Filter
    if (filters.status === 'active') {
      filtered = filtered.filter(token => !token.isGraduated && (token.volume24h || 0) > 0);
    } else if (filters.status === 'graduated') {
      filtered = filtered.filter(token => token.isGraduated);
    } else if (filters.status === 'new') {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      filtered = filtered.filter(token => token.createdAt.getTime() > oneDayAgo);
    }

    // Volume Filter
    if (filters.volumeRange === 'high') {
      filtered = filtered.filter(token => (token.volume24h || 0) >= 10000);
    } else if (filters.volumeRange === 'medium') {
      filtered = filtered.filter(token => {
        const vol = token.volume24h || 0;
        return vol >= 1000 && vol < 10000;
      });
    } else if (filters.volumeRange === 'low') {
      filtered = filtered.filter(token => (token.volume24h || 0) < 1000);
    }

    // Sorting
    filtered.sort((a, b) => {
      let compareA: number;
      let compareB: number;

      switch (filters.sortBy) {
        case 'volume':
          compareA = a.volume24h || 0;
          compareB = b.volume24h || 0;
          break;
        case 'marketCap':
          compareA = a.marketCap;
          compareB = b.marketCap;
          break;
        case 'price':
          compareA = a.price;
          compareB = b.price;
          break;
        case 'change24h':
          compareA = a.change24h;
          compareB = b.change24h;
          break;
        case 'holders':
          compareA = a.holders;
          compareB = b.holders;
          break;
        case 'created':
          compareA = a.createdAt.getTime();
          compareB = b.createdAt.getTime();
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return filters.sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tokens, filters]);

  const stats = useMemo(() => ({
    totalTokens: tokens.length,
    totalVolume: tokens.reduce((acc, token) => acc + token.volume24h, 0),
    totalHolders: tokens.reduce((acc, token) => acc + token.holders, 0),
  }), [tokens]);

  const handleQuickTrade = (token: KasPumpToken) => {
    setSelectedToken(token);
  };

  // Show token trading page when a token is selected
  if (selectedToken) {
    return (
      <div className="pb-20 md:pb-0">
        <TokenTradingPage
          token={selectedToken}
          onBack={() => setSelectedToken(null)}
        />
      </div>
    );
  }

  return (
    <div
      ref={pullRefreshRef as any}
      className="min-h-screen relative"
    >
      <AmbientBackground
        showRoofLight={true}
        showLightBeam={true}
        showOrbs={true}
        showStars={true}
        showNoise={true}
        colorScheme="yellow"
      />

      {isMobile && isPulling && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-yellow-600/20 backdrop-blur-sm"
          style={{ height: `${Math.min(pullProgress * 60, 60)}px` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{ rotate: pullProgress * 360 }}
              className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full"
            />
            <span className="text-yellow-400 text-sm font-medium">
              {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </motion.div>
      )}

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.section
          className="text-center py-12 mb-12 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <AnimatedBadge variant="live" animated={true}>
              Live on BSC
            </AnimatedBadge>
          </motion.div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-6 animate-fade-in-up">
            <span className="text-white">Launch Your </span>
            <GradientText
              as="span"
              colorScheme="yellow"
              glow={true}
              className="font-bold"
            >
              Meme Coin
            </GradientText>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
            Fair launch, bonding curve trading, instant liquidity on BNB Smart Chain.
            No presale, no team allocation, just pure meme magic.
          </p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <GlowButton
              size="lg"
              onClick={() => router.push('/launch')}
              colorScheme="yellow"
            >
              <Rocket size={20} className="mr-2" />
              Launch New Token
            </GlowButton>
            <Button
              variant="outline"
              size="lg"
              onClick={() => document.getElementById('tokens')?.scrollIntoView({ behavior: 'smooth' })}
              icon={<TrendingUp size={20} />}
              className="border-white/10 hover:bg-white/5"
            >
              Browse Tokens
            </Button>
          </motion.div>
        </motion.section>

        {/* Stats Section */}
        <motion.section
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <GlowCard padding="lg">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <Zap className="w-7 h-7 text-yellow-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {isLoading ? '...' : stats.totalTokens}
              </div>
              <div className="text-sm text-gray-400 font-medium">Tokens Launched</div>
            </div>
          </GlowCard>

          <GlowCard padding="lg">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <TrendingUp className="w-7 h-7 text-green-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {isLoading ? '...' : `$${stats.totalVolume.toLocaleString()}`}
              </div>
              <div className="text-sm text-gray-400 font-medium">24h Volume</div>
            </div>
          </GlowCard>

          <GlowCard padding="lg">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Users className="w-7 h-7 text-blue-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {isLoading ? '...' : stats.totalHolders.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400 font-medium">Total Holders</div>
            </div>
          </GlowCard>
        </motion.section>

        {/* Trending Tokens Carousel */}
        {filteredTokens.length > 0 && (
          <motion.section
            className="mb-12 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <TokenCarousel
              tokens={filteredTokens
                .sort((a, b) => b.volume24h - a.volume24h)
                .slice(0, 10)}
              title="Trending Now"
              subtitle="Top tokens by 24h volume"
              onTokenClick={(token) => setSelectedToken(token)}
              autoScroll={true}
            />
          </motion.section>
        )}

        {/* Tokens Section */}
        <section id="tokens" className="relative z-10">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-white">
                Live Tokens
              </h2>
              <AnimatedBadge variant="success" animated={tokens.length > 0}>
                {tokens.length} Active
              </AnimatedBadge>
              {isRefetching && (
                <span className="text-xs text-yellow-500 animate-pulse ml-2">Updating...</span>
              )}
            </div>

            <TokenSearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              tokenCount={filteredTokens.length}
            />
          </div>

          {/* Token Grid */}
          {isLoading ? (
            <TokenListSkeleton count={6} />
          ) : filteredTokens.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="h-12 w-12 text-gray-400" />}
              title="No tokens found"
              description={
                filters.searchQuery
                  ? `No tokens match "${filters.searchQuery}". Try adjusting your search or filters.`
                  : "Be the first to launch a token on KasPump! Create your meme coin and watch it pump."
              }
              action={{
                label: 'Launch First Token',
                onClick: () => router.push('/launch'),
                icon: <Plus size={16} />,
              }}
            />
          ) : (
            <motion.div
              className={cn(
                'space-y-4',
                !isMobile && 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 space-y-0'
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              {filteredTokens.map((token, index) => (
                <motion.div
                  key={token.address}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="content-visibility-auto"
                >
                  {isMobile ? (
                    <MobileTokenCard
                      token={token}
                      onClick={() => setSelectedToken(token)}
                      onQuickTrade={handleQuickTrade}
                      showQuickActions={true}
                    />
                  ) : (
                    <TokenCard token={token} onClick={() => setSelectedToken(token)} />
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-gray-900/30 mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2025 KasPump. Built on BNB Smart Chain.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
