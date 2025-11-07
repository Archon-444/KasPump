/**
 * Error Toast Component
 * Displays user-friendly error notifications
 */

'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../utils';

export interface ErrorToastProps {
  error: Error | string;
  onDismiss?: () => void;
  onRetry?: () => void;
  showDetails?: boolean;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  onDismiss,
  onRetry,
  showDetails = false,
  duration = 5000,
  action,
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorObject = typeof error === 'object' ? error : null;

  useEffect(() => {
    if (duration > 0 && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const getErrorType = () => {
    if (!errorObject) return 'general';
    
    const message = errorMessage.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) return 'network';
    if (message.includes('gas') || message.includes('transaction')) return 'transaction';
    if (message.includes('wallet') || message.includes('connect')) return 'wallet';
    if (message.includes('permission') || message.includes('denied')) return 'permission';
    return 'general';
  };

  const errorType = getErrorType();

  const getErrorIcon = () => {
    switch (errorType) {
      case 'network':
        return '📡';
      case 'transaction':
        return '⛽';
      case 'wallet':
        return '🔗';
      case 'permission':
        return '🔒';
      default:
        return '⚠️';
    }
  };

  const getErrorColor = () => {
    switch (errorType) {
      case 'network':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'transaction':
        return 'border-red-500/30 bg-red-500/10';
      case 'wallet':
        return 'border-blue-500/30 bg-blue-500/10';
      case 'permission':
        return 'border-orange-500/30 bg-orange-500/10';
      default:
        return 'border-red-500/30 bg-red-500/10';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={cn(
          'fixed top-4 right-4 z-50 max-w-md w-full',
          'glassmorphism rounded-xl p-4',
          'border-2',
          getErrorColor(),
          'shadow-2xl'
        )}
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 text-2xl">{getErrorIcon()}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">
                {errorType === 'network' && 'Network Error'}
                {errorType === 'transaction' && 'Transaction Failed'}
                {errorType === 'wallet' && 'Wallet Error'}
                {errorType === 'permission' && 'Permission Denied'}
                {errorType === 'general' && 'Error'}
              </h3>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <p className="text-sm text-gray-300 mb-3">{errorMessage}</p>

            {/* Error Details */}
            {showDetails && errorObject && errorObject.stack && (
              <details className="mb-3">
                <summary className="text-xs text-gray-500 cursor-pointer mb-2">
                  Technical Details
                </summary>
                <pre className="text-xs text-gray-600 bg-gray-900/50 p-2 rounded overflow-auto max-h-32">
                  {errorObject.stack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                >
                  <RefreshCw size={12} className="mr-1" />
                  Retry
                </Button>
              )}
              {action && (
                <Button
                  onClick={action.onClick}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                </Button>
              )}
              {errorType === 'transaction' && errorObject && (errorObject as any).txHash && (
                <Button
                  onClick={() => {
                    const txHash = (errorObject as any).txHash;
                    const explorerUrl = `https://bscscan.com/tx/${txHash}`;
                    window.open(explorerUrl, '_blank');
                  }}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                >
                  <ExternalLink size={12} className="mr-1" />
                  View on Explorer
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

