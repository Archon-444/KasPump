'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, Filter, Search, Award, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMultichainWallet } from '../../hooks/useMultichainWallet';
import { useCreatorTokens } from '../../hooks/useCreatorTokens';
import { useIsMobile } from '../../hooks/useIsMobile';
import { WalletRequired } from '../../components/features/WalletConnectButton';
import { CreatorStatsCard } from '../../components/features/CreatorStatsCard';
import { CreatorTokenCard } from '../../components/features/CreatorTokenCard';
import { TokenCreationModal } from '../../components/features/TokenCreationModal';
import { Button, Input } from '../../components/ui';
import { cn } from '../../utils';
import { MobileNavigation } from '../../components/mobile';

export default function CreatorDashboardPage() {
  const router = useRouter();
  const wallet = useMultichainWallet();
  const { tokens, stats, loading, error, refresh } = useCreatorTokens();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'graduated'>('all');
  const [sortBy, setSortBy] = useState<'volume' | 'marketCap' | 'earnings' | 'created'>('volume');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter and sort tokens
  const filteredTokens = React.useMemo(() => {
    let filtered = [...tokens];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(token =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterBy === 'graduated') {
      filtered = filtered.filter(token => token.isGraduated);
    } else if (filterBy === 'active') {
      filtered = filtered.filter(token => !token.isGraduated && (token.volume24h || 0) > 0);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return (b.totalVolume || 0) - (a.totalVolume || 0);
        case 'marketCap':
          return b.marketCap - a.marketCap;
        case 'earnings':
          return (b.totalEarnings || 0) - (a.totalEarnings || 0);
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [tokens, searchQuery, filterBy, sortBy]);

  const handleCreateToken = () => {
    // Validate wallet is connected before opening modal
    if (!wallet.connected) {
      console.warn('Wallet not connected. Please connect your wallet first.');
      // The WalletRequired component should handle this, but we'll add a check anyway
      return;
    }
    
    // Check if contracts are available
    try {
      setShowCreateModal(true);
    } catch (error) {
      console.error('Failed to open token creation modal:', error);
      alert('Unable to open token creation. Please ensure your wallet is connected and try again.');
    }
  };

  return (
    <div className={cn('min-h-screen', isMobile && 'pb-20')}>
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {/* Back to Home Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-gray-400 hover:text-white"
                title="Back to Home"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Home</span>
              </Button>
              <Award className="text-yellow-400" size={24} />
              <h1 className="text-xl font-bold gradient-text">Creator Dashboard</h1>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateToken}
                disabled={!wallet.connected}
                className="flex items-center space-x-2 btn-glow-purple"
                title={wallet.connected ? 'Create a new token' : 'Connect wallet to create token'}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Create Token</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WalletRequired>
          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mb-4"></div>
              <div className="text-gray-400">Loading your tokens...</div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="glow-card-wrapper border-red-500/30"><div className="glow-card-inner">
              <div className="text-center py-8">
                <div className="text-red-400 mb-2">Error loading tokens</div>
                <div className="text-sm text-gray-400 mb-4">{error}</div>
                <Button onClick={refresh}>Try Again</Button>
              </div>
            </div></div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              {/* Stats Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <CreatorStatsCard stats={stats} />
              </motion.div>

              {/* Filters and Search */}
              {tokens.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 space-y-4"
                >
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      placeholder="Search tokens by name, symbol, or address..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <Filter size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-400">Filter:</span>
                    </div>
                    {(['all', 'active', 'graduated'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setFilterBy(filter)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                          filterBy === filter
                            ? 'bg-yellow-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        )}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}

                    <div className="flex-1" />

                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-yellow-500/30 focus:border-yellow-500/50"
                      >
                        <option value="volume">Volume</option>
                        <option value="marketCap">Market Cap</option>
                        <option value="earnings">Earnings</option>
                        <option value="created">Newest</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Empty State */}
              {!loading && !error && tokens.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="glow-card-wrapper max-w-md mx-auto"><div className="glow-card-inner p-8">
                    <Award size={48} className="mx-auto text-gray-500 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Tokens Created Yet</h3>
                    <p className="text-gray-400 mb-6">
                      Start your journey as a token creator! Launch your first token and watch it grow.
                    </p>
                    <Button
                      onClick={handleCreateToken}
                      variant="primary"
                      className="btn-glow-purple"
                      disabled={!wallet.connected}
                      title={wallet.connected ? 'Create your first token' : 'Connect wallet to create token'}
                    >
                      <Plus size={16} className="mr-2" />
                      Create Your First Token
                    </Button>
                  </div></div>
                </motion.div>
              )}

              {/* Token Grid */}
              {filteredTokens.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTokens.map((token, _index) => (
                      <CreatorTokenCard
                        key={`${token.chainId}-${token.address}`}
                        token={token}
                        onClick={(token) => {
                          router.push(`/tokens/${token.address}?chain=${token.chainId}`);
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* No Results */}
              {filteredTokens.length === 0 && tokens.length > 0 && (
                <div className="glow-card-wrapper"><div className="glow-card-inner p-8 text-center">
                  <p className="text-gray-400">No tokens match your filters.</p>
                </div></div>
              )}
            </>
          )}
        </WalletRequired>
      </main>

      {/* Token Creation Modal */}
      <TokenCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(tokenData) => {
          console.log('Token created successfully:', tokenData);
          setShowCreateModal(false);
          // Refresh the token list to show the new token
          refresh();
        }}
      />

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNavigation
          currentPage="profile"
          onNavigate={(page) => {
            if (page === 'home') router.push('/');
            else if (page === 'create') {
              handleCreateToken();
            } else if (page === 'profile') router.push('/portfolio');
          }}
        />
      )}
    </div>
  );
}

