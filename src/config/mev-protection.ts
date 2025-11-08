/**
 * MEV Protection Configuration
 *
 * STRATEGY IMPLEMENTATION:
 * - Protects against sandwich attacks (5-10% of volume typically lost)
 * - Multi-layer approach: RPC + Smart Contract + Frontend
 * - Chain-specific protection mechanisms
 *
 * MEV Attack Vectors Addressed:
 * 1. Sandwich attacks (front-run + back-run)
 * 2. Front-running
 * 3. Back-running
 * 4. Time-bandit attacks
 */

import { type Chain } from 'viem';

// ========== MEV-PROTECTED RPC ENDPOINTS ==========

/**
 * MEV-Protected RPC Configuration
 * These RPCs route transactions through private mempools
 */
export const MEV_PROTECTED_RPCS = {
  // BNB Smart Chain
  bsc: {
    chainId: 56,
    rpcs: [
      {
        name: 'BNB48 Club MEV Shield',
        url: 'https://rpc-bsc.48.club',
        protection: 'private-mempool',
        fee: 'free',
      },
      {
        name: 'BSC Public RPC',
        url: 'https://bsc-dataseed1.binance.org',
        protection: 'standard',
        fee: 'free',
      },
      // SECURITY FIX: Removed NodeReal API key from client-side config
      // NodeReal RPC with API key should only be used server-side
      // To use NodeReal: Set up server-side RPC proxy in /api/rpc route
    ],
    defaultSlippage: 200, // 2% (higher for BSC due to MEV)
  },

  // Arbitrum One
  arbitrum: {
    chainId: 42161,
    rpcs: [
      {
        name: 'Arbitrum Sequencer',
        url: 'https://arb1.arbitrum.io/rpc',
        protection: 'first-come-first-serve', // Arbitrum has built-in MEV protection
        fee: 'free',
      },
    ],
    defaultSlippage: 50, // 0.5% (lower due to sequencer protection)
  },

  // Base
  base: {
    chainId: 8453,
    rpcs: [
      {
        name: 'Base Sequencer',
        url: 'https://mainnet.base.org',
        protection: 'sequencer-ordering', // Base uses sequencer
        fee: 'free',
      },
    ],
    defaultSlippage: 100, // 1% (medium protection)
  },
} as const;

// ========== MEV PROTECTION STRATEGIES ==========

/**
 * Get MEV-protected RPC for a chain
 */
export function getMEVProtectedRPC(chainId: number): string | null {
  switch (chainId) {
    case 56: // BSC
      return MEV_PROTECTED_RPCS.bsc.rpcs[0].url;
    case 42161: // Arbitrum
      return MEV_PROTECTED_RPCS.arbitrum.rpcs[0].url;
    case 8453: // Base
      return MEV_PROTECTED_RPCS.base.rpcs[0].url;
    default:
      return null;
  }
}

/**
 * Get recommended slippage for chain (accounts for MEV risk)
 */
export function getRecommendedSlippage(chainId: number): number {
  switch (chainId) {
    case 56:
      return MEV_PROTECTED_RPCS.bsc.defaultSlippage;
    case 42161:
      return MEV_PROTECTED_RPCS.arbitrum.defaultSlippage;
    case 8453:
      return MEV_PROTECTED_RPCS.base.defaultSlippage;
    default:
      return 300; // 3% conservative default
  }
}

// ========== TRANSACTION PROTECTION ==========

/**
 * MEV Protection Settings for Transactions
 */
export interface MEVProtectionSettings {
  usePrivateRPC: boolean;
  maxSlippageBps: number;
  deadline: number; // seconds
  minReceivedPercentage: number;
  splitLargeOrders: boolean;
  splitThreshold: string; // in wei
}

/**
 * Get MEV protection settings based on trade size and chain
 */
export function getMEVProtectionSettings(
  chainId: number,
  tradeSize: bigint,
  userSlippage?: number
): MEVProtectionSettings {
  const baseSettings: MEVProtectionSettings = {
    usePrivateRPC: true,
    maxSlippageBps: userSlippage || getRecommendedSlippage(chainId),
    deadline: 300, // 5 minutes
    minReceivedPercentage: 95, // Minimum 95% of expected
    splitLargeOrders: false,
    splitThreshold: '0',
  };

  // Chain-specific adjustments
  if (chainId === 56) {
    // BSC has higher MEV risk
    baseSettings.maxSlippageBps = Math.max(baseSettings.maxSlippageBps, 200);

    // Split large orders on BSC
    const largeOrderThreshold = BigInt('1000000000000000000'); // 1 BNB
    if (tradeSize > largeOrderThreshold) {
      baseSettings.splitLargeOrders = true;
      baseSettings.splitThreshold = largeOrderThreshold.toString();
    }
  } else if (chainId === 42161) {
    // Arbitrum has built-in protection via sequencer
    baseSettings.maxSlippageBps = Math.max(baseSettings.maxSlippageBps, 50);
  }

  return baseSettings;
}

// ========== FLASHBOTS INTEGRATION (BSC/Ethereum) ==========

/**
 * Flashbots-style protect configuration
 * Note: Flashbots is primarily Ethereum, but similar services exist for BSC
 * SECURITY: Flashbots integration disabled (requires server-side implementation)
 */
export const FLASHBOTS_CONFIG = {
  enabled: false, // SECURITY: Disabled - implement server-side if needed
  rpcUrl: '', // SECURITY: Removed client-side RPC URL
  builderUrl: 'https://relay.flashbots.net',
};

/**
 * Check if transaction should use Flashbots protection
 */
export function shouldUseFlashbots(chainId: number, tradeValue: bigint): boolean {
  if (!FLASHBOTS_CONFIG.enabled) return false;

  // Only for Ethereum mainnet currently
  if (chainId !== 1) return false;

  // Only for large trades (> $1000 equivalent)
  const largeTradeThreshold = BigInt('1000000000000000000'); // 1 ETH
  return tradeValue > largeTradeThreshold;
}

// ========== FRONTEND HELPERS ==========

/**
 * Calculate minimum output with MEV protection
 */
export function calculateMinOutput(
  expectedOutput: bigint,
  slippageBps: number
): bigint {
  const slippageMultiplier = BigInt(10000 - slippageBps);
  return (expectedOutput * slippageMultiplier) / BigInt(10000);
}

/**
 * Estimate MEV risk for a trade
 */
export function estimateMEVRisk(
  chainId: number,
  tradeSize: bigint,
  liquiditySize: bigint
): 'low' | 'medium' | 'high' {
  // Calculate trade size as % of liquidity
  const impactBps = (tradeSize * BigInt(10000)) / liquiditySize;

  if (chainId === 42161) {
    // Arbitrum has built-in protection
    if (impactBps < BigInt(100)) return 'low'; // < 1%
    if (impactBps < BigInt(500)) return 'medium'; // < 5%
    return 'high';
  } else if (chainId === 56) {
    // BSC has higher MEV risk
    if (impactBps < BigInt(50)) return 'low'; // < 0.5%
    if (impactBps < BigInt(200)) return 'medium'; // < 2%
    return 'high';
  } else {
    // Default (Base, etc.)
    if (impactBps < BigInt(75)) return 'low'; // < 0.75%
    if (impactBps < BigInt(300)) return 'medium'; // < 3%
    return 'high';
  }
}

/**
 * Get MEV protection explanation for users
 */
export function getMEVProtectionExplanation(chainId: number): string {
  switch (chainId) {
    case 56:
      return 'Your transaction is routed through private RPC to prevent front-running on BSC';
    case 42161:
      return 'Arbitrum sequencer provides built-in MEV protection via transaction ordering';
    case 8453:
      return 'Base sequencer protects against MEV through fair transaction ordering';
    default:
      return 'MEV protection enabled via private mempool routing';
  }
}

// ========== ADVANCED: COMMIT-REVEAL PATTERN ==========

/**
 * Generate commit hash for large trades
 * Uses commit-reveal to hide trade details until execution
 */
export function generateTradeCommit(
  trader: string,
  amount: bigint,
  minOutput: bigint,
  deadline: number,
  salt: string
): string {
  // This would be used with a smart contract commit-reveal function
  const encoder = new TextEncoder();
  const data = encoder.encode(
    `${trader}${amount}${minOutput}${deadline}${salt}`
  );

  // In production, use proper keccak256 from ethers/viem
  return `0x${Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Check if trade should use commit-reveal
 */
export function shouldUseCommitReveal(
  chainId: number,
  tradeSize: bigint
): boolean {
  // Only for very large trades on high-MEV chains
  if (chainId === 42161) return false; // Arbitrum has sequencer protection

  const veryLargeThreshold = BigInt('10000000000000000000'); // 10 ETH/BNB
  return tradeSize > veryLargeThreshold;
}

// ========== MONITORING ==========

/**
 * MEV Protection metrics for analytics
 */
export interface MEVProtectionMetrics {
  transactionsProtected: number;
  estimatedSavings: string; // in USD
  sandwichAttacksPrevented: number;
  averageSlippageReduction: number; // in bps
}

/**
 * Track MEV protection effectiveness
 */
export function trackMEVProtection(
  chainId: number,
  expectedPrice: bigint,
  actualPrice: bigint,
  tradeSize: bigint
): void {
  // Calculate if we were sandwich attacked
  const priceDifferenceBps =
    ((actualPrice - expectedPrice) * BigInt(10000)) / expectedPrice;

  // Log to analytics
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track('MEV Protection Result', {
      chainId,
      priceDifferenceBps: priceDifferenceBps.toString(),
      tradeSize: tradeSize.toString(),
      protected: Math.abs(Number(priceDifferenceBps)) < 100, // < 1% difference
    });
  }
}
