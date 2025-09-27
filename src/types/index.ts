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
  kasBalance: number;
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
  kasBalance: number;
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
  sellTokens: (tokenAmount: bigint, minKasOut: bigint) => Promise<any>;
  getCurrentPrice: () => Promise<bigint>;
  getTradingInfo: () => Promise<[bigint, bigint, bigint, bigint, boolean]>;
  calculateTokensOut: (kasIn: bigint, supply: bigint) => Promise<bigint>;
  calculateKasOut: (tokensIn: bigint, supply: bigint) => Promise<bigint>;
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
  kasAmount: number;
  tokenAmount: number;
  price: number;
  txHash: string;
  timestamp: number;
}

// Error Types
export interface ContractError {
  code: string;
  message: string;
  txHash?: string;
}

export interface WalletError {
  code: string;
  message: string;
  data?: any;
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
  KASPLEX_MAINNET: {
    chainId: 167012,
    name: 'Kasplex',
    rpcUrl: 'https://rpc.kasplex.io',
    explorerUrl: 'https://explorer.kasplex.io',
    nativeCurrency: {
      name: 'KAS',
      symbol: 'KAS',
      decimals: 18,
    },
  },
  KASPLEX_TESTNET: {
    chainId: 167012,
    name: 'Kasplex Testnet',
    rpcUrl: 'https://rpc.kasplextest.xyz',
    explorerUrl: 'https://explorer.kasplextest.xyz',
    nativeCurrency: {
      name: 'KAS',
      symbol: 'KAS',
      decimals: 18,
    },
  },
} as const;

// Utility Types
export type CurveType = keyof typeof CURVE_TYPES;
export type NetworkName = keyof typeof NETWORK_CONFIG;
export type TradeAction = 'buy' | 'sell';
export type TokenStatus = 'bonding' | 'graduated' | 'failed';
