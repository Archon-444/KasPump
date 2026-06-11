/**
 * Tests for useMultichainWallet hook
 * Tests wallet connection, chain switching, and balance tracking
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMultichainWallet } from './useMultichainWallet';
import type { Connector } from 'wagmi';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useConnect: vi.fn(),
  useDisconnect: vi.fn(),
  useBalance: vi.fn(),
  useSwitchChain: vi.fn(),
}));

// Mock chain config (V2 Phase 1: Base + Base Sepolia are the active chains)
vi.mock('../config/chains', () => ({
  getChainById: vi.fn((chainId: number) => {
    const chains: Record<number, any> = {
      8453: { id: 8453, name: 'Base' },
      84532: { id: 84532, name: 'Base Sepolia' },
    };
    return chains[chainId];
  }),
  getChainMetadata: vi.fn((chainId: number) => {
    const metadata: Record<number, any> = {
      8453: { name: 'Base' },
      84532: { name: 'Base Sepolia' },
    };
    return metadata[chainId];
  }),
  supportedChains: [
    { id: 8453, name: 'Base' },
    { id: 84532, name: 'Base Sepolia' },
  ],
}));

import * as wagmi from 'wagmi';

describe('useMultichainWallet', () => {
  // Default mock implementations
  const mockAccount = {
    address: undefined,
    isConnected: false,
    chainId: undefined,
    connector: undefined,
  };

  const mockConnect = {
    connect: vi.fn(),
    connectors: [] as Connector[],
    isPending: false,
    error: null,
  };

  const mockDisconnect = {
    disconnect: vi.fn(),
  };

  const mockBalance = {
    data: undefined,
    refetch: vi.fn(),
  };

  const mockSwitchChain = {
    switchChain: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset to default mocks
    (wagmi.useAccount as any).mockReturnValue(mockAccount);
    (wagmi.useConnect as any).mockReturnValue(mockConnect);
    (wagmi.useDisconnect as any).mockReturnValue(mockDisconnect);
    (wagmi.useBalance as any).mockReturnValue(mockBalance);
    (wagmi.useSwitchChain as any).mockReturnValue(mockSwitchChain);
  });

  describe('Initial State', () => {
    it('should initialize with disconnected state', () => {
      const { result } = renderHook(() => useMultichainWallet());

      expect(result.current.connected).toBe(false);
      expect(result.current.address).toBeNull();
      expect(result.current.balance).toBe('0');
      expect(result.current.balanceFormatted).toBe('0');
      expect(result.current.chainId).toBeUndefined();
      expect(result.current.chainName).toBe('Unknown');
    });

    it('should initialize with connected wallet state', () => {
      (wagmi.useAccount as any).mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        chainId: 8453,
        connector: {},
      });

      (wagmi.useBalance as any).mockReturnValue({
        data: {
          value: BigInt('1000000000000000000'), // 1 ETH in wei
          symbol: 'ETH',
          decimals: 18,
        },
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useMultichainWallet());

      expect(result.current.connected).toBe(true);
      expect(result.current.address).toBe('0x1234567890123456789012345678901234567890');
      expect(result.current.chainId).toBe(8453);
      expect(result.current.chainName).toBe('Base');
    });
  });

  describe('Connection State Updates', () => {
    it('should update state when wallet connects', async () => {
      const { result, rerender } = renderHook(() => useMultichainWallet());

      expect(result.current.connected).toBe(false);

      // Simulate connection
      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 84532,
        connector: {},
      });

      rerender();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      expect(result.current.address).toBe('0xABC');
      expect(result.current.chainId).toBe(84532);
    });

    it('should update state when wallet disconnects', async () => {
      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 56,
        connector: {},
      });

      const { result, rerender } = renderHook(() => useMultichainWallet());

      expect(result.current.connected).toBe(true);

      // Simulate disconnection
      (wagmi.useAccount as any).mockReturnValue({
        address: undefined,
        isConnected: false,
        chainId: undefined,
        connector: undefined,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      expect(result.current.address).toBeNull();
    });

    it('should handle chain switching', async () => {
      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 8453,
        connector: {},
      });

      const { result, rerender } = renderHook(() => useMultichainWallet());

      expect(result.current.chainId).toBe(8453);
      expect(result.current.chainName).toBe('Base');

      // Simulate chain switch
      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 84532,
        connector: {},
      });

      rerender();

      await waitFor(() => {
        expect(result.current.chainId).toBe(84532);
      });

      expect(result.current.chainName).toBe('Base Sepolia');
    });
  });

  describe('Balance Formatting', () => {
    it('should format balance correctly with symbol', () => {
      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 56,
        connector: {},
      });

      (wagmi.useBalance as any).mockReturnValue({
        data: {
          value: BigInt('1500000000000000000'), // 1.5 BNB
          symbol: 'BNB',
          decimals: 18,
        },
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useMultichainWallet());

      expect(result.current.balance).toBe('1.5');
      expect(result.current.balanceFormatted).toContain('1.5');
      expect(result.current.balanceFormatted).toContain('BNB');
    });

    it('should handle zero balance', () => {
      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 56,
        connector: {},
      });

      (wagmi.useBalance as any).mockReturnValue({
        data: {
          value: BigInt('0'),
          symbol: 'BNB',
          decimals: 18,
        },
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useMultichainWallet());

      expect(result.current.balance).toBe('0');
      expect(result.current.balanceFormatted).toContain('0');
    });

    it('should handle undefined balance data', () => {
      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 56,
        connector: {},
      });

      (wagmi.useBalance as any).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useMultichainWallet());

      expect(result.current.balance).toBe('0');
      expect(result.current.balanceFormatted).toBe('0');
    });

    it('should format large balances correctly', () => {
      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 56,
        connector: {},
      });

      (wagmi.useBalance as any).mockReturnValue({
        data: {
          value: BigInt('123456789000000000000000'), // 123,456.789 BNB
          symbol: 'BNB',
          decimals: 18,
        },
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useMultichainWallet());

      expect(result.current.balance).toBe('123456.789');
    });
  });

  describe('Connect Functions', () => {
    it('should call wagmi connect with the injected connector', async () => {
      const mockConnector = { id: 'injected', name: 'Injected' } as Connector;
      const connectFn = vi.fn();

      (wagmi.useConnect as any).mockReturnValue({
        connect: connectFn,
        connectors: [mockConnector],
        isPending: false,
        error: null,
      });

      const { result } = renderHook(() => useMultichainWallet());

      await act(async () => {
        await result.current.connectInjected();
      });

      expect(connectFn).toHaveBeenCalledWith({ connector: mockConnector });
    });

    it('should call wagmi connect with the WalletConnect connector', async () => {
      const mockConnector = { id: 'walletConnect', name: 'WalletConnect' } as Connector;
      const connectFn = vi.fn();

      (wagmi.useConnect as any).mockReturnValue({
        connect: connectFn,
        connectors: [mockConnector],
        isPending: false,
        error: null,
      });

      const { result } = renderHook(() => useMultichainWallet());

      await act(async () => {
        await result.current.connectWalletConnect();
      });

      expect(connectFn).toHaveBeenCalledWith({ connector: mockConnector });
    });

    it('should return available connectors', () => {
      const mockConnectors = [
        { id: 'metaMask', name: 'MetaMask' },
        { id: 'walletConnect', name: 'WalletConnect' },
      ] as Connector[];

      (wagmi.useConnect as any).mockReturnValue({
        connect: vi.fn(),
        connectors: mockConnectors,
        isPending: false,
        error: null,
      });

      const { result } = renderHook(() => useMultichainWallet());

      expect(result.current.availableConnectors).toHaveLength(2);
      expect(result.current.availableConnectors).toEqual(mockConnectors);
    });
  });

  describe('Disconnect Function', () => {
    it('should call wagmi disconnect', async () => {
      const disconnectFn = vi.fn();

      (wagmi.useDisconnect as any).mockReturnValue({
        disconnect: disconnectFn,
      });

      const { result } = renderHook(() => useMultichainWallet());

      await act(async () => {
        await result.current.disconnectWallet();
      });

      expect(disconnectFn).toHaveBeenCalled();
    });
  });

  describe('Switch Network Function', () => {
    it('should call switchChain with correct chainId', async () => {
      const switchChainFn = vi.fn().mockResolvedValue(undefined);

      (wagmi.useSwitchChain as any).mockReturnValue({
        switchChain: switchChainFn,
        isPending: false,
      });

      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 56,
        connector: {},
      });

      const { result } = renderHook(() => useMultichainWallet());

      await act(async () => {
        await result.current.switchNetwork(97);
      });

      expect(switchChainFn).toHaveBeenCalledWith({ chainId: 97 });
    });

    it('should return true on successful chain switch', async () => {
      const switchChainFn = vi.fn().mockResolvedValue(undefined);

      (wagmi.useSwitchChain as any).mockReturnValue({
        switchChain: switchChainFn,
        isPending: false,
      });

      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 56,
        connector: {},
      });

      const { result } = renderHook(() => useMultichainWallet());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.switchNetwork(97);
      });

      expect(success).toBe(true);
    });

    it('should return false on failed chain switch', async () => {
      const switchChainFn = vi.fn().mockRejectedValue(new Error('User rejected'));

      (wagmi.useSwitchChain as any).mockReturnValue({
        switchChain: switchChainFn,
        isPending: false,
      });

      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 56,
        connector: {},
      });

      const { result } = renderHook(() => useMultichainWallet());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.switchNetwork(97);
      });

      expect(success).toBe(false);
    });

    it('should handle switching to unsupported chain', async () => {
      const switchChainFn = vi.fn().mockRejectedValue(new Error('Unsupported chain'));

      (wagmi.useSwitchChain as any).mockReturnValue({
        switchChain: switchChainFn,
        isPending: false,
      });

      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 56,
        connector: {},
      });

      const { result } = renderHook(() => useMultichainWallet());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.switchNetwork(999); // Unsupported
      });

      expect(success).toBe(false);
    });
  });

  describe('Connection Status', () => {
    it('should show isConnecting when connection is pending', () => {
      (wagmi.useConnect as any).mockReturnValue({
        connect: vi.fn(),
        connectors: [],
        isPending: true,
        error: null,
      });

      const { result } = renderHook(() => useMultichainWallet());

      expect(result.current.isConnecting).toBe(true);
    });

    it('should show isSwitchingNetwork when chain switch is pending', () => {
      (wagmi.useSwitchChain as any).mockReturnValue({
        switchChain: vi.fn(),
        isPending: true,
      });

      const { result } = renderHook(() => useMultichainWallet());

      expect(result.current.isSwitchingNetwork).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should expose connection errors', () => {
      const error = new Error('Connection failed');

      (wagmi.useConnect as any).mockReturnValue({
        connect: vi.fn(),
        connectors: [],
        isPending: false,
        error,
      });

      const { result } = renderHook(() => useMultichainWallet());

      expect(result.current.error).toBe('Connection failed');
    });

    it('should handle missing connector gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      (wagmi.useConnect as any).mockReturnValue({
        connect: undefined,
        connectors: [],
        isPending: false,
        error: null,
      });

      (wagmi.useDisconnect as any).mockReturnValue({
        disconnect: undefined,
      });

      renderHook(() => useMultichainWallet());

      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Balance Refetch', () => {
    it('should expose balance refresh function', () => {
      const refetchFn = vi.fn();

      (wagmi.useBalance as any).mockReturnValue({
        data: undefined,
        refetch: refetchFn,
      });

      const { result } = renderHook(() => useMultichainWallet());

      act(() => {
        result.current.refreshBalance();
      });

      expect(refetchFn).toHaveBeenCalled();
    });
  });

  describe('Chain Name Resolution', () => {
    it('should show "Unknown" for unsupported chains', () => {
      (wagmi.useAccount as any).mockReturnValue({
        address: '0xABC',
        isConnected: true,
        chainId: 999999, // Unsupported
        connector: {},
      });

      const { result } = renderHook(() => useMultichainWallet());

      expect(result.current.chainName).toBe('Unknown');
    });

    it('should show correct chain names for supported chains', () => {
      const testCases = [
        { chainId: 8453, expectedName: 'Base' },
        { chainId: 84532, expectedName: 'Base Sepolia' },
      ];

      testCases.forEach(({ chainId, expectedName }) => {
        (wagmi.useAccount as any).mockReturnValue({
          address: '0xABC',
          isConnected: true,
          chainId,
          connector: {},
        });

        const { result } = renderHook(() => useMultichainWallet());

        expect(result.current.chainName).toBe(expectedName);
      });
    });
  });
});
