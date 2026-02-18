/**
 * useBridge Hook
 * Cross-chain token bridging between BSC, Arbitrum, and Base
 *
 * Features:
 * - Chain selection with fee estimation
 * - Bridge transaction tracking
 * - Transfer history
 * - Refund handling for expired transfers
 *
 * @example
 * ```typescript
 * const {
 *   bridge,
 *   getBridgeFee,
 *   transfers,
 *   pendingTransfers,
 * } = useBridge();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';

// ============ Types ============

export interface SupportedChain {
  id: number;
  name: string;
  icon: string;
  nativeCurrency: string;
  bridgeFee: number; // basis points
  minBridge: number;
  maxBridge: number;
  dailyLimit: number;
  dailyUsed: number;
  estimatedTime: number; // minutes
}

export interface BridgeTransfer {
  id: string;
  sender: string;
  recipient: string;
  token: string;
  tokenSymbol: string;
  amount: number;
  fee: number;
  sourceChainId: number;
  destChainId: number;
  status: BridgeStatus;
  txHash?: string;
  completionTxHash?: string;
  createdAt: number;
  completedAt?: number;
  expiresAt: number;
}

export type BridgeStatus = 'pending' | 'processing' | 'completed' | 'refunded' | 'expired';

export interface BridgeQuote {
  inputAmount: number;
  outputAmount: number;
  fee: number;
  feePercent: number;
  estimatedTime: number;
  dailyLimitRemaining: number;
}

export interface UseBridgeReturn {
  // Chain info
  supportedChains: SupportedChain[];
  currentChain: SupportedChain | null;

  // Bridge operations
  bridge: (params: BridgeParams) => Promise<BridgeTransfer>;
  getBridgeQuote: (amount: number, destChainId: number, token: string) => Promise<BridgeQuote>;
  refund: (transferId: string) => Promise<void>;

  // Transfer tracking
  transfers: BridgeTransfer[];
  pendingTransfers: BridgeTransfer[];
  getTransferStatus: (transferId: string) => BridgeTransfer | null;

  // State
  isLoading: boolean;
  isBridging: boolean;
  error: string | null;
}

interface BridgeParams {
  token: string;
  amount: number;
  destChainId: number;
  recipient?: string; // defaults to sender
}

// ============ Supported Chains ============

const SUPPORTED_CHAINS: SupportedChain[] = [
  {
    id: 56,
    name: 'BNB Smart Chain',
    icon: '🟡',
    nativeCurrency: 'BNB',
    bridgeFee: 30, // 0.3%
    minBridge: 0.01,
    maxBridge: 100000,
    dailyLimit: 1000000,
    dailyUsed: 0,
    estimatedTime: 10,
  },
  {
    id: 42161,
    name: 'Arbitrum One',
    icon: '⬜',
    nativeCurrency: 'ETH',
    bridgeFee: 25, // 0.25%
    minBridge: 0.01,
    maxBridge: 100000,
    dailyLimit: 1000000,
    dailyUsed: 0,
    estimatedTime: 5,
  },
  {
    id: 8453,
    name: 'Base',
    icon: '🔵',
    nativeCurrency: 'ETH',
    bridgeFee: 25, // 0.25%
    minBridge: 0.01,
    maxBridge: 100000,
    dailyLimit: 1000000,
    dailyUsed: 0,
    estimatedTime: 5,
  },
];

// ============ Storage Keys ============

const STORAGE_KEYS = {
  transfers: 'kaspump_bridge_transfers',
};

// ============ Hook ============

export function useBridge(): UseBridgeReturn {
  const { address } = useAccount();
  const chainId = useChainId();

  const [transfers, setTransfers] = useState<BridgeTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBridging, setIsBridging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load transfers from localStorage
  useEffect(() => {
    if (!address) {
      setTransfers([]);
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.transfers}_${address}`);
      if (stored) {
        const parsed = JSON.parse(stored) as BridgeTransfer[];
        // Update expired transfers
        const now = Date.now();
        const updated = parsed.map(t =>
          t.status === 'pending' && t.expiresAt < now
            ? { ...t, status: 'expired' as BridgeStatus }
            : t
        );
        setTransfers(updated);
      }
    } catch (err) {
      console.error('Failed to load bridge transfers:', err);
    }

    setIsLoading(false);
  }, [address]);

  // Save transfers to localStorage
  useEffect(() => {
    if (!address || transfers.length === 0) return;
    localStorage.setItem(
      `${STORAGE_KEYS.transfers}_${address}`,
      JSON.stringify(transfers)
    );
  }, [transfers, address]);

  // Get current chain info
  const currentChain = SUPPORTED_CHAINS.find(c => c.id === chainId) || null;

  // Get pending transfers
  const pendingTransfers = transfers.filter(
    t => t.status === 'pending' || t.status === 'processing'
  );

  // Get bridge quote
  const getBridgeQuote = useCallback(async (
    amount: number,
    destChainId: number,
    _token: string
  ): Promise<BridgeQuote> => {
    const destChain = SUPPORTED_CHAINS.find(c => c.id === destChainId);
    if (!destChain) {
      throw new Error('Destination chain not supported');
    }

    const fee = (amount * destChain.bridgeFee) / 10000;
    const outputAmount = amount - fee;
    const dailyLimitRemaining = destChain.dailyLimit - destChain.dailyUsed;

    return {
      inputAmount: amount,
      outputAmount,
      fee,
      feePercent: destChain.bridgeFee / 100,
      estimatedTime: destChain.estimatedTime,
      dailyLimitRemaining,
    };
  }, []);

  // Bridge tokens
  const bridge = useCallback(async (params: BridgeParams): Promise<BridgeTransfer> => {
    const { token, amount, destChainId, recipient } = params;

    if (!address) {
      throw new Error('Please connect your wallet');
    }

    if (!currentChain) {
      throw new Error('Current chain not supported');
    }

    if (destChainId === chainId) {
      throw new Error('Cannot bridge to the same chain');
    }

    const destChain = SUPPORTED_CHAINS.find(c => c.id === destChainId);
    if (!destChain) {
      throw new Error('Destination chain not supported');
    }

    if (amount < destChain.minBridge) {
      throw new Error(`Minimum bridge amount is ${destChain.minBridge}`);
    }

    if (amount > destChain.maxBridge) {
      throw new Error(`Maximum bridge amount is ${destChain.maxBridge}`);
    }

    setIsBridging(true);
    setError(null);

    try {
      const quote = await getBridgeQuote(amount, destChainId, token);

      if (quote.dailyLimitRemaining < amount) {
        throw new Error('Daily bridge limit exceeded. Try again tomorrow.');
      }

      // In production, would call the bridge contract
      // For now, simulate the bridge transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      const transfer: BridgeTransfer = {
        id: `bridge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        sender: address,
        recipient: recipient || address,
        token,
        tokenSymbol: 'TOKEN', // Would fetch from contract
        amount: quote.outputAmount,
        fee: quote.fee,
        sourceChainId: chainId,
        destChainId,
        status: 'pending',
        txHash: `0x${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      setTransfers(prev => [transfer, ...prev]);

      // Simulate processing and completion
      simulateTransferCompletion(transfer.id);

      return transfer;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bridge failed';
      setError(message);
      throw err;
    } finally {
      setIsBridging(false);
    }
  }, [address, chainId, currentChain, getBridgeQuote]);

  // Simulate transfer completion (for demo)
  const simulateTransferCompletion = (transferId: string) => {
    // Update to processing after 3 seconds
    setTimeout(() => {
      setTransfers(prev => prev.map(t =>
        t.id === transferId ? { ...t, status: 'processing' as BridgeStatus } : t
      ));
    }, 3000);

    // Complete after 10 seconds
    setTimeout(() => {
      setTransfers(prev => prev.map(t =>
        t.id === transferId
          ? {
              ...t,
              status: 'completed' as BridgeStatus,
              completedAt: Date.now(),
              completionTxHash: `0x${Math.random().toString(16).slice(2)}`,
            }
          : t
      ));
    }, 10000);
  };

  // Refund expired transfer
  const refund = useCallback(async (transferId: string): Promise<void> => {
    if (!address) {
      throw new Error('Please connect your wallet');
    }

    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'expired') {
      throw new Error('Can only refund expired transfers');
    }

    if (transfer.sender.toLowerCase() !== address.toLowerCase()) {
      throw new Error('Only the sender can request a refund');
    }

    setIsLoading(true);
    setError(null);

    try {
      // In production, would call bridge contract refund
      await new Promise(resolve => setTimeout(resolve, 2000));

      setTransfers(prev => prev.map(t =>
        t.id === transferId ? { ...t, status: 'refunded' as BridgeStatus } : t
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refund failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address, transfers]);

  // Get transfer status
  const getTransferStatus = useCallback((transferId: string): BridgeTransfer | null => {
    return transfers.find(t => t.id === transferId) || null;
  }, [transfers]);

  return {
    supportedChains: SUPPORTED_CHAINS,
    currentChain,
    bridge,
    getBridgeQuote,
    refund,
    transfers,
    pendingTransfers,
    getTransferStatus,
    isLoading,
    isBridging,
    error,
  };
}

/**
 * useChainSwitch - Switch between supported chains
 */
export function useChainSwitch() {
  const chainId = useChainId();
  const [isSwitching, setIsSwitching] = useState(false);

  const switchChain = useCallback(async (targetChainId: number): Promise<void> => {
    if (chainId === targetChainId) return;

    const chain = SUPPORTED_CHAINS.find(c => c.id === targetChainId);
    if (!chain) {
      throw new Error('Chain not supported');
    }

    setIsSwitching(true);

    try {
      if (!window.ethereum) {
        throw new Error('No wallet detected');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (err: unknown) {
      // Chain not added, try to add it
      const error = err as { code?: number };
      if (error.code === 4902) {
        // Would add the chain here
        throw new Error('Please add this network to your wallet');
      }
      throw err;
    } finally {
      setIsSwitching(false);
    }
  }, [chainId]);

  return {
    currentChainId: chainId,
    switchChain,
    isSwitching,
    supportedChains: SUPPORTED_CHAINS,
  };
}

export default useBridge;
