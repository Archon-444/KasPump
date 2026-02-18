// Core KasPump TypeScript Definitions
export interface KasPumpToken {
  address: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  creator: string;
  totalSupply: number;
  currentSupply: number;
  marketCap: number;
  price: number;
  change24h: number;
  volume24h: number;
  holders: number;
  createdAt: Date;
  curveType: 'linear' | 'exponential';
  bondingCurveProgress: number; // 0-100, when it graduates to AMM
  ammAddress: string;
  isGraduated: boolean;
}

export interface TradeData {
  tokenAddress: string;
  action: 'buy' | 'sell';
  baseAmount: number;
  slippageTolerance: number;
  expectedOutput: number;
  priceImpact: number;
  gasFee: number;
  timestamp?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  reward?: {
    type: 'badge' | 'tokens' | 'discount' | 'access';
    value: number;
  };
}

export interface UserProfile {
  address: string;
  totalTrades: number;
  totalVolume: number;
  tokensCreated: number;
  profitLoss: number;
  achievements: Achievement[];
  followers: number;
  following: number;
  verified: boolean;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  bnbBalance: number;
  isConnecting: boolean;
  error: string | null;
}

export interface ContractConfig {
  tokenFactory: string;
  feeRecipient: string;
  chainId: number;
  rpcUrl: string;
}

export interface TokenCreationForm {
  name: string;
  symbol: string;
  description: string;
  image: File | null;
  totalSupply: number;
  curveType: 'linear' | 'exponential';
  basePrice: number;
  slope: number;
}

export interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  slippage: number;
  gasFee: number;
  route: 'bonding-curve' | 'amm';
  minimumOutput: number;
}

export interface TradingViewProps {
  token: KasPumpToken;
  onTrade: (trade: TradeData) => Promise<void>;
  walletConnected: boolean;
  bnbBalance: number;
}

export interface BondingCurveConfig {
  basePrice: number;
  slope: number;
  curveType: 'linear' | 'exponential';
  graduationThreshold: number;
  currentSupply: number;
  totalVolume: number;
}

// Smart Contract Interfaces
export interface TokenFactoryContract {
  createToken: (
    name: string,
    symbol: string,
    description: string,
    imageUrl: string,
    totalSupply: bigint,
    basePrice: bigint,
    slope: bigint,
    curveType: number
  ) => Promise<any>;
  getAllTokens: () => Promise<string[]>;
  getTokenConfig: (address: string) => Promise<any>;
  isKasPumpToken: (address: string) => Promise<boolean>;
}

export interface BondingCurveAMMContract {
  buyTokens: (minTokensOut: bigint, options: { value: bigint }) => Promise<any>;
  sellTokens: (tokenAmount: bigint, minBnbOut: bigint) => Promise<any>;
  getCurrentPrice: () => Promise<bigint>;
  getTradingInfo: () => Promise<[bigint, bigint, bigint, bigint, boolean]>;
  calculateTokensOut: (bnbIn: bigint, supply: bigint) => Promise<bigint>;
  calculateBnbOut: (tokensIn: bigint, supply: bigint) => Promise<bigint>;
  getPriceImpact: (amount: bigint, isBuy: boolean) => Promise<bigint>;
}

// UI Component Props
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export interface TokenCardProps {
  token: KasPumpToken;
  onClick?: () => void;
  showActions?: boolean;
}

export interface ChartDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  marketCap: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PriceUpdateEvent {
  tokenAddress: string;
  price: number;
  volume24h: number;
  change24h: number;
  timestamp: number;
}

export interface TradeEvent {
  tokenAddress: string;
  trader: string;
  action: 'buy' | 'sell';
  bnbAmount: number;
  tokenAmount: number;
  price: number;
  txHash: string;
  timestamp: number;
}

// Error Types
export interface ContractError {
  code: string;
  message: string;
  txHash?: string | undefined;
}

export interface WalletError {
  code: string;
  message: string;
  data?: unknown;
}

// Constants
export const CURVE_TYPES = {
  LINEAR: 0,
  EXPONENTIAL: 1,
} as const;

export const PLATFORM_CONFIG = {
  PLATFORM_FEE: 50, // 0.5% in basis points
  MAX_SLIPPAGE: 1000, // 10% in basis points
  MIN_TOKEN_SUPPLY: 1000000,
  MAX_TOKEN_SUPPLY: 1000000000000,
  GRADUATION_THRESHOLD_PERCENT: 80,
} as const;

export const NETWORK_CONFIG = {
  BSC_MAINNET: {
    chainId: 56,
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    icon: '🟡',
  },
  BSC_TESTNET: {
    chainId: 97,
    name: 'BNB Smart Chain Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    icon: '🟡',
  },
  ARBITRUM_ONE: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    icon: '⬜',
  },
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    icon: '⬜',
  },
  BASE_MAINNET: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    icon: '🔵',
  },
  BASE_SEPOLIA: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    icon: '🔵',
  },
} as const;

// EIP-1193 Provider Types
export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isWalletConnect?: boolean;
}

// Window ethereum extension
declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

// Contract Event Types
export interface TokenCreatedEventArgs {
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  ammAddress: string;
}

export interface TradeEventArgs {
  trader: string;
  isBuy: boolean;
  nativeAmount: bigint;
  tokenAmount: bigint;
  newPrice: bigint;
  fee: bigint;
}

// Ethers error types for proper error handling
export interface EthersError extends Error {
  code?: string;
  reason?: string;
  transactionHash?: string;
  data?: unknown;
  error?: {
    message?: string;
    data?: unknown;
  };
}

// Token Creation Result Types
export interface SingleChainCreationResult {
  tokenAddress: string;
  ammAddress: string;
  txHash: string;
}

export interface MultiChainDeploymentResult {
  chainId: number;
  chainName: string;
  success: boolean;
  tokenAddress?: string;
  ammAddress?: string;
  txHash?: string;
  error?: string;
}

export interface MultiChainCreationResult {
  multiChain: true;
  results: Map<number, MultiChainDeploymentResult>;
}

export type TokenCreationResult = SingleChainCreationResult | MultiChainCreationResult;

// Utility Types
export type CurveType = keyof typeof CURVE_TYPES;
export type NetworkName = keyof typeof NETWORK_CONFIG;
export type TradeAction = 'buy' | 'sell';
export type TokenStatus = 'bonding' | 'graduated' | 'failed';
