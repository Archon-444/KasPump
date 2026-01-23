/**
 * usePortfolio Hook
 * Aggregates and tracks user's token holdings across multiple chains
 *
 * Features:
 * - Multi-chain portfolio aggregation
 * - Real-time balance and value calculations
 * - Profit/Loss tracking (when cost basis available)
 * - Automatic refresh on wallet changes
 * - Chain-specific token filtering
 *
 * @example
 * ```typescript
 * const {
 *   tokens,
 *   stats,
 *   isLoading,
 *   error,
 *   refresh
 * } = usePortfolio();
 *
 * // Display portfolio value
 * <div>Total: {stats.totalValueFormatted}</div>
 *
 * // Show tokens by chain
 * {tokens.filter(t => t.chainId === 97).map(token => (
 *   <TokenCard key={token.token.address} {...token} />
 * ))}
 *
 * // Refresh portfolio
 * <Button onClick={refresh}>Refresh</Button>
 * ```
 *
 * @returns Object containing portfolio tokens, stats, and management functions
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import TokenFactoryABI from '@/abis/TokenFactory.json';
import BondingCurveAMMABI from '@/abis/BondingCurveAMM.json';
import { KasPumpToken } from '../types';
import { useMultichainWallet } from './useMultichainWallet';
import { useContracts } from './useContracts';
import { getChainById, getChainMetadata } from '../config/chains';
import { getTokenFactoryAddress } from '../config/contracts';
import { formatCurrency } from '../utils';

/**
 * Portfolio token with balance and value information
 */
export interface PortfolioToken {
  /** Full token information */
  token: KasPumpToken;
  /** Chain ID where token resides */
  chainId: number;
  /** Chain display name */
  chainName: string;
  /** Token balance (raw number) */
  balance: number;
  /** Formatted balance string */
  balanceFormatted: string;
  /** USD value of holdings (balance * price) */
  value: number;
  /** Formatted value string */
  valueFormatted: string;
  /** Total cost to acquire (for P&L) */
  costBasis?: number;
  /** Profit or loss amount */
  profitLoss?: number;
  /** Profit or loss percentage */
  profitLossPercent?: number;
}

/**
 * Aggregated portfolio statistics
 */
export interface PortfolioStats {
  /** Total portfolio value in USD */
  totalValue: number;
  /** Formatted total value */
  totalValueFormatted: string;
  /** Total cost basis */
  totalCostBasis: number;
  /** Total profit/loss */
  totalProfitLoss: number;
  /** Formatted profit/loss */
  totalProfitLossFormatted: string;
  /** Profit/loss percentage */
  totalProfitLossPercent: number;
  /** Number of unique tokens held */
  tokenCount: number;
  chainCount: number;
  chains: {
    chainId: number;
    chainName: string;
    value: number;
    tokenCount: number;
  }[];
}

export function usePortfolio() {
  const wallet = useMultichainWallet();
  const contracts = useContracts();
  const [tokens, setTokens] = useState<PortfolioToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get all supported chains
  const supportedChains = useMemo(() => {
    return [
      { chainId: 56, name: 'BSC' },
      { chainId: 42161, name: 'Arbitrum' },
      { chainId: 8453, name: 'Base' },
      // Testnets (optional, can be filtered)
      { chainId: 97, name: 'BSC Testnet' },
      { chainId: 421614, name: 'Arbitrum Sepolia' },
      { chainId: 84532, name: 'Base Sepolia' },
    ];
  }, []);

  // Fetch user's token balances across all chains
  const fetchPortfolio = useCallback(async () => {
    if (!wallet.connected || !wallet.address) {
      setTokens([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const portfolioTokens: PortfolioToken[] = [];

      // Fetch tokens from each chain
      for (const chain of supportedChains) {
        try {
          // Get all tokens from factory on this chain
          const chainConfig = getChainById(chain.chainId);
          const chainMetadata = getChainMetadata(chain.chainId);
          if (!chainConfig || !chainMetadata) continue;

          const rpcUrl = chainConfig.rpcUrls.default.http[0];
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const factoryAddress = getTokenFactoryAddress(chain.chainId);

          if (!factoryAddress) continue;

          const factoryContract = new ethers.Contract(factoryAddress, TokenFactoryABI.abi, provider);
          const allTokens = await factoryContract.getAllTokens();

          // Check balance for each token
          for (const tokenAddress of allTokens) {
            try {
              const ERC20_ABI = [
                "function balanceOf(address account) external view returns (uint256)",
                "function symbol() external view returns (string)",
                "function name() external view returns (string)",
                "function decimals() external view returns (uint8)",
                "function totalSupply() external view returns (uint256)",
              ];

              const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
              const balance = await tokenContract.balanceOf(wallet.address);
              const balanceNumber = parseFloat(ethers.formatEther(balance));

              // Only include tokens with balance > 0
              if (balanceNumber > 0) {
                // Get AMM address and fetch complete token data
                const ammAddress = await factoryContract.getTokenAMM(tokenAddress);

                // Fetch complete token configuration and trading info
                try {
                  const [config, name, symbol, totalSupply, ammContract] = await Promise.all([
                    factoryContract.getTokenConfig(tokenAddress),
                    tokenContract.name(),
                    tokenContract.symbol(),
                    tokenContract.totalSupply(),
                    new ethers.Contract(ammAddress, BondingCurveAMMABI.abi, provider),
                  ]);

                  const [currentSupply, currentPrice, totalVolume, graduation, isGraduated] = await ammContract.getTradingInfo();

                  const currentSupplyNumber = parseFloat(ethers.formatEther(currentSupply));
                  const price = parseFloat(ethers.formatEther(currentPrice));
                  const value = balanceNumber * price;
                  const marketCap = currentSupplyNumber * price;
                  const bondingCurveProgress = parseFloat(ethers.formatUnits(graduation, 2));

                  portfolioTokens.push({
                    token: {
                      address: tokenAddress,
                      name: config.name || name,
                      symbol: config.symbol || symbol,
                      description: config.description || '',
                      image: config.imageUrl || '',
                      creator: '', // Would need to get from TokenCreated event
                      totalSupply: parseFloat(ethers.formatEther(totalSupply)),
                      currentSupply: currentSupplyNumber,
                      marketCap,
                      price,
                      change24h: 0, // Would need historical price data
                      volume24h: parseFloat(ethers.formatEther(totalVolume)),
                      holders: 0, // Would need to count unique holders
                      createdAt: new Date(), // Would get from TokenCreated event
                      curveType: config.curveType === 0 ? 'linear' : 'exponential',
                      bondingCurveProgress,
                      ammAddress,
                      isGraduated,
                    },
                    chainId: chain.chainId,
                    chainName: chain.name,
                    balance: balanceNumber,
                    balanceFormatted: formatCurrency(balanceNumber, '', 4),
                    value,
                    valueFormatted: formatCurrency(value, chainConfig.nativeCurrency.symbol, 2),
                    // P&L calculation would require transaction history
                    // For now, we'll set costBasis to undefined
                  });
                } catch (err) {
                  // Skip tokens with errors
                  console.warn(`Error fetching token data for ${tokenAddress} on chain ${chain.chainId}:`, err);
                }
              }
            } catch (err) {
              // Skip individual token errors
              continue;
            }
          }
        } catch (err) {
          console.warn(`Error fetching portfolio for chain ${chain.chainId}:`, err);
          // Continue to next chain
          continue;
        }
      }

      setTokens(portfolioTokens);
    } catch (err: any) {
      console.error('Portfolio fetch error:', err);
      setError(err.message || 'Failed to fetch portfolio');
    } finally {
      setLoading(false);
    }
  }, [wallet.connected, wallet.address, supportedChains]);

  // Calculate portfolio stats
  const stats = useMemo<PortfolioStats>(() => {
    const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
    const totalCostBasis = tokens.reduce((sum, token) => sum + (token.costBasis || 0), 0);
    const totalProfitLoss = totalValue - totalCostBasis;
    const totalProfitLossPercent = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;

    // Group by chain
    const chainMap = new Map<number, { value: number; count: number; name: string }>();
    tokens.forEach(token => {
      const existing = chainMap.get(token.chainId) || { value: 0, count: 0, name: token.chainName };
      chainMap.set(token.chainId, {
        value: existing.value + token.value,
        count: existing.count + 1,
        name: token.chainName,
      });
    });

    const chains = Array.from(chainMap.entries()).map(([chainId, data]) => ({
      chainId,
      chainName: data.name,
      value: data.value,
      tokenCount: data.count,
    }));

    return {
      totalValue,
      totalValueFormatted: formatCurrency(totalValue, 'USD', 2),
      totalCostBasis,
      totalProfitLoss,
      totalProfitLossFormatted: formatCurrency(totalProfitLoss, 'USD', 2),
      totalProfitLossPercent,
      tokenCount: tokens.length,
      chainCount: chains.length,
      chains,
    };
  }, [tokens]);

  // Refresh portfolio when wallet connects/disconnects
  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  return {
    tokens,
    stats,
    loading,
    error,
    refresh: fetchPortfolio,
  };
}

