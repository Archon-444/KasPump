/**
 * Service Worker Registration Component
 * Registers the PWA service worker on mount
 */

'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegistration: React.FC = () => {
  useEffect(() => {
    // Only register service worker on client side
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Register service worker immediately (don't wait for window load)
    // This prevents the preload warning and ensures faster registration
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[PWA] Service Worker registered:', registration.scope);

        // Check for updates periodically (only in production)
        if (process.env.NODE_ENV === 'production') {
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour
        }

        // Listen for service worker updates
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[PWA] New service worker activated');
          // Optionally reload the page to use the new service worker
          // window.location.reload();
        });
      } catch (error) {
        // Silently fail in development to avoid console noise
        if (process.env.NODE_ENV === 'production') {
          console.error('[PWA] Service Worker registration failed:', error);
        }
      }
    };

    // Register immediately if DOM is ready, otherwise wait for load
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      registerServiceWorker();
      return undefined;
    } else {
      window.addEventListener('load', registerServiceWorker);
      return () => window.removeEventListener('load', registerServiceWorker);
    }
  }, []);

  return null; // This component doesn't render anything
};

