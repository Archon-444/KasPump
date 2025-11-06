/**
 * Service Worker Registration Component
 * Registers the PWA service worker on mount
 */

'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegistration: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registered:', registration.scope);

            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000); // Check every hour
          })
          .catch((error) => {
            console.error('[PWA] Service Worker registration failed:', error);
          });

        // Listen for service worker updates
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[PWA] New service worker activated');
          // Optionally reload the page to use the new service worker
          // window.location.reload();
        });
      });
    }
  }, []);

  return null; // This component doesn't render anything
};

