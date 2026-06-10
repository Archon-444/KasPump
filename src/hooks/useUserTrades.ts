/**
 * useUserTrades — fetch the connected wallet's trade history.
 *
 * Queries Trade events from each held token's BondingCurveAMM, filtered by
 * the trader indexed parameter. Scans a bounded recent block window per chain
 * (public RPCs cap eth_getLogs ranges), so very old trades may not appear
 * until subgraph indexing lands.
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { BlockchainService } from '@/services/blockchain';
import type { PortfolioToken } from './usePortfolio';

export interface UserTrade {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chainId: number;
  type: 'buy' | 'sell';
  nativeAmount: number;
  tokenAmount: number;
  price: number;
  timestamp: number; // ms
  txHash: string;
}

const BLOCKS_TO_SCAN = 50_000;

async function fetchTradesForToken(
  walletAddress: string,
  token: PortfolioToken
): Promise<UserTrade[]> {
  const ammAddress = token.token.ammAddress;
  if (!ammAddress || ammAddress === ethers.ZeroAddress) return [];

  try {
    const provider = BlockchainService.getProvider(token.chainId);
    const amm = BlockchainService.getAMM(ammAddress, token.chainId);

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - BLOCKS_TO_SCAN);

    // trader is the first indexed param on the Trade event
    const filter = amm.filters.Trade(walletAddress);
    const events = await amm.queryFilter(filter, fromBlock, currentBlock);

    return events.map(e => ({
      tokenAddress: token.token.address,
      tokenSymbol: token.token.symbol,
      tokenName: token.token.name,
      chainId: token.chainId,
      type: e.args.isBuy ? 'buy' as const : 'sell' as const,
      nativeAmount: parseFloat(ethers.formatEther(e.args.nativeAmount)),
      tokenAmount: parseFloat(ethers.formatEther(e.args.tokenAmount)),
      price: parseFloat(ethers.formatEther(e.args.newPrice)),
      timestamp: Number(e.args.timestamp) * 1000,
      txHash: e.transactionHash,
    }));
  } catch (error) {
    console.warn(`Failed to fetch trades for ${token.token.symbol}:`, error);
    return [];
  }
}

export function useUserTrades(walletAddress: string | null, tokens: PortfolioToken[]) {
  const [trades, setTrades] = useState<UserTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    if (!walletAddress || tokens.length === 0) {
      setTrades([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        tokens.map(token => fetchTradesForToken(walletAddress, token))
      );

      const all = results.flat().sort((a, b) => b.timestamp - a.timestamp);
      setTrades(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trade history');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, tokens]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  return { trades, loading, error, refresh: fetchTrades };
}
