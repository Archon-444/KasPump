// Web3 Provider for Multichain Support
'use client';

import React, { ReactNode, useEffect, useState } from 'react';
// DO NOT import WagmiProvider at top level - it causes SSR evaluation issues
// We'll import it dynamically when needed
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Lazy load wagmi config to prevent SSR issues
// This prevents the config from being evaluated during SSR
let wagmiConfig: any = null;
const getWagmiConfig = async (): Promise<any> => {
  if (typeof window === 'undefined') return null;
  if (!wagmiConfig) {
    try {
      // Dynamically import and use getConfigAsync to ensure config is fully loaded
      const wagmiModule = await import('../config/wagmi');
      // Call getConfigAsync() which will create the config only when needed
      wagmiConfig = await wagmiModule.getConfigAsync();
    } catch (error) {
      console.error('Failed to load wagmi config:', error);
      return null;
    }
  }
  return wagmiConfig;
};

// Create query client with memoization to prevent recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [WagmiProvider, setWagmiProvider] = useState<React.ComponentType<any> | null>(null);
  const [config, setConfig] = useState<any>(null);

  // Load both WagmiProvider and config on mount
  useEffect(() => {
    let cancelled = false;

    const loadWagmiSetup = async () => {
      try {
        // Load both the provider and config in parallel
        const [wagmiModule, loadedConfig] = await Promise.all([
          import('wagmi'),
          getWagmiConfig()
        ]);

        if (cancelled) return;

        // Validate config
        if (!loadedConfig || typeof loadedConfig !== 'object' || !('chains' in loadedConfig)) {
          console.error('Invalid wagmi config');
          setMounted(true);
          return;
        }

        setWagmiProvider(() => wagmiModule.WagmiProvider);
        setConfig(loadedConfig);
        setMounted(true);
      } catch (error) {
        console.error('Failed to load wagmi setup:', error);
        if (!cancelled) {
          setMounted(true);
        }
      }
    };

    loadWagmiSetup();

    return () => {
      cancelled = true;
    };
  }, []);

  // IMPORTANT: Don't render children until WagmiProvider is ready
  // This prevents "WagmiProviderNotFoundError" when pages try to use wagmi hooks
  if (!mounted || !WagmiProvider || !config) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-orange-900/20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      </QueryClientProvider>
    );
  }

  // Render with full Web3 support
  try {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    );
  } catch (error) {
    console.error('Error initializing WagmiProvider:', error);
    // Fallback: show error message
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-orange-900/20 flex items-center justify-center">
          <div className="text-center text-red-400">
            <p>Failed to initialize Web3</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-yellow-500 text-black rounded">
              Reload
            </button>
          </div>
        </div>
      </QueryClientProvider>
    );
  }
}
