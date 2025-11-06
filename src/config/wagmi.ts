// Wagmi Configuration for Multichain Wallet Support
'use client';

import { http, createConfig } from 'wagmi';
import { bsc, bscTestnet, arbitrum, arbitrumSepolia, base, baseSepolia } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet, metaMask } from 'wagmi/connectors';

// Get WalletConnect Project ID from env
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Check if project ID is valid (not a placeholder)
const hasValidProjectId = projectId && projectId !== 'your_walletconnect_project_id_here' && projectId.length > 0;

if (!hasValidProjectId) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set or is a placeholder. WalletConnect will not work.');
  console.warn('Get a free project ID from: https://cloud.walletconnect.com');
}

// Define supported chains
const chains = [
  bsc,
  arbitrum,
  base,
  bscTestnet,
  arbitrumSepolia,
  baseSepolia,
] as const;

// Build connectors array (only include WalletConnect if project ID is valid)
const connectors = [
  // MetaMask (highest priority for EVM)
  metaMask({
    dappMetadata: {
      name: 'KasPump',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
  }),
  // WalletConnect (only if project ID is valid)
  ...(hasValidProjectId ? [walletConnect({
    projectId,
    metadata: {
      name: 'KasPump',
      description: 'Multichain Token Launchpad',
      url: typeof window !== 'undefined' ? window.location.origin : '',
      icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : ''],
    },
    showQrModal: true,
  })] : []),
  // Coinbase Wallet
  coinbaseWallet({
    appName: 'KasPump',
    appLogoUrl: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : undefined,
  }),
  // Generic injected wallet (Trust Wallet, Rabby, OKX, Binance, etc.)
  injected({ 
    shimDisconnect: true,
  }),
];

// Default RPC URLs (fallback if env vars not set)
const defaultRpcUrls = {
  [bsc.id]: 'https://bsc-dataseed1.binance.org',
  [bscTestnet.id]: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  [arbitrum.id]: 'https://arb1.arbitrum.io/rpc',
  [arbitrumSepolia.id]: 'https://sepolia-rollup.arbitrum.io/rpc',
  [base.id]: 'https://mainnet.base.org',
  [baseSepolia.id]: 'https://sepolia.base.org',
};

// Create wagmi config with prioritized connectors for EVM wallets
export const config = createConfig({
  chains,
  connectors,
  transports: {
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL || defaultRpcUrls[bsc.id]),
    [bscTestnet.id]: http(process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || defaultRpcUrls[bscTestnet.id]),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || defaultRpcUrls[arbitrum.id]),
    [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || defaultRpcUrls[arbitrumSepolia.id]),
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || defaultRpcUrls[base.id]),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || defaultRpcUrls[baseSepolia.id]),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
