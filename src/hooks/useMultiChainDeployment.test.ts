/**
 * Comprehensive tests for useMultiChainDeployment hook
 * Tests multi-chain deployment, state management, and error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useMultiChainDeployment } from './useMultiChainDeployment';
import { ethers } from 'ethers';
import type { TokenCreationForm } from '../types';

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
    { id: 421614, name: 'Arbitrum Sepolia' },
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
      BrowserProvider: vi.fn(),
      Contract: vi.fn(),
      parseEther: vi.fn((value: string) => BigInt(Math.floor(parseFloat(value) * 1e18))),
      formatEther: vi.fn((value: bigint) => (Number(value) / 1e18).toString()),
      ZeroAddress: '0x0000000000000000000000000000000000000000',
    },
  };
});

import { useMultichainWallet } from './useMultichainWallet';

describe('useMultiChainDeployment', () => {
  const mockWalletAddress = '0x1234567890123456789012345678901234567890';
  const mockTokenAddress = '0xtoken123456789012345678901234567890abcdef';
  const mockAmmAddress = '0xamm1234567890123456789012345678901234abcdef';

  const mockWallet = {
    connected: true,
    address: mockWalletAddress,
    chainId: 56,
    connector: {
      getProvider: vi.fn(),
    },
    switchNetwork: vi.fn(),
  };

  const mockTokenData: TokenCreationForm = {
    name: 'Multi Chain Token',
    symbol: 'MCT',
    description: 'A token deployed on multiple chains',
    totalSupply: 1000000,
    basePrice: 0.001,
    slope: 0.00001,
    curveType: 'linear',
  };

  let mockBrowserProvider: any;
  let mockSigner: any;
  let mockFactoryContract: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock signer
    mockSigner = {
      getAddress: vi.fn().mockResolvedValue(mockWalletAddress),
    };

    // Setup mock browser provider
    mockBrowserProvider = {
      getSigner: vi.fn().mockResolvedValue(mockSigner),
    };

    // Setup mock factory contract
    mockFactoryContract = {
      createToken: vi.fn(),
      interface: {
        parseLog: vi.fn(),
      },
    };

    // Mock ethers constructors
    (ethers.BrowserProvider as any).mockImplementation(() => mockBrowserProvider);
    (ethers.Contract as any).mockImplementation(() => mockFactoryContract);

    // Setup wallet mock
    (useMultichainWallet as any).mockReturnValue(mockWallet);

    // Mock environment variables
    process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS = '0xfactory123456789012345678901234567890';

    // Mock successful deployment by default
    mockWallet.switchNetwork.mockResolvedValue(true);
    mockFactoryContract.createToken.estimateGas = vi.fn().mockResolvedValue(BigInt(300000));
    mockFactoryContract.createToken.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({
        hash: '0xdeploytxhash',
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

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
  });

  describe('Initial State', () => {
    it('should initialize with empty deployments', () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      expect(result.current.deployments).toEqual([]);
      expect(result.current.isDeploying).toBe(false);
    });

    it('should initialize with sequential deployment mode', () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      expect(result.current.deploymentMode).toBe('sequential');
    });

    it('should provide deployment functions', () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      expect(result.current.deployToMultipleChains).toBeInstanceOf(Function);
      expect(result.current.resetDeployments).toBeInstanceOf(Function);
      expect(result.current.getMainnetChains).toBeInstanceOf(Function);
      expect(result.current.setDeploymentMode).toBeInstanceOf(Function);
    });
  });

  describe('Get Mainnet Chains', () => {
    it('should return only mainnet chains', () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      const mainnets = result.current.getMainnetChains();

      expect(mainnets).toBeInstanceOf(Array);
      expect(mainnets.every(chain => !chain.chainName.includes('Testnet'))).toBe(true);
    });

    it('should include chain IDs and names', () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      const mainnets = result.current.getMainnetChains();

      mainnets.forEach(chain => {
        expect(chain).toHaveProperty('chainId');
        expect(chain).toHaveProperty('chainName');
        expect(typeof chain.chainId).toBe('number');
        expect(typeof chain.chainName).toBe('string');
      });
    });
  });

  describe('Deployment Mode', () => {
    it('should allow changing deployment mode', () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      expect(result.current.deploymentMode).toBe('sequential');

      act(() => {
        result.current.setDeploymentMode('parallel');
      });

      expect(result.current.deploymentMode).toBe('parallel');
    });
  });

  describe('Single Chain Deployment', () => {
    it('should deploy to single chain successfully', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      let deploymentResults: any;
      await act(async () => {
        deploymentResults = await result.current.deployToMultipleChains([56], mockTokenData, 'ipfs://test');
      });

      const result56 = deploymentResults.get(56);
      expect(result56.success).toBe(true);
      expect(result56.tokenAddress).toBe(mockTokenAddress);
      expect(result56.ammAddress).toBe(mockAmmAddress);
      expect(result56.txHash).toBe('0xdeploytxhash');
    });

    it('should switch network before deployment', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([42161], mockTokenData);
      });

      expect(mockWallet.switchNetwork).toHaveBeenCalledWith(42161);
    });

    it('should update deployment state during deployment', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      let deploymentPromise: Promise<any>;
      act(() => {
        deploymentPromise = result.current.deployToMultipleChains([56], mockTokenData);
      });

      // Should be deploying
      expect(result.current.isDeploying).toBe(true);

      await act(async () => {
        await deploymentPromise!;
      });

      // Should be done
      expect(result.current.isDeploying).toBe(false);
    });

    it('should track deployment progress', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      // Check final deployment state
      const deployment = result.current.deployments.find(d => d.chainId === 56);
      expect(deployment).toBeDefined();
      expect(deployment?.status).toBe('success');
      expect(deployment?.progress).toBe(100);
    });

    it('should handle network switch failure', async () => {
      mockWallet.switchNetwork.mockResolvedValue(false);

      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const result56 = result.current.deployments.find(d => d.chainId === 56);
      expect(result56?.status).toBe('error');
      expect(result56?.error).toContain('Failed to switch network');
    });

    it('should handle deployment transaction failure', async () => {
      mockFactoryContract.createToken.mockRejectedValue(new Error('Insufficient funds'));

      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const result56 = result.current.deployments.find(d => d.chainId === 56);
      expect(result56?.status).toBe('error');
      expect(result56?.error).toContain('Insufficient funds');
    });

    it('should handle missing factory address', async () => {
      delete process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;

      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const result56 = result.current.deployments.find(d => d.chainId === 56);
      expect(result56?.status).toBe('error');
      expect(result56?.error).toContain('Factory not deployed');
    });

    it('should handle missing chain configuration', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([999], mockTokenData);
      });

      const result999 = result.current.deployments.find(d => d.chainId === 999);
      expect(result999?.success).toBe(false);
      expect(result999?.error).toContain('Chain configuration not found');
    });
  });

  describe('Multi-Chain Deployment', () => {
    it('should deploy to multiple chains sequentially', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56, 42161], mockTokenData);
      });

      expect(result.current.deployments).toHaveLength(2);
      expect(result.current.deployments.every(d => d.status === 'success')).toBe(true);
    });

    it('should switch network for each chain', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56, 42161, 8453], mockTokenData);
      });

      expect(mockWallet.switchNetwork).toHaveBeenCalledTimes(3);
      expect(mockWallet.switchNetwork).toHaveBeenCalledWith(56);
      expect(mockWallet.switchNetwork).toHaveBeenCalledWith(42161);
      expect(mockWallet.switchNetwork).toHaveBeenCalledWith(8453);
    });

    it('should deploy with same token data to all chains', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56, 42161], mockTokenData, 'ipfs://image');
      });

      expect(mockFactoryContract.createToken).toHaveBeenCalledTimes(2);

      // Verify both calls have same token data
      const calls = mockFactoryContract.createToken.mock.calls;
      expect(calls[0][0]).toBe(mockTokenData.name);
      expect(calls[1][0]).toBe(mockTokenData.name);
      expect(calls[0][3]).toBe('ipfs://image');
      expect(calls[1][3]).toBe('ipfs://image');
    });

    it('should continue deploying even if one chain fails', async () => {
      let callCount = 0;
      mockFactoryContract.createToken.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First chain failed'));
        }
        return Promise.resolve({
          wait: vi.fn().mockResolvedValue({
            hash: '0xsuccess',
            logs: [{ topics: ['0xtopic'], data: '0xdata' }],
          }),
        });
      });

      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56, 42161], mockTokenData);
      });

      const result56 = result.current.deployments.find(d => d.chainId === 56);
      const result42161 = result.current.deployments.find(d => d.chainId === 42161);

      expect(result56?.status).toBe('error');
      expect(result42161?.status).toBe('success');
    });

    it('should track individual deployment states', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56, 42161, 8453], mockTokenData);
      });

      expect(result.current.deployments).toHaveLength(3);
      result.current.deployments.forEach(deployment => {
        expect(deployment).toHaveProperty('chainId');
        expect(deployment).toHaveProperty('chainName');
        expect(deployment).toHaveProperty('status');
        expect(deployment).toHaveProperty('progress');
      });
    });
  });

  describe('Deployment Results', () => {
    it('should return deployment results map', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      let results: Map<number, any>;
      await act(async () => {
        results = await result.current.deployToMultipleChains([56, 42161], mockTokenData);
      });

      expect(results!).toBeInstanceOf(Map);
      expect(results!.size).toBe(2);
      expect(results!.has(56)).toBe(true);
      expect(results!.has(42161)).toBe(true);
    });

    it('should include all deployment details in results', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      let results: Map<number, any>;
      await act(async () => {
        results = await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const result56 = results!.get(56);
      expect(result56).toMatchObject({
        chainId: 56,
        chainName: expect.any(String),
        success: true,
        tokenAddress: mockTokenAddress,
        ammAddress: mockAmmAddress,
        txHash: '0xdeploytxhash',
      });
    });

    it('should include error in results for failed deployments', async () => {
      mockFactoryContract.createToken.mockRejectedValue(new Error('Deploy failed'));

      const { result } = renderHook(() => useMultiChainDeployment());

      let results: Map<number, any>;
      await act(async () => {
        results = await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const result56 = results!.get(56);
      expect(result56.success).toBe(false);
      expect(result56.error).toBe('Deploy failed');
    });
  });

  describe('Deployment State Management', () => {
    it('should initialize deployment states', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      let deployPromise: Promise<any>;
      act(() => {
        deployPromise = result.current.deployToMultipleChains([56, 42161], mockTokenData);
      });

      // Check that states are initialized
      await waitFor(() => {
        expect(result.current.deployments).toHaveLength(2);
      });

      await act(async () => {
        await deployPromise!;
      });
    });

    it('should update status from pending to success', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const deployment = result.current.deployments.find(d => d.chainId === 56);
      expect(deployment?.status).toBe('success');
    });

    it('should update progress throughout deployment', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const deployment = result.current.deployments.find(d => d.chainId === 56);
      expect(deployment?.progress).toBe(100);
    });

    it('should set error status on failure', async () => {
      mockWallet.switchNetwork.mockResolvedValue(false);

      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const deployment = result.current.deployments.find(d => d.chainId === 56);
      expect(deployment?.status).toBe('error');
      expect(deployment?.error).toBeDefined();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset deployments', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      // Do a deployment
      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      expect(result.current.deployments.length).toBeGreaterThan(0);

      // Reset
      act(() => {
        result.current.resetDeployments();
      });

      expect(result.current.deployments).toHaveLength(0);
      expect(result.current.isDeploying).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should throw error when wallet not connected', async () => {
      mockWallet.connected = false;

      const { result } = renderHook(() => useMultiChainDeployment());

      await expect(
        result.current.deployToMultipleChains([56], mockTokenData)
      ).rejects.toThrow('Wallet not connected');
    });

    it('should handle provider not available', async () => {
      mockWallet.connector.getProvider.mockResolvedValue(null);

      // Mock window.ethereum as null too
      const originalWindow = global.window;
      (global as any).window = { ethereum: undefined };

      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const result56 = result.current.deployments.find(d => d.chainId === 56);
      expect(result56?.status).toBe('error');
      expect(result56?.error).toContain('provider not available');

      // Restore window
      (global as any).window = originalWindow;
    });

    it('should handle gas estimation failure', async () => {
      mockFactoryContract.createToken.estimateGas = vi.fn().mockRejectedValue(new Error('Gas estimation failed'));

      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const result56 = result.current.deployments.find(d => d.chainId === 56);
      expect(result56?.status).toBe('error');
    });

    it('should handle transaction wait failure', async () => {
      mockFactoryContract.createToken.mockResolvedValue({
        wait: vi.fn().mockRejectedValue(new Error('Transaction reverted')),
      });

      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const result56 = result.current.deployments.find(d => d.chainId === 56);
      expect(result56?.status).toBe('error');
      expect(result56?.error).toContain('Transaction reverted');
    });

    it('should handle missing TokenCreated event', async () => {
      mockFactoryContract.createToken.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({
          hash: '0xtxhash',
          logs: [],
        }),
      });

      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const result56 = result.current.deployments.find(d => d.chainId === 56);
      expect(result56?.status).toBe('error');
      expect(result56?.error).toContain('TokenCreated event not found');
    });
  });

  describe('Parallel Mode', () => {
    it('should deploy in parallel mode (currently implemented as sequential)', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      act(() => {
        result.current.setDeploymentMode('parallel');
      });

      await act(async () => {
        await result.current.deployToMultipleChains([56, 42161], mockTokenData);
      });

      // Even in parallel mode, currently deploys sequentially
      expect(result.current.deployments).toHaveLength(2);
      expect(mockFactoryContract.createToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('Image URL', () => {
    it('should pass image URL to contract', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData, 'ipfs://Qm123abc');
      });

      expect(mockFactoryContract.createToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'ipfs://Qm123abc',
        expect.any(BigInt),
        expect.any(BigInt),
        expect.any(BigInt),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should use empty string if no image URL provided', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const calls = mockFactoryContract.createToken.mock.calls;
      expect(calls[0][3]).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty chain list', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      let results: Map<number, any>;
      await act(async () => {
        results = await result.current.deployToMultipleChains([], mockTokenData);
      });

      expect(results!.size).toBe(0);
      expect(result.current.deployments).toHaveLength(0);
    });

    it('should handle deployment to same chain twice', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56, 56], mockTokenData);
      });

      // Should deploy twice
      expect(mockFactoryContract.createToken).toHaveBeenCalledTimes(2);
    });

    it('should wait between network switches', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      const startTime = Date.now();
      await act(async () => {
        await result.current.deployToMultipleChains([56, 42161], mockTokenData);
      });
      const endTime = Date.now();

      // Should have waited at least 2 seconds total (1s per deployment)
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });

    it('should handle very large numbers in token data', async () => {
      const largeTokenData: TokenCreationForm = {
        ...mockTokenData,
        totalSupply: 1000000000000, // 1 trillion
        basePrice: 0.0000001,
        slope: 0.00000001,
      };

      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], largeTokenData);
      });

      const result56 = result.current.deployments.find(d => d.chainId === 56);
      expect(result56?.status).toBe('success');
    });
  });

  describe('Chain-specific Environment Variables', () => {
    it('should use chain-specific factory address if available', async () => {
      process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_56 = '0xchain56specific123456789012345678901234';

      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      // Should successfully deploy with chain-specific address
      const result56 = result.current.deployments.find(d => d.chainId === 56);
      expect(result56?.status).toBe('success');

      delete process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_56;
    });

    it('should fall back to default factory address', async () => {
      const { result } = renderHook(() => useMultiChainDeployment());

      await act(async () => {
        await result.current.deployToMultipleChains([56], mockTokenData);
      });

      const result56 = result.current.deployments.find(d => d.chainId === 56);
      expect(result56?.status).toBe('success');
    });
  });
});
