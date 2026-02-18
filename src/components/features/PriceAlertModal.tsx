'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, TrendingUp, TrendingDown } from 'lucide-react';
import { Button, Input, Card, Alert } from '../ui';
import { usePriceAlerts } from '../../hooks/usePriceAlerts';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { KasPumpToken } from '../../types';
import { cn, formatCurrency } from '../../utils';

export interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: KasPumpToken;
  chainId?: number | undefined;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  isOpen,
  onClose,
  token,
  chainId,
}) => {
  const { createAlert, getAlertsForToken, removeAlert } = usePriceAlerts();
  const pushNotifications = usePushNotifications();
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [error, setError] = useState<string>('');
  
  const existingAlerts = getAlertsForToken(token.address, chainId);

  const handleCreateAlert = () => {
    setError('');
    
    const price = parseFloat(targetPrice);
    if (!price || price <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (direction === 'above' && price <= token.price) {
      setError(`Price must be above current price (${formatCurrency(token.price, '$', 6)})`);
      return;
    }

    if (direction === 'below' && price >= token.price) {
      setError(`Price must be below current price (${formatCurrency(token.price, '$', 6)})`);
      return;
    }

    createAlert(
      token.address,
      token.symbol,
      price,
      direction,
      token.price,
      chainId
    );

    // Show push notification confirmation if enabled
    if (pushNotifications.isSubscribed) {
      pushNotifications.showNotification({
        title: '✅ Price Alert Created',
        body: `You'll be notified when ${token.symbol} reaches ${formatCurrency(price, '$', 6)}`,
        tag: `price-alert-${token.address}`,
        data: { type: 'price-alert-created', tokenSymbol: token.symbol, targetPrice: price },
      });
    }

    setTargetPrice('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-w-md w-full z-10"
        >
          <Card className="glassmorphism border-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Bell className="text-yellow-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Price Alert</h3>
                  <p className="text-sm text-gray-400">{token.name} (${token.symbol})</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Current Price */}
            <div className="mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <div className="text-xs text-gray-400 mb-1">Current Price</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(token.price, '$', 6)}
              </div>
            </div>

            {/* Direction Selector */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-300 mb-3">Alert When Price Is</div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setDirection('above')}
                  className={cn(
                    'flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all',
                    direction === 'above'
                      ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                  )}
                >
                  <TrendingUp size={18} />
                  <span>Above</span>
                </button>
                <button
                  onClick={() => setDirection('below')}
                  className={cn(
                    'flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all',
                    direction === 'below'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                  )}
                >
                  <TrendingDown size={18} />
                  <span>Below</span>
                </button>
              </div>
            </div>

            {/* Target Price Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Price (USD)
              </label>
              <Input
                type="number"
                step="0.000001"
                placeholder="0.000000"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="danger" className="mb-4">
                {error}
              </Alert>
            )}

            {/* Existing Alerts */}
            {existingAlerts.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-300 mb-2">Active Alerts</div>
                <div className="space-y-2">
                  {existingAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl"
                    >
                      <div>
                        <div className="text-sm text-white">
                          {alert.direction === 'above' ? 'Above' : 'Below'} {formatCurrency(alert.targetPrice, '$', 6)}
                        </div>
                        <div className="text-xs text-gray-400">
                          Current: {formatCurrency(alert.currentPrice, '$', 6)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeAlert(alert.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3">
              <Button variant="secondary" onClick={onClose} fullWidth>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateAlert}
                fullWidth
                className="btn-glow-purple"
              >
                <Bell size={16} className="mr-2" />
                Create Alert
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

