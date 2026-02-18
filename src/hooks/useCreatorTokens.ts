/**
 * useCreatorTokens Hook
 * Fetches and manages tokens created by the connected wallet across all chains
 *
 * Features:
 * - Multi-chain token aggregation
 * - Creator statistics (volume, earnings, holders)
 * - Graduated vs active token tracking
 * - Automatic refresh on wallet changes
 *
 * @example
 * ```typescript
 * const {
 *   tokens,
 *   stats,
 *   isLoading,
 *   error,
 *   refresh
 * } = useCreatorTokens();
 *
 * // Display creator stats
 * <div>
 *   <p>Tokens Created: {stats.totalTokens}</p>
 *   <p>Total Volume: ${stats.totalVolume}</p>
 *   <p>Earnings: ${stats.totalEarnings}</p>
 * </div>
 *
 * // Show graduated tokens
 * {tokens.filter(t => t.isGraduated).map(token => (
 *   <TokenCard key={token.address} {...token} />
 * ))}
 * ```
 *
 * @returns Object containing created tokens, stats, and management functions
 */

import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { KasPumpToken } from '../types';
import { useMultichainWallet } from './useMultichainWallet';
import { supportedChains, getChainById, getChainMetadata, isTestnet } from '../config/chains';

/**
 * Creator token with additional creator-specific fields
 */
export interface CreatorToken extends KasPumpToken {
  /** Chain where token was deployed */
  chainId: number;
  /** Chain display name */
  chainName: string;
  /** Transaction hash of token creation */
  creationTxHash?: string;
  /** Total fees earned by creator */
  totalEarnings?: number;
  /** Total trading volume */
  totalVolume?: number;
  /** Number of unique holders */
  holderCount?: number;
}

/**
 * Aggregated creator statistics
 */
export interface CreatorStats {
  /** Total number of tokens created */
  totalTokens: number;
  /** Total trading volume across all tokens */
  totalVolume: number;
  /** Total creator fees earned */
  totalEarnings: number;
  /** Total unique holders across tokens */
  totalHolders: number;
  /** Number of graduated tokens */
  graduatedTokens: number;
  /** Number of active (non-graduated) tokens */
  activeTokens: number;
  /** Per-chain breakdown */
  chains: {
    chainId: number;
    chainName: string;
    tokenCount: number;
    totalVolume: number;
  }[];
}

const TOKEN_FACTORY_ABI = [
  "function getAllTokens() external view returns (address[])",
  "function getTokenConfig(address tokenAddress) external view returns (tuple(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType, uint256 graduationThreshold, address creator, uint256 createdAt))",
  "function getTokenAMM(address tokenAddress) external view returns (address)",
  "event TokenCreated(address indexed tokenAddress, address indexed ammAddress, address indexed creator, string name, string symbol, uint256 totalSupply, uint256 timestamp)"
];

const BONDING_CURVE_ABI = [
  "function getTradingInfo() external view returns (uint256 currentSupply, uint256 currentPrice, uint256 totalVolume, uint256 graduation, bool isGraduated)",
  "function token() external view returns (address)",
];


export function useCreatorTokens() {
  const wallet = useMultichainWallet();
  const [tokens, setTokens] = useState<CreatorToken[]>([]);
  const [stats, setStats] = useState<CreatorStats>({
    totalTokens: 0,
    totalVolume: 0,
    totalEarnings: 0,
    totalHolders: 0,
    graduatedTokens: 0,
    activeTokens: 0,
    chains: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tokens created by the user
  const fetchCreatorTokens = useCallback(async () => {
    if (!wallet.connected || !wallet.address) {
      setTokens([]);
      setStats({
        totalTokens: 0,
        totalVolume: 0,
        totalEarnings: 0,
        totalHolders: 0,
        graduatedTokens: 0,
        activeTokens: 0,
        chains: [],
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const creatorTokens: CreatorToken[] = [];
      const chainStatsMap = new Map<number, { tokenCount: number; totalVolume: number }>();

      // Fetch from all mainnet chains
      const mainnetChains = supportedChains.filter(chain => !isTestnet(chain.id));

      for (const chain of mainnetChains) {
        try {
          const chainConfig = getChainById(chain.id);
          const chainMetadata = getChainMetadata(chain.id);
          if (!chainConfig) continue;

          const rpcUrl = chainConfig.rpcUrls.default.http[0];
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          
          // Get factory address for this chain
          const factoryAddress = process.env[`NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_${chain.id}`] ||
                                 process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;

          if (!factoryAddress) continue;

          const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);
          
          // Get all tokens
          const allTokens = await factoryContract.getAllTokens!();

          // Filter tokens created by this user
          for (const tokenAddress of allTokens) {
            try {
              const config = await factoryContract.getTokenConfig!(tokenAddress);
              
              // Check if this user is the creator
              if (config.creator.toLowerCase() !== wallet.address.toLowerCase()) {
                continue;
              }

              // Get AMM address
              const ammAddress = await factoryContract.getTokenAMM!(tokenAddress);
              if (!ammAddress || ammAddress === ethers.ZeroAddress) continue;

              // Get trading data
              const ammContract = new ethers.Contract(ammAddress, BONDING_CURVE_ABI, provider);
              const [currentSupply, currentPrice, totalVolume, graduation, isGraduated] =
                await ammContract.getTradingInfo!();

              const currentSupplyNumber = parseFloat(ethers.formatEther(currentSupply));
              const priceNumber = parseFloat(ethers.formatEther(currentPrice));
              const volumeNumber = parseFloat(ethers.formatEther(totalVolume));
              const marketCap = currentSupplyNumber * priceNumber;

              // Get holder count (simplified - count addresses with balance > 0)
              // In production, this would use a more efficient method
              // Placeholder — real implementation would track holders via indexer
              const holderCount = 0;

              const creatorToken: CreatorToken = {
                address: tokenAddress,
                chainId: chain.id,
                chainName: chainMetadata?.shortName || chain.name,
                name: config.name,
                symbol: config.symbol,
                description: config.description,
                image: config.imageUrl || '',
                creator: config.creator,
                totalSupply: parseFloat(ethers.formatEther(config.totalSupply)),
                currentSupply: currentSupplyNumber,
                marketCap,
                price: priceNumber,
                change24h: 0, // Would need historical data
                volume24h: volumeNumber, // Simplified - would calculate 24h volume
                holders: holderCount,
                createdAt: new Date(Number(config.createdAt) * 1000),
                curveType: config.curveType === 0 ? 'linear' : 'exponential',
                bondingCurveProgress: parseFloat(ethers.formatUnits(graduation, 2)),
                ammAddress,
                isGraduated,
                totalVolume: volumeNumber,
                totalEarnings: volumeNumber * 0.005, // 0.5% creator fee (simplified)
              };

              creatorTokens.push(creatorToken);

              // Update chain stats
              const currentChainStats = chainStatsMap.get(chain.id) || { tokenCount: 0, totalVolume: 0 };
              currentChainStats.tokenCount += 1;
              currentChainStats.totalVolume += volumeNumber;
              chainStatsMap.set(chain.id, currentChainStats);
            } catch (err) {
              console.warn(`Error fetching token ${tokenAddress} on ${chain.name}:`, err);
              // Continue with other tokens
            }
          }
        } catch (err) {
          console.error(`Error fetching tokens on chain ${chain.name}:`, err);
          // Continue with other chains
        }
      }

      setTokens(creatorTokens);

      // Calculate overall stats
      const totalTokens = creatorTokens.length;
      const totalVolume = creatorTokens.reduce((sum, t) => sum + (t.totalVolume || 0), 0);
      const totalEarnings = creatorTokens.reduce((sum, t) => sum + (t.totalEarnings || 0), 0);
      const totalHolders = creatorTokens.reduce((sum, t) => sum + (t.holders || 0), 0);
      const graduatedTokens = creatorTokens.filter(t => t.isGraduated).length;
      const activeTokens = creatorTokens.filter(t => !t.isGraduated && (t.volume24h || 0) > 0).length;

      const chainsStats = Array.from(chainStatsMap.entries()).map(([chainId, stats]) => ({
        chainId,
        chainName: getChainMetadata(chainId)?.shortName || getChainById(chainId)?.name || 'Unknown',
        tokenCount: stats.tokenCount,
        totalVolume: stats.totalVolume,
      }));

      setStats({
        totalTokens,
        totalVolume,
        totalEarnings,
        totalHolders,
        graduatedTokens,
        activeTokens,
        chains: chainsStats,
      });

    } catch (err: any) {
      console.error('Failed to fetch creator tokens:', err);
      setError(err.message || 'Failed to load your tokens');
    } finally {
      setLoading(false);
    }
  }, [wallet.connected, wallet.address]);

  useEffect(() => {
    fetchCreatorTokens();
  }, [fetchCreatorTokens]);

  return {
    tokens,
    stats,
    loading,
    error,
    refresh: fetchCreatorTokens,
  };
}

