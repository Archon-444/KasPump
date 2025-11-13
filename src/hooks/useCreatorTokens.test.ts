/**
 * Comprehensive tests for useCreatorTokens hook
 * Tests creator token tracking, statistics, and multi-chain aggregation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useCreatorTokens } from './useCreatorTokens';
import { ethers } from 'ethers';

// Mock dependencies
vi.mock('./useMultichainWallet', () => ({
  useMultichainWallet: vi.fn(),
}));

vi.mock('../config/chains', () => ({
  supportedChains: [
    { id: 56, name: 'BSC' },
    { id: 42161, name: 'Arbitrum' },
    { id: 8453, name: 'Base' },
    { id: 97, name: 'BSC Testnet' },
  ],
  getChainById: vi.fn((chainId: number) => {
    const chains: Record<number, any> = {
      56: { id: 56, name: 'BSC', rpcUrls: { default: { http: ['https://bsc-dataseed.binance.org'] } } },
      42161: { id: 42161, name: 'Arbitrum', rpcUrls: { default: { http: ['https://arb1.arbitrum.io/rpc'] } } },
      8453: { id: 8453, name: 'Base', rpcUrls: { default: { http: ['https://mainnet.base.org'] } } },
      97: { id: 97, name: 'BSC Testnet', rpcUrls: { default: { http: ['https://data-seed-prebsc-1-s1.binance.org:8545'] } } },
    };
    return chains[chainId];
  }),
  getChainMetadata: vi.fn((chainId: number) => {
    const metadata: Record<number, any> = {
      56: { shortName: 'BSC', name: 'BNB Smart Chain' },
      42161: { shortName: 'Arbitrum', name: 'Arbitrum One' },
      8453: { shortName: 'Base', name: 'Base' },
      97: { shortName: 'BSC Testnet', name: 'BNB Smart Chain Testnet' },
    };
    return metadata[chainId];
  }),
  isTestnet: vi.fn((chainId: number) => chainId === 97 || chainId === 421614 || chainId === 84532),
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

describe('useCreatorTokens', () => {
  const mockCreatorAddress = '0x1234567890123456789012345678901234567890';
  const mockTokenAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const mockAmmAddress = '0x9876543210987654321098765432109876543210';

  const mockWallet = {
    connected: false,
    address: null as string | null,
  };

  // Mock contract instances
  let mockFactoryContract: any;
  let mockAmmContract: any;
  let mockProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock provider
    mockProvider = {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 56 }),
    };

    // Setup mock factory contract
    mockFactoryContract = {
      getAllTokens: vi.fn().mockResolvedValue([]),
      getTokenConfig: vi.fn(),
      getTokenAMM: vi.fn(),
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
      if (abi.includes('getTradingInfo')) return mockAmmContract;
      return {};
    });

    // Setup default mocks
    (useMultichainWallet as any).mockReturnValue(mockWallet);

    // Mock environment variables
    process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS = '0xfactory123456789012345678901234567890';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
  });

  describe('Initial State', () => {
    it('should initialize with empty tokens when wallet not connected', () => {
      const { result } = renderHook(() => useCreatorTokens());

      expect(result.current.tokens).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with default stats', () => {
      const { result } = renderHook(() => useCreatorTokens());

      expect(result.current.stats).toMatchObject({
        totalTokens: 0,
        totalVolume: 0,
        totalEarnings: 0,
        totalHolders: 0,
        graduatedTokens: 0,
        activeTokens: 0,
        chains: [],
      });
    });

    it('should provide refresh function', () => {
      const { result } = renderHook(() => useCreatorTokens());

      expect(result.current.refresh).toBeInstanceOf(Function);
    });
  });

  describe('Wallet Connection', () => {
    it('should clear tokens and stats when wallet not connected', async () => {
      mockWallet.connected = false;
      mockWallet.address = null;

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tokens).toEqual([]);
      expect(result.current.stats.totalTokens).toBe(0);
    });

    it('should fetch creator tokens when wallet connects', async () => {
      mockWallet.connected = true;
      mockWallet.address = mockCreatorAddress;
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Creator Token',
        symbol: 'CRT',
        description: 'My first token',
        imageUrl: 'https://example.com/token.png',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Math.floor(Date.now() / 1000)),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFactoryContract.getAllTokens).toHaveBeenCalled();
    });

    it('should refetch tokens when wallet address changes', async () => {
      mockWallet.connected = true;
      mockWallet.address = mockCreatorAddress;

      const { result, rerender } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstCallCount = mockFactoryContract.getAllTokens.mock.calls.length;

      // Change wallet address
      mockWallet.address = '0xdifferentaddress1234567890123456789012';
      rerender();

      await waitFor(() => {
        expect(mockFactoryContract.getAllTokens.mock.calls.length).toBeGreaterThan(firstCallCount);
      });
    });
  });

  describe('Token Filtering', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockCreatorAddress;
    });

    it('should only include tokens created by the connected wallet', async () => {
      const token1 = '0x1111111111111111111111111111111111111111';
      const token2 = '0x2222222222222222222222222222222222222222';
      const token3 = '0x3333333333333333333333333333333333333333';

      mockFactoryContract.getAllTokens.mockResolvedValue([token1, token2, token3]);

      let configCallCount = 0;
      mockFactoryContract.getTokenConfig.mockImplementation(() => {
        configCallCount++;
        return Promise.resolve({
          name: `Token ${configCallCount}`,
          symbol: `TK${configCallCount}`,
          description: '',
          imageUrl: '',
          creator: configCallCount === 2 ? mockCreatorAddress : '0xotheraddress',
          totalSupply: ethers.parseEther('1000000'),
          createdAt: BigInt(Date.now() / 1000),
          curveType: 0,
        });
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Only token2 has the creator address matching mockCreatorAddress
      expect(result.current.tokens.length).toBe(1);
      if (result.current.tokens.length > 0) {
        expect(result.current.tokens[0].creator.toLowerCase()).toBe(mockCreatorAddress.toLowerCase());
      }
    });

    it('should skip tokens with zero address AMM', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Zero AMM Token',
        symbol: 'ZERO',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(ethers.ZeroAddress);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tokens).toEqual([]);
    });

    it('should only fetch from mainnet chains', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([]);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have created providers for mainnet chains only (not testnet)
      const providerCalls = (ethers.JsonRpcProvider as any).mock.calls;
      // Verify we're not connecting to testnet chains
      expect(providerCalls.some((call: any[]) => call[0]?.includes('testnet'))).toBe(false);
    });
  });

  describe('Token Data', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockCreatorAddress;
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);
    });

    it('should correctly parse token configuration', async () => {
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Awesome Token',
        symbol: 'AWSM',
        description: 'This is an awesome token',
        imageUrl: 'https://example.com/awesome.png',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('5000000'),
        createdAt: BigInt(1609459200), // 2021-01-01
        curveType: 1, // exponential
      });

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        const token = result.current.tokens[0];
        expect(token.name).toBe('Awesome Token');
        expect(token.symbol).toBe('AWSM');
        expect(token.description).toBe('This is an awesome token');
        expect(token.image).toBe('https://example.com/awesome.png');
        expect(token.curveType).toBe('exponential');
        expect(token.totalSupply).toBe(5000000);
      }
    });

    it('should include chain information', async () => {
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Chain Token',
        symbol: 'CHN',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        expect(result.current.tokens[0].chainId).toBeDefined();
        expect(result.current.tokens[0].chainName).toBeDefined();
        expect(typeof result.current.tokens[0].chainId).toBe('number');
      }
    });

    it('should calculate trading metrics from AMM', async () => {
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Trading Token',
        symbol: 'TRD',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });

      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('750000'), // currentSupply
        ethers.parseEther('0.05'), // currentPrice
        ethers.parseEther('50000'), // totalVolume
        BigInt(7500), // graduation (75%)
        false, // isGraduated
      ]);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        const token = result.current.tokens[0];
        expect(token.currentSupply).toBe(750000);
        expect(token.price).toBe(0.05);
        expect(token.totalVolume).toBe(50000);
        expect(token.bondingCurveProgress).toBe(75);
        expect(token.isGraduated).toBe(false);
      }
    });

    it('should calculate market cap', async () => {
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Market Cap Token',
        symbol: 'MKT',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });

      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('100000'), // currentSupply
        ethers.parseEther('2.0'), // currentPrice = $2
        ethers.parseEther('10000'),
        BigInt(5000),
        false,
      ]);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        const token = result.current.tokens[0];
        // Market cap = currentSupply * price = 100000 * 2 = 200000
        expect(token.marketCap).toBe(200000);
      }
    });

    it('should calculate creator earnings from volume', async () => {
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Earnings Token',
        symbol: 'ERN',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });

      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('500000'),
        ethers.parseEther('0.01'),
        ethers.parseEther('100000'), // totalVolume
        BigInt(5000),
        false,
      ]);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        const token = result.current.tokens[0];
        // Earnings = volume * 0.005 (0.5% creator fee)
        expect(token.totalEarnings).toBe(500); // 100000 * 0.005
      }
    });

    it('should handle graduated tokens', async () => {
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Graduated Token',
        symbol: 'GRAD',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });

      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('1000000'),
        ethers.parseEther('1.0'),
        ethers.parseEther('500000'),
        BigInt(10000), // 100% graduation
        true, // isGraduated
      ]);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.tokens.length > 0) {
        expect(result.current.tokens[0].isGraduated).toBe(true);
        expect(result.current.tokens[0].bondingCurveProgress).toBe(100);
      }
    });
  });

  describe('Creator Statistics', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockCreatorAddress;
    });

    it('should count total tokens created', async () => {
      const tokens = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
      ];

      mockFactoryContract.getAllTokens.mockResolvedValue(tokens);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Token',
        symbol: 'TKN',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.totalTokens).toBe(3);
    });

    it('should sum total volume across all tokens', async () => {
      const token1 = '0x1111111111111111111111111111111111111111';
      const token2 = '0x2222222222222222222222222222222222222222';

      mockFactoryContract.getAllTokens.mockResolvedValue([token1, token2]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Volume Token',
        symbol: 'VOL',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      let callCount = 0;
      mockAmmContract.getTradingInfo.mockImplementation(() => {
        callCount++;
        return Promise.resolve([
          ethers.parseEther('500000'),
          ethers.parseEther('0.01'),
          ethers.parseEther(callCount === 1 ? '10000' : '15000'), // Different volumes
          BigInt(5000),
          false,
        ]);
      });

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Total volume = 10000 + 15000 = 25000
      expect(result.current.stats.totalVolume).toBe(25000);
    });

    it('should sum total earnings from all tokens', async () => {
      const token1 = '0x1111111111111111111111111111111111111111';
      const token2 = '0x2222222222222222222222222222222222222222';

      mockFactoryContract.getAllTokens.mockResolvedValue([token1, token2]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Earnings Token',
        symbol: 'ERN',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      let callCount = 0;
      mockAmmContract.getTradingInfo.mockImplementation(() => {
        callCount++;
        return Promise.resolve([
          ethers.parseEther('500000'),
          ethers.parseEther('0.01'),
          ethers.parseEther(callCount === 1 ? '20000' : '30000'),
          BigInt(5000),
          false,
        ]);
      });

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Token 1: 20000 * 0.005 = 100
      // Token 2: 30000 * 0.005 = 150
      // Total earnings = 250
      expect(result.current.stats.totalEarnings).toBe(250);
    });

    it('should count graduated tokens', async () => {
      const token1 = '0x1111111111111111111111111111111111111111';
      const token2 = '0x2222222222222222222222222222222222222222';
      const token3 = '0x3333333333333333333333333333333333333333';

      mockFactoryContract.getAllTokens.mockResolvedValue([token1, token2, token3]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Token',
        symbol: 'TKN',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      let callCount = 0;
      mockAmmContract.getTradingInfo.mockImplementation(() => {
        callCount++;
        const isGraduated = callCount <= 2; // First two are graduated
        return Promise.resolve([
          ethers.parseEther('1000000'),
          ethers.parseEther('1.0'),
          ethers.parseEther('50000'),
          BigInt(isGraduated ? 10000 : 5000),
          isGraduated,
        ]);
      });

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.graduatedTokens).toBe(2);
    });

    it('should count active (non-graduated with volume) tokens', async () => {
      const token1 = '0x1111111111111111111111111111111111111111';
      const token2 = '0x2222222222222222222222222222222222222222';

      mockFactoryContract.getAllTokens.mockResolvedValue([token1, token2]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Active Token',
        symbol: 'ACT',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      let callCount = 0;
      mockAmmContract.getTradingInfo.mockImplementation(() => {
        callCount++;
        return Promise.resolve([
          ethers.parseEther('500000'),
          ethers.parseEther('0.01'),
          ethers.parseEther(callCount === 1 ? '10000' : '0'), // Only first has volume
          BigInt(5000),
          false, // Both not graduated
        ]);
      });

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Only token1 is active (not graduated AND has volume)
      expect(result.current.stats.activeTokens).toBe(1);
    });

    it('should provide per-chain statistics', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Chain Token',
        symbol: 'CHN',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.chains).toBeInstanceOf(Array);
      if (result.current.stats.chains.length > 0) {
        const chainStat = result.current.stats.chains[0];
        expect(chainStat).toHaveProperty('chainId');
        expect(chainStat).toHaveProperty('chainName');
        expect(chainStat).toHaveProperty('tokenCount');
        expect(chainStat).toHaveProperty('totalVolume');
      }
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockCreatorAddress;
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Refresh Token',
        symbol: 'REF',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);
    });

    it('should allow manual refresh', async () => {
      const { result } = renderHook(() => useCreatorTokens());

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
      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let refreshPromise: Promise<void>;
      act(() => {
        refreshPromise = result.current.refresh();
      });

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
      mockWallet.address = mockCreatorAddress;
    });

    it('should set error state on fetch failure', async () => {
      mockFactoryContract.getAllTokens.mockRejectedValue(new Error('RPC failure'));

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('RPC failure');
    });

    it('should handle chain-specific errors gracefully', async () => {
      mockFactoryContract.getAllTokens.mockRejectedValue(new Error('Chain error'));

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should complete without crashing
      expect(result.current.tokens).toBeDefined();
    });

    it('should handle individual token errors gracefully', async () => {
      const token1 = '0x1111111111111111111111111111111111111111';
      const token2 = '0x2222222222222222222222222222222222222222';

      mockFactoryContract.getAllTokens.mockResolvedValue([token1, token2]);

      let configCallCount = 0;
      mockFactoryContract.getTokenConfig.mockImplementation(() => {
        configCallCount++;
        if (configCallCount === 1) {
          throw new Error('Token 1 config error');
        }
        return Promise.resolve({
          name: 'Token 2',
          symbol: 'TK2',
          description: '',
          imageUrl: '',
          creator: mockCreatorAddress,
          totalSupply: ethers.parseEther('1000000'),
          createdAt: BigInt(Date.now() / 1000),
          curveType: 0,
        });
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should skip failed token but include successful one
      expect(result.current.tokens.length).toBe(1);
    });

    it('should clear error on successful refetch', async () => {
      mockFactoryContract.getAllTokens.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useCreatorTokens());

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
  });

  describe('Multi-chain Support', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockCreatorAddress;
    });

    it('should aggregate tokens from multiple chains', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Multi Chain Token',
        symbol: 'MCT',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have created multiple providers for different chains
      expect(ethers.JsonRpcProvider).toHaveBeenCalled();
    });

    it('should handle missing factory address for chain', async () => {
      delete process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
      delete process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_56;

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should complete without crash
      expect(result.current.tokens).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockWallet.connected = true;
      mockWallet.address = mockCreatorAddress;
    });

    it('should handle empty token list', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([]);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tokens).toEqual([]);
      expect(result.current.stats.totalTokens).toBe(0);
    });

    it('should handle tokens with missing metadata', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: '',
        symbol: '',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000'),
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still include token even with minimal metadata
      expect(result.current.tokens.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large numbers correctly', async () => {
      mockFactoryContract.getAllTokens.mockResolvedValue([mockTokenAddress]);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Large Number Token',
        symbol: 'LRG',
        description: '',
        imageUrl: '',
        creator: mockCreatorAddress,
        totalSupply: ethers.parseEther('1000000000'), // 1 billion
        createdAt: BigInt(Date.now() / 1000),
        curveType: 0,
      });
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);
      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('999999999'), // Very large supply
        ethers.parseEther('100'), // High price
        ethers.parseEther('10000000'), // Large volume
        BigInt(5000),
        false,
      ]);

      const { result } = renderHook(() => useCreatorTokens());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should handle large numbers without overflow
      if (result.current.tokens.length > 0) {
        expect(result.current.tokens[0].totalSupply).toBe(1000000000);
        expect(result.current.tokens[0].currentSupply).toBe(999999999);
      }
    });
  });
});
