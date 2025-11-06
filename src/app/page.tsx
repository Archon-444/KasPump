'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, Zap, Users, Search, Star } from 'lucide-react';
import { WalletConnectButton } from '../components/features/WalletConnectButton';
import { TokenCard, TokenCardSkeleton } from '../components/features/TokenCard';
import { TokenListSkeleton, EmptyState } from '../components/features/LoadingStates';
import { TokenCreationModal } from '../components/features/TokenCreationModal';
import dynamic from 'next/dynamic';
import { TokenSearchFilters, TokenFilters } from '../components/features/TokenSearchFilters';
import { PWAInstallBanner } from '../components/features/PWAInstallBanner';
import { MobileNavigation, MobileHeader, useMobileNavigation, MobileTokenCard } from '../components/mobile';

// Lazy load heavy components for better mobile performance
const TokenTradingPage = dynamic(() => import('../components/features/TokenTradingPage').then(mod => ({ default: mod.TokenTradingPage })), {
  loading: () => <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>,
  ssr: false,
});

const TokenCarousel = dynamic(() => import('../components/features/TokenCarousel').then(mod => ({ default: mod.TokenCarousel })), {
  loading: () => <div className="h-64 flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading trending tokens...</div></div>,
  ssr: false,
});
import { Button, Input, Card } from '../components/ui';
import { useRouter } from 'next/navigation';
import { useContracts } from '../hooks/useContracts';
import { useFavorites } from '../hooks/useFavorites';
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useServiceWorkerCache } from '../hooks/useServiceWorkerCache';
import { KasPumpToken } from '../types';
import { debounce, cn } from '../utils';

export default function HomePage() {
  const [tokens, setTokens] = useState<KasPumpToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<KasPumpToken | null>(null);
  const [isMobile, setIsMobile] = useState(false);
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

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load tokens function
  const loadTokens = async () => {
    try {
      setLoading(true);
      const tokenAddresses = await contracts.getAllTokens();
      
      // For now, we'll create mock data since the full token info fetching
      // requires AMM address resolution which we noted needs implementation
      const mockTokens: KasPumpToken[] = [
        {
          address: '0x1234567890123456789012345678901234567890',
          name: 'Kaspa Moon',
          symbol: 'KMOON',
          description: 'First meme coin on Kasplex! 🌙',
          image: '',
          creator: '0xabcd...efgh',
          totalSupply: 1000000000,
          currentSupply: 400000000,
          marketCap: 50000,
          price: 0.000125,
          change24h: 15.4,
          volume24h: 12500,
          holders: 342,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          curveType: 'linear',
          bondingCurveProgress: 40,
          ammAddress: '0x1234...amm',
          isGraduated: false,
        },
        {
          address: '0x2345678901234567890123456789012345678901',
          name: 'KaspaBot',
          symbol: 'KBOT',
          description: 'AI-powered meme machine 🤖',
          image: '',
          creator: '0xdcba...hgfe',
          totalSupply: 500000000,
          currentSupply: 125000000,
          marketCap: 18750,
          price: 0.00015,
          change24h: -8.2,
          volume24h: 8900,
          holders: 156,
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
          curveType: 'exponential',
          bondingCurveProgress: 25,
          ammAddress: '0x2345...amm',
          isGraduated: false,
        },
      ];
      
      setTokens(mockTokens);
      
      // Cache tokens for offline access
      cacheTokenList({ tokens: mockTokens });
    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load tokens on mount
  useEffect(() => {
    loadTokens();
  }, []);

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
      className={cn('min-h-screen', isMobile && 'pb-20')}
    >
      {/* Pull-to-refresh indicator */}
      {isMobile && isPulling && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-purple-600/20 backdrop-blur-sm"
          style={{ height: `${Math.min(pullProgress * 60, 60)}px` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{ rotate: pullProgress * 360 }}
              className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full"
            />
            <span className="text-purple-400 text-sm font-medium">
              {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <motion.a
                href="/"
                className="text-2xl font-bold gradient-text flex items-center space-x-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <span className="text-3xl">🚀</span>
                <span>KasPump</span>
              </motion.a>
              <div className="hidden sm:block text-sm text-gray-400">
                Meme coins on Kasplex L2
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Button variant="ghost" size="sm" onClick={() => router.push('/')}>Trade</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(true)}>Create</Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/portfolio')}>Portfolio</Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/analytics')}>Analytics</Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/creator')}>Creator</Button>
            </nav>

            {/* Wallet Connection */}
            <div className="flex items-center space-x-3">
              <a
                href="/favorites"
                className="p-2 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-gray-800 transition-colors relative"
                title="Favorites"
              >
                <Star size={20} />
                {favorites.favoriteCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-gray-900 rounded-full text-xs font-bold flex items-center justify-center">
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
          className="text-center py-12 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-6 flex items-center justify-center gap-3 flex-wrap">
            <span>🚀</span>
            <span>Launch Your Meme Coin</span>
            <span>🚀</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Fair launch, bonding curve trading, instant liquidity on Kasplex Layer 2. 
            No presale, no team allocation, just pure meme magic! 🚀
          </p>
          
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button
              size="lg"
              onClick={() => setShowCreateModal(true)}
              className="btn-glow-purple"
              icon={<Plus size={20} />}
            >
              Create Token
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => document.getElementById('tokens')?.scrollIntoView({ behavior: 'smooth' })}
              icon={<TrendingUp size={20} />}
            >
              Browse Tokens
            </Button>
          </motion.div>
        </motion.section>

        {/* Stats Section */}
        <motion.section
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="text-center glassmorphism">
            <div className="flex items-center justify-center mb-2">
              <Zap className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalTokens}</div>
            <div className="text-gray-400">Tokens Launched</div>
          </Card>
          
          <Card className="text-center glassmorphism">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">${stats.totalVolume.toLocaleString()}</div>
            <div className="text-gray-400">24h Volume</div>
          </Card>
          
          <Card className="text-center glassmorphism">
            <div className="flex items-center justify-center mb-2">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalHolders.toLocaleString()}</div>
            <div className="text-gray-400">Total Holders</div>
          </Card>
        </motion.section>

        {/* Trending Tokens Carousel */}
        {filteredTokens.length > 0 && (
          <motion.section
            className="mb-12"
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
        <section id="tokens">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Live Tokens
            </h2>
            
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
      <footer className="border-t border-gray-800/50 bg-gray-900/30 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2025 KasPump. Built on Kasplex Layer 2.</p>
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
