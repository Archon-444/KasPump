import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useContractProvider } from './useContractProvider';
import { ethers } from 'ethers';

// Mock ethers
vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    JsonRpcProvider: vi.fn().mockImplementation(() => ({
      getNetwork: vi.fn().mockResolvedValue({ chainId: 97 }),
    })),
    BrowserProvider: vi.fn().mockImplementation(() => ({
      getSigner: vi.fn().mockResolvedValue({ address: '0x123' }),
    })),
  };
});

describe('useContractProvider', () => {
  const mockWallet = {
    connected: false,
    address: null,
    chainId: undefined,
    connector: null,
  };

  const chainId = 97;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with provider when RPC URL is configured', () => {
      const { result } = renderHook(() =>
        useContractProvider(mockWallet, chainId)
      );

      expect(result.current.provider).toBeTruthy();
      expect(result.current.signer).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });

    it('should not have signer when wallet is disconnected', () => {
      const { result } = renderHook(() =>
        useContractProvider(mockWallet, chainId)
      );

      expect(result.current.signer).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Wallet Connection', () => {
    it('should mark as connected when wallet connects', async () => {
      const connectedWallet = {
        connected: true,
        address: '0xTest123',
        chainId: 97,
        connector: {
          getProvider: vi.fn().mockResolvedValue({
            request: vi.fn(),
          }),
        },
      };

      const { result } = renderHook(() =>
        useContractProvider(connectedWallet, chainId)
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should initialize signer when wallet is connected', async () => {
      const mockProvider = {
        request: vi.fn(),
      };

      const connectedWallet = {
        connected: true,
        address: '0xTest123',
        chainId: 97,
        connector: {
          getProvider: vi.fn().mockResolvedValue(mockProvider),
        },
      };

      const { result } = renderHook(() =>
        useContractProvider(connectedWallet, chainId)
      );

      await waitFor(() => {
        expect(result.current.signer).toBeTruthy();
      });
    });
  });

  describe('getContractRunner', () => {
    it('should return signer when available', async () => {
      const mockProvider = {
        request: vi.fn(),
      };

      const connectedWallet = {
        connected: true,
        address: '0xTest123',
        chainId: 97,
        connector: {
          getProvider: vi.fn().mockResolvedValue(mockProvider),
        },
      };

      const { result } = renderHook(() =>
        useContractProvider(connectedWallet, chainId)
      );

      await waitFor(() => {
        expect(result.current.signer).toBeTruthy();
      });

      const runner = result.current.getContractRunner(true);
      expect(runner).toBe(result.current.signer);
    });

    it('should return provider for read-only operations', () => {
      const { result } = renderHook(() =>
        useContractProvider(mockWallet, chainId)
      );

      const runner = result.current.getContractRunner(false);
      expect(runner).toBe(result.current.provider);
    });

    it('should throw error when signer required but not available', () => {
      const { result } = renderHook(() =>
        useContractProvider(mockWallet, chainId)
      );

      expect(() => result.current.getContractRunner(true)).toThrow(
        'Wallet not connected. Signer required for this operation.'
      );
    });

    it('should throw error when provider not available', () => {
      // Mock environment without RPC URL
      const originalEnv = process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL;
      delete process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL;

      const { result } = renderHook(() =>
        useContractProvider(mockWallet, chainId)
      );

      expect(() => result.current.getContractRunner(false)).toThrow();

      // Restore
      process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL = originalEnv;
    });
  });

  describe('Chain Switching', () => {
    it('should handle chain ID changes', async () => {
      const mockProvider = {
        request: vi.fn(),
      };

      const connectedWallet = {
        connected: true,
        address: '0xTest123',
        chainId: 97,
        connector: {
          getProvider: vi.fn().mockResolvedValue(mockProvider),
        },
      };

      const { result, rerender } = renderHook(
        ({ wallet, chain }) => useContractProvider(wallet, chain),
        {
          initialProps: { wallet: connectedWallet, chain: 97 },
        }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Change chain
      rerender({ wallet: connectedWallet, chain: 56 });

      // Should still maintain connection
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Wallet Disconnection', () => {
    it('should clear signer when wallet disconnects', async () => {
      const mockProvider = {
        request: vi.fn(),
      };

      const connectedWallet = {
        connected: true,
        address: '0xTest123',
        chainId: 97,
        connector: {
          getProvider: vi.fn().mockResolvedValue(mockProvider),
        },
      };

      const { result, rerender } = renderHook(
        ({ wallet }) => useContractProvider(wallet, chainId),
        {
          initialProps: { wallet: connectedWallet },
        }
      );

      await waitFor(() => {
        expect(result.current.signer).toBeTruthy();
      });

      // Disconnect wallet
      const disconnectedWallet = {
        ...connectedWallet,
        connected: false,
        address: null,
      };

      rerender({ wallet: disconnectedWallet });

      await waitFor(() => {
        expect(result.current.signer).toBeNull();
        expect(result.current.isConnected).toBe(false);
      });
    });
  });

  describe('Initialization', () => {
    it('should mark as initialized when provider is ready', async () => {
      const { result } = renderHook(() =>
        useContractProvider(mockWallet, chainId)
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
    });
  });
});
