/**
 * Error Boundary Component
 * Catches React errors and displays user-friendly error UI
 */

'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRetrying: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Send error to Sentry with component stack
    Sentry.withScope((scope) => {
      scope.setContext('react', {
        componentStack: errorInfo.componentStack,
      });
      scope.setLevel('error');
      Sentry.captureException(error);
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: true,
    });

    // Small delay to show retry animation
    setTimeout(() => {
      this.setState({ isRetrying: false });
    }, 500);
  };

  handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-[400px] flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full glassmorphism rounded-2xl p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="mb-4"
              >
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                {this.state.error.message || 'An unexpected error occurred'}
              </p>

              {this.props.showDetails && this.state.errorInfo && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-gray-500 cursor-pointer mb-2">
                    Error Details
                  </summary>
                  <pre className="text-xs text-gray-600 bg-gray-900/50 p-3 rounded overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Button
                  onClick={this.handleReset}
                  variant="primary"
                  disabled={this.state.isRetrying}
                  className="flex items-center justify-center gap-2"
                >
                  <RefreshCw
                    size={16}
                    className={this.state.isRetrying ? 'animate-spin' : ''}
                  />
                  {this.state.isRetrying ? 'Retrying...' : 'Try Again'}
                </Button>
                <Button
                  onClick={this.handleDismiss}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Dismiss
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      );
    }

    return this.props.children;
  }
}

