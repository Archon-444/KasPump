// Contract Address Registry for Multichain Support
// This file stores deployed contract addresses for each supported chain

export interface ContractAddresses {
  TokenFactory?: string;
  FeeRecipient?: string;
  DexRouterRegistry?: string;
}

export const contractAddresses: Record<number, ContractAddresses> = {
  // BNB Smart Chain Mainnet (56)
  56: {
    TokenFactory: process.env.NEXT_PUBLIC_BSC_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_BSC_FEE_RECIPIENT || '',
    DexRouterRegistry: process.env.NEXT_PUBLIC_BSC_DEX_ROUTER_REGISTRY || '',
  },
  // BNB Smart Chain Testnet (97)
  97: {
    TokenFactory: process.env.NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT || '',
    DexRouterRegistry: process.env.NEXT_PUBLIC_BSC_TESTNET_DEX_ROUTER_REGISTRY || '',
  },
  // Arbitrum One (42161)
  42161: {
    TokenFactory: process.env.NEXT_PUBLIC_ARBITRUM_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_ARBITRUM_FEE_RECIPIENT || '',
    DexRouterRegistry: process.env.NEXT_PUBLIC_ARBITRUM_DEX_ROUTER_REGISTRY || '',
  },
  // Arbitrum Sepolia (421614)
  421614: {
    TokenFactory: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_FEE_RECIPIENT || '',
    DexRouterRegistry: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_DEX_ROUTER_REGISTRY || '',
  },
  // Base Mainnet (8453)
  8453: {
    TokenFactory: process.env.NEXT_PUBLIC_BASE_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_BASE_FEE_RECIPIENT || '',
    DexRouterRegistry: process.env.NEXT_PUBLIC_BASE_DEX_ROUTER_REGISTRY || '',
  },
  // Base Sepolia (84532)
  84532: {
    TokenFactory: process.env.NEXT_PUBLIC_BASE_SEPOLIA_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_BASE_SEPOLIA_FEE_RECIPIENT || '',
    DexRouterRegistry: process.env.NEXT_PUBLIC_BASE_SEPOLIA_DEX_ROUTER_REGISTRY || '',
  },
};

// Get contract addresses for a specific chain
export function getContractAddresses(chainId: number): ContractAddresses {
  return contractAddresses[chainId] || {};
}

// Get TokenFactory address for current chain
export function getTokenFactoryAddress(chainId: number): string | undefined {
  const address = contractAddresses[chainId]?.TokenFactory;
  // Return undefined if address is empty string (not configured)
  return address && address.trim() !== '' ? address : undefined;
}

// Get FeeRecipient address for current chain
export function getFeeRecipientAddress(chainId: number): string | undefined {
  const address = contractAddresses[chainId]?.FeeRecipient;
  // Return undefined if address is empty string (not configured)
  return address && address.trim() !== '' ? address : undefined;
}

// Get DexRouterRegistry address for current chain
export function getDexRouterRegistryAddress(chainId: number): string | undefined {
  const address = contractAddresses[chainId]?.DexRouterRegistry;
  return address && address.trim() !== '' ? address : undefined;
}

// Get list of chains with deployed contracts
export function getSupportedChains(): number[] {
  return Object.keys(contractAddresses)
    .map(Number)
    .filter(chainId => {
      const addresses = contractAddresses[chainId];
      return !!(
        addresses?.TokenFactory &&
        addresses?.TokenFactory.trim() !== '' &&
        addresses?.DexRouterRegistry &&
        addresses?.DexRouterRegistry.trim() !== ''
      );
    });
}

// Get chain name for better error messages
export function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    1: 'Ethereum Mainnet',
    56: 'BNB Smart Chain (BSC)',
    97: 'BSC Testnet',
    137: 'Polygon',
    42161: 'Arbitrum One',
    421614: 'Arbitrum Sepolia',
    8453: 'Base',
    84532: 'Base Sepolia',
  };
  return chainNames[chainId] || `Chain ${chainId}`;
}

// Check if contracts are deployed on a chain
export function areContractsDeployed(chainId: number): boolean {
  const addresses = contractAddresses[chainId];
  return !!(addresses?.TokenFactory && addresses?.FeeRecipient && addresses?.DexRouterRegistry);
}

// Validate contract address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
