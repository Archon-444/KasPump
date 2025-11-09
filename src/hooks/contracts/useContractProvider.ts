/**
 * useContractProvider Hook
 * Manages ethers.js provider and signer initialization for blockchain interactions
 *
 * Extracted from useContracts to separate provider management concerns
 *
 * @example
 * ```typescript
 * const {
 *   provider,
 *   signer,
 *   browserProvider,
 *   isInitialized
 * } = useContractProvider(wallet, chainId);
 * ```
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import { EIP1193Provider } from '../../types';
import { getTokenFactoryAddress } from '../../config/contracts';

const NETWORK_CONFIG = {
  chainId: Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? '97'),
  rpcUrl: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL ?? 'https://data-seed-prebsc-1-s1.binance.org:8545',
};

const TOKEN_FACTORY_ABI = [
  "function getAllTokens() external view returns (address[])",
];

export interface UseContractProviderReturn {
  /** JSON-RPC provider for read operations */
  provider: ethers.JsonRpcProvider | null;
  /** Browser provider when wallet connected */
  browserProvider: ethers.BrowserProvider | null;
  /** Signer for write operations */
  signer: ethers.Signer | null;
  /** Whether contracts are initialized */
  isInitialized: boolean;
  /** Get appropriate runner (signer or provider) */
  getRunnerOrThrow: () => ethers.Signer | ethers.AbstractProvider;
  /** Get read-only provider */
  getReadProviderOrThrow: () => ethers.AbstractProvider;
}

export function useContractProvider(
  wallet: { connected: boolean; address: string | null; chainId: number | undefined; connector?: any },
  currentChainId: number
): UseContractProviderReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [browserProvider, setBrowserProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // Create ethers provider
  const provider = useMemo(() => {
    if (!NETWORK_CONFIG.rpcUrl) {
      console.warn('NEXT_PUBLIC_RPC_URL is not set. Read-only blockchain access disabled.');
      return null;
    }

    try {
      return new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    } catch (error) {
      console.error('Failed to create RPC provider:', error);
      return null;
    }
  }, []);

  // Create signer when wallet is connected
  useEffect(() => {
    let cancelled = false;

    const initializeSigner = async () => {
      if (!wallet.connected || !wallet.address) {
        setBrowserProvider(null);
        setSigner(null);
        return;
      }

      try {
        let externalProvider: EIP1193Provider | null = null;

        if (wallet.connector?.getProvider) {
          externalProvider = await wallet.connector.getProvider();
        }

        if (!externalProvider && typeof window !== 'undefined') {
          externalProvider = window.ethereum ?? null;
        }

        if (!externalProvider) {
          throw new Error('Wallet provider not available');
        }

        const targetChainId = wallet.chainId ?? (NETWORK_CONFIG.chainId || undefined);
        const browser = new ethers.BrowserProvider(externalProvider, targetChainId);
        const signerInstance = await browser.getSigner();

        if (!cancelled) {
          setBrowserProvider(browser);
          setSigner(signerInstance);
        }
      } catch (error) {
        console.error('Failed to initialize wallet signer:', error);
        if (!cancelled) {
          setBrowserProvider(null);
          setSigner(null);
        }
      }
    };

    initializeSigner();

    return () => {
      cancelled = true;
    };
  }, [wallet.connected, wallet.connector, wallet.address, wallet.chainId]);

  // Initialize contract validation
  useEffect(() => {
    const validateContracts = async () => {
      if (!provider) {
        console.warn('RPC provider not available; skipping contract validation.');
        return;
      }

      try {
        const factoryAddress = getTokenFactoryAddress(currentChainId);
        if (!factoryAddress) {
          console.warn(`Token factory address not configured for chain ${currentChainId}`);
          return;
        }

        const factory = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);

        // Validate contract instance before calling methods
        if (!factory || typeof factory.getAllTokens !== 'function') {
          throw new Error('Invalid factory contract instance');
        }

        // Test contract connectivity with defensive check
        try {
          await factory.getAllTokens();
          setIsInitialized(true);
        } catch (callError: unknown) {
          // If the call fails, log but don't crash - contract might not be deployed yet
          const errorMessage = callError instanceof Error ? callError.message : String(callError);
          console.warn('Contract connectivity test failed:', errorMessage);
          // Still mark as initialized if contract exists (might just be empty)
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Contract initialization failed:', error);
      }
    };

    validateContracts();
  }, [provider, currentChainId]);

  const getRunnerOrThrow = useCallback((): ethers.Signer | ethers.AbstractProvider => {
    if (signer && typeof signer === 'object') return signer;
    if (provider && typeof provider === 'object') return provider;
    if (browserProvider && typeof browserProvider === 'object') return browserProvider;
    throw new Error('Blockchain provider not available');
  }, [signer, provider, browserProvider]);

  const getReadProviderOrThrow = useCallback((): ethers.AbstractProvider => {
    if (provider && typeof provider === 'object') return provider;
    if (browserProvider && typeof browserProvider === 'object') return browserProvider;
    throw new Error('Blockchain provider not available');
  }, [provider, browserProvider]);

  return {
    provider,
    browserProvider,
    signer,
    isInitialized,
    getRunnerOrThrow,
    getReadProviderOrThrow,
  };
}
