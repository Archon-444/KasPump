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
import { Web3Provider } from '../../providers/Web3Provider';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Guard against SSR — Web3Provider's own useEffect handles wagmi loading
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-orange-900/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

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
            <Web3Provider>
              <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-orange-900/20">
                {children}
                <PerformanceMonitor />
              </div>
            </Web3Provider>
          </AriaLiveProvider>
        </ToastProvider>
      </ErrorBoundary>
    </>
  );
};

