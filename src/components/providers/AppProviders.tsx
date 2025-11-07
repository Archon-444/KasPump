/**
 * App Providers Wrapper
 * Client component that wraps all providers for use in server components
 */

'use client';

import React, { useEffect, useState } from 'react';
import { ServiceWorkerRegistration } from '../features/ServiceWorkerRegistration';
import { PerformanceMonitor } from '../features/PerformanceMonitor';
import { ErrorBoundary } from '../features/ErrorBoundary';
import { ToastProvider } from '../../contexts/ToastContext';
import { AriaLiveProvider } from '../features/ARIALiveRegion';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [Web3Provider, setWeb3Provider] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null);

  // Dynamically load Web3Provider only on client side
  useEffect(() => {
    setIsMounted(true);

    // Dynamically import Web3Provider to prevent webpack from evaluating it during SSR
    import('../../providers/Web3Provider')
      .then((module) => {
        setWeb3Provider(() => module.Web3Provider);
      })
      .catch((error) => {
        console.error('Failed to load Web3Provider:', error);
      });
  }, []);

  // Don't render children during SSR - prevents wagmi hook errors
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-orange-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  // Wrap providers in ErrorBoundary for better isolation
  return (
    <>
      <ServiceWorkerRegistration />
      <ErrorBoundary
        fallback={
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-orange-900/20">
            {children}
          </div>
        }
      >
        <ToastProvider>
          <AriaLiveProvider>
            {Web3Provider ? (
              <Web3Provider>
                <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-orange-900/20">
                  {children}
                  <PerformanceMonitor />
                </div>
              </Web3Provider>
            ) : (
              <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-orange-900/20">
                {children}
                <PerformanceMonitor />
              </div>
            )}
          </AriaLiveProvider>
        </ToastProvider>
      </ErrorBoundary>
    </>
  );
};

