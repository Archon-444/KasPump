'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  // Log error for debugging
  useEffect(() => {
    console.error('Error boundary caught:', error);
    // TODO: Send to error tracking service
  }, [error]);

  const getErrorType = () => {
    const message = error.message?.toLowerCase() || '';
    if (message.includes('network') || message.includes('fetch')) return 'network';
    if (message.includes('chunk') || message.includes('loading')) return 'loading';
    if (message.includes('wallet') || message.includes('connect')) return 'wallet';
    return 'general';
  };

  const errorType = getErrorType();

  const getErrorSuggestions = () => {
    switch (errorType) {
      case 'network':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Check if the service is available',
        ];
      case 'loading':
        return [
          'Clear your browser cache',
          'Try refreshing the page',
          'Check your internet connection',
        ];
      case 'wallet':
        return [
          'Make sure your wallet is connected',
          'Try reconnecting your wallet',
          'Check if your wallet extension is enabled',
        ];
      default:
        return [
          'Try refreshing the page',
          'Clear your browser cache',
          'Contact support if the problem persists',
        ];
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-yellow-900 to-orange-900 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glassmorphism rounded-2xl p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="mb-6"
        >
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong!</h1>
          <p className="text-gray-400 text-sm mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <p className="text-gray-500 text-xs font-mono mb-2">
              Error ID: {error.digest}
            </p>
          )}
        </motion.div>

        {/* Error Suggestions */}
        <div className="mb-6 text-left">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Try these solutions:</h3>
          <ul className="space-y-1 text-xs text-gray-400">
            {getErrorSuggestions().map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            variant="primary"
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Try Again
          </Button>
          <Button
            onClick={() => router.push('/')}
            variant="secondary"
            className="flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Go Home
          </Button>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="text-xs text-gray-500 cursor-pointer mb-2 flex items-center gap-2">
              <Bug size={14} />
              Debug Information
            </summary>
            <pre className="text-xs text-gray-600 bg-gray-900/50 p-3 rounded overflow-auto max-h-40">
              {error.stack}
            </pre>
          </details>
        )}
      </motion.div>
    </div>
  );
}

