/**
 * Hook for managing PWA installation prompts and install status
 * Implements smart install prompts (show after 2+ page views)
 */

'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  canPrompt: boolean;
  showPrompt: boolean;
  install: () => Promise<void>;
  dismissPrompt: () => void;
}

// Schema for page view count validation
const PageViewCountSchema = z.number().int().nonnegative().max(1000000);

export const usePWAInstall = (): PWAInstallState => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pageViewCount, setPageViewCount] = useState(0);

  // Check if app is installed or in standalone mode
  useEffect(() => {
    // Check if running as standalone (installed PWA)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);
    setIsInstalled(isStandaloneMode);

    // Load and validate page view count from localStorage
    const storedCount = localStorage.getItem('kaspump_page_views');
    let count = 0;

    if (storedCount) {
      try {
        const parsedCount = parseInt(storedCount, 10);
        const validationResult = PageViewCountSchema.safeParse(parsedCount);

        if (validationResult.success) {
          count = validationResult.data;
        } else {
          console.warn('Invalid page view count, resetting:', validationResult.error);
          localStorage.removeItem('kaspump_page_views');
        }
      } catch (e) {
        console.error('Failed to parse page view count:', e);
        localStorage.removeItem('kaspump_page_views');
      }
    }

    setPageViewCount(count);

    // Increment page view count
    const newCount = count + 1;
    localStorage.setItem('kaspump_page_views', newCount.toString());
    setPageViewCount(newCount);

    // Show prompt after 2+ page views
    if (newCount >= 2 && !isStandaloneMode && deferredPrompt) {
      setShowPrompt(true);
    }
  }, [deferredPrompt]);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt if user has visited 2+ times
      if (pageViewCount >= 2) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app was recently installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('kaspump_page_views');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [pageViewCount]);

  const install = async (): Promise<void> => {
    if (!deferredPrompt) {
      console.warn('PWA install prompt not available');
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user response
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.removeItem('kaspump_page_views');
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  const dismissPrompt = (): void => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  // Check if prompt was dismissed this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    if (dismissed === 'true' && showPrompt) {
      setShowPrompt(false);
    }
  }, [showPrompt]);

  return {
    isInstallable: deferredPrompt !== null,
    isInstalled,
    isStandalone,
    canPrompt: deferredPrompt !== null && !isInstalled && !isStandalone,
    showPrompt: showPrompt && !isInstalled && !isStandalone,
    install,
    dismissPrompt,
  };
};

