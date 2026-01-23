// Multi-chain deployment hook for deploying tokens across multiple chains
import { useCallback, useState } from 'react';
import { ethers } from 'ethers';
import TokenFactoryABI from '@/abis/TokenFactory.json';
import { TokenCreationForm } from '../types';
import { supportedChains, getChainById, getChainMetadata, isTestnet } from '../config/chains';
import { getTokenFactoryAddress } from '../config/contracts';
import { useMultichainWallet } from './useMultichainWallet';

/**
 * Type for Ethereum provider (from injected wallet like MetaMask)
 */
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  [key: string]: unknown;
}

/**
 * Extend Window interface to include ethereum provider
 */
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export interface DeploymentResult {
  chainId: number;
  chainName: string;
  success: boolean;
  tokenAddress?: string;
  ammAddress?: string;
  txHash?: string;
  error?: string;
}

export interface DeploymentState {
  chainId: number;
  chainName: string;
  status: 'pending' | 'switching' | 'deploying' | 'success' | 'error';
  progress: number; // 0-100
  error?: string;
  result?: DeploymentResult;
}

export function useMultiChainDeployment() {
  const wallet = useMultichainWallet();
  const [deployments, setDeployments] = useState<Map<number, DeploymentState>>(new Map());
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentMode, setDeploymentMode] = useState<'sequential' | 'parallel'>('sequential');

  // Get mainnet chains only
  const getMainnetChains = useCallback(() => {
    return supportedChains
      .filter(chain => !isTestnet(chain.id))
      .map(chain => ({
        chainId: chain.id,
        chainName: getChainMetadata(chain.id)?.shortName || chain.name,
      }));
  }, []);

  // Initialize deployment state for selected chains
  const initializeDeployments = useCallback((chainIds: number[]) => {
    const newDeployments = new Map<number, DeploymentState>();
    chainIds.forEach(chainId => {
      const chainConfig = getChainById(chainId);
      const chainName = getChainMetadata(chainId)?.shortName || chainConfig?.name || 'Unknown';
      newDeployments.set(chainId, {
        chainId,
        chainName,
        status: 'pending',
        progress: 0,
      });
    });
    setDeployments(newDeployments);
  }, []);

  // Deploy token to a single chain
  const deployToChain = useCallback(async (
    chainId: number,
    tokenData: TokenCreationForm,
    imageUrl: string = ''
  ): Promise<DeploymentResult> => {
    const chainConfig = getChainById(chainId);
    const chainName = getChainMetadata(chainId)?.shortName || chainConfig?.name || 'Unknown';
    
    if (!chainConfig) {
      return {
        chainId,
        chainName,
        success: false,
        error: 'Chain configuration not found',
      };
    }

    // Update status to switching
    setDeployments(prev => {
      const updated = new Map(prev);
      const state = updated.get(chainId);
      if (state) {
        updated.set(chainId, { ...state, status: 'switching', progress: 10 });
      }
      return updated;
    });

    try {
      // Switch to target chain
      const switchSuccess = await wallet.switchNetwork(chainId);
      if (!switchSuccess) {
        throw new Error('Failed to switch network');
      }

      // Wait a bit for network switch to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update status to deploying
      setDeployments(prev => {
        const updated = new Map(prev);
        const state = updated.get(chainId);
        if (state) {
          updated.set(chainId, { ...state, status: 'deploying', progress: 30 });
        }
        return updated;
      });

      // Get provider and signer for this chain
      if (!wallet.address) {
        throw new Error('Wallet not connected');
      }

      let externalProvider: EthereumProvider | null = null;
      if (wallet.connector?.getProvider) {
        externalProvider = (await wallet.connector.getProvider()) as EthereumProvider | null;
      }

      if (!externalProvider && typeof window !== 'undefined') {
        externalProvider = window.ethereum ?? null;
      }

      if (!externalProvider) {
        throw new Error('Wallet provider not available');
      }

      const browserProvider = new ethers.BrowserProvider(externalProvider, chainId);
      const signer = await browserProvider.getSigner();

      // Get factory address for this chain
      const factoryAddress = getTokenFactoryAddress(chainId);
      
      if (!factoryAddress) {
        throw new Error(`Factory not deployed on chain ${chainId}`);
      }

      const factoryContract = new ethers.Contract(factoryAddress, TokenFactoryABI.abi, signer);

      // Prepare contract parameters
      const totalSupply = ethers.parseEther(tokenData.totalSupply.toString());
      const basePrice = ethers.parseEther(tokenData.basePrice.toString());
      const slope = ethers.parseEther(tokenData.slope.toString());
      const curveType = tokenData.curveType === 'linear' ? 0 : 1;

      setDeployments(prev => {
        const updated = new Map(prev);
        const state = updated.get(chainId);
        if (state) {
          updated.set(chainId, { ...state, progress: 50 });
        }
        return updated;
      });

      // Estimate gas
      const creationFee = await factoryContract.CREATION_FEE();
      const gasEstimate = await factoryContract.createToken.estimateGas(
        tokenData.name,
        tokenData.symbol,
        tokenData.description,
        imageUrl,
        totalSupply,
        basePrice,
        slope,
        curveType,
        { value: creationFee }
      );

      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

      setDeployments(prev => {
        const updated = new Map(prev);
        const state = updated.get(chainId);
        if (state) {
          updated.set(chainId, { ...state, progress: 70 });
        }
        return updated;
      });

      // Execute transaction
      const tx = await factoryContract.createToken(
        tokenData.name,
        tokenData.symbol,
        tokenData.description,
        imageUrl,
        totalSupply,
        basePrice,
        slope,
        curveType,
        { gasLimit, value: creationFee }
      );

      setDeployments(prev => {
        const updated = new Map(prev);
        const state = updated.get(chainId);
        if (state) {
          updated.set(chainId, { ...state, progress: 85 });
        }
        return updated;
      });

      const receipt = await tx.wait();

      // Parse TokenCreated event
      const tokenCreatedEvent = receipt.logs.find((log: ethers.Log | ethers.EventLog) => {
        try {
          const decoded = factoryContract.interface.parseLog(log);
          return decoded?.name === 'TokenCreated';
        } catch {
          return false;
        }
      });

      if (!tokenCreatedEvent) {
        throw new Error('TokenCreated event not found');
      }

      const decodedEvent = factoryContract.interface.parseLog(tokenCreatedEvent);
      if (!decodedEvent || !decodedEvent.args) {
        throw new Error('Unable to decode TokenCreated event');
      }
      const tokenAddress = decodedEvent.args.tokenAddress as string;
      const ammAddress = decodedEvent.args.ammAddress as string;

      const result: DeploymentResult = {
        chainId,
        chainName,
        success: true,
        tokenAddress,
        ammAddress,
        txHash: receipt.hash,
      };

      setDeployments(prev => {
        const updated = new Map(prev);
        const state = updated.get(chainId);
        if (state) {
          updated.set(chainId, {
            ...state,
            status: 'success',
            progress: 100,
            result,
          });
        }
        return updated;
      });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
      
      setDeployments(prev => {
        const updated = new Map(prev);
        const state = updated.get(chainId);
        if (state) {
          updated.set(chainId, {
            ...state,
            status: 'error',
            error: errorMessage,
          });
        }
        return updated;
      });

      return {
        chainId,
        chainName,
        success: false,
        error: errorMessage,
      };
    }
  }, [wallet]);

  // Deploy to multiple chains
  const deployToMultipleChains = useCallback(async (
    chainIds: number[],
    tokenData: TokenCreationForm,
    imageUrl: string = ''
  ): Promise<Map<number, DeploymentResult>> => {
    if (!wallet.connected) {
      throw new Error('Wallet not connected');
    }

    setIsDeploying(true);
    initializeDeployments(chainIds);

    const results = new Map<number, DeploymentResult>();

    if (deploymentMode === 'sequential') {
      // Deploy one chain at a time
      for (const chainId of chainIds) {
        const result = await deployToChain(chainId, tokenData, imageUrl);
        results.set(chainId, result);
      }
    } else {
      // Deploy in parallel (more complex, requires multiple wallet connections)
      // For now, we'll do sequential even if parallel is selected
      // True parallel deployment would require wallet support for multiple simultaneous connections
      for (const chainId of chainIds) {
        const result = await deployToChain(chainId, tokenData, imageUrl);
        results.set(chainId, result);
      }
    }

    setIsDeploying(false);
    return results;
  }, [wallet.connected, deploymentMode, initializeDeployments, deployToChain]);

  const resetDeployments = useCallback(() => {
    setDeployments(new Map());
    setIsDeploying(false);
  }, []);

  return {
    deployments: Array.from(deployments.values()),
    isDeploying,
    deploymentMode,
    setDeploymentMode,
    deployToMultipleChains,
    resetDeployments,
    getMainnetChains,
  };
}
