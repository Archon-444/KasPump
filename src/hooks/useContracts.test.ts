/**
 * Comprehensive tests for useContracts hook
 * Tests contract interactions, token creation, trading, and error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useContracts } from './useContracts';
import { ethers } from 'ethers';
import type { TokenCreationForm, TradeData } from '../types';

// Mock dependencies
vi.mock('./useMultichainWallet', () => ({
  useMultichainWallet: vi.fn(),
}));

vi.mock('./contracts/useContractProvider', () => ({
  useContractProvider: vi.fn(),
}));

vi.mock('../utils/contractErrors', () => ({
  parseContractError: vi.fn((error: any) => {
    if (error instanceof Error) return error;
    return new Error('Contract error');
  }),
}));

vi.mock('../config/contracts', () => ({
  getTokenFactoryAddress: vi.fn((chainId: number) => {
    if (chainId === 97 || chainId === 56) return '0xfactory1234567890123456789012345678901234';
    return null;
  }),
  getFeeRecipientAddress: vi.fn(() => '0xfeerecipient123456789012345678901234567890'),
  getChainName: vi.fn((chainId: number) => {
    const names: Record<number, string> = {
      56: 'BSC',
      97: 'BSC Testnet',
      42161: 'Arbitrum',
    };
    return names[chainId] || 'Unknown';
  }),
  getSupportedChains: vi.fn(() => ['BSC', 'Arbitrum', 'Base']),
}));

// Mock ethers
vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    ethers: {
      ...(actual as any).ethers,
      Contract: vi.fn(),
      parseEther: vi.fn((value: string) => BigInt(Math.floor(parseFloat(value) * 1e18))),
      formatEther: vi.fn((value: bigint) => (Number(value) / 1e18).toString()),
      formatUnits: vi.fn((value: bigint, decimals: number) => (Number(value) / Math.pow(10, decimals)).toString()),
      ZeroAddress: '0x0000000000000000000000000000000000000000',
    },
  };
});

import { useMultichainWallet } from './useMultichainWallet';
import { useContractProvider } from './contracts/useContractProvider';
import { parseContractError } from '../utils/contractErrors';

describe('useContracts', () => {
  const mockWalletAddress = '0x1234567890123456789012345678901234567890';
  const mockTokenAddress = '0xtoken123456789012345678901234567890abcdef';
  const mockAmmAddress = '0xamm1234567890123456789012345678901234abcdef';

  const mockWallet = {
    connected: true,
    address: mockWalletAddress,
    chainId: 97,
    connector: null,
  };

  const mockProvider = {
    getNetwork: vi.fn().mockResolvedValue({ chainId: 97 }),
  };

  const mockSigner = {
    getAddress: vi.fn().mockResolvedValue(mockWalletAddress),
  };

  const mockContractProvider = {
    provider: mockProvider,
    signer: mockSigner,
    isInitialized: true,
    isConnected: true,
    getContractRunner: vi.fn().mockReturnValue(mockSigner),
  };

  // Mock contract instances
  let mockFactoryContract: any;
  let mockAmmContract: any;
  let mockTokenContract: any;

  const abiHasFunction = (abi: any, name: string) =>
    Array.isArray(abi) &&
    abi.some((item) => {
      if (typeof item === 'string') {
        return item.includes(` ${name}(`) || item.includes(`${name}(`);
      }
      return item?.type === 'function' && item?.name === name;
    });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock contracts
    mockFactoryContract = {
      createToken: vi.fn(),
      CREATION_FEE: vi.fn().mockResolvedValue(BigInt('25000000000000000')),
      getAllTokens: vi.fn(),
      getTokenConfig: vi.fn(),
      getTokenAMM: vi.fn(),
      isKasPumpToken: vi.fn(),
      interface: {
        parseLog: vi.fn(),
      },
    };

    mockAmmContract = {
      buyTokens: vi.fn(),
      sellTokens: vi.fn(),
      getTradingInfo: vi.fn(),
      calculateTokensOut: vi.fn(),
      calculateNativeOut: vi.fn(),
      getPriceImpact: vi.fn(),
    };

    mockTokenContract = {
      balanceOf: vi.fn(),
      approve: vi.fn(),
      allowance: vi.fn(),
      name: vi.fn(),
      symbol: vi.fn(),
      decimals: vi.fn(),
      totalSupply: vi.fn(),
    };

    // Mock ethers Contract constructor
    (ethers.Contract as any).mockImplementation((address: string, abi: any, runner: any) => {
      if (abiHasFunction(abi, 'createToken')) return mockFactoryContract;
      if (abiHasFunction(abi, 'buyTokens')) return mockAmmContract;
      if (abiHasFunction(abi, 'balanceOf')) return mockTokenContract;
      return {};
    });

    // Setup default mocks
    (useMultichainWallet as any).mockReturnValue(mockWallet);
    (useContractProvider as any).mockReturnValue(mockContractProvider);
  });

  describe('Initial State', () => {
    it('should initialize with connection state from provider', () => {
      const { result } = renderHook(() => useContracts());

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.provider).toBe(mockProvider);
      expect(result.current.signer).toBe(mockSigner);
    });

    it('should provide contract getter functions', () => {
      const { result } = renderHook(() => useContracts());

      expect(result.current.getTokenFactoryContract).toBeInstanceOf(Function);
      expect(result.current.getBondingCurveContract).toBeInstanceOf(Function);
      expect(result.current.getTokenContract).toBeInstanceOf(Function);
    });

    it('should provide token operation functions', () => {
      const { result } = renderHook(() => useContracts());

      expect(result.current.createToken).toBeInstanceOf(Function);
      expect(result.current.getAllTokens).toBeInstanceOf(Function);
      expect(result.current.getTokenInfo).toBeInstanceOf(Function);
      expect(result.current.getTokenAMMAddress).toBeInstanceOf(Function);
    });

    it('should provide trading functions', () => {
      const { result } = renderHook(() => useContracts());

      expect(result.current.executeTrade).toBeInstanceOf(Function);
      expect(result.current.getSwapQuote).toBeInstanceOf(Function);
    });
  });

  describe('Token Creation', () => {
    const mockTokenData: TokenCreationForm = {
      name: 'Test Token',
      symbol: 'TEST',
      description: 'A test token',
      totalSupply: 1000000,
      basePrice: 0.001,
      slope: 0.00001,
      curveType: 'linear',
    };

    beforeEach(() => {
      // Mock successful token creation
      mockFactoryContract.createToken.estimateGas = vi.fn().mockResolvedValue(BigInt(300000));
      mockFactoryContract.createToken.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({
          hash: '0xtxhash',
          logs: [
            {
              topics: ['0xtopic'],
              data: '0xdata',
            },
          ],
        }),
      });
      mockFactoryContract.interface.parseLog.mockReturnValue({
        name: 'TokenCreated',
        args: {
          tokenAddress: mockTokenAddress,
          ammAddress: mockAmmAddress,
        },
      });
    });

    it('should create token successfully', async () => {
      const { result } = renderHook(() => useContracts());

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createToken(mockTokenData, 'ipfs://test');
      });

      expect(createResult).toEqual({
        tokenAddress: mockTokenAddress,
        ammAddress: mockAmmAddress,
        txHash: '0xtxhash',
      });
    });

    it('should throw error when wallet not connected', async () => {
      mockWallet.connected = false;
      const { result } = renderHook(() => useContracts());

      await expect(
        result.current.createToken(mockTokenData)
      ).rejects.toThrow('Wallet not connected');
    });

    it('should throw error when contracts not initialized', async () => {
      mockContractProvider.isInitialized = false;
      const { result } = renderHook(() => useContracts());

      await expect(
        result.current.createToken(mockTokenData)
      ).rejects.toThrow('Contracts not initialized');
    });

    it('should convert form data to contract parameters correctly', async () => {
      const { result } = renderHook(() => useContracts());

      await act(async () => {
        await result.current.createToken(mockTokenData, 'ipfs://test');
      });

      expect(mockFactoryContract.createToken).toHaveBeenCalledWith(
        'Test Token',
        'TEST',
        'A test token',
        'ipfs://test',
        BigInt(1000000 * 1e18),
        BigInt(0.001 * 1e18),
        BigInt(0.00001 * 1e18),
        0, // linear curve type
        expect.objectContaining({
          gasLimit: expect.any(BigInt),
          value: BigInt('25000000000000000'),
        })
      );
    });

    it('should handle exponential curve type', async () => {
      const exponentialTokenData = { ...mockTokenData, curveType: 'exponential' as const };
      const { result } = renderHook(() => useContracts());

      await act(async () => {
        await result.current.createToken(exponentialTokenData);
      });

      const callArgs = mockFactoryContract.createToken.mock.calls[0];
      expect(callArgs[7]).toBe(1); // exponential = 1
    });

    it('should estimate and add gas buffer', async () => {
      const { result } = renderHook(() => useContracts());

      await act(async () => {
        await result.current.createToken(mockTokenData);
      });

      expect(mockFactoryContract.createToken.estimateGas).toHaveBeenCalled();
      const callArgs = mockFactoryContract.createToken.mock.calls[0];
      const gasLimit = callArgs[8].gasLimit;
      // Gas limit should be 120% of estimate
      expect(gasLimit).toBeGreaterThan(BigInt(300000));
    });

    it('should cache AMM address after creation', async () => {
      const { result } = renderHook(() => useContracts());

      await act(async () => {
        await result.current.createToken(mockTokenData);
      });

      // Subsequent call to getTokenAMMAddress should use cache
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);
      const ammAddress = await result.current.getTokenAMMAddress(mockTokenAddress);
      expect(ammAddress).toBe(mockAmmAddress);
    });

    it('should handle creation errors', async () => {
      mockFactoryContract.createToken.mockRejectedValue(new Error('Insufficient funds'));
      const { result } = renderHook(() => useContracts());

      await expect(
        result.current.createToken(mockTokenData)
      ).rejects.toThrow();
      expect(parseContractError).toHaveBeenCalled();
    });

    it('should handle missing TokenCreated event', async () => {
      mockFactoryContract.createToken.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({
          hash: '0xtxhash',
          logs: [],
        }),
      });

      const { result } = renderHook(() => useContracts());

      await expect(
        result.current.createToken(mockTokenData)
      ).rejects.toThrow('TokenCreated event not found');
    });
  });

  describe('Trading - Buy Tokens', () => {
    const mockBuyTrade: TradeData = {
      tokenAddress: mockTokenAddress,
      action: 'buy',
      baseAmount: 1.0, // 1 BNB
      expectedOutput: 1000, // 1000 tokens
      slippageTolerance: 0.5,
    };

    beforeEach(() => {
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);
      mockAmmContract.buyTokens.estimateGas = vi.fn().mockResolvedValue(BigInt(200000));
      mockAmmContract.buyTokens.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: '0xbuytxhash' }),
      });
    });

    it('should execute buy trade successfully', async () => {
      const { result } = renderHook(() => useContracts());

      let txHash: string = '';
      await act(async () => {
        txHash = await result.current.executeTrade(mockBuyTrade);
      });

      expect(txHash).toBe('0xbuytxhash');
      expect(mockAmmContract.buyTokens).toHaveBeenCalled();
    });

    it('should send correct native amount for buy', async () => {
      const { result } = renderHook(() => useContracts());

      await act(async () => {
        await result.current.executeTrade(mockBuyTrade);
      });

      const callArgs = mockAmmContract.buyTokens.mock.calls[0];
      expect(callArgs[1].value).toBe(BigInt(1e18)); // 1 BNB in wei
    });

    it('should calculate minTokensOut with slippage', async () => {
      const { result } = renderHook(() => useContracts());

      await act(async () => {
        await result.current.executeTrade(mockBuyTrade);
      });

      const callArgs = mockAmmContract.buyTokens.mock.calls[0];
      const minTokensOut = callArgs[0];
      // minTokensOut = 1000 * (1 - 0.005) = 995
      expect(Number(minTokensOut)).toBeCloseTo(995 * 1e18, -15);
    });

    it('should resolve AMM address before trading', async () => {
      const { result } = renderHook(() => useContracts());

      await act(async () => {
        await result.current.executeTrade(mockBuyTrade);
      });

      expect(mockFactoryContract.getTokenAMM).toHaveBeenCalledWith(mockTokenAddress);
    });

    it('should throw error when wallet not connected', async () => {
      mockWallet.connected = false;
      const { result } = renderHook(() => useContracts());

      await expect(
        result.current.executeTrade(mockBuyTrade)
      ).rejects.toThrow('Wallet not connected');
    });
  });

  describe('Trading - Sell Tokens', () => {
    const mockSellTrade: TradeData = {
      tokenAddress: mockTokenAddress,
      action: 'sell',
      baseAmount: 1000, // 1000 tokens
      expectedOutput: 0.95, // 0.95 BNB
      slippageTolerance: 0.5,
    };

    beforeEach(() => {
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);
      mockTokenContract.allowance.mockResolvedValue(BigInt(0));
      mockTokenContract.approve.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: '0xapprovetxhash' }),
      });
      mockAmmContract.sellTokens.estimateGas = vi.fn().mockResolvedValue(BigInt(200000));
      mockAmmContract.sellTokens.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: '0xselltxhash' }),
      });
    });

    it('should execute sell trade successfully', async () => {
      const { result } = renderHook(() => useContracts());

      let txHash: string = '';
      await act(async () => {
        txHash = await result.current.executeTrade(mockSellTrade);
      });

      expect(txHash).toBe('0xselltxhash');
      expect(mockAmmContract.sellTokens).toHaveBeenCalled();
    });

    it('should approve tokens before selling', async () => {
      const { result } = renderHook(() => useContracts());

      await act(async () => {
        await result.current.executeTrade(mockSellTrade);
      });

      expect(mockTokenContract.approve).toHaveBeenCalledWith(
        mockAmmAddress,
        BigInt(1000 * 1e18)
      );
    });

    it('should skip approval if allowance sufficient', async () => {
      mockTokenContract.allowance.mockResolvedValue(BigInt(2000 * 1e18)); // More than needed

      const { result } = renderHook(() => useContracts());

      await act(async () => {
        await result.current.executeTrade(mockSellTrade);
      });

      expect(mockTokenContract.approve).not.toHaveBeenCalled();
    });

    it('should calculate minNativeOut with slippage', async () => {
      const { result } = renderHook(() => useContracts());

      await act(async () => {
        await result.current.executeTrade(mockSellTrade);
      });

      const callArgs = mockAmmContract.sellTokens.mock.calls[0];
      const minNativeOut = callArgs[1];
      // minNativeOut = 0.95 * (1 - 0.005) = 0.94525
      expect(Number(minNativeOut)).toBeCloseTo(0.94525 * 1e18, -15);
    });

    it('should throw error when wallet address not available', async () => {
      mockWallet.address = null;
      const { result } = renderHook(() => useContracts());

      await expect(
        result.current.executeTrade(mockSellTrade)
      ).rejects.toThrow('Wallet address not available');
    });
  });

  describe('Swap Quotes', () => {
    beforeEach(() => {
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);
      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('500000'), // currentSupply
        ethers.parseEther('0.001'), // currentPrice
        ethers.parseEther('10000'), // totalVolume
        BigInt(5000), // graduation
        false, // isGraduated
      ]);
      mockAmmContract.calculateTokensOut.mockResolvedValue(ethers.parseEther('1000'));
      mockAmmContract.calculateNativeOut.mockResolvedValue(ethers.parseEther('0.95'));
      mockAmmContract.getPriceImpact.mockResolvedValue(BigInt(200)); // 2% in basis points
    });

    it('should get buy quote', async () => {
      const { result } = renderHook(() => useContracts());

      let quote: any;
      await act(async () => {
        quote = await result.current.getSwapQuote(mockTokenAddress, 1.0, 'buy');
      });

      expect(quote).toMatchObject({
        inputAmount: 1.0,
        outputAmount: 1000,
        priceImpact: 2,
        route: 'bonding-curve',
      });
    });

    it('should get sell quote', async () => {
      const { result } = renderHook(() => useContracts());

      let quote: any;
      await act(async () => {
        quote = await result.current.getSwapQuote(mockTokenAddress, 1000, 'sell');
      });

      expect(quote).toMatchObject({
        inputAmount: 1000,
        outputAmount: 0.95,
        priceImpact: 2,
        route: 'bonding-curve',
      });
    });

    it('should show amm route for graduated tokens', async () => {
      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('1000000'),
        ethers.parseEther('1.0'),
        ethers.parseEther('100000'),
        BigInt(10000),
        true, // isGraduated
      ]);

      const { result } = renderHook(() => useContracts());

      let quote: any;
      await act(async () => {
        quote = await result.current.getSwapQuote(mockTokenAddress, 1.0, 'buy');
      });

      expect(quote.route).toBe('amm');
    });

    it('should calculate minimum output with slippage', async () => {
      const { result } = renderHook(() => useContracts());

      let quote: any;
      await act(async () => {
        quote = await result.current.getSwapQuote(mockTokenAddress, 1.0, 'buy');
      });

      // minimumOutput = outputAmount * 0.995
      expect(quote.minimumOutput).toBe(1000 * 0.995);
    });

    it('should handle quote errors', async () => {
      mockAmmContract.getTradingInfo.mockRejectedValue(new Error('AMM error'));

      const { result } = renderHook(() => useContracts());

      await expect(
        result.current.getSwapQuote(mockTokenAddress, 1.0, 'buy')
      ).rejects.toThrow();
    });
  });

  describe('Token Information', () => {
    beforeEach(() => {
      mockFactoryContract.isKasPumpToken.mockResolvedValue(true);
      mockFactoryContract.getTokenConfig.mockResolvedValue({
        name: 'Test Token',
        symbol: 'TEST',
        description: 'Test description',
        imageUrl: 'https://example.com/image.png',
        curveType: 0,
      });
      mockTokenContract.name.mockResolvedValue('Test Token');
      mockTokenContract.symbol.mockResolvedValue('TEST');
      mockTokenContract.totalSupply.mockResolvedValue(ethers.parseEther('1000000'));
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);
      mockAmmContract.getTradingInfo.mockResolvedValue([
        ethers.parseEther('500000'),
        ethers.parseEther('0.01'),
        ethers.parseEther('10000'),
        BigInt(5000),
        false,
      ]);
    });

    it('should get complete token info', async () => {
      const { result } = renderHook(() => useContracts());

      let tokenInfo: any;
      await act(async () => {
        tokenInfo = await result.current.getTokenInfo(mockTokenAddress);
      });

      expect(tokenInfo).toMatchObject({
        address: mockTokenAddress,
        name: 'Test Token',
        symbol: 'TEST',
        description: 'Test description',
        curveType: 'linear',
        ammAddress: mockAmmAddress,
      });
    });

    it('should return null for non-KasPump token', async () => {
      mockFactoryContract.isKasPumpToken.mockResolvedValue(false);

      const { result } = renderHook(() => useContracts());

      let tokenInfo: any;
      await act(async () => {
        tokenInfo = await result.current.getTokenInfo(mockTokenAddress);
      });

      expect(tokenInfo).toBeNull();
    });

    it('should calculate market cap', async () => {
      const { result } = renderHook(() => useContracts());

      let tokenInfo: any;
      await act(async () => {
        tokenInfo = await result.current.getTokenInfo(mockTokenAddress);
      });

      // marketCap = currentSupply * price = 500000 * 0.01 = 5000
      expect(tokenInfo.marketCap).toBe(5000);
    });

    it('should handle errors gracefully', async () => {
      mockFactoryContract.isKasPumpToken.mockRejectedValue(new Error('RPC error'));

      const { result } = renderHook(() => useContracts());

      let tokenInfo: any;
      await act(async () => {
        tokenInfo = await result.current.getTokenInfo(mockTokenAddress);
      });

      expect(tokenInfo).toBeNull();
    });
  });

  describe('Get All Tokens', () => {
    it('should fetch all tokens from factory', async () => {
      const mockTokens = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ];
      mockFactoryContract.getAllTokens.mockResolvedValue(mockTokens);

      const { result } = renderHook(() => useContracts());

      let tokens: string[] = [];
      await act(async () => {
        tokens = await result.current.getAllTokens();
      });

      expect(tokens).toEqual(mockTokens);
    });

    it('should throw error when factory not deployed', async () => {
      mockWallet.chainId = 999; // Unsupported chain

      const { result } = renderHook(() => useContracts());

      await expect(
        result.current.getAllTokens()
      ).rejects.toThrow();
    });

    it('should handle contract call errors', async () => {
      mockFactoryContract.getAllTokens.mockRejectedValue(new Error('Contract call failed'));

      const { result } = renderHook(() => useContracts());

      await expect(
        result.current.getAllTokens()
      ).rejects.toThrow();
      expect(parseContractError).toHaveBeenCalled();
    });
  });

  describe('AMM Address Resolution', () => {
    it('should resolve AMM address from factory', async () => {
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => useContracts());

      let ammAddress: string = '';
      await act(async () => {
        ammAddress = await result.current.getTokenAMMAddress(mockTokenAddress);
      });

      expect(ammAddress).toBe(mockAmmAddress);
    });

    it('should cache AMM addresses', async () => {
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);

      const { result } = renderHook(() => useContracts());

      // First call
      await act(async () => {
        await result.current.getTokenAMMAddress(mockTokenAddress);
      });

      // Second call should use cache
      await act(async () => {
        await result.current.getTokenAMMAddress(mockTokenAddress);
      });

      // Should only call contract once
      expect(mockFactoryContract.getTokenAMM).toHaveBeenCalledTimes(1);
    });

    it('should throw error for zero address', async () => {
      mockFactoryContract.getTokenAMM.mockResolvedValue(ethers.ZeroAddress);

      const { result } = renderHook(() => useContracts());

      await expect(
        result.current.getTokenAMMAddress(mockTokenAddress)
      ).rejects.toThrow('AMM address not found');
    });
  });

  describe('Token Operations', () => {
    beforeEach(() => {
      mockTokenContract.balanceOf.mockResolvedValue(ethers.parseEther('100'));
      mockTokenContract.allowance.mockResolvedValue(ethers.parseEther('50'));
      mockTokenContract.approve.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: '0xapprovetx' }),
      });
    });

    it('should get token balance', async () => {
      const { result } = renderHook(() => useContracts());

      let balance: number = 0;
      await act(async () => {
        balance = await result.current.getTokenBalance(mockTokenAddress, mockWalletAddress);
      });

      expect(balance).toBe(100);
    });

    it('should get allowance', async () => {
      const { result } = renderHook(() => useContracts());

      let allowance: number = 0;
      await act(async () => {
        allowance = await result.current.getAllowance(mockTokenAddress, mockWalletAddress, mockAmmAddress);
      });

      expect(allowance).toBe(50);
    });

    it('should approve token spending', async () => {
      const { result } = renderHook(() => useContracts());

      let txHash: string = '';
      await act(async () => {
        txHash = await result.current.approveToken(mockTokenAddress, mockAmmAddress, '100');
      });

      expect(txHash).toBe('0xapprovetx');
      expect(mockTokenContract.approve).toHaveBeenCalledWith(
        mockAmmAddress,
        BigInt(100 * 1e18)
      );
    });

    it('should throw error on approval when not connected', async () => {
      mockContractProvider.isConnected = false;

      const { result } = renderHook(() => useContracts());

      await expect(
        result.current.approveToken(mockTokenAddress, mockAmmAddress, '100')
      ).rejects.toThrow('Wallet not connected');
    });

    it('should return 0 on balance fetch error', async () => {
      mockTokenContract.balanceOf.mockRejectedValue(new Error('Balance error'));

      const { result } = renderHook(() => useContracts());

      let balance: number = -1;
      await act(async () => {
        balance = await result.current.getTokenBalance(mockTokenAddress, mockWalletAddress);
      });

      expect(balance).toBe(0);
    });
  });

  describe('Contract Instances', () => {
    it('should get factory contract instance', () => {
      const { result } = renderHook(() => useContracts());

      const contract = result.current.getTokenFactoryContract();
      expect(contract).toBeDefined();
      expect(ethers.Contract).toHaveBeenCalled();
    });

    it('should throw error getting factory without signer', () => {
      mockContractProvider.signer = null;

      const { result } = renderHook(() => useContracts());

      expect(() => result.current.getTokenFactoryContract()).toThrow('Wallet not connected');
    });

    it('should get bonding curve contract instance', () => {
      const { result } = renderHook(() => useContracts());

      const contract = result.current.getBondingCurveContract(mockAmmAddress);
      expect(contract).toBeDefined();
    });

    it('should throw error getting bonding curve without address', () => {
      const { result } = renderHook(() => useContracts());

      expect(() => result.current.getBondingCurveContract('')).toThrow('AMM address is required');
    });

    it('should get token contract instance', () => {
      const { result } = renderHook(() => useContracts());

      const contract = result.current.getTokenContract(mockTokenAddress);
      expect(contract).toBeDefined();
    });

    it('should throw error getting token contract without address', () => {
      const { result } = renderHook(() => useContracts());

      expect(() => result.current.getTokenContract('')).toThrow('Token address is required');
    });
  });

  describe('Chain Support', () => {
    it('should work with supported chains', () => {
      mockWallet.chainId = 56; // BSC mainnet

      const { result } = renderHook(() => useContracts());

      expect(result.current.isConnected).toBe(true);
    });

    it('should provide helpful error for unsupported chains', () => {
      mockWallet.chainId = 999; // Unsupported

      const { result } = renderHook(() => useContracts());

      expect(() => result.current.getTokenFactoryContract()).toThrow(/not deployed/);
      expect(() => result.current.getTokenFactoryContract()).toThrow(/Supported chains/);
    });
  });

  describe('Error Handling', () => {
    it('should parse contract errors on token creation failure', async () => {
      mockFactoryContract.createToken.mockRejectedValue(new Error('Revert: Insufficient balance'));

      const { result } = renderHook(() => useContracts());

      const mockTokenData: TokenCreationForm = {
        name: 'Test',
        symbol: 'TST',
        description: '',
        totalSupply: 1000000,
        basePrice: 0.001,
        slope: 0.00001,
        curveType: 'linear',
      };

      await expect(
        result.current.createToken(mockTokenData)
      ).rejects.toThrow();

      expect(parseContractError).toHaveBeenCalled();
    });

    it('should parse contract errors on trade failure', async () => {
      mockFactoryContract.getTokenAMM.mockResolvedValue(mockAmmAddress);
      mockAmmContract.buyTokens.mockRejectedValue(new Error('Revert: Slippage too high'));

      const { result } = renderHook(() => useContracts());

      const mockTrade: TradeData = {
        tokenAddress: mockTokenAddress,
        action: 'buy',
        baseAmount: 1.0,
        expectedOutput: 1000,
        slippageTolerance: 0.5,
      };

      await expect(
        result.current.executeTrade(mockTrade)
      ).rejects.toThrow();

      expect(parseContractError).toHaveBeenCalled();
    });
  });
});
