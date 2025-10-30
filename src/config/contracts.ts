// Contract Address Registry for Multichain Support
// This file stores deployed contract addresses for each supported chain

export interface ContractAddresses {
  TokenFactory?: string;
  FeeRecipient?: string;
}

export const contractAddresses: Record<number, ContractAddresses> = {
  // BNB Smart Chain Mainnet (56)
  56: {
    TokenFactory: process.env.NEXT_PUBLIC_BSC_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_BSC_FEE_RECIPIENT || '',
  },
  // BNB Smart Chain Testnet (97)
  97: {
    TokenFactory: process.env.NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT || '',
  },
  // Arbitrum One (42161)
  42161: {
    TokenFactory: process.env.NEXT_PUBLIC_ARBITRUM_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_ARBITRUM_FEE_RECIPIENT || '',
  },
  // Arbitrum Sepolia (421614)
  421614: {
    TokenFactory: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_FEE_RECIPIENT || '',
  },
  // Base Mainnet (8453)
  8453: {
    TokenFactory: process.env.NEXT_PUBLIC_BASE_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_BASE_FEE_RECIPIENT || '',
  },
  // Base Sepolia (84532)
  84532: {
    TokenFactory: process.env.NEXT_PUBLIC_BASE_SEPOLIA_TOKEN_FACTORY || '',
    FeeRecipient: process.env.NEXT_PUBLIC_BASE_SEPOLIA_FEE_RECIPIENT || '',
  },
};

// Get contract addresses for a specific chain
export function getContractAddresses(chainId: number): ContractAddresses {
  return contractAddresses[chainId] || {};
}

// Get TokenFactory address for current chain
export function getTokenFactoryAddress(chainId: number): string | undefined {
  return contractAddresses[chainId]?.TokenFactory;
}

// Get FeeRecipient address for current chain
export function getFeeRecipientAddress(chainId: number): string | undefined {
  return contractAddresses[chainId]?.FeeRecipient;
}

// Check if contracts are deployed on a chain
export function areContractsDeployed(chainId: number): boolean {
  const addresses = contractAddresses[chainId];
  return !!(addresses?.TokenFactory && addresses?.FeeRecipient);
}

// Validate contract address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
