'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, AlertTriangle, Info, Coins, Zap } from 'lucide-react';
import { Button, Alert } from '../ui';
import { KasPumpToken } from '../../types';
import { cn, formatCurrency, formatPercentage } from '../../utils';

export interface TransactionPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  token: KasPumpToken;
  type: 'buy' | 'sell';
  amount: string;
  expectedOutput: number;
  priceImpact: number;
  slippage: number;
  minimumReceived: number;
  fees: number;
  gasFee?: number;
  chainId?: number;
  loading?: boolean;
}

export const TransactionPreviewModal: React.FC<TransactionPreviewProps> = ({
  isOpen,
  onClose,
  onConfirm,
  token,
  type,
  amount,
  expectedOutput,
  priceImpact,
  slippage,
  minimumReceived,
  fees,
  gasFee,
  chainId,
  loading = false,
}) => {
  if (!isOpen) return null;

  const isHighImpact = Math.abs(priceImpact) > 3;
  const isVeryHighImpact = Math.abs(priceImpact) > 5;

  const handleConfirm = () => {
    onConfirm();
  };

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
          className="relative max-w-lg w-full z-10 max-h-[90vh] overflow-y-auto glow-card-wrapper shadow-2xl"
        >
          <div className="glow-card-inner p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'
                )}>
                  {type === 'buy' ? (
                    <TrendingUp className="text-green-400" size={24} />
                  ) : (
                    <TrendingDown className="text-red-400" size={24} />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {type === 'buy' ? 'Buy' : 'Sell'} {token.symbol}
                  </h3>
                  <p className="text-sm text-gray-400">Review transaction details</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                disabled={loading}
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Transaction Summary */}
            <div className="mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">You {type === 'buy' ? 'pay' : 'receive'}</span>
                  <span className="text-lg font-semibold text-white">
                    {amount} {type === 'buy' ? 'BNB' : token.symbol}
                  </span>
                </div>
                <div className="border-t border-white/5" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">You {type === 'buy' ? 'receive' : 'get'}</span>
                  <span className="text-lg font-semibold text-white">
                    ~{expectedOutput.toLocaleString(undefined, { maximumFractionDigits: 6 })} {type === 'buy' ? token.symbol : 'BNB'}
                  </span>
                </div>
              </div>
            </div>

            {/* Price Impact Warning */}
            {isHighImpact && (
              <Alert
                variant={isVeryHighImpact ? 'danger' : 'warning'}
                className="mb-4"
              >
                <AlertTriangle size={16} />
                <div className="ml-2">
                  <p className="font-medium">
                    {isVeryHighImpact ? 'Very High' : 'High'} Price Impact
                  </p>
                  <p className="text-sm">
                    This trade will result in a {formatPercentage(Math.abs(priceImpact))} price{' '}
                    {priceImpact > 0 ? 'increase' : 'decrease'}
                  </p>
                </div>
              </Alert>
            )}

            {/* Transaction Details */}
            <div className="mb-6 space-y-3">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center">
                <Info size={16} className="mr-2" />
                Transaction Details
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Price per token</span>
                  <span className="text-white">
                    {formatCurrency(token.price, 'BNB', 8)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Price impact</span>
                  <span className={cn(
                    'font-medium',
                    Math.abs(priceImpact) > 3 ? 'text-red-400' : 'text-gray-300'
                  )}>
                    {formatPercentage(priceImpact)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Platform fee</span>
                  <span className="text-white">
                    {formatCurrency(fees, 'BNB', 6)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Slippage tolerance</span>
                  <span className="text-white">
                    {slippage}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Minimum {type === 'buy' ? 'received' : 'paid'}</span>
                  <span className="text-white">
                    {minimumReceived.toLocaleString(undefined, { maximumFractionDigits: 6 })} {type === 'buy' ? token.symbol : 'BNB'}
                  </span>
                </div>

                {typeof gasFee === 'number' && gasFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center">
                      <Zap size={14} className="mr-1" />
                      Estimated gas fee
                    </span>
                    <span className="text-white">
                      {formatCurrency(gasFee, 'BNB', 6)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={onClose}
                fullWidth
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant={type === 'buy' ? 'success' : 'danger'}
                onClick={handleConfirm}
                fullWidth
                loading={loading}
                disabled={loading || isVeryHighImpact}
                className={cn(
                  type === 'buy' ? 'btn-glow-green' : 'btn-glow-red'
                )}
              >
                {loading ? 'Processing...' : `Confirm ${type === 'buy' ? 'Buy' : 'Sell'}`}
              </Button>
            </div>

            {/* Warning for very high impact */}
            {isVeryHighImpact && (
              <p className="text-xs text-red-400 mt-3 text-center">
                Transaction disabled due to very high price impact. Consider reducing the trade size.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

