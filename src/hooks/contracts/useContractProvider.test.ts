import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useContractProvider } from './useContractProvider';
import { ethers } from 'ethers';

// Mock contract config so the initialization effect can resolve a factory address
vi.mock('../../config/contracts', () => ({
  getTokenFactoryAddress: vi.fn((chainId: number) => {
    if (chainId === 97 || chainId === 56) return '0xfactory1234567890123456789012345678901234';
    return null;
  }),
}));

// Mock ethers. The implementation uses the `ethers` namespace import
// (ethers.JsonRpcProvider / ethers.BrowserProvider / ethers.Contract),
// so the namespace object must be mocked too.
vi.mock('ethers', async () => {
  const actual = await vi.importActual<any>('ethers');

  const JsonRpcProvider = vi.fn().mockImplementation(() => ({
    getNetwork: vi.fn().mockResolvedValue({ chainId: 97 }),
  }));
  const BrowserProvider = vi.fn().mockImplementation(() => ({
    getSigner: vi.fn().mockResolvedValue({
      getAddress: vi.fn().mockResolvedValue('0xTest123'),
    }),
  }));
  const Contract = vi.fn().mockImplementation(() => ({
    getAllTokens: vi.fn().mockResolvedValue([]),
  }));

  return {
    ...actual,
    JsonRpcProvider,
    BrowserProvider,
    Contract,
    ethers: {
      ...actual.ethers,
      JsonRpcProvider,
      BrowserProvider,
      Contract,
    },
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
        expect(result.current.browserProvider).toBeTruthy();
      });
    });
  });

  describe('Contract runners', () => {
    it('getContractRunner should return signer when available', async () => {
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

      const runner = result.current.getContractRunner();
      expect(runner).toBe(result.current.signer);
    });

    it('getRunnerOrThrow should fall back to the provider when no signer is available', () => {
      const { result } = renderHook(() =>
        useContractProvider(mockWallet, chainId)
      );

      const runner = result.current.getRunnerOrThrow();
      expect(runner).toBe(result.current.provider);
    });

    it('getReadProviderOrThrow should return the read provider', () => {
      const { result } = renderHook(() =>
        useContractProvider(mockWallet, chainId)
      );

      const runner = result.current.getReadProviderOrThrow();
      expect(runner).toBe(result.current.provider);
    });

    it('should throw error when no provider is available', () => {
      // Make JsonRpcProvider construction fail so the provider memo resolves to null
      (ethers.JsonRpcProvider as any).mockImplementationOnce(() => {
        throw new Error('RPC unavailable');
      });

      const { result } = renderHook(() =>
        useContractProvider(mockWallet, chainId)
      );

      expect(result.current.provider).toBeNull();
      expect(() => result.current.getRunnerOrThrow()).toThrow(
        'Blockchain provider not available'
      );
      expect(() => result.current.getReadProviderOrThrow()).toThrow(
        'Blockchain provider not available'
      );
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
    it('should mark as initialized when contract validation succeeds', async () => {
      const { result } = renderHook(() =>
        useContractProvider(mockWallet, chainId)
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
    });

    it('should still mark as initialized when the connectivity test call fails', async () => {
      (ethers.Contract as any).mockImplementationOnce(() => ({
        getAllTokens: vi.fn().mockRejectedValue(new Error('not deployed yet')),
      }));

      const { result } = renderHook(() =>
        useContractProvider(mockWallet, chainId)
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
    });
  });
});
