// Enhanced Smart Contract Integration with AMM Address Resolution
import { useCallback } from 'react';
import { ethers } from 'ethers';
import {
  KasPumpToken,
  TradeData,
  SwapQuote,
  TokenCreationForm,
  TokenCreatedEventArgs,
} from '../types';
import { useMultichainWallet } from './useMultichainWallet';
import { useContractProvider } from './contracts/useContractProvider';
import { parseContractError } from '../utils/contractErrors';
import { getTokenFactoryAddress, getChainName, getSupportedChains } from '../config/contracts';

// Enhanced ABI definitions with events
const TOKEN_FACTORY_ABI = [
  "function createToken(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType) external payable returns (address, address)",
  "function getAllTokens() external view returns (address[])",
  "function getTokenConfig(address tokenAddress) external view returns (tuple(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType, uint256 graduationThreshold))",
  "function getTokenAMM(address tokenAddress) external view returns (address)",
  "function isKasPumpToken(address tokenAddress) external view returns (bool)",
  "event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 totalSupply, address ammAddress)"
];

const BONDING_CURVE_AMM_ABI = [
  "function buyTokens(uint256 minTokensOut) external payable",
  "function sellTokens(uint256 tokenAmount, uint256 minNativeOut) external",
  "function getCurrentPrice() external view returns (uint256)",
  "function getTradingInfo() external view returns (uint256 currentSupply, uint256 currentPrice, uint256 totalVolume, uint256 graduation, bool isGraduated)",
  "function calculateTokensOut(uint256 nativeIn, uint256 supply) external view returns (uint256)",
  "function calculateNativeOut(uint256 tokensIn, uint256 supply) external view returns (uint256)",
  "function getPriceImpact(uint256 amount, bool isBuy) external view returns (uint256)",
  "function token() external view returns (address)",
  "function currentSupply() external view returns (uint256)",
  "function totalVolume() external view returns (uint256)",
  "function isGraduated() external view returns (bool)",
  "event Trade(address indexed trader, bool indexed isBuy, uint256 nativeAmount, uint256 tokenAmount, uint256 newPrice, uint256 fee)"
];

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)"
];

// AMM address cache for performance
const ammAddressCache = new Map<string, string>();

export function useContracts() {
  const wallet = useMultichainWallet();

  // Get contract addresses for current chain
  const currentChainId = wallet.chainId ?? Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? '97');
  // Use extracted provider hook
  const {
    provider,
    readProvider,
    signer,
    isInitialized,
    isConnected,
    getRunnerOrThrow: providerRunner,
    getReadProviderOrThrow: providerReadRunner,
    getContractRunner
  } = useContractProvider(wallet, currentChainId);

  // Derived state
  const hasSigner = Boolean(signer);

  // Get contract instances
  const getTokenFactoryContract = useCallback(() => {
    const factoryAddress = getTokenFactoryAddress(currentChainId);
    if (!factoryAddress) {
      const chainName = getChainName(currentChainId);
      const supportedChains = getSupportedChains();
      throw new Error(
        `Token factory not deployed on ${chainName} (chain ${currentChainId}). ` +
        `Please switch to a supported chain or deploy the contracts first. ` +
        `Supported chains: ${supportedChains.join(', ')}`
      );
    }
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    if (!signer || typeof signer !== 'object') {
      throw new Error('Invalid signer');
    }
    return new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, signer);
  }, [signer, currentChainId]);

  const getRunnerOrThrow = useCallback((): ethers.Signer | ethers.AbstractProvider => {
    if (getContractRunner) {
      try {
        return getContractRunner();
      } catch (error) {
        console.warn('Contract runner unavailable from provider hook, falling back to signer/provider.', error);
      }
    }
    if (providerRunner) {
      try {
        return providerRunner();
      } catch (error) {
        console.warn('Provider runner unavailable, attempting manual resolution.', error);
      }
    }
    if (signer && typeof signer === 'object') return signer;
    if (provider && typeof provider === 'object') return provider;
    throw new Error('Blockchain provider not available');
  }, [getContractRunner, providerRunner, signer, provider]);

  const getReadProviderOrThrow = useCallback((): ethers.AbstractProvider => {
    if (providerReadRunner) {
      try {
        return providerReadRunner();
      } catch (error) {
        console.warn('Provider read runner unavailable, falling back to resolved provider.', error);
      }
    }
    if (readProvider && typeof readProvider === 'object') return readProvider;
    if (provider && typeof provider === 'object') return provider;
    throw new Error('Blockchain provider not available');
  }, [providerReadRunner, readProvider, provider]);

  const getBondingCurveContract = useCallback((ammAddress: string) => {
    if (!ammAddress) {
      throw new Error('AMM address is required');
    }
    const runner = getRunnerOrThrow();
    return new ethers.Contract(ammAddress, BONDING_CURVE_AMM_ABI, runner);
  }, [getRunnerOrThrow]);

  const getTokenContract = useCallback((tokenAddress: string) => {
    if (!tokenAddress) {
      throw new Error('Token address is required');
    }
    const runner = getRunnerOrThrow();
    return new ethers.Contract(tokenAddress, ERC20_ABI, runner);
  }, [getRunnerOrThrow]);

  // Resolve AMM address for a token (with caching)
  const getTokenAMMAddress = useCallback(async (tokenAddress: string): Promise<string> => {
    // Check cache first
    if (ammAddressCache.has(tokenAddress)) {
      return ammAddressCache.get(tokenAddress)!;
    }

    try {
      const factoryAddress = getTokenFactoryAddress(currentChainId);
      if (!factoryAddress) {
        throw new Error(`Token factory address not configured for chain ${currentChainId}`);
      }

      const runner = getReadProviderOrThrow();
      const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, runner);
      
      // Check if we have a getTokenAMM function (newer factory version)
      try {
        const ammAddress = await factoryContract.getTokenAMM!(tokenAddress);
        if (!ammAddress || ammAddress === ethers.ZeroAddress) {
          throw new Error('AMM address not found');
        }
        ammAddressCache.set(tokenAddress, ammAddress);
        return ammAddress;
      } catch (error) {
        // Fallback: search TokenCreated events
        const filter = factoryContract.filters.TokenCreated!(tokenAddress);
        const events = await factoryContract.queryFilter(filter);
        
        if (events.length > 0) {
          const event = events[0]!;
          if ('args' in event && event.args) {
            // Type assertion for TokenCreated event args
            const args = event.args as unknown as TokenCreatedEventArgs;
            ammAddressCache.set(tokenAddress, args.ammAddress);
            return args.ammAddress;
          }
        }
        
        throw new Error('AMM address not found for token');
      }
    } catch (error) {
      console.error('Failed to resolve AMM address:', error);
      throw new Error(`Failed to resolve AMM address for token ${tokenAddress}`);
    }
  }, [getReadProviderOrThrow]);

  // Create a new token with bonding curve
  const createToken = useCallback(async (tokenData: TokenCreationForm, imageUrl?: string): Promise<{ tokenAddress: string; ammAddress: string; txHash: string }> => {
    if (!wallet.connected) throw new Error('Wallet not connected');
    if (!isInitialized) throw new Error('Contracts not initialized');
    
    try {
      const contract = getTokenFactoryContract();
      
      // Convert form data to contract parameters
      const totalSupply = ethers.parseEther(tokenData.totalSupply.toString());
      const basePrice = ethers.parseEther(tokenData.basePrice.toString());
      const slope = ethers.parseEther(tokenData.slope.toString());
      const curveType = tokenData.curveType === 'linear' ? 0 : 1;
      
      // Estimate gas
      const imageUrlToUse = imageUrl || ''; // Use provided IPFS URL or empty string
      const gasEstimate = await contract.createToken!.estimateGas(
        tokenData.name,
        tokenData.symbol,
        tokenData.description,
        imageUrlToUse, // IPFS hash if available
        totalSupply,
        basePrice,
        slope,
        curveType
      );

      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

      // Execute transaction
      const tx = await contract.createToken!(
        tokenData.name,
        tokenData.symbol,
        tokenData.description,
        imageUrlToUse, // IPFS hash if available
        totalSupply,
        basePrice,
        slope,
        curveType,
        { gasLimit }
      );

      const receipt = await tx.wait();

      // Parse the TokenCreated event to get addresses
      const tokenCreatedEvent = receipt.logs.find((log: ethers.Log | ethers.EventLog) => {
        try {
          const decoded = contract.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          return decoded?.name === 'TokenCreated';
        } catch {
          return false;
        }
      });
      
      if (!tokenCreatedEvent) {
        throw new Error('TokenCreated event not found');
      }

      const decodedEvent = contract.interface.parseLog(tokenCreatedEvent);
      if (!decodedEvent || !decodedEvent.args) {
        throw new Error('Unable to decode TokenCreated event');
      }
      const tokenAddress = decodedEvent.args.tokenAddress as string;
      const ammAddress = decodedEvent.args.ammAddress as string;
      
      // Cache the AMM address
      ammAddressCache.set(tokenAddress, ammAddress);
      
      return {
        tokenAddress,
        ammAddress,
        txHash: receipt.hash
      };

    } catch (error: unknown) {
      console.error('Token creation failed:', error);
      throw parseContractError(error);
    }
  }, [wallet.connected, isInitialized, getTokenFactoryContract]);

  // Execute a trade (buy or sell)
  const executeTrade = useCallback(async (trade: TradeData): Promise<string> => {
    if (!wallet.connected) throw new Error('Wallet not connected');
    if (!isInitialized) throw new Error('Contracts not initialized');
    if (!wallet.address) throw new Error('Wallet address not available');
    
    try {
      // Get AMM address for the token
      const ammAddress = await getTokenAMMAddress(trade.tokenAddress);
      const ammContract = getBondingCurveContract(ammAddress);
      
      if (trade.action === 'buy') {
        const nativeAmount = ethers.parseEther(trade.baseAmount.toString());
        const minTokensOut = ethers.parseEther((trade.expectedOutput * (1 - trade.slippageTolerance / 100)).toString());

        // Estimate gas
        const gasEstimate = await ammContract.buyTokens!.estimateGas(minTokensOut, { value: nativeAmount });
        const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

        const tx = await ammContract.buyTokens!(minTokensOut, {
          value: nativeAmount,
          gasLimit
        });
        const receipt = await tx.wait();
        return receipt.hash;

      } else {
        const tokenContract = getTokenContract(trade.tokenAddress);
        const tokenAmount = ethers.parseEther(trade.baseAmount.toString());
        const minNativeOut = ethers.parseEther((trade.expectedOutput * (1 - trade.slippageTolerance / 100)).toString());
        
        // Check and approve tokens if needed
        const allowance = await tokenContract.allowance!(wallet.address, ammAddress);
        if (allowance < tokenAmount) {
          const approveTx = await tokenContract.approve!(ammAddress, tokenAmount);
          await approveTx.wait();
        }
        
        // Execute sell
        const gasEstimate = await ammContract.sellTokens!.estimateGas(tokenAmount, minNativeOut);
        const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

        const tx = await ammContract.sellTokens!(tokenAmount, minNativeOut, { gasLimit });
        const receipt = await tx.wait();
        return receipt.hash;
      }

    } catch (error: unknown) {
      console.error('Trade execution failed:', error);
      throw parseContractError(error);
    }
  }, [wallet.connected, wallet.address, isInitialized, getTokenAMMAddress, getBondingCurveContract, getTokenContract]);

  // Get swap quote
  const getSwapQuote = useCallback(async (
    tokenAddress: string,
    amount: number,
    action: 'buy' | 'sell'
  ): Promise<SwapQuote> => {
    try {
      const ammAddress = await getTokenAMMAddress(tokenAddress);
      const ammContract = getBondingCurveContract(ammAddress);
      const amountWei = ethers.parseEther(amount.toString());
      
      // Get current trading info
      const [currentSupply, , , , isGraduated] = await ammContract.getTradingInfo!();

      if (action === 'buy') {
        const tokensOut = await ammContract.calculateTokensOut!(amountWei, currentSupply);
        const priceImpact = await ammContract.getPriceImpact!(amountWei, true);
        
        return {
          inputAmount: amount,
          outputAmount: parseFloat(ethers.formatEther(tokensOut)),
          priceImpact: parseFloat(ethers.formatUnits(priceImpact, 2)), // Basis points to percentage
          slippage: 0.5, // Default slippage
          gasFee: 0.001, // Estimated gas fee
          route: isGraduated ? 'amm' : 'bonding-curve',
          minimumOutput: parseFloat(ethers.formatEther(tokensOut)) * 0.995 // 0.5% slippage
        };
      } else {
        const nativeOut = await ammContract.calculateNativeOut!(amountWei, currentSupply);
        const priceImpact = await ammContract.getPriceImpact!(amountWei, false);

        return {
          inputAmount: amount,
          outputAmount: parseFloat(ethers.formatEther(nativeOut)),
          priceImpact: parseFloat(ethers.formatUnits(priceImpact, 2)),
          slippage: 0.5,
          gasFee: 0.001,
          route: isGraduated ? 'amm' : 'bonding-curve',
          minimumOutput: parseFloat(ethers.formatEther(nativeOut)) * 0.995
        };
      }

    } catch (error: unknown) {
      console.error('Quote calculation failed:', error);
      throw parseContractError(error);
    }
  }, [getTokenAMMAddress, getBondingCurveContract]);

  // Get all tokens created through the factory
  const getAllTokens = useCallback(async (): Promise<string[]> => {
    try {
      const factoryAddress = getTokenFactoryAddress(currentChainId);
      if (!factoryAddress) {
        const chainName = getChainName(currentChainId);
        const supportedChains = getSupportedChains();
        throw new Error(
          `Token factory not deployed on ${chainName} (chain ${currentChainId}). ` +
          `Supported chains: ${supportedChains.join(', ')}`
        );
      }
      const runner = getReadProviderOrThrow();
      const contract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, runner);
      
      // Validate contract before calling
      if (!contract || typeof contract !== 'object') {
        throw new Error('Invalid factory contract instance');
      }
      
      // Check if getAllTokens method exists and is callable
      if (typeof contract.getAllTokens !== 'function') {
        throw new Error('getAllTokens method not available on contract');
      }
      
      // Defensive call with error handling
      try {
        return await contract.getAllTokens();
      } catch (error: unknown) {
        // If the contract call fails, provide a more descriptive error
        const errorMessage = error instanceof Error
          ? error.message
          : (error && typeof error === 'object' && 'reason' in error && typeof error.reason === 'string')
            ? error.reason
            : 'Contract call failed';
        throw new Error(`Failed to fetch tokens: ${errorMessage}`);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch tokens:', error);
      throw parseContractError(error);
    }
  }, [getReadProviderOrThrow, currentChainId]);

  // Get detailed token information with real blockchain data
  const getTokenInfo = useCallback(async (tokenAddress: string): Promise<KasPumpToken | null> => {
    try {
      const factoryAddress = getTokenFactoryAddress(currentChainId);
      if (!factoryAddress) {
        throw new Error(`Token factory address not configured for chain ${currentChainId}`);
      }
      const runner = getReadProviderOrThrow();
      const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, runner);
      const tokenContract = getTokenContract(tokenAddress);
      
      // Check if it's a KasPump token
      const isKasPumpToken = await factoryContract.isKasPumpToken!(tokenAddress);
      if (!isKasPumpToken) return null;
      
      // Get config and basic token info
      const [config, name, symbol, totalSupply] = await Promise.all([
        factoryContract.getTokenConfig!(tokenAddress),
        tokenContract.name!(),
        tokenContract.symbol!(),
        tokenContract.totalSupply!()
      ]);
      
      // Get AMM address and trading info
      const ammAddress = await getTokenAMMAddress(tokenAddress);
      const ammContract = getBondingCurveContract(ammAddress);
      
      const [currentSupply, currentPrice, totalVolume, graduation, isGraduated] = await ammContract.getTradingInfo!();
      
      // Calculate derived metrics
      const currentSupplyNumber = parseFloat(ethers.formatEther(currentSupply));
      const priceNumber = parseFloat(ethers.formatEther(currentPrice));
      const marketCap = currentSupplyNumber * priceNumber;
      const bondingCurveProgress = parseFloat(ethers.formatUnits(graduation, 2)); // From basis points
      
      return {
        address: tokenAddress,
        name: config.name || name,
        symbol: config.symbol || symbol,
        description: config.description || '',
        image: config.imageUrl || '',
        creator: '', // Would need to get from TokenCreated event
        totalSupply: parseFloat(ethers.formatEther(totalSupply)),
        currentSupply: currentSupplyNumber,
        marketCap,
        price: priceNumber,
        change24h: 0, // Would need historical price data
        volume24h: parseFloat(ethers.formatEther(totalVolume)),
        holders: 0, // Would need to count unique holders
        createdAt: new Date(), // Would get from TokenCreated event
        curveType: config.curveType === 0 ? 'linear' : 'exponential',
        bondingCurveProgress,
        ammAddress,
        isGraduated
      };

    } catch (error: unknown) {
      console.error('Failed to fetch token info:', error);
      return null;
    }
  }, [getReadProviderOrThrow, getTokenContract, getTokenAMMAddress, getBondingCurveContract, currentChainId]);

  // Token approval
  const approveToken = useCallback(async (tokenAddress: string, spenderAddress: string, amount: string): Promise<string> => {
    if (!isConnected || !hasSigner) {
      throw new Error('Wallet not connected');
    }

    try {
      const tokenContract = getTokenContract(tokenAddress);
      const amountWei = ethers.parseEther(amount);

      const tx = await tokenContract.approve!(spenderAddress, amountWei);
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      throw parseContractError(error);
    }
  }, [getTokenContract, isConnected, hasSigner]);

  const getTokenBalance = useCallback(async (tokenAddress: string, userAddress: string): Promise<number> => {
    try {
      const tokenContract = getTokenContract(tokenAddress);
      const balance = await tokenContract.balanceOf!(userAddress);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
      return 0;
    }
  }, [getTokenContract]);

  const getAllowance = useCallback(async (tokenAddress: string, owner: string, spender: string): Promise<number> => {
    try {
      const tokenContract = getTokenContract(tokenAddress);
      const allowance = await tokenContract.allowance!(owner, spender);
      return parseFloat(ethers.formatEther(allowance));
    } catch (error) {
      console.error('Failed to fetch allowance:', error);
      return 0;
    }
  }, [getTokenContract]);

  return {
    // Connection state
    isConnected,
    isInitialized,
    provider,
    readProvider: readProvider ?? provider,
    signer,

    // Contract instances
    getTokenFactoryContract,
    getBondingCurveContract,
    getTokenContract,

    // Token creation and info
    createToken,
    getAllTokens,
    getTokenInfo,
    getTokenAMMAddress,

    // Trading
    executeTrade,
    getSwapQuote,

    // Token operations
    approveToken,
    getTokenBalance,
    getAllowance,
  };
}
