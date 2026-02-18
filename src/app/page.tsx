'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, Zap, Users, Star } from 'lucide-react';
import { WalletConnectButton } from '../components/features/WalletConnectButton';
import { TokenCard } from '../components/features/TokenCard';
import { TokenListSkeleton, EmptyState } from '../components/features/LoadingStates';
import { TokenCreationModal } from '../components/features/TokenCreationModal';
import dynamic from 'next/dynamic';
import { TokenSearchFilters, TokenFilters } from '../components/features/TokenSearchFilters';
import { PWAInstallBanner } from '../components/features/PWAInstallBanner';
import { MobileNavigation, useMobileNavigation, MobileTokenCard } from '../components/mobile';

// Lazy load heavy components for better mobile performance
const TokenTradingPage = dynamic(
  () => import('../components/features/TokenTradingPage').then((mod) => {
    if (!mod || !mod.TokenTradingPage) {
      throw new Error('TokenTradingPage component not found');
    }
    return { default: mod.TokenTradingPage };
  }).catch((error) => {
    console.error('Failed to load TokenTradingPage:', error);
    // Return a fallback component
    return { 
      default: () => <div className="flex items-center justify-center min-h-screen text-red-400">Failed to load trading page</div>
    };
  }),
  {
    loading: () => <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div></div>,
    ssr: false,
  }
);

const TokenCarousel = dynamic(
  () => import('../components/features/TokenCarousel').then((mod) => {
    if (!mod || !mod.TokenCarousel) {
      throw new Error('TokenCarousel component not found');
    }
    return { default: mod.TokenCarousel };
  }).catch((error) => {
    console.error('Failed to load TokenCarousel:', error);
    // Return a fallback component
    return { 
      default: () => <div className="h-64 flex items-center justify-center text-gray-400">Failed to load carousel</div>
    };
  }),
  {
    loading: () => <div className="h-64 flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading trending tokens...</div></div>,
    ssr: false,
  }
);
import { Button } from '../components/ui';
import {
  AmbientBackground,
  GlowCard,
  GlowButton,
  AnimatedBadge,
  GradientText,
} from '../components/ui/enhanced';
import { useRouter } from 'next/navigation';
import { useContracts } from '../hooks/useContracts';
import { useFavorites } from '../hooks/useFavorites';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useServiceWorkerCache } from '../hooks/useServiceWorkerCache';
import { useIsMobile } from '../hooks/useIsMobile';
import { KasPumpToken } from '../types';
import { cn } from '../utils';

export default function HomePage() {
  const [tokens, setTokens] = useState<KasPumpToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
  const mobileNav = useMobileNavigation();

  const contracts = useContracts();
  const favorites = useFavorites();
  const { cacheTokenList } = useServiceWorkerCache();
  const isMobile = useIsMobile();

  // Load tokens function
  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch real tokens from blockchain
      if (!contracts.isInitialized || !contracts.getAllTokens || !contracts.getTokenInfo) {
        console.warn('Contracts not initialized, waiting...');
        setTokens([]);
        return;
      }

      try {
        // Get all token addresses from the factory
        const tokenAddresses = await contracts.getAllTokens();

        if (!tokenAddresses || tokenAddresses.length === 0) {
          console.log('No tokens deployed yet');
          setTokens([]);
          cacheTokenList({ tokens: [] });
          return;
        }

        console.log(`Fetching info for ${tokenAddresses.length} tokens...`);

        // Fetch detailed info for each token
        const tokenPromises = tokenAddresses.map(async (address) => {
          try {
            return await contracts.getTokenInfo(address);
          } catch (error) {
            console.error(`Failed to fetch token info for ${address}:`, error);
            return null;
          }
        });

        const tokenResults = await Promise.all(tokenPromises);

        // Filter out failed fetches
        const validTokens = tokenResults.filter(
          (token): token is KasPumpToken => token !== null
        );

        console.log(`Successfully loaded ${validTokens.length} tokens`);
        setTokens(validTokens);

        // Cache tokens for offline access
        cacheTokenList({ tokens: validTokens });
      } catch (error) {
        console.error('Failed to fetch tokens from blockchain:', error);
        setTokens([]);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [contracts.isInitialized, contracts.getAllTokens, contracts.getTokenInfo, cacheTokenList]);

  // Load tokens on mount and when contracts are initialized
  useEffect(() => {
    // Small delay to ensure contracts are ready
    const timer = setTimeout(() => {
      loadTokens();
    }, 100);
    return () => clearTimeout(timer);
  }, [loadTokens]);

  // Pull-to-refresh support (mobile) - must be after loadTokens is defined
  const { elementRef: pullRefreshRef, isPulling, pullProgress } = usePullToRefresh({
    onRefresh: loadTokens,
    enabled: isMobile,
  });

  // Filter and sort tokens
  const filteredTokens = useMemo(() => {
    let filtered = [...tokens];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(token =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filters.status === 'active') {
      filtered = filtered.filter(token => !token.isGraduated && (token.volume24h || 0) > 0);
    } else if (filters.status === 'graduated') {
      filtered = filtered.filter(token => token.isGraduated);
    } else if (filters.status === 'new') {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      filtered = filtered.filter(token => token.createdAt.getTime() > oneDayAgo);
    }

    // Chain filter (if tokens had chainId, we'd filter here)
    // For now, we'll skip since mock tokens don't have chainId

    // Volume range filter
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

    // Sort
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

  const stats = {
    totalTokens: tokens.length,
    totalVolume: tokens.reduce((acc, token) => acc + token.volume24h, 0),
    totalHolders: tokens.reduce((acc, token) => acc + token.holders, 0),
  };

  const handleMobileNavigation = (page: string) => {
    mobileNav.navigate(page);
    
    switch (page) {
      case 'create-token':
      case 'create':
        setShowCreateModal(true);
        break;
      case 'home':
        setSelectedToken(null);
        break;
      default:
        console.log('Navigate to:', page);
    }
  };

  const handleQuickTrade = (token: KasPumpToken, type: 'buy' | 'sell') => {
    setSelectedToken(token);
    // Auto-set trade type in the trading interface
    console.log(`Quick ${type} for ${token.symbol}`);
  };

  // Show token trading page when a token is selected
  if (selectedToken) {
    return (
      <div className="pb-20 md:pb-0">
        <TokenTradingPage 
          token={selectedToken} 
          onBack={() => setSelectedToken(null)} 
        />
        {isMobile && (
          <MobileNavigation
            currentPage="trading"
            onNavigate={handleMobileNavigation}
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={pullRefreshRef as any}
      className={cn('min-h-screen relative', isMobile && 'pb-20')}
    >
      {/* Ambient Background Effects */}
      <AmbientBackground
        showRoofLight={true}
        showLightBeam={true}
        showOrbs={true}
        showStars={true}
        showNoise={true}
        colorScheme="yellow"
      />

      {/* Pull-to-refresh indicator */}
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

      {/* Header */}
      <header className="border-b border-white/5 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <motion.a
                href="/"
                className="flex items-center space-x-2 group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 group-hover:bg-yellow-500/20 transition-colors">
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-xl font-semibold tracking-tight gradient-text">KasPump</span>
              </motion.a>
              <div className="hidden sm:block text-xs text-gray-500 font-medium">
                Meme coins on BSC
              </div>
            </div>

            {/* Center Pill Navigation */}
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-1.5 text-xs font-medium rounded-full bg-white/10 text-white shadow-sm border border-white/5"
              >
                Trade
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-1.5 text-xs font-medium rounded-full text-gray-400 hover:text-white transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => router.push('/portfolio')}
                className="px-4 py-1.5 text-xs font-medium rounded-full text-gray-400 hover:text-white transition-colors"
              >
                Portfolio
              </button>
              <button
                onClick={() => router.push('/analytics')}
                className="px-4 py-1.5 text-xs font-medium rounded-full text-gray-400 hover:text-white transition-colors"
              >
                Analytics
              </button>
              <button
                onClick={() => router.push('/creator')}
                className="px-4 py-1.5 text-xs font-medium rounded-full text-gray-400 hover:text-white transition-colors"
              >
                Creator
              </button>
            </nav>

            {/* Wallet Connection */}
            <div className="flex items-center space-x-3">
              <a
                href="/favorites"
                className="relative p-2 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-white/5 transition-colors"
                title="Favorites"
              >
                <Star size={20} />
                {favorites.favoriteCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-gray-900 rounded-full text-xs font-bold flex items-center justify-center animate-fade-in-up">
                    {favorites.favoriteCount > 99 ? '99+' : favorites.favoriteCount}
                  </span>
                )}
              </a>
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Skip to main content link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.section
          className="text-center py-12 mb-12 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Animated Badge */}
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
              onClick={() => setShowCreateModal(true)}
              colorScheme="yellow"
            >
              <Plus size={20} className="mr-2" />
              Create Token
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
          {[
            { icon: Zap, color: 'yellow', value: stats.totalTokens.toString(), label: 'Tokens Launched' },
            { icon: TrendingUp, color: 'green', value: `$${stats.totalVolume.toLocaleString()}`, label: '24h Volume' },
            { icon: Users, color: 'blue', value: stats.totalHolders.toLocaleString(), label: 'Total Holders' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <GlowCard key={stat.label} padding="lg">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className={`p-3 rounded-xl bg-${stat.color}-500/10`}>
                      <Icon className={`w-7 h-7 text-${stat.color}-400`} />
                    </div>
                  </div>
                  {loading ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <div className="h-9 w-24 bg-white/5 rounded-lg animate-pulse" />
                      <div className="h-4 w-28 bg-white/5 rounded animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-sm text-gray-400 font-medium">{stat.label}</div>
                    </>
                  )}
                </div>
              </GlowCard>
            );
          })}
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
              title="Trending Now 🔥"
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
            </div>
            
            <TokenSearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              tokenCount={filteredTokens.length}
            />
          </div>

          {/* Token Grid */}
          {loading ? (
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
                label: 'Create First Token',
                onClick: () => setShowCreateModal(true),
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
                    <TokenCard token={token} onClick={() => {
                      setSelectedToken(token);
                    }} />
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </main>

      {/* Token Creation Modal */}
      <TokenCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(tokenData) => {
          console.log('Token created:', tokenData);
          setShowCreateModal(false);
          loadTokens(); // Reload tokens
        }}
      />

      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-gray-900/30 mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2025 KasPump. Built on BNB Smart Chain.</p>
          </div>
        </div>
      </footer>
      
      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNavigation
          currentPage={mobileNav.currentPage as 'home' | 'trading' | 'create' | 'analytics' | 'profile'}
          onNavigate={handleMobileNavigation}
        />
      )}

      {/* PWA Install Banner */}
      <PWAInstallBanner />
    </div>
  );
}
