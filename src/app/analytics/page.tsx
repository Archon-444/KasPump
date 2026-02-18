'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, BarChart3, TrendingUp, DollarSign, Users, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui';
import { PlatformStatsCard, AnalyticsData } from '../../components/features/PlatformStatsCard';
import { ChainComparisonChart } from '../../components/features/ChainComparisonChart';
import { GrowthChart } from '../../components/features/GrowthChart';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../utils';
import { MobileNavigation } from '../../components/mobile';

export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const isMobile = useIsMobile();

  // Fetch analytics data
  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/analytics?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!analytics) return;
    
    const csv = [
      ['Metric', 'Value'].join(','),
      ['Total Tokens', analytics.platform.totalTokens].join(','),
      ['Graduated Tokens', analytics.platform.graduatedTokens].join(','),
      ['Total Volume', analytics.financial.totalVolume].join(','),
      ['Total Market Cap', analytics.financial.totalMarketCap].join(','),
      ['Platform Fees', analytics.financial.platformFees].join(','),
      ['Total Users', analytics.platform.totalUsers].join(','),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaspump-analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
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
              <BarChart3 className="text-yellow-400" size={24} />
              <h1 className="text-xl font-bold gradient-text">Analytics</h1>
            </div>

            <div className="flex items-center space-x-3">
              {/* Timeframe Selector */}
              <div className="flex items-center space-x-1 bg-white/5 rounded-xl p-1">
                {(['24h', '7d', '30d', 'all'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={cn(
                      'px-3 py-1.5 rounded text-sm font-medium transition-all',
                      timeframe === tf
                        ? 'bg-yellow-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    {tf === 'all' ? 'All' : tf}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!analytics}
                className="flex items-center space-x-2"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mb-4"></div>
            <div className="text-gray-400">Loading analytics...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glow-card-wrapper border-red-500/30"><div className="glow-card-inner">
            <div className="text-center py-8">
              <div className="text-red-400 mb-2">Error loading analytics</div>
              <div className="text-sm text-gray-400 mb-4">{error}</div>
              <Button onClick={fetchAnalytics}>Try Again</Button>
            </div>
          </div></div>
        )}

        {/* Analytics Content */}
        {!loading && !error && analytics && (
          <>
            {/* Platform Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <PlatformStatsCard data={analytics} />
            </motion.div>

            {/* Financial Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn(
                'grid gap-4 mb-8',
                isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'
              )}
            >
              <div className="glow-card-wrapper border-2 border-blue-500/30"><div className={cn('glow-card-inner', isMobile ? 'p-4' : 'p-6')}>
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="text-blue-400" size={isMobile ? 18 : 20} />
                  <span className={cn('bg-blue-500/20 text-blue-400 px-2 py-1 rounded', isMobile ? 'text-[10px]' : 'text-xs')}>Revenue</span>
                </div>
                <div className={cn('font-bold text-white mb-1', isMobile ? 'text-xl' : 'text-2xl')}>
                  ${analytics.financial.platformFees.toLocaleString()}
                </div>
                <div className={cn('text-gray-400', isMobile ? 'text-xs' : 'text-sm')}>Platform Fees</div>
              </div></div>

              <div className="glow-card-wrapper border-2 border-green-500/30"><div className={cn('glow-card-inner', isMobile ? 'p-4' : 'p-6')}>
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="text-green-400" size={isMobile ? 18 : 20} />
                  <span className={cn('bg-green-500/20 text-green-400 px-2 py-1 rounded', isMobile ? 'text-[10px]' : 'text-xs')}>Creator</span>
                </div>
                <div className={cn('font-bold text-white mb-1', isMobile ? 'text-xl' : 'text-2xl')}>
                  ${analytics.financial.creatorEarnings.toLocaleString()}
                </div>
                <div className={cn('text-gray-400', isMobile ? 'text-xs' : 'text-sm')}>Creator Earnings</div>
              </div></div>

              <div className="glow-card-wrapper border-2 border-yellow-500/30"><div className={cn('glow-card-inner', isMobile ? 'p-4' : 'p-6')}>
                <div className="flex items-center justify-between mb-2">
                  <Users className="text-yellow-400" size={isMobile ? 18 : 20} />
                  <span className={cn('bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded', isMobile ? 'text-[10px]' : 'text-xs')}>Ecosystem</span>
                </div>
                <div className={cn('font-bold text-white mb-1', isMobile ? 'text-xl' : 'text-2xl')}>
                  ${(analytics.partnership?.ecosystemValue || 0).toLocaleString()}
                </div>
                <div className={cn('text-gray-400', isMobile ? 'text-xs' : 'text-sm')}>Total Value</div>
              </div></div>
            </motion.div>

            {/* Charts Grid */}
            <div className={cn(
              'grid gap-6 mb-8',
              isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
            )}>
              <GrowthChart data={analytics} />
              <ChainComparisonChart 
                data={{
                  chains: [] // Would need to fetch per-chain data
                }}
              />
            </div>

            {/* Leaderboard - Placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Leaderboard placeholder - would need token data from API */}
              {analytics.partnership && (
                <div className="glow-card-wrapper"><div className="glow-card-inner p-6">
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-2">Leaderboard data coming soon</p>
                    <div className="text-sm text-gray-500">
                      Top {analytics.partnership.topPerformingTokens} performing tokens identified
                    </div>
                  </div>
                </div></div>
              )}
            </motion.div>
          </>
        )}
      </main>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNavigation
          currentPage="analytics"
          onNavigate={(page) => {
            if (page === 'home') router.push('/');
            else if (page === 'create') router.push('/');
            else if (page === 'profile') router.push('/portfolio');
          }}
        />
      )}
    </div>
  );
}

