/**
 * Hook for managing Service Worker cache
 * Provides utilities for caching token lists and managing offline data
 */

'use client';

import { useEffect, useCallback } from 'react';

export interface CacheTokenListOptions {
  tokens: any[];
  timestamp?: number;
}

export const useServiceWorkerCache = () => {
  useEffect(() => {
    // Ensure service worker is ready
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[Cache] Service Worker ready for cache management');
      });
    }
  }, []);

  /**
   * Cache token list for offline access
   */
  const cacheTokenList = useCallback((options: CacheTokenListOptions) => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const { tokens, timestamp = Date.now() } = options;

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage({
          type: 'CACHE_TOKEN_LIST',
          tokens,
          timestamp,
        });
        console.log('[Cache] Token list cached for offline access');
      }
    });
  }, []);

  /**
   * Clear API cache
   */
  const clearCache = useCallback(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          const channel = new MessageChannel();
          
          channel.port1.onmessage = (event) => {
            if (event.data.success) {
              console.log('[Cache] API cache cleared');
              resolve();
            }
          };

          registration.active?.postMessage(
            { type: 'CLEAR_CACHE' },
            [channel.port2]
          );
        } else {
          resolve();
        }
      });
    });
  }, []);

  /**
   * Trigger cache cleanup (remove old entries)
   */
  const cleanupCache = useCallback(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage({
          type: 'CLEANUP_CACHE',
        });
        console.log('[Cache] Cache cleanup triggered');
      }
    });
  }, []);

  /**
   * Skip waiting for service worker update
   */
  const skipWaiting = useCallback(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        console.log('[Cache] Service Worker update skipped');
      }
    });
  }, []);

  return {
    cacheTokenList,
    clearCache,
    cleanupCache,
    skipWaiting,
  };
};

