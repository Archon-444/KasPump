/**
 * App Providers Wrapper
 * Client component that wraps all providers for use in server components
 */

'use client';

import React from 'react';
import { Web3Provider } from '../../providers/Web3Provider';
import { ServiceWorkerRegistration } from '../features/ServiceWorkerRegistration';
import { PerformanceMonitor } from '../features/PerformanceMonitor';
import { ErrorBoundary } from '../features/ErrorBoundary';
import { ToastProvider } from '../../contexts/ToastContext';
import { AriaLiveProvider } from '../features/ARIALiveRegion';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <ServiceWorkerRegistration />
      <ErrorBoundary>
        <ToastProvider>
          <AriaLiveProvider>
            <Web3Provider>
              <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
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

