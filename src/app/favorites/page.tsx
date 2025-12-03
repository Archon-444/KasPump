'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Star, Trash2, TrendingUp, Zap } from 'lucide-react';
import { useFavorites } from '../../hooks/useFavorites';
import { useContracts } from '../../hooks/useContracts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { TokenCard } from '../../components/features/TokenCard';
import { Card, Button, Alert } from '../../components/ui';
import { KasPumpToken } from '../../types';
import { cn } from '../../utils';
import { MobileNavigation } from '../../components/mobile';

export default function FavoritesPage() {
  const router = useRouter();
  const { favorites, isLoading, clearFavorites, removeFavorite } = useFavorites();
  const contracts = useContracts();
  const isMobile = useIsMobile();
  const [tokens, setTokens] = useState<KasPumpToken[]>([]);
  const [loading, setLoading] = useState(true);

  // Load token details for favorites
  React.useEffect(() => {
    const loadFavoriteTokens = async () => {
      if (favorites.length === 0) {
        setTokens([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const tokenPromises = favorites.map(async (fav) => {
          try {
            const tokenInfo = await contracts.getTokenInfo(fav.address);
            return tokenInfo;
          } catch (error) {
            console.error(`Failed to load token ${fav.address}:`, error);
            return null;
          }
        });

        const loadedTokens = (await Promise.all(tokenPromises)).filter(
          (token): token is KasPumpToken => token !== null
        );

        setTokens(loadedTokens);
      } catch (error) {
        console.error('Failed to load favorite tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      loadFavoriteTokens();
    }
  }, [favorites, isLoading, contracts]);

  const handleClearAll = () => {
    if (confirm('Are you sure you want to remove all favorites?')) {
      clearFavorites();
    }
  };

  return (
    <div className={cn('min-h-screen', isMobile && 'pb-20')}>
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Star className="text-yellow-400 fill-yellow-400" size={24} />
              <h1 className="text-xl font-bold gradient-text">Favorites</h1>
              {favorites.length > 0 && (
                <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 rounded text-sm font-semibold">
                  {favorites.length}
                </span>
              )}
            </div>

            {favorites.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="flex items-center space-x-2 text-red-400 hover:text-red-300 hover:border-red-400"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Clear All</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {(isLoading || loading) && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mb-4"></div>
            <div className="text-gray-400">Loading favorites...</div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !loading && favorites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Card className="glassmorphism p-12 max-w-md mx-auto">
              <Star size={64} className="mx-auto text-gray-500 mb-6" />
              <h3 className="text-2xl font-semibold text-white mb-2">No Favorites Yet</h3>
              <p className="text-gray-400 mb-6">
                Start adding tokens to your favorites to track them easily!
              </p>
              <Button
                onClick={() => router.push('/')}
                variant="primary"
                className="btn-glow-purple"
              >
                <TrendingUp size={16} className="mr-2" />
                Browse Tokens
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Favorites Grid */}
        {!isLoading && !loading && tokens.length > 0 && (
          <>
            <div className="mb-6">
              <p className="text-gray-400">
                {tokens.length} of {favorites.length} favorite token{tokens.length !== 1 ? 's' : ''} loaded
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {tokens.map((token, index) => (
                <motion.div
                  key={token.address}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <TokenCard
                    token={token}
                    onClick={() => {
                      router.push(`/tokens/${token.address}`);
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* Some favorites failed to load */}
        {!isLoading && !loading && tokens.length < favorites.length && (
          <Alert variant="default" className="mt-6">
            <Zap size={16} />
            <div className="ml-2">
              <p className="font-medium">Some favorites couldn't be loaded</p>
              <p className="text-sm text-gray-400">
                {favorites.length - tokens.length} token(s) may no longer exist or are on a different chain.
              </p>
            </div>
          </Alert>
        )}
      </main>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNavigation
          currentPage="profile"
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

