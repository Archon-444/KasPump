// Universal Multichain Wallet Hook
'use client';

import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from 'wagmi';
import { useCallback, useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { getChainById, getChainMetadata, supportedChains } from '../config/chains';

export interface MultichainWalletState {
  connected: boolean;
  address: string | null;
  balance: string;
  balanceFormatted: string;
  chainId: number | undefined;
  chainName: string;
  isConnecting: boolean;
  error: string | null;
}

export function useMultichainWallet() {
  const { address, isConnected, chainId, connector } = useAccount();
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address,
  });
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [walletState, setWalletState] = useState<MultichainWalletState>({
    connected: false,
    address: null,
    balance: '0',
    balanceFormatted: '0',
    chainId: undefined,
    chainName: 'Unknown',
    isConnecting: false,
    error: null,
  });

  // Update wallet state when account changes
  useEffect(() => {
    const chain = chainId ? getChainById(chainId) : undefined;
    const chainMeta = chainId ? getChainMetadata(chainId) : undefined;

    setWalletState({
      connected: isConnected,
      address: address || null,
      balance: balanceData?.value ? formatEther(balanceData.value) : '0',
      balanceFormatted: balanceData ? `${Number(formatEther(balanceData.value)).toFixed(4)} ${balanceData.symbol}` : '0',
      chainId,
      chainName: chainMeta?.name || chain?.name || 'Unknown',
      isConnecting,
      error: connectError?.message || null,
    });
  }, [isConnected, address, chainId, balanceData, isConnecting, connectError]);

  // Connect to MetaMask/Injected wallet
  const connectInjected = useCallback(async () => {
    const injectedConnector = connectors.find(c => c.id === 'injected' || c.id === 'metaMask');
    if (injectedConnector) {
      try {
        await connect({ connector: injectedConnector });
        return true;
      } catch (error) {
        console.error('Failed to connect:', error);
        return false;
      }
    }
    return false;
  }, [connect, connectors]);

  // Connect to WalletConnect
  const connectWalletConnect = useCallback(async () => {
    const wcConnector = connectors.find(c => c.id === 'walletConnect');
    if (wcConnector) {
      try {
        await connect({ connector: wcConnector });
        return true;
      } catch (error) {
        console.error('Failed to connect:', error);
        return false;
      }
    }
    return false;
  }, [connect, connectors]);

  // Connect to Coinbase Wallet
  const connectCoinbase = useCallback(async () => {
    const cbConnector = connectors.find(c => c.id === 'coinbaseWallet');
    if (cbConnector) {
      try {
        await connect({ connector: cbConnector });
        return true;
      } catch (error) {
        console.error('Failed to connect:', error);
        return false;
      }
    }
    return false;
  }, [connect, connectors]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }, [disconnect]);

  // Switch network
  const switchNetwork = useCallback(
    async (targetChainId: number) => {
      if (!switchChain) return false;
      try {
        await switchChain({ chainId: targetChainId } as any);
        return true;
      } catch (error) {
        console.error('Failed to switch network:', error);
        return false;
      }
    },
    [switchChain]
  );

  // Refresh balance
  const refreshBalance = useCallback(() => {
    refetchBalance();
  }, [refetchBalance]);

  return {
    ...walletState,
    connectInjected,
    connectWalletConnect,
    connectCoinbase,
    disconnectWallet,
    switchNetwork,
    refreshBalance,
    connectorName: connector?.name,
    availableConnectors: connectors,
    isSwitchingNetwork: isSwitching,
    connector,
  };
}

// Format balance for display
export function formatBalance(balance: string | number, symbol: string = 'ETH'): string {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;

  if (num === 0) return `0 ${symbol}`;
  if (num < 0.0001) return `<0.0001 ${symbol}`;
  if (num < 1) return `${num.toFixed(6)} ${symbol}`;
  if (num < 1000) return `${num.toFixed(4)} ${symbol}`;
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K ${symbol}`;
  return `${(num / 1000000).toFixed(2)}M ${symbol}`;
}

// Format address for display
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
