'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, Wallet, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { WalletConnectButton, WalletRequired } from '../../components/features/WalletConnectButton';
import { PortfolioStatsCard } from '../../components/features/PortfolioStatsCard';
import { ChainBalanceCard } from '../../components/features/ChainBalanceCard';
import { PortfolioTokenList } from '../../components/features/PortfolioTokenList';
import { Button } from '../../components/ui';
import { usePortfolio, PortfolioToken } from '../../hooks/usePortfolio';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../utils';
import { MobileNavigation } from '../../components/mobile';

export default function PortfolioPage() {
  const router = useRouter();
  const { tokens, stats, loading, error, refresh } = usePortfolio();
  const isMobile = useIsMobile();
  const [selectedChain, setSelectedChain] = useState<number | 'all'>('all');

  const handleTokenClick = (portfolioToken: PortfolioToken) => {
    // Navigate to token trading page
    router.push(`/token/${portfolioToken.token.address}?chain=${portfolioToken.chainId}`);
  };

  const handleExportPortfolio = () => {
    // Create CSV export
    const csv = [
      ['Chain', 'Token Symbol', 'Balance', 'Price', 'Value USD', 'P&L USD', 'P&L %'].join(','),
      ...tokens.map(token => [
        token.chainName,
        token.token.symbol,
        token.balance.toFixed(6),
        token.token.price.toFixed(6),
        token.value.toFixed(2),
        token.profitLoss?.toFixed(2) || 'N/A',
        token.profitLossPercent?.toFixed(2) || 'N/A',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <WalletRequired>
      <div className={cn('min-h-screen', isMobile && 'pb-20')}>
        {/* Header */}
        <header className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <h1 className="text-xl font-bold gradient-text">Portfolio</h1>
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
                  variant="outline"
                  size="sm"
                  onClick={handleExportPortfolio}
                  disabled={tokens.length === 0}
                  className="flex items-center space-x-2"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <WalletConnectButton />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Portfolio Stats */}
          {!loading && tokens.length > 0 && (
            <PortfolioStatsCard stats={stats} />
          )}

          {/* Chain Breakdown */}
          {!loading && stats.chains.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h2 className="text-xl font-semibold text-white mb-4">By Chain</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.chains.map((chainData) => (
                  <ChainBalanceCard
                    key={chainData.chainId}
                    chainData={chainData}
                    onClick={() => setSelectedChain(chainData.chainId)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mb-4"></div>
              <div className="text-gray-400">Loading portfolio...</div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="glow-card-wrapper border-red-500/30"><div className="glow-card-inner">
              <div className="text-center py-8">
                <div className="text-red-400 mb-2">Error loading portfolio</div>
                <div className="text-sm text-gray-400 mb-4">{error}</div>
                <Button onClick={refresh}>Try Again</Button>
              </div>
            </div></div>
          )}

          {/* Empty State */}
          {!loading && !error && tokens.length === 0 && (
            <div className="glow-card-wrapper"><div className="glow-card-inner">
              <div className="text-center py-12">
                <Wallet size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No tokens in portfolio</h3>
                <p className="text-gray-400 mb-6">
                  Start trading to build your portfolio across all supported chains
                </p>
                <Button onClick={() => router.push('/')}>
                  Browse Tokens
                </Button>
              </div>
            </div></div>
          )}

          {/* Token List */}
          {!loading && !error && tokens.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                Your Tokens ({tokens.length})
              </h2>
              <PortfolioTokenList
                tokens={tokens}
                onTokenClick={handleTokenClick}
              />
            </motion.div>
          )}
        </main>

        {/* Mobile Navigation */}
        {isMobile && (
          <MobileNavigation
            currentPage="profile"
            onNavigate={(page) => {
              if (page === 'home') router.push('/');
              else if (page === 'create') router.push('/');
              else if (page === 'analytics') router.push('/analytics');
            }}
          />
        )}
      </div>
    </WalletRequired>
  );
}

