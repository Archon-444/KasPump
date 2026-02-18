/**
 * useLPFarming Hook
 * Interface for LP token staking and farming rewards
 *
 * Features:
 * - View available farming pools
 * - Stake/unstake LP tokens
 * - Claim rewards
 * - Track boost multipliers
 * - Calculate APR/APY
 *
 * @example
 * ```typescript
 * const {
 *   pools,
 *   userStakes,
 *   stake,
 *   unstake,
 *   claimRewards,
 * } = useLPFarming();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

// ============ Types ============

export interface FarmingPool {
  id: number;
  lpToken: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  rewardToken: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  rewardPerBlock: bigint;
  totalStaked: bigint;
  apr: number;
  apy: number;
  startBlock: number;
  endBlock: number;
  minStakeDuration: number;
  isActive: boolean;
  tvl: number; // Total Value Locked in USD
}

export interface UserStake {
  poolId: number;
  amount: bigint;
  pendingRewards: bigint;
  stakedAt: number;
  lastClaimAt: number;
  boostMultiplier: number; // 100 = 1x, 150 = 1.5x
  estimatedDailyRewards: bigint;
}

export interface BoostTier {
  minDuration: number; // seconds
  multiplier: number;  // 100 = 1x
  label: string;
}

interface UseLPFarmingReturn {
  // Pool data
  pools: FarmingPool[];
  isLoadingPools: boolean;

  // User data
  userStakes: Map<number, UserStake>;
  isLoadingUser: boolean;

  // Actions
  stake: (poolId: number, amount: bigint) => Promise<string | null>;
  unstake: (poolId: number, amount: bigint) => Promise<string | null>;
  claimRewards: (poolId: number) => Promise<string | null>;
  emergencyWithdraw: (poolId: number) => Promise<string | null>;

  // Utilities
  getPoolAPR: (poolId: number) => number;
  getPoolAPY: (poolId: number) => number;
  getUserBoost: (poolId: number) => number;
  getNextBoostTier: (poolId: number) => BoostTier | null;
  calculateRewards: (poolId: number, amount: bigint, duration: number) => bigint;

  // State
  error: string | null;
  pendingTx: string | null;
}

// ============ Constants ============

const BOOST_TIERS: BoostTier[] = [
  { minDuration: 0, multiplier: 100, label: 'Base' },
  { minDuration: 7 * 24 * 60 * 60, multiplier: 110, label: '7+ Days (+10%)' },
  { minDuration: 30 * 24 * 60 * 60, multiplier: 125, label: '30+ Days (+25%)' },
  { minDuration: 90 * 24 * 60 * 60, multiplier: 150, label: '90+ Days (+50%)' },
  { minDuration: 180 * 24 * 60 * 60, multiplier: 200, label: '180+ Days (+100%)' },
];

// BLOCKS_PER_YEAR used for APR calculations in contract integration
// const BLOCKS_PER_YEAR = 2102400; // ~15 second blocks

// ============ Mock Data ============

const MOCK_POOLS: FarmingPool[] = [
  {
    id: 0,
    lpToken: {
      address: '0xLP1234567890123456789012345678901234567890',
      symbol: 'KPUMP-BNB LP',
      name: 'KasPump BNB LP Token',
      decimals: 18,
    },
    rewardToken: {
      address: '0xRW1234567890123456789012345678901234567890',
      symbol: 'KPUMP',
      name: 'KasPump Token',
      decimals: 18,
    },
    rewardPerBlock: BigInt('1000000000000000000'), // 1 token per block
    totalStaked: BigInt('500000000000000000000000'), // 500k LP
    apr: 125.5,
    apy: 252.3,
    startBlock: 1000000,
    endBlock: 0, // Infinite
    minStakeDuration: 0,
    isActive: true,
    tvl: 1250000,
  },
  {
    id: 1,
    lpToken: {
      address: '0xLP2345678901234567890123456789012345678901',
      symbol: 'KPUMP-USDT LP',
      name: 'KasPump USDT LP Token',
      decimals: 18,
    },
    rewardToken: {
      address: '0xRW1234567890123456789012345678901234567890',
      symbol: 'KPUMP',
      name: 'KasPump Token',
      decimals: 18,
    },
    rewardPerBlock: BigInt('500000000000000000'), // 0.5 tokens per block
    totalStaked: BigInt('250000000000000000000000'), // 250k LP
    apr: 85.2,
    apy: 134.8,
    startBlock: 1000000,
    endBlock: 0,
    minStakeDuration: 7 * 24 * 60 * 60, // 7 days
    isActive: true,
    tvl: 750000,
  },
];

// ============ Hook ============

export function useLPFarming(): UseLPFarmingReturn {
  const { address, isConnected } = useAccount();

  // State
  const [pools, setPools] = useState<FarmingPool[]>([]);
  const [userStakes, setUserStakes] = useState<Map<number, UserStake>>(new Map());
  const [isLoadingPools, setIsLoadingPools] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTx, setPendingTx] = useState<string | null>(null);

  // Fetch pools
  useEffect(() => {
    const fetchPools = async () => {
      setIsLoadingPools(true);
      try {
        // In production, would fetch from contract
        await new Promise(resolve => setTimeout(resolve, 500));
        setPools(MOCK_POOLS);
      } catch (err) {
        console.error('Failed to fetch pools:', err);
        setError('Failed to load farming pools');
      } finally {
        setIsLoadingPools(false);
      }
    };

    fetchPools();
  }, []);

  // Fetch user stakes
  useEffect(() => {
    if (!isConnected || !address) {
      setUserStakes(new Map());
      return;
    }

    const fetchUserStakes = async () => {
      setIsLoadingUser(true);
      try {
        // In production, would fetch from contract
        await new Promise(resolve => setTimeout(resolve, 300));

        // Mock user stakes
        const stakes = new Map<number, UserStake>();
        stakes.set(0, {
          poolId: 0,
          amount: BigInt('10000000000000000000000'), // 10k LP
          pendingRewards: BigInt('125000000000000000000'), // 125 rewards
          stakedAt: Date.now() / 1000 - 15 * 24 * 60 * 60, // 15 days ago
          lastClaimAt: Date.now() / 1000 - 2 * 24 * 60 * 60, // 2 days ago
          boostMultiplier: 110, // 1.1x for 7+ days
          estimatedDailyRewards: BigInt('8500000000000000000'), // ~8.5 per day
        });

        setUserStakes(stakes);
      } catch (err) {
        console.error('Failed to fetch user stakes:', err);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserStakes();
  }, [isConnected, address]);

  // Stake LP tokens
  const stake = useCallback(async (poolId: number, amount: bigint): Promise<string | null> => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return null;
    }

    if (amount <= BigInt(0)) {
      setError('Amount must be greater than 0');
      return null;
    }

    setError(null);
    setPendingTx('pending');

    try {
      // In production, would call contract
      await new Promise(resolve => setTimeout(resolve, 2000));

      const txHash = `0x${Math.random().toString(16).slice(2)}`;
      setPendingTx(txHash);

      // Update local state
      setUserStakes(prev => {
        const newStakes = new Map(prev);
        const existing = newStakes.get(poolId);

        if (existing) {
          newStakes.set(poolId, {
            ...existing,
            amount: existing.amount + amount,
          });
        } else {
          newStakes.set(poolId, {
            poolId,
            amount,
            pendingRewards: BigInt(0),
            stakedAt: Date.now() / 1000,
            lastClaimAt: 0,
            boostMultiplier: 100,
            estimatedDailyRewards: BigInt(0),
          });
        }

        return newStakes;
      });

      return txHash;
    } catch (err) {
      console.error('Stake failed:', err);
      setError('Failed to stake LP tokens');
      return null;
    } finally {
      setPendingTx(null);
    }
  }, [isConnected, address]);

  // Unstake LP tokens
  const unstake = useCallback(async (poolId: number, amount: bigint): Promise<string | null> => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return null;
    }

    const userStake = userStakes.get(poolId);
    if (!userStake || userStake.amount < amount) {
      setError('Insufficient staked balance');
      return null;
    }

    setError(null);
    setPendingTx('pending');

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const txHash = `0x${Math.random().toString(16).slice(2)}`;
      setPendingTx(txHash);

      // Update local state
      setUserStakes(prev => {
        const newStakes = new Map(prev);
        const existing = newStakes.get(poolId);

        if (existing) {
          const newAmount = existing.amount - amount;
          if (newAmount > BigInt(0)) {
            newStakes.set(poolId, {
              ...existing,
              amount: newAmount,
            });
          } else {
            newStakes.delete(poolId);
          }
        }

        return newStakes;
      });

      return txHash;
    } catch (err) {
      console.error('Unstake failed:', err);
      setError('Failed to unstake LP tokens');
      return null;
    } finally {
      setPendingTx(null);
    }
  }, [isConnected, address, userStakes]);

  // Claim rewards
  const claimRewards = useCallback(async (poolId: number): Promise<string | null> => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return null;
    }

    const userStake = userStakes.get(poolId);
    if (!userStake || userStake.pendingRewards <= BigInt(0)) {
      setError('No rewards to claim');
      return null;
    }

    setError(null);
    setPendingTx('pending');

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const txHash = `0x${Math.random().toString(16).slice(2)}`;
      setPendingTx(txHash);

      // Update local state
      setUserStakes(prev => {
        const newStakes = new Map(prev);
        const existing = newStakes.get(poolId);

        if (existing) {
          newStakes.set(poolId, {
            ...existing,
            pendingRewards: BigInt(0),
            lastClaimAt: Date.now() / 1000,
          });
        }

        return newStakes;
      });

      return txHash;
    } catch (err) {
      console.error('Claim failed:', err);
      setError('Failed to claim rewards');
      return null;
    } finally {
      setPendingTx(null);
    }
  }, [isConnected, address, userStakes]);

  // Emergency withdraw
  const emergencyWithdraw = useCallback(async (poolId: number): Promise<string | null> => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return null;
    }

    setError(null);
    setPendingTx('pending');

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const txHash = `0x${Math.random().toString(16).slice(2)}`;
      setPendingTx(txHash);

      // Remove from local state
      setUserStakes(prev => {
        const newStakes = new Map(prev);
        newStakes.delete(poolId);
        return newStakes;
      });

      return txHash;
    } catch (err) {
      console.error('Emergency withdraw failed:', err);
      setError('Failed to withdraw');
      return null;
    } finally {
      setPendingTx(null);
    }
  }, [isConnected, address]);

  // Get pool APR
  const getPoolAPR = useCallback((poolId: number): number => {
    const pool = pools.find(p => p.id === poolId);
    return pool?.apr ?? 0;
  }, [pools]);

  // Get pool APY (with compounding)
  const getPoolAPY = useCallback((poolId: number): number => {
    const pool = pools.find(p => p.id === poolId);
    return pool?.apy ?? 0;
  }, [pools]);

  // Get user's current boost
  const getUserBoost = useCallback((poolId: number): number => {
    const stake = userStakes.get(poolId);
    return stake?.boostMultiplier ?? 100;
  }, [userStakes]);

  // Get next boost tier for user
  const getNextBoostTier = useCallback((poolId: number): BoostTier | null => {
    const stake = userStakes.get(poolId);
    const firstTier = BOOST_TIERS[0];
    if (!stake) return firstTier ?? null;

    const stakeDuration = Date.now() / 1000 - stake.stakedAt;

    for (let i = 0; i < BOOST_TIERS.length - 1; i++) {
      const nextTier = BOOST_TIERS[i + 1];
      if (nextTier && stakeDuration < nextTier.minDuration) {
        return nextTier;
      }
    }

    return null; // Already at max tier
  }, [userStakes]);

  // Calculate expected rewards
  const calculateRewards = useCallback((
    poolId: number,
    amount: bigint,
    durationSeconds: number
  ): bigint => {
    const pool = pools.find(p => p.id === poolId);
    if (!pool || pool.totalStaked === BigInt(0)) return BigInt(0);

    // Blocks in duration (assuming 15 second blocks)
    const blocks = BigInt(Math.floor(durationSeconds / 15));

    // User's share of pool
    const userShare = (amount * BigInt(1e18)) / (pool.totalStaked + amount);

    // Rewards for duration
    const totalRewards = pool.rewardPerBlock * blocks;
    const userRewards = (totalRewards * userShare) / BigInt(1e18);

    return userRewards;
  }, [pools]);

  return {
    pools,
    isLoadingPools,
    userStakes,
    isLoadingUser,
    stake,
    unstake,
    claimRewards,
    emergencyWithdraw,
    getPoolAPR,
    getPoolAPY,
    getUserBoost,
    getNextBoostTier,
    calculateRewards,
    error,
    pendingTx,
  };
}

export { BOOST_TIERS };
export default useLPFarming;
