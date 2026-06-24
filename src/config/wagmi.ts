// Wagmi Configuration for Multichain Wallet Support
'use client';

// DO NOT import wagmi modules at top level - they cause SSR evaluation issues
// All imports are done inside functions that only run on the client

import { brand } from './brand';

// Get WalletConnect Project ID from env
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Check if project ID is valid (not a placeholder)
const hasValidProjectId = projectId && projectId !== 'your_walletconnect_project_id_here' && projectId.length > 0;

// Helper to get chains - only imports when called.
// Phase 1 rollout (V2): Base only. BSC + Arbitrum re-enabled in Phase 2/3
// after >=2 weeks of clean Base mainnet activity. Re-enable by uncommenting
// the relevant entries in the returned array.
async function getChains() {
  const { /* bsc, bscTestnet, arbitrum, arbitrumSepolia, */ base, baseSepolia } = await import('wagmi/chains');
  return [
    base,
    baseSepolia,
    // Phase 2 — BSC: bsc, bscTestnet,
    // Phase 3 — Arbitrum: arbitrum, arbitrumSepolia,
  ] as const;
}

// Helper to safely get origin (only on client)
const getOrigin = () => {
  if (typeof window === 'undefined') return '';
  try {
    return window.location.origin;
  } catch {
    return '';
  }
};

// Helper to safely get logo URL
const getLogoUrl = () => {
  const origin = getOrigin();
  return origin ? `${origin}/logo.png` : '';
};

// Build connectors array - wrapped in async function to prevent SSR evaluation
// This function only runs when explicitly called, not during module load
async function createConnectors(): Promise<any[]> {
  // Only create connectors on client side
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    // `injected` is exported from the main `wagmi` package (via @wagmi/core) and
    // carries zero SDK dependencies. It wraps window.ethereum and supports every
    // injected wallet: MetaMask, Coinbase Extension, Brave Wallet, etc.
    //
    // DO NOT import from 'wagmi/connectors' here. That barrel re-exports
    // @wagmi/connectors which loads @metamask/sdk, @coinbase/wallet-sdk, and
    // @walletconnect/universal-provider. At least one of those SDKs executes
    // synchronous blocking code during module evaluation (no-ops that poll or
    // wait on missing browser APIs in restricted CI environments), which freezes
    // the JavaScript event loop and prevents the app from ever rendering.
    const { injected } = await import('wagmi');
    return [injected({ shimDisconnect: true })];
  } catch (error) {
    console.error('Error creating injected connector:', error);
    return [];
  }
}

// Primary RPC URLs (overrideable via env vars)
function getDefaultRpcUrls() {
  return {
    56: 'https://bsc-dataseed1.binance.org',
    97: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    42161: 'https://arb1.arbitrum.io/rpc',
    421614: 'https://sepolia-rollup.arbitrum.io/rpc',
    8453: 'https://mainnet.base.org',
    84532: 'https://sepolia.base.org',
  } as Record<number, string>;
}

// Secondary RPC URLs for failover (used when primary is unavailable)
function getFallbackRpcUrls() {
  return {
    56: 'https://bsc-dataseed2.binance.org',
    97: 'https://data-seed-prebsc-2-s1.binance.org:8545',
    42161: 'https://arb1.arbitrum.io/rpc', // no distinct public secondary for Arbitrum
    421614: 'https://sepolia-rollup.arbitrum.io/rpc',
    8453: 'https://base.llamarpc.com',
    84532: 'https://sepolia.base.org',
  } as Record<number, string>;
}

// Function to validate config
const isValidConfig = (cfg: any): boolean => {
  return cfg !== null && cfg !== undefined && typeof cfg === 'object' && 'chains' in cfg;
};

// Create wagmi config - wrapped in async function to prevent SSR evaluation
// This function only runs when explicitly called, not during module load
async function createWagmiConfig(): Promise<any> {
  // Only create config on client side
  if (typeof window === 'undefined') {
    // Return null for SSR - Web3Provider will handle this
    return null;
  }

  try {
    // Dynamically import wagmi modules only when needed
    const { http, fallback, createConfig } = await import('wagmi');
    const chains = await getChains();
    const connectors = await createConnectors();
    const defaultRpcUrls = getDefaultRpcUrls();
    const fallbackRpcUrls = getFallbackRpcUrls();

    // Env var lookup keyed by chain id. BSC + Arbitrum entries stay so re-enabling
    // those chains in `getChains` Just Works.
    const envUrlByChainId: Record<number, string | undefined> = {
      56: process.env.NEXT_PUBLIC_BSC_RPC_URL,
      97: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL,
      42161: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL,
      421614: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL,
      8453: process.env.NEXT_PUBLIC_BASE_RPC_URL,
      84532: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
    };

    const transports = chains.reduce<Record<number, ReturnType<typeof fallback>>>((acc, chain) => {
      const primaryUrl = envUrlByChainId[chain.id] ?? defaultRpcUrls[chain.id];
      const secondaryUrl = fallbackRpcUrls[chain.id];
      if (primaryUrl && secondaryUrl && primaryUrl !== secondaryUrl) {
        acc[chain.id] = fallback([http(primaryUrl), http(secondaryUrl)]);
      } else if (primaryUrl) {
        acc[chain.id] = fallback([http(primaryUrl)]);
      }
      return acc;
    }, {});

    // Ensure we have at least one valid connector
    if (!connectors || connectors.length === 0) {
      throw new Error('No valid connectors available');
    }

    const config = createConfig({
      chains,
      connectors,
      transports,
    });

    // Validate the created config
    if (!isValidConfig(config)) {
      throw new Error('Created config is invalid');
    }

    return config;
  } catch (error) {
    console.error('Error creating wagmi config:', error);
    // Create a minimal fallback config
    try {
      const { http, createConfig } = await import('wagmi');
      const chains = await getChains();
      const fallbackConnectors = await createConnectors();
      const defaultRpcUrls = getDefaultRpcUrls();

      if (fallbackConnectors.length > 0) {
        return createConfig({
          chains: [chains[0]], // Default to first supported chain (Base in Phase 1)
          connectors: fallbackConnectors,
          transports: {
            [chains[0].id]: http(defaultRpcUrls[chains[0].id]),
          },
        });
      } else {
        // Last resort: empty connectors
        return createConfig({
          chains: [chains[0]],
          connectors: [],
          transports: {
            [chains[0].id]: http(defaultRpcUrls[chains[0].id]),
          },
        });
      }
    } catch (fallbackError) {
      console.error('Error creating fallback wagmi config:', fallbackError);
      // Absolute last resort: try to create minimal config
      try {
        const { http, createConfig } = await import('wagmi');
        const chains = await getChains();
        const defaultRpcUrls = getDefaultRpcUrls();
        return createConfig({
          chains: [chains[0]], // Phase 1 default: Base
          connectors: [],
          transports: {
            [chains[0].id]: http(defaultRpcUrls[chains[0].id]),
          },
        });
      } catch {
        return null;
      }
    }
  }
}

// Lazy initialization - config is only created when accessed
// This prevents webpack from evaluating it during SSR
let _configCache: any = null;
let _configPromise: Promise<any> | null = null;

// Getter function that creates config on first access (client-side only)
// Now async since we're using dynamic imports
async function getConfigAsync(): Promise<any> {
  if (_configCache) {
    return _configCache;
  }
  if (_configPromise) {
    return _configPromise;
  }
  _configPromise = createWagmiConfig().then(config => {
    _configCache = config;
    return config;
  });
  return _configPromise;
}

// Synchronous getter for backward compatibility
// This will return null if config isn't ready yet
function getConfig(): any {
  return _configCache;
}

// Export config getters for explicit access
// getConfigAsync() is the preferred method - it ensures config is loaded
// getConfig() returns cached config or null if not ready
export { getConfig, getConfigAsync };

// DO NOT export config directly - it causes SSR evaluation issues
// Use getConfig() instead when you need the config
// For backward compatibility, we'll create a lazy getter
// But this should only be used in client components that check for window

// Type-only export for TypeScript module declaration
type WagmiConfig = ReturnType<typeof getConfig>;

declare module 'wagmi' {
  interface Register {
    config: WagmiConfig;
  }
}
