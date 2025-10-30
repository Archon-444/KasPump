// Real Kasplex Wallet Integration
import { useEffect, useState, useCallback } from 'react';
import { WalletState, ContractError } from '../types';

// Kasplex SDK types (since @kasplex/kiwi-web may not have perfect types)
interface KasplexWallet {
  connect(): Promise<string[]>;
  disconnect(): Promise<void>;
  getBalance(address: string): Promise<string>;
  signTransaction(tx: any): Promise<string>;
  isConnected(): boolean;
  getAccount(): string | null;
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}

declare global {
  interface Window {
    kasplex?: KasplexWallet;
  }
}

export function useKasplexWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    address: null,
    kasBalance: 0,
    isConnecting: false,
    error: null,
  });

  const [isSupported, setIsSupported] = useState(false);

  // Check if Kasplex wallet is available
  useEffect(() => {
    const checkWalletAvailability = () => {
      if (typeof window !== 'undefined' && window.kasplex) {
        setIsSupported(true);
        
        // Check if already connected
        if (window.kasplex.isConnected()) {
          const address = window.kasplex.getAccount();
          if (address) {
            setWalletState(prev => ({
              ...prev,
              connected: true,
              address,
            }));
            updateBalance(address);
          }
        }
      } else {
        // Wait a bit for wallet to load
        setTimeout(checkWalletAvailability, 500);
      }
    };

    checkWalletAvailability();
  }, []);

  // Update KAS balance
  const updateBalance = useCallback(async (address: string) => {
    if (!window.kasplex) return;
    
    try {
      const balanceWei = await window.kasplex.getBalance(address);
      const balanceKas = parseFloat(balanceWei) / 1e18; // Convert from wei to KAS
      
      setWalletState(prev => ({
        ...prev,
        kasBalance: balanceKas,
      }));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async (): Promise<boolean> => {
    if (!window.kasplex) {
      setWalletState(prev => ({
        ...prev,
        error: 'Kasplex wallet not found. Please install it first.',
      }));
      return false;
    }

    setWalletState(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      const accounts = await window.kasplex.connect();
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        
        setWalletState(prev => ({
          ...prev,
          connected: true,
          address,
          isConnecting: false,
        }));

        await updateBalance(address);
        return true;
      } else {
        throw new Error('No accounts returned from wallet');
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      
      setWalletState(prev => ({
        ...prev,
        connected: false,
        address: null,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      }));
      
      return false;
    }
  }, [updateBalance]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    if (!window.kasplex) return;

    try {
      await window.kasplex.disconnect();
      
      setWalletState({
        connected: false,
        address: null,
        kasBalance: 0,
        isConnecting: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, []);

  // Sign transaction
  const signTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!window.kasplex || !walletState.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await window.kasplex.signTransaction(transaction);
      return signature;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign transaction');
    }
  }, [walletState.connected]);

  // Listen for account changes
  useEffect(() => {
    if (!window.kasplex) return;

    const handleAccountChange = (accounts: string[]) => {
      if (accounts.length === 0) {
        // Disconnected
        setWalletState({
          connected: false,
          address: null,
          kasBalance: 0,
          isConnecting: false,
          error: null,
        });
      } else {
        // Account changed
        const newAddress = accounts[0];
        setWalletState(prev => ({
          ...prev,
          address: newAddress,
        }));
        updateBalance(newAddress);
      }
    };

    const handleChainChange = () => {
      // Refresh balance on network change
      if (walletState.address) {
        updateBalance(walletState.address);
      }
    };

    window.kasplex.on('accountsChanged', handleAccountChange);
    window.kasplex.on('chainChanged', handleChainChange);

    return () => {
      if (window.kasplex) {
        window.kasplex.off('accountsChanged', handleAccountChange);
        window.kasplex.off('chainChanged', handleChainChange);
      }
    };
  }, [walletState.address, updateBalance]);

  // Refresh balance manually
  const refreshBalance = useCallback(() => {
    if (walletState.address) {
      updateBalance(walletState.address);
    }
  }, [walletState.address, updateBalance]);

  return {
    ...walletState,
    isSupported,
    connectWallet,
    disconnectWallet,
    signTransaction,
    refreshBalance,
  };
}

// Wallet connection helper for UI components
export function formatKasBalance(balance: number): string {
  if (balance === 0) return '0 KAS';
  if (balance < 0.001) return '<0.001 KAS';
  if (balance < 1) return balance.toFixed(6) + ' KAS';
  if (balance < 1000) return balance.toFixed(3) + ' KAS';
  if (balance < 1000000) return (balance / 1000).toFixed(2) + 'K KAS';
  return (balance / 1000000).toFixed(2) + 'M KAS';
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Error handling utilities
export function parseWalletError(error: any): ContractError {
  if (error?.code === 4001) {
    return {
      code: 'USER_REJECTED',
      message: 'Transaction was rejected by user',
    };
  }
  
  if (error?.code === -32603) {
    return {
      code: 'INTERNAL_ERROR',
      message: 'Internal wallet error occurred',
    };
  }
  
  if (error?.message?.includes('insufficient funds')) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient KAS balance for transaction',
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: error?.message || 'An unknown error occurred',
  };
}

// Hook for wallet connection status
export function useWalletConnection() {
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    const checkInstallation = () => {
      setIsInstalled(typeof window !== 'undefined' && !!window.kasplex);
    };
    
    checkInstallation();
    
    // Check again after a delay in case wallet loads asynchronously
    const timer = setTimeout(checkInstallation, 1000);
    return () => clearTimeout(timer);
  }, []);
  
  return { isInstalled };
}
