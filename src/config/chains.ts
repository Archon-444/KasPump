// Multichain Configuration for KasPump
// Supports: BNB Smart Chain, Arbitrum, Base

import { Chain } from 'viem';
import { bsc, bscTestnet, arbitrum, arbitrumSepolia, base, baseSepolia } from 'viem/chains';

export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: { http: string[] };
    public: { http: string[] };
  };
  blockExplorers: {
    default: { name: string; url: string };
  };
  testnet?: boolean;
  iconUrl?: string;
}

// Supported Mainnets
export const supportedMainnets = {
  bsc,
  arbitrum,
  base,
} as const;

// Supported Testnets
export const supportedTestnets = {
  bscTestnet,
  arbitrumSepolia,
  baseSepolia,
} as const;

// All supported chains
export const supportedChains: Chain[] = [
  bsc,
  arbitrum,
  base,
  bscTestnet,
  arbitrumSepolia,
  baseSepolia,
];

// Chain metadata with additional info
export const chainMetadata = {
  [bsc.id]: {
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    logo: '/chains/bsc.svg',
    features: ['Low Fees', 'Fast Blocks', 'Large Ecosystem'],
    estimatedFees: '$0.10 - $0.50',
    blockTime: '3s',
    color: '#F0B90B',
  },
  [arbitrum.id]: {
    name: 'Arbitrum One',
    shortName: 'ARB',
    logo: '/chains/arbitrum.svg',
    features: ['L2 Scaling', 'Low Fees', 'Ethereum Security'],
    estimatedFees: '$0.05 - $0.30',
    blockTime: '0.25s',
    color: '#28A0F0',
  },
  [base.id]: {
    name: 'Base',
    shortName: 'BASE',
    logo: '/chains/base.svg',
    features: ['Coinbase L2', 'Growing Ecosystem', 'Low Fees'],
    estimatedFees: '$0.03 - $0.20',
    blockTime: '2s',
    color: '#0052FF',
  },
  [bscTestnet.id]: {
    name: 'BSC Testnet',
    shortName: 'BSC Test',
    logo: '/chains/bsc.svg',
    features: ['Testing', 'Free Tokens'],
    estimatedFees: 'Free',
    blockTime: '3s',
    color: '#F0B90B',
  },
  [arbitrumSepolia.id]: {
    name: 'Arbitrum Sepolia',
    shortName: 'ARB Sep',
    logo: '/chains/arbitrum.svg',
    features: ['Testing', 'L2 Testnet'],
    estimatedFees: 'Free',
    blockTime: '0.25s',
    color: '#28A0F0',
  },
  [baseSepolia.id]: {
    name: 'Base Sepolia',
    shortName: 'Base Sep',
    logo: '/chains/base.svg',
    features: ['Testing', 'Coinbase'],
    estimatedFees: 'Free',
    blockTime: '2s',
    color: '#0052FF',
  },
};

// Get chain by ID
export function getChainById(chainId: number): Chain | undefined {
  return supportedChains.find((chain) => chain.id === chainId);
}

// Get chain metadata
export function getChainMetadata(chainId: number) {
  return chainMetadata[chainId as keyof typeof chainMetadata];
}

// Check if chain is testnet
export function isTestnet(chainId: number): boolean {
  const testnetIds: number[] = [bscTestnet.id, arbitrumSepolia.id, baseSepolia.id];
  return testnetIds.includes(chainId);
}

// Get explorer URL for address/tx
export function getExplorerUrl(chainId: number, type: 'address' | 'tx', hash: string): string {
  const chain = getChainById(chainId);
  if (!chain?.blockExplorers?.default) return '';

  const baseUrl = chain.blockExplorers.default.url;
  return `${baseUrl}/${type}/${hash}`;
}

// Default chain based on environment
export function getDefaultChain(): Chain {
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultChainId = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID;

  if (defaultChainId) {
    const chain = getChainById(parseInt(defaultChainId));
    if (chain) return chain;
  }

  return isProduction ? bsc : bscTestnet;
}

// Format native currency
export function formatNativeCurrency(chainId: number, amount: string | number): string {
  const chain = getChainById(chainId);
  if (!chain) return '';

  return `${amount} ${chain.nativeCurrency.symbol}`;
}
