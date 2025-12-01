'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Bell, Trash2, TrendingUp, TrendingDown, X, Check } from 'lucide-react';
import { usePriceAlerts } from '../../hooks/usePriceAlerts';
import { useContracts } from '../../hooks/useContracts';
import { Card, Button, Alert } from '../../components/ui';
import { cn, formatCurrency } from '../../utils';
import { MobileNavigation } from '../../components/mobile';

export default function AlertsPage() {
  const router = useRouter();
  const { alerts, isLoading, removeAlert, clearAllAlerts } = usePriceAlerts();
  const contracts = useContracts();
  const [tokenPrices, setTokenPrices] = useState<Map<string, number>>(new Map());
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load current token prices for alerts
  useEffect(() => {
    const loadPrices = async () => {
      const priceMap = new Map<string, number>();
      
      for (const alert of alerts) {
        try {
          const tokenInfo = await contracts.getTokenInfo(alert.tokenAddress);
          if (tokenInfo) {
            priceMap.set(alert.id, tokenInfo.price);
          }
        } catch (error) {
          console.error(`Failed to load price for ${alert.tokenAddress}:`, error);
        }
      }
      
      setTokenPrices(priceMap);
    };

    if (alerts.length > 0 && !isLoading) {
      loadPrices();
      // Refresh prices every 30 seconds
      const interval = setInterval(loadPrices, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [alerts, isLoading, contracts]);

  const handleClearAll = () => {
    if (confirm('Are you sure you want to remove all alerts?')) {
      clearAllAlerts();
    }
  };

  const getAlertStatus = (alert: any) => {
    const currentPrice = tokenPrices.get(alert.id);
    if (!currentPrice) return 'loading';

    if (alert.direction === 'above') {
      return currentPrice >= alert.targetPrice ? 'triggered' : 'active';
    } else {
      return currentPrice <= alert.targetPrice ? 'triggered' : 'active';
    }
  };

  return (
    <div className={cn('min-h-screen', isMobile && 'pb-20')}>
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Bell className="text-yellow-400" size={24} />
              <h1 className="text-xl font-bold gradient-text">Price Alerts</h1>
              {alerts.length > 0 && (
                <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 rounded text-sm font-semibold">
                  {alerts.filter(a => a.isActive).length}
                </span>
              )}
            </div>

            {alerts.length > 0 && (
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
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mb-4"></div>
            <div className="text-gray-400">Loading alerts...</div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && alerts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Card className="glassmorphism p-12 max-w-md mx-auto">
              <Bell size={64} className="mx-auto text-gray-500 mb-6" />
              <h3 className="text-2xl font-semibold text-white mb-2">No Price Alerts</h3>
              <p className="text-gray-400 mb-6">
                Create price alerts to get notified when tokens reach your target price!
              </p>
              <Button
                onClick={() => router.push('/')}
                variant="primary"
                className="btn-glow-purple"
              >
                Browse Tokens
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Alerts List */}
        {!isLoading && alerts.length > 0 && (
          <div className="space-y-4">
            {alerts.map((alert, index) => {
              const currentPrice = tokenPrices.get(alert.id) || alert.currentPrice;
              const status = getAlertStatus(alert);
              const isTriggered = status === 'triggered';
              const isAbove = alert.direction === 'above';
              const progress = isAbove
                ? Math.min((currentPrice / alert.targetPrice) * 100, 100)
                : Math.max((currentPrice / alert.targetPrice) * 100, 0);

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      'glassmorphism p-6 transition-all',
                      isTriggered
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-gray-700'
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {alert.tokenSymbol}
                          </h3>
                          {isTriggered && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold flex items-center">
                              <Check size={12} className="mr-1" />
                              Triggered!
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div>
                            <span className="text-gray-400">Target: </span>
                            <span className="text-white font-semibold">
                              {formatCurrency(alert.targetPrice, '$', 6)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Current: </span>
                            <span className={cn(
                              'font-semibold',
                              isTriggered ? 'text-green-400' : 'text-white'
                            )}>
                              {formatCurrency(currentPrice, '$', 6)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isAbove ? (
                          <TrendingUp size={20} className="text-green-400" />
                        ) : (
                          <TrendingDown size={20} className="text-red-400" />
                        )}
                        <button
                          onClick={() => removeAlert(alert.id)}
                          className="p-2 hover:bg-gray-700 rounded transition-colors"
                          title="Remove alert"
                        >
                          <X size={16} className="text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {!isTriggered && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{isAbove ? 'Price increase needed' : 'Price decrease needed'}</span>
                          <span>{progress.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                            className={cn(
                              'h-full rounded-full',
                              isAbove ? 'bg-green-500' : 'bg-red-500'
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {/* Triggered Message */}
                    {isTriggered && (
                      <Alert variant="success" className="mt-4">
                        <Check size={16} />
                        <div className="ml-2">
                          <p className="font-medium">Alert Triggered!</p>
                          <p className="text-sm">
                            {alert.tokenSymbol} reached your target price of{' '}
                            {formatCurrency(alert.targetPrice, '$', 6)}
                          </p>
                        </div>
                      </Alert>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
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

