// Wagmi Configuration for Multichain Wallet Support
'use client';

// DO NOT import wagmi modules at top level - they cause SSR evaluation issues
// All imports are done inside functions that only run on the client

// Get WalletConnect Project ID from env
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Check if project ID is valid (not a placeholder)
const hasValidProjectId = projectId && projectId !== 'your_walletconnect_project_id_here' && projectId.length > 0;

// Helper to get chains - only imports when called
// ONLY BSC for now
async function getChains() {
  const { bsc, bscTestnet } = await import('wagmi/chains');
  return [bsc, bscTestnet] as const;
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
    // Dynamically import only the connectors we need for BSC
    const { injected, metaMask } = await import('wagmi/connectors');

    const origin = getOrigin();
    const logoUrl = getLogoUrl();

    const connectorList = [
      // MetaMask (highest priority for BSC)
      metaMask({
        dappMetadata: {
          name: 'KasPump',
          url: origin,
        },
      }),
      // Generic injected wallet (Trust Wallet, Binance Wallet, etc.)
      injected({
        shimDisconnect: true,
      }),
    ];

    return connectorList.filter(Boolean); // Remove any null/undefined connectors
  } catch (error) {
    console.error('Error initializing wagmi connectors:', error);
    // Fallback to minimal connector set
    try {
      const { metaMask, injected } = await import('wagmi/connectors');
      return [
        metaMask({
          dappMetadata: {
            name: 'KasPump',
            url: getOrigin(),
          },
        }),
        injected({ 
          shimDisconnect: true,
        }),
      ].filter(Boolean);
    } catch {
      // Last resort: return empty array
      return [];
    }
  }
}

// Default RPC URLs (fallback if env vars not set)
// ONLY BSC for now
function getDefaultRpcUrls() {
  return {
    56: 'https://bsc-dataseed1.binance.org', // BSC Mainnet
    97: 'https://data-seed-prebsc-1-s1.binance.org:8545', // BSC Testnet
  };
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
    const { http, createConfig } = await import('wagmi');
    const chains = await getChains();
    const connectors = await createConnectors();
    const defaultRpcUrls = getDefaultRpcUrls();
    
    // Ensure we have at least one valid connector
    if (!connectors || connectors.length === 0) {
      throw new Error('No valid connectors available');
    }

    const config = createConfig({
      chains,
      connectors,
      transports: {
        [chains[0].id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL || defaultRpcUrls[56]),
        [chains[1].id]: http(process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || defaultRpcUrls[97]),
      },
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
          chains: [chains[0]], // BSC Mainnet only
          connectors: fallbackConnectors,
          transports: {
            [chains[0].id]: http(defaultRpcUrls[56]),
          },
        });
      } else {
        // Last resort: empty connectors
        return createConfig({
          chains: [chains[0]], // BSC Mainnet only
          connectors: [],
          transports: {
            [chains[0].id]: http(defaultRpcUrls[56]),
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
          chains: [chains[0]], // BSC Mainnet only
          connectors: [],
          transports: {
            [chains[0].id]: http(defaultRpcUrls[56]),
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
