/**
 * Hook for mobile wallet detection and deep linking
 * Supports wallet app detection, deep linking, and QR code generation
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

export interface MobileWalletInfo {
  name: string;
  scheme: string; // Deep link scheme (e.g., 'metamask://', 'trust://')
  appStoreUrl: string;
  playStoreUrl: string;
  isInstalled: boolean;
  canDeepLink: boolean;
}

const MOBILE_WALLETS: Record<string, MobileWalletInfo> = {
  metamask: {
    name: 'MetaMask',
    scheme: 'metamask://wc?uri=',
    appStoreUrl: 'https://apps.apple.com/app/metamask/id1438144202',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=io.metamask',
    isInstalled: false,
    canDeepLink: false,
  },
  trust: {
    name: 'Trust Wallet',
    scheme: 'trust://wc?uri=',
    appStoreUrl: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    isInstalled: false,
    canDeepLink: false,
  },
  coinbase: {
    name: 'Coinbase Wallet',
    scheme: 'cbwallet://wc?uri=',
    appStoreUrl: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=org.toshi',
    isInstalled: false,
    canDeepLink: false,
  },
};

export const useMobileWallet = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [userAgent, setUserAgent] = useState('');
  const [detectedWallets, setDetectedWallets] = useState<Record<string, MobileWalletInfo>>({});

  // Detect mobile device
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const ua = navigator.userAgent;
    setUserAgent(ua);
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(ua));
  }, []);

  // Detect installed wallets (iOS only for now)
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    const checkWalletInstalled = async (wallet: MobileWalletInfo) => {
      // iOS detection using URL scheme checking
      if (/iPhone|iPad|iPod/i.test(userAgent)) {
        try {
          const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 100)
          );
          
          const checkScheme = new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = wallet.scheme;
            document.body.appendChild(iframe);
            
            setTimeout(() => {
              document.body.removeChild(iframe);
              resolve(true);
            }, 50);
          });

          await Promise.race([checkScheme, timeout]);
          return true;
        } catch {
          return false;
        }
      }
      
      // Android detection via intent
      if (/Android/i.test(userAgent)) {
        // Can't reliably detect on Android without native bridge
        return false;
      }
      
      return false;
    };

    const detectWallets = async () => {
      const updatedWallets: Record<string, MobileWalletInfo> = {};
      
      for (const [key, wallet] of Object.entries(MOBILE_WALLETS)) {
        const isInstalled = await checkWalletInstalled(wallet);
        updatedWallets[key] = {
          ...wallet,
          isInstalled,
          canDeepLink: isInstalled || false,
        };
      }
      
      setDetectedWallets(updatedWallets);
    };

    detectWallets();
  }, [isMobile, userAgent]);

  const openWalletDeepLink = useCallback((walletKey: string, wcUri?: string) => {
    const wallet = MOBILE_WALLETS[walletKey];
    if (!wallet) return false;

    if (wallet.canDeepLink && wcUri) {
      const deepLink = `${wallet.scheme}${encodeURIComponent(wcUri)}`;
      window.location.href = deepLink;
      return true;
    }

    // Fallback to app store
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const storeUrl = isIOS ? wallet.appStoreUrl : wallet.playStoreUrl;
    window.open(storeUrl, '_blank');
    return false;
  }, [userAgent]);

  const generateWalletConnectURI = useCallback(async (projectId: string): Promise<string | null> => {
    // This would normally come from WalletConnect SDK
    // For now, return a placeholder
    // In production, this would generate an actual WC URI
    return null;
  }, []);

  return {
    isMobile,
    detectedWallets,
    openWalletDeepLink,
    generateWalletConnectURI,
    userAgent,
  };
};

