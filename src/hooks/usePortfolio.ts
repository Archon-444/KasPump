// Portfolio hook for multi-chain token aggregation
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { KasPumpToken } from '../types';
import { useMultichainWallet } from './useMultichainWallet';
import { useContracts } from './useContracts';
import { getChainById, getChainMetadata } from '../config/chains';
import { formatCurrency } from '../utils';

export interface PortfolioToken {
  token: KasPumpToken;
  chainId: number;
  chainName: string;
  balance: number;
  balanceFormatted: string;
  value: number; // Balance * current price
  valueFormatted: string;
  costBasis?: number; // Total cost to acquire (for P&L calculation)
  profitLoss?: number;
  profitLossPercent?: number;
}

export interface PortfolioStats {
  totalValue: number;
  totalValueFormatted: string;
  totalCostBasis: number;
  totalProfitLoss: number;
  totalProfitLossFormatted: string;
  totalProfitLossPercent: number;
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
          const factoryAddress = process.env[`NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_${chain.chainId}`] || 
                                 process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
          
          if (!factoryAddress) continue;

          const TOKEN_FACTORY_ABI = [
            "function getAllTokens() external view returns (address[])",
            "function getTokenAMM(address tokenAddress) external view returns (address)",
          ];

          const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);
          const allTokens = await factoryContract.getAllTokens();

          // Check balance for each token
          for (const tokenAddress of allTokens) {
            try {
              const ERC20_ABI = [
                "function balanceOf(address account) external view returns (uint256)",
                "function symbol() external view returns (string)",
                "function decimals() external view returns (uint8)",
              ];

              const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
              const balance = await tokenContract.balanceOf(wallet.address);
              const balanceNumber = parseFloat(ethers.formatEther(balance));

              // Only include tokens with balance > 0
              if (balanceNumber > 0) {
                // Get AMM address and fetch token data
                const ammAddress = await factoryContract.getTokenAMM(tokenAddress);
                
                // Fetch token price and metadata (simplified - would use proper token config)
                const BONDING_CURVE_ABI = [
                  "function getTradingInfo() external view returns (uint256 currentSupply, uint256 currentPrice, uint256 totalVolume, uint256 graduation, bool isGraduated)",
                ];

                try {
                  const ammContract = new ethers.Contract(ammAddress, BONDING_CURVE_ABI, provider);
                  const [currentSupply, currentPrice] = await ammContract.getTradingInfo();
                  const price = parseFloat(ethers.formatEther(currentPrice));
                  const value = balanceNumber * price;

                  portfolioTokens.push({
                    token: {
                      address: tokenAddress,
                      name: '', // Would fetch from factory
                      symbol: await tokenContract.symbol(),
                      description: '',
                      image: '',
                      creator: '',
                      totalSupply: parseFloat(ethers.formatEther(currentSupply)),
                      currentSupply: parseFloat(ethers.formatEther(currentSupply)),
                      marketCap: 0,
                      price,
                      change24h: 0,
                      volume24h: 0,
                      holders: 0,
                      createdAt: new Date(),
                      curveType: 'linear',
                      bondingCurveProgress: 0,
                      ammAddress,
                      isGraduated: false,
                    },
                    chainId: chain.chainId,
                    chainName: chain.name,
                    balance: balanceNumber,
                    balanceFormatted: formatCurrency(balanceNumber, '', 4),
                    value,
                    valueFormatted: formatCurrency(value, chainConfig.nativeCurrency.symbol, 2),
                    // P&L calculation would require transaction history
                    // For now, we'll set costBasis to null
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

