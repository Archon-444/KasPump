'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, Zap, Users, Search } from 'lucide-react';
import { WalletConnectButton } from '../components/features/WalletConnectButton';
import { TokenCard } from '../components/features/TokenCard';
import { TokenCreationModal } from '../components/features/TokenCreationModal';
import { TokenTradingPage } from '../components/features/TokenTradingPage';
import { MobileNavigation, MobileHeader, useMobileNavigation, MobileTokenCard } from '../components/mobile';
import { Button, Input, Card } from '../components/ui';
import { useContracts } from '../hooks/useContracts';
import { KasPumpToken } from '../types';
import { debounce } from '../utils';

export default function HomePage() {
  const [tokens, setTokens] = useState<KasPumpToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'trending' | 'new'>('all');
  const [selectedToken, setSelectedToken] = useState<KasPumpToken | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const mobileNav = useMobileNavigation();
  
  const contracts = useContracts();

  // Load tokens on mount
  useEffect(() => {
    loadTokens();
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = debounce((term: string) => {
    // In a real implementation, this would filter tokens
    console.log('Searching for:', term);
  }, 300);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm]);

  const filteredTokens = tokens.filter(token => {
    const matchesSearch = token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         token.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'trending') {
      return matchesSearch && token.change24h > 5;
    } else if (filter === 'new') {
      return matchesSearch && Date.now() - token.createdAt.getTime() < 24 * 60 * 60 * 1000;
    }
    
    return matchesSearch;
  });

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
    <div className={cn('min-h-screen', isMobile && 'pb-20')}>
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <motion.div
                className="text-2xl font-bold gradient-text"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                KasPump
              </motion.div>
              <div className="hidden sm:block text-sm text-gray-400">
                Meme coins on Kasplex L2
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Button variant="ghost" size="sm">Trade</Button>
              <Button variant="ghost" size="sm">Create</Button>
              <Button variant="ghost" size="sm">Portfolio</Button>
            </nav>

            {/* Wallet Connection */}
            <WalletConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.section
          className="text-center py-12 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-6">
            Launch Your Meme Coin
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

        {/* Tokens Section */}
        <section id="tokens">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 sm:mb-0">
              Live Tokens
            </h2>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search tokens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700"
                />
              </div>
              
              {/* Filter */}
              <div className="flex space-x-2">
                {(['all', 'trending', 'new'] as const).map((filterOption) => (
                  <Button
                    key={filterOption}
                    variant={filter === filterOption ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter(filterOption)}
                  >
                    {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Token Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse glassmorphism">
                  <div className="h-48 bg-gray-700/50 rounded-lg mb-4" />
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-700/50 rounded w-3/4" />
                    <div className="h-4 bg-gray-700/50 rounded w-1/2" />
                    <div className="h-4 bg-gray-700/50 rounded w-2/3" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredTokens.length === 0 ? (
            <Card className="text-center py-12 glassmorphism">
              <div className="text-gray-400 mb-4">No tokens found</div>
              <Button
                onClick={() => setShowCreateModal(true)}
                icon={<Plus size={16} />}
              >
                Create First Token
              </Button>
            </Card>
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
          currentPage={mobileNav.currentPage}
          onNavigate={handleMobileNavigation}
        />
      )}
    </div>
  );
}
