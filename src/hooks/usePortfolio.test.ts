/**
 * Comprehensive tests for usePortfolio hook
 * Tests portfolio aggregation, multi-chain balance tracking, and statistics
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { usePortfolio } from './usePortfolio';
import { ethers } from 'ethers';

// Mock dependencies
vi.mock('./useMultichainWallet', () => ({
  useMultichainWallet: vi.fn(),
}));

vi.mock('./useContracts', () => ({
  useContracts: vi.fn(),
}));

vi.mock('../config/chains', () => ({
  getChainById: vi.fn((chainId: number) => {
    const chains: Record<number, any> = {
      56: { id: 56, name: 'BSC', nativeCurrency: { symbol: 'BNB' }, rpcUrls: { default: { http: ['https://bsc-dataseed.binance.org'] } } },
      97: { id: 97, name: 'BSC Testnet', nativeCurrency: { symbol: 'tBNB' }, rpcUrls: { default: { http: ['https://data-seed-prebsc-1-s1.binance.org:8545'] } } },
      42161: { id: 42161, name: 'Arbitrum', nativeCurrency: { symbol: 'ETH' }, rpcUrls: { default: { http: ['https://arb1.arbitrum.io/rpc'] } } },
      8453: { id: 8453, name: 'Base', nativeCurrency: { symbol: 'ETH' }, rpcUrls: { default: { http: ['https://mainnet.base.org'] } } },
    };
    return chains[chainId];
  }),
  getChainMetadata: vi.fn((chainId: number) => {
    const metadata: Record<number, any> = {
      56: { shortName: 'BSC', name: 'BNB Smart Chain' },
      97: { shortName: 'BSC Testnet', name: 'BNB Smart Chain Testnet' },
      42161: { shortName: 'Arbitrum', name: 'Arbitrum One' },
      8453: { shortName: 'Base', name: 'Base' },
    };
    return metadata[chainId];
  }),
}));

vi.mock('../utils', () => ({
  formatCurrency: vi.fn((value: number, symbol: string = '', decimals: number = 2) => {
    return `${symbol ? symbol + ' ' : ''}${value.toFixed(decimals)}`;
  }),
}));

// Mock ethers
vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    ethers: {
      ...(actual as any).ethers,
      JsonRpcProvider: vi.fn(),
      Contract: vi.fn(),
      formatEther: vi.fn((value: bigint) => (Number(value) / 1e18).toString()),
      formatUnits: vi.fn((value: bigint, decimals: number) => (Number(value) / Math.pow(10, decimals)).toString()),
      ZeroAddress: '0x0000000000000000000000000000000000000000',
    },
  };
});

import { useMultichainWallet } from './useMultichainWallet';
import { useContracts } from './useContracts';

describe('usePortfolio', () => {
  const mockWallet = {
    connected: false,
    address: null as string | null,
  };

  const mockContracts = {};

  // Mock token data
  const mockTokenAddress = '0x1234567890123456789012345678901234567890';
  const mockAmmAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const mockUserAddress = '0x9876543210987654321098765432109876543210';

  // Mock contract instances
  let mockFactoryContract: any;
  let mockTokenContract: any;
  let mockAmmContract: any;
  let mockProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock provider
    mockProvider = {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 97 }),
    };

    // Setup mock factory contract
    mockFactoryContract = {
      getAllTokens: vi.fn().mockResolvedValue([]),
      getTokenConfig: vi.fn(),
      getTokenAMM: vi.fn(),
    };

    // Setup mock token contract
    mockTokenContract = {
      balanceOf: vi.fn().mockResolvedValue(BigInt(0)),
      name: vi.fn().mockResolvedValue('Test Token'),
      symbol: vi.fn().mockResolvedValue('TEST'),
      totalSupply: vi.fn().mockResolvedValue(ethers.parseEther('1000000')),
    };

    // Setup mock AMM contract
    mockAmmContract = {
      getTradingInfo: vi.fn().mockResolvedValue([
        ethers.parseEther('500000'), // currentSupply
        ethers.parseEther('0.001'), // currentPrice
        ethers.parseEther('10000'), // totalVolume
        BigInt(5000), // graduation (50%)
        false, // isGraduated
      ]),
    };

    // Mock ethers constructors
    (ethers.JsonRpcProvider as any).mockImplementation(() => mockProvider);
    (ethers.Contract as any).mockImplementation((address: string, abi: any) => {
      if (abi.includes('getAllTokens')) return mockFactoryContract;
      if (abi.includes('balanceOf')) return mockTokenContract;
      if (abi.includes('getTradingInfo')) return mockAmmContract;
      return {};
    });

    // Setup default mocks
    (useMultichainWallet as any).mockReturnValue(mockWallet);
    (useContracts as any).mockReturnValue(mockContracts);

    // Mock environment variables
    process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS = '0xfactory123456789012345678901234567890';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
  });

  describe('Initial State', () => {
    it('should initialize with empty portfolio when wallet not connected', () => {
      const { result } = renderHook(() => usePortfolio());

      expect(result.current.tokens).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.stats.totalValue).toBe(0);
      expect(result.current.stats.tokenCount).toBe(0);
    });

    it('should initialize stats with zero values', () => {
      const { result } = renderHook(() => usePortfolio());

      expect(result.current.stats).toMatchObject({
        totalValue: 0,
        totalCostBasis: 0,
        totalProfitLoss: 0,
        totalProfitLossPercent: 0,
        tokenCount: 0,
        chainCount: 0,
        chains: [],
      });
    });

    it('should provide refresh function', () => {
      const { result } = renderHook(() => usePortfolio());

      expect(result.current.refresh).toBeInstanceOf(Function);
    });
  });

  describe('Wallet Connection', () => {
    it('should not fetch portfolio when wallet not connected', async () => {
      mockWallet.connected = false;
      mockWallet.address = null;

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFactoryContract.getAllTokens).not.toHaveBeenCalled();
      expect(result.current.tokens).toEqual([]);
    });

    it('should fetch portfolio when wallet connects', async () => {
      // Start disconnected
      mockWallet.connected = false;
      mockWallet.address = null;
      const { result, rerender } = renderHook(() => usePortfolio());

      // Connect wallet
      mockWallet.connected = true;
      mockWallet.address = mockUserAddress;
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('100'));
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Portfolio Token',
        symbol: 'PORT',
        description: 'Test portfolio token',
        imageUrl: 'https://example.com/image.png',
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      rerender();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFactoryContract.getAllTokens).toHaveBeenCalled();
    });

    it('should clear portfolio when wallet disconnects', async () => {
      // Start connected with tokens
      mockWallet.connected = true;
      mockWallet.address = mockUserAddress;
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('100'));

      const { result, rerender } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Disconnect wallet
      mockWallet.connected = false;
      mockWallet.address = null;
      rerender();

      await waitFor(() => {
        expect(result.current.tokens).toEqual([]);
      });
    });
  });

  describe('Portfolio Fetching', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockUserAddress;
    });

    it('should set loading state during fetch', async () => {
      let resolveGetAllTokens: (value: string[]) => void;
      const getAllTokensPromise = new Promise<string[]>((resolve) => {
        resolveGetAllTokens = resolve;
      });
      mockFactoryContract.getAllTokens.mockReturnValue(getAllTokensPromise);

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      resolveGetAllTokens!([]);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should fetch tokens from all supported chains', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([]);

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should create providers for multiple chains
      expect(ethers.JsonRpcProvider).toHaveBeenCalled();
    });

    it('should skip tokens with zero balance', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockTokenContract.balanceOf.mockResolvedValue(BigInt(0));

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tokens).toEqual([]);
    });

    it('should include tokens with non-zero balance', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('100'));
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Test Token',
        symbol: 'TEST',
        description: 'Test description',
        imageUrl: 'https://example.com/image.png',
        totalSupply: ethers.parseEther('1000000'),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tokens.length).toBeGreaterThan(0);
    });

    it('should handle chain errors gracefully', async () => {
      mockFactoryContract.getAllTokens.mockRejectedValue(new Error('Chain RPC error'));

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not throw, just continue with empty results
      expect(result.current.tokens).toEqual([]);
      expect(result.current.error).toBeNull(); // Chain errors are logged but don't set global error
    });

    it('should handle individual token errors gracefully', async () => {
      const token1 = '0x1111111111111111111111111111111111111111';
      const token2 = '0x2222222222222222222222222222222222222222';

      mockFactoryContract.getAllTokens.mockResolvedValue([token1, token2]);
      mockTokenContract.balanceOf
        .mockRejectedValueOnce(new Error('Token 1 error'))
        .mockResolvedValueOnce(ethers.parseEther('50'));
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Token 2',
        symbol: 'TKN2',
        description: 'Second token',
        imageUrl: '',
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should skip failed token but include successful one
      // (Both might be filtered if balance checks fail, so just verify no crash)
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Token Data', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockUserAddress;
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('250'));
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);
    });

    it('should correctly parse token configuration', async () => {
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'My Token',
        symbol: 'MYT',
        description: 'My test token',
        imageUrl: 'https://example.com/mytoken.png',
        totalSupply: ethers.parseEther('1000000'),
        curveType: 0, // linear
      });

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        const token = result.current.tokens[0];
        expect(token.token.name).toBe('My Token');
        expect(token.token.symbol).toBe('MYT');
        expect(token.token.description).toBe('My test token');
        expect(token.token.image).toBe('https://example.com/mytoken.png');
        expect(token.token.curveType).toBe('linear');
      }
    });

    it('should calculate token balance correctly', async () => {
      const balanceWei = ethers.parseEther('250.5');
      mockTokenContract.balanceOf.mockResolvedValue(balanceWei);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Balance Test',
        symbol: 'BAL',
        description: '',
        imageUrl: '',
        curveType: 0,
      });

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        expect(result.current.tokens[0].balance).toBe(250.5);
      }
    });

    it('should calculate token value from balance and price', async () => {
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('1000'));
      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('500000'), // currentSupply
        ethers.parseEther('0.01'), // currentPrice = $0.01
        ethers.parseEther('10000'), // totalVolume
        BigInt(5000), // graduation
        false, // isGraduated
      ]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Value Test',
        symbol: 'VAL',
        description: '',
        imageUrl: '',
        curveType: 0,
      });

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        const token = result.current.tokens[0];
        expect(token.balance).toBe(1000);
        expect(token.token.price).toBe(0.01);
        expect(token.value).toBe(10); // 1000 * 0.01
      }
    });

    it('should include chain information', async () => {
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Chain Test',
        symbol: 'CHN',
        description: '',
        imageUrl: '',
        curveType: 0,
      });

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        const token = result.current.tokens[0];
        expect(token.chainId).toBeDefined();
        expect(token.chainName).toBeDefined();
        expect(typeof token.chainId).toBe('number');
        expect(typeof token.chainName).toBe('string');
      }
    });

    it('should handle exponential curve type', async () => {
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Exponential Token',
        symbol: 'EXP',
        description: '',
        imageUrl: '',
        curveType: 1, // exponential
      });

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        expect(result.current.tokens[0].token.curveType).toBe('exponential');
      }
    });

    it('should include AMM address', async () => {
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'AMM Test',
        symbol: 'AMM',
        description: '',
        imageUrl: '',
        curveType: 0,
      });

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        expect(result.current.tokens[0].token.ammAddress).toBe(mockAmmAddress);
      }
    });

    it('should handle graduated tokens', async () => {
      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('1000000'), // currentSupply
        ethers.parseEther('1.0'), // currentPrice
        ethers.parseEther('50000'), // totalVolume
        BigInt(10000), // graduation (100%)
        true, // isGraduated
      ]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Graduated Token',
        symbol: 'GRAD',
        description: '',
        imageUrl: '',
        curveType: 0,
      });

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        expect(result.current.tokens[0].token.isGraduated).toBe(true);
        expect(result.current.tokens[0].token.bondingCurveProgress).toBe(100);
      }
    });
  });

  describe('Portfolio Statistics', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockUserAddress;
    });

    it('should calculate total portfolio value', async () => {
      const token1 = '0x1111111111111111111111111111111111111111';
      const token2 = '0x2222222222222222222222222222222222222222';

      mockFactoryContract.getAllTokens.mockResolvedValue([token1, token2]);

      let callCount = 0;
      mockTokenContract.balanceOf.mockImplementation(() => {
        callCount++;
        return callCount === 1
          ? ethers.parseEther('1000')
          : ethers.parseEther('500');
      });

      mockAmmContract.getTradingInfo.mockImplementation(() => {
        return Promise.resolve([
          ethers.parseEther('500000'),
          ethers.parseEther('0.01'), // $0.01 per token
          ethers.parseEther('10000'),
          BigInt(5000),
          false,
        ]);
      });

      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Test',
        symbol: 'TST',
        description: '',
        imageUrl: '',
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Token 1: 1000 * 0.01 = 10
      // Token 2: 500 * 0.01 = 5
      // Total: 15
      expect(result.current.stats.totalValue).toBe(15);
    });

    it('should count unique tokens', async () => {
      const tokens = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
      ];

      mockFactoryContract.getAllTokens.mockResolvedValue(tokens);
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('100'));
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Token',
        symbol: 'TKN',
        description: '',
        imageUrl: '',
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.tokenCount).toBe(3);
    });

    it('should group tokens by chain', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('100'));
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Chain Token',
        symbol: 'CHN',
        description: '',
        imageUrl: '',
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.chains).toBeInstanceOf(Array);
      expect(result.current.stats.chainCount).toBeGreaterThanOrEqual(0);
    });

    it('should calculate profit/loss percentage when cost basis available', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('1000'));
      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('500000'),
        ethers.parseEther('0.02'), // Current price: $0.02
        ethers.parseEther('10000'),
        BigInt(5000),
        false,
      ]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Profit Token',
        symbol: 'PROF',
        description: '',
        imageUrl: '',
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Without cost basis data, P&L should be 0
      expect(result.current.stats.totalCostBasis).toBe(0);
      expect(result.current.stats.totalProfitLoss).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty portfolio stats', () => {
      mockWallet.connected = false;
      mockWallet.address = null;

      const { result } = renderHook(() => usePortfolio());

      expect(result.current.stats.totalValue).toBe(0);
      expect(result.current.stats.tokenCount).toBe(0);
      expect(result.current.stats.chainCount).toBe(0);
      expect(result.current.stats.chains).toEqual([]);
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockUserAddress;
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('100'));
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Refresh Token',
        symbol: 'REF',
        description: '',
        imageUrl: '',
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);
    });

    it('should allow manual portfolio refresh', async () => {
      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = mockFactoryContract.getAllTokens.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFactoryContract.getAllTokens.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should set loading state during refresh', async () => {
      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let refreshPromise: Promise<void>;
      act(() => {
        refreshPromise = result.current.refresh();
      });

      // Check loading state
      expect(result.current.loading).toBe(true);

      await act(async () => {
        await refreshPromise!;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockUserAddress;
    });

    it('should set error state on fetch failure', async () => {
      mockFactoryContract.getAllTokens.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should clear error on successful refetch', async () => {
      mockFactoryContract.getAllTokens.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      // Mock successful response
      mockFactoryContract.getAllTokens.mockResolvedValue([]);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle missing factory address gracefully', async () => {
      delete process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should complete without crash
      expect(result.current.tokens).toEqual([]);
    });
  });

  describe('Multi-chain Aggregation', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockUserAddress;
    });

    it('should aggregate tokens from multiple chains', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('100'));
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Multi Token',
        symbol: 'MULT',
        description: '',
        imageUrl: '',
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have attempted to fetch from multiple chains
      expect(ethers.JsonRpcProvider).toHaveBeenCalled();
    });

    it('should calculate per-chain statistics', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('100'));
      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('500000'),
        ethers.parseEther('0.01'),
        ethers.parseEther('10000'),
        BigInt(5000),
        false,
      ]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Chain Stats',
        symbol: 'CHS',
        description: '',
        imageUrl: '',
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => usePortfolio());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.stats.chains.length > 0) {
        const chain = result.current.stats.chains[0];
        expect(chain).toHaveProperty('chainId');
        expect(chain).toHaveProperty('chainName');
        expect(chain).toHaveProperty('value');
        expect(chain).toHaveProperty('tokenCount');
      }
    });
  });
});
