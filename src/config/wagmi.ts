// Wagmi Configuration for Multichain Wallet Support
'use client';

import { http, createConfig } from 'wagmi';
import { bsc, bscTestnet, arbitrum, arbitrumSepolia, base, baseSepolia } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet, metaMask } from 'wagmi/connectors';

// Get WalletConnect Project ID from env
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect will not work.');
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

// Create wagmi config with prioritized connectors for EVM wallets
export const config = createConfig({
  chains,
  connectors: [
    // MetaMask (highest priority for EVM)
    metaMask({
      dappMetadata: {
        name: 'KasPump',
        url: typeof window !== 'undefined' ? window.location.origin : '',
      },
    }),
    // WalletConnect (supports many wallets via QR)
    walletConnect({
      projectId,
      metadata: {
        name: 'KasPump',
        description: 'Multichain Token Launchpad',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : ''],
      },
      showQrModal: true,
    }),
    // Coinbase Wallet
    coinbaseWallet({
      appName: 'KasPump',
      appLogoUrl: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : undefined,
    }),
    // Generic injected wallet (Trust Wallet, Rabby, OKX, Binance, etc.)
    injected({ 
      shimDisconnect: true,
    }),
  ],
  transports: {
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL),
    [bscTestnet.id]: http(process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL),
    [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL),
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
