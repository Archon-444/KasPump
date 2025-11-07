/**
 * App Providers Wrapper
 * Client component that wraps all providers for use in server components
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Web3Provider } from '../../providers/Web3Provider';
import { ServiceWorkerRegistration } from '../features/ServiceWorkerRegistration';
import { PerformanceMonitor } from '../features/PerformanceMonitor';
import { ErrorBoundary } from '../features/ErrorBoundary';
import { ToastProvider } from '../../contexts/ToastContext';
import { AriaLiveProvider } from '../features/ARIALiveRegion';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);

  // Ensure we're on the client before rendering providers
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Render a minimal fallback during SSR or if not mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-orange-900/20">
        {children}
      </div>
    );
  }

  try {
    return (
      <>
        <ServiceWorkerRegistration />
        <ErrorBoundary>
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
  } catch (error) {
    console.error('Error initializing AppProviders:', error);
    // Fallback: render children without providers
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-orange-900/20">
        {children}
      </div>
    );
  }
};

