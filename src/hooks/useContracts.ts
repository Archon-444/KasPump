// Enhanced Smart Contract Integration with AMM Address Resolution
import { useCallback } from 'react';
import { ethers } from 'ethers';
import {
  KasPumpToken,
  TradeData,
  SwapQuote,
  TokenCreationForm,
  ContractError,
  TokenCreatedEventArgs,
} from '../types';
import { useMultichainWallet } from './useMultichainWallet';
import { useContractProvider } from './contracts/useContractProvider';
import { parseContractError } from '../utils/contractErrors';
import { getTokenFactoryAddress, getChainName, getSupportedChains } from '../config/contracts';

// Import TypeChain Factories for strict typing
import { 
  TokenFactory__factory, 
  BondingCurveAMM__factory 
} from '../../typechain-types';

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
const getAmmCacheKey = (chainId: number, tokenAddress: string) =>
  `${chainId}:${tokenAddress.toLowerCase()}`;

export function useContracts() {
  const wallet = useMultichainWallet();

  // Get contract addresses for current chain
  const currentChainId = wallet.chainId ?? Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? '97');
  
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

  // Get Typed Token Factory Contract
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
    
    // TypeChain Connect
    return TokenFactory__factory.connect(factoryAddress, signer);
  }, [signer, currentChainId]);

  const getRunnerOrThrow = useCallback((): ethers.Signer | ethers.AbstractProvider => {
    if (getContractRunner) {
      try { return getContractRunner(); } catch (e) { console.warn(e); }
    }
    if (providerRunner) {
      try { return providerRunner(); } catch (e) { console.warn(e); }
    }
    if (signer) return signer;
    if (provider) return provider;
    throw new Error('Blockchain provider not available');
  }, [getContractRunner, providerRunner, signer, provider]);

  const getReadProviderOrThrow = useCallback((): ethers.AbstractProvider => {
    if (providerReadRunner) {
      try { return providerReadRunner(); } catch (e) { console.warn(e); }
    }
    if (readProvider) return readProvider;
    if (provider) return provider;
    throw new Error('Blockchain provider not available');
  }, [providerReadRunner, readProvider, provider]);

  // Get Typed Bonding Curve Contract
  const getBondingCurveContract = useCallback((ammAddress: string) => {
    if (!ammAddress) throw new Error('AMM address is required');
    const runner = getRunnerOrThrow();
    // TypeChain Connect
    return BondingCurveAMM__factory.connect(ammAddress, runner);
  }, [getRunnerOrThrow]);

  // Standard ERC20 (keeping generic for now as it's simple)
  const getTokenContract = useCallback((tokenAddress: string) => {
    if (!tokenAddress) throw new Error('Token address is required');
    const runner = getRunnerOrThrow();
    return new ethers.Contract(tokenAddress, ERC20_ABI, runner);
  }, [getRunnerOrThrow]);

  // Resolve AMM address with TypeChain
  const getTokenAMMAddress = useCallback(async (tokenAddress: string): Promise<string> => {
    const cacheKey = getAmmCacheKey(currentChainId, tokenAddress);
    if (ammAddressCache.has(cacheKey)) {
      return ammAddressCache.get(cacheKey)!;
    }

    try {
      const factoryAddress = getTokenFactoryAddress(currentChainId);
      if (!factoryAddress) throw new Error(`Token factory address not configured for chain ${currentChainId}`);

      const runner = getReadProviderOrThrow();
      // Use Typed Factory for Read operations
      const factoryContract = TokenFactory__factory.connect(factoryAddress, runner);
      
      try {
        // Direct call - TypeSafe!
        const ammAddress = await factoryContract.getTokenAMM(tokenAddress);
        if (!ammAddress || ammAddress === ethers.ZeroAddress) {
          throw new Error('AMM address not found');
        }
        ammAddressCache.set(cacheKey, ammAddress);
        return ammAddress;
      } catch (error) {
        // Fallback: Event Filtering - TypeSafe filters!
        const filter = factoryContract.filters.TokenCreated(tokenAddress);
        const events = await factoryContract.queryFilter(filter);
        
        if (events.length > 0) {
          // TypeChain types the event args automatically
          const args = events[0].args;
          ammAddressCache.set(cacheKey, args.ammAddress);
          return args.ammAddress;
        }
        
        throw new Error('AMM address not found for token');
      }
    } catch (error) {
      console.error('Failed to resolve AMM address:', error);
      throw new Error(`Failed to resolve AMM address for token ${tokenAddress}`);
    }
  }, [getReadProviderOrThrow, currentChainId]);

  // Create a new token with bonding curve
  const createToken = useCallback(async (tokenData: TokenCreationForm, imageUrl?: string): Promise<{ tokenAddress: string; ammAddress: string; txHash: string }> => {
    if (!wallet.connected) throw new Error('Wallet not connected');
    if (!isInitialized) throw new Error('Contracts not initialized');
    
    try {
      const contract = getTokenFactoryContract();
      
      const totalSupply = ethers.parseEther(tokenData.totalSupply.toString());
      const basePrice = ethers.parseEther(tokenData.basePrice.toString());
      const slope = ethers.parseEther(tokenData.slope.toString());
      const curveType = tokenData.curveType === 'linear' ? 0 : 1;
      
      const imageUrlToUse = imageUrl || '';
      const creationFee = await contract.CREATION_FEE();

      // Estimate gas - TypeSafe!
      const gasEstimate = await contract.createToken.estimateGas(
        tokenData.name,
        tokenData.symbol,
        tokenData.description,
        imageUrlToUse,
        totalSupply,
        basePrice,
        slope,
        curveType,
        { value: creationFee }
      );

      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

      // Execute transaction - TypeSafe!
      const tx = await contract.createToken(
        tokenData.name,
        tokenData.symbol,
        tokenData.description,
        imageUrlToUse,
        totalSupply,
        basePrice,
        slope,
        curveType,
        { gasLimit, value: creationFee }
      );

      const receipt = await tx.wait();
      if (!receipt) throw new Error("Transaction failed");

      // Use the contract interface to parse logs - TypeSafe!
      const eventTopic = contract.interface.getEvent('TokenCreated').topicHash;
      const log = receipt.logs.find(x => x.topics[0] === eventTopic);
      
      if (!log) throw new Error('TokenCreated event not found');

      const decodedEvent = contract.interface.parseLog({
        topics: [...log.topics],
        data: log.data
      });

      if (!decodedEvent) throw new Error('Unable to decode TokenCreated event');
      
      // Args are typed!
      const tokenAddress = decodedEvent.args.tokenAddress;
      const ammAddress = decodedEvent.args.ammAddress;
      
      ammAddressCache.set(getAmmCacheKey(currentChainId, tokenAddress), ammAddress);
      
      return {
        tokenAddress,
        ammAddress,
        txHash: receipt.hash
      };

    } catch (error: unknown) {
      console.error('Token creation failed:', error);
      throw parseContractError(error);
    }
  }, [wallet.connected, isInitialized, getTokenFactoryContract, currentChainId]);

  // Execute a trade (buy or sell)
  const executeTrade = useCallback(async (trade: TradeData): Promise<string> => {
    if (!wallet.connected) throw new Error('Wallet not connected');
    if (!isInitialized) throw new Error('Contracts not initialized');
    
    try {
      const ammAddress = await getTokenAMMAddress(trade.tokenAddress);
      const ammContract = getBondingCurveContract(ammAddress);
      
      if (trade.action === 'buy') {
        const nativeAmount = ethers.parseEther(trade.baseAmount.toString());
        const minTokensOut = ethers.parseEther((trade.expectedOutput * (1 - trade.slippageTolerance / 100)).toString());

        // TypeSafe buyTokens
        const gasEstimate = await ammContract.buyTokens.estimateGas(minTokensOut, { value: nativeAmount });
        const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

        const tx = await ammContract.buyTokens(minTokensOut, {
          value: nativeAmount,
          gasLimit
        });
        const receipt = await tx.wait();
        return receipt ? receipt.hash : '';

      } else {
        const tokenContract = getTokenContract(trade.tokenAddress);
        const tokenAmount = ethers.parseEther(trade.baseAmount.toString());
        const minNativeOut = ethers.parseEther((trade.expectedOutput * (1 - trade.slippageTolerance / 100)).toString());
        
        // ERC20 Approve
        const allowance = await tokenContract.allowance(wallet.address, ammAddress);
        if (allowance < tokenAmount) {
          const approveTx = await tokenContract.approve(ammAddress, tokenAmount);
          await approveTx.wait();
        }
        
        // TypeSafe sellTokens
        const gasEstimate = await ammContract.sellTokens.estimateGas(tokenAmount, minNativeOut);
        const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

        const tx = await ammContract.sellTokens(tokenAmount, minNativeOut, { gasLimit });
        const receipt = await tx.wait();
        return receipt ? receipt.hash : '';
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
      
      // TypeSafe getTradingInfo
      // Returns [virtualTokenReserves, currentPrice, totalVolume, graduationThreshold, isGraduated]
      // or similar based on your contract. Using array destructuring based on previous code.
      // Adjusting to result object if TypeChain generates named outputs, but destructuring is safer for now.
      const info = await ammContract.getTradingInfo();
      const currentSupply = info[0]; // virtualTokenReserves
      const isGraduated = info[4];
      
      if (action === 'buy') {
        const tokensOut = await ammContract.calculateTokensOut(amountWei, currentSupply);
        const priceImpact = await ammContract.getPriceImpact(amountWei, true);
        
        return {
          inputAmount: amount,
          outputAmount: parseFloat(ethers.formatEther(tokensOut)),
          priceImpact: parseFloat(ethers.formatUnits(priceImpact, 2)),
          slippage: 0.5,
          gasFee: 0.001,
          route: isGraduated ? 'amm' : 'bonding-curve',
          minimumOutput: parseFloat(ethers.formatEther(tokensOut)) * 0.995
        };
      } else {
        const nativeOut = await ammContract.calculateNativeOut(amountWei, currentSupply);
        const priceImpact = await ammContract.getPriceImpact(amountWei, false);

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

  // Get all tokens
  const getAllTokens = useCallback(async (): Promise<string[]> => {
    try {
      const factoryAddress = getTokenFactoryAddress(currentChainId);
      if (!factoryAddress) throw new Error(`Factory not deployed`);

      const runner = getReadProviderOrThrow();
      const contract = TokenFactory__factory.connect(factoryAddress, runner);
      
      return await contract.getAllTokens();
    } catch (error: unknown) {
      console.error('Failed to fetch tokens:', error);
      throw parseContractError(error);
    }
  }, [getReadProviderOrThrow, currentChainId]);

  // Get detailed token information
  const getTokenInfo = useCallback(async (tokenAddress: string): Promise<KasPumpToken | null> => {
    try {
      const factoryAddress = getTokenFactoryAddress(currentChainId);
      if (!factoryAddress) throw new Error(`Factory not deployed`);
      
      const runner = getReadProviderOrThrow();
      const factoryContract = TokenFactory__factory.connect(factoryAddress, runner);
      const tokenContract = getTokenContract(tokenAddress);
      
      const isKasPumpToken = await factoryContract.isKasPumpToken(tokenAddress);
      if (!isKasPumpToken) return null;
      
      // Parallel fetch
      const [config, name, symbol, totalSupply, ammAddress] = await Promise.all([
        factoryContract.getTokenConfig(tokenAddress),
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.totalSupply(),
        getTokenAMMAddress(tokenAddress)
      ]);
      
      const ammContract = getBondingCurveContract(ammAddress);
      const info = await ammContract.getTradingInfo();
      
      const currentSupply = info[0];
      const currentPrice = info[1];
      const totalVolume = info[2];
      const graduation = info[3];
      const isGraduated = info[4];
      
      const currentSupplyNumber = parseFloat(ethers.formatEther(currentSupply));
      const priceNumber = parseFloat(ethers.formatEther(currentPrice));
      
      return {
        address: tokenAddress,
        name: config.name || name,
        symbol: config.symbol || symbol,
        description: config.description || '',
        image: config.imageUrl || '',
        creator: '', 
        totalSupply: parseFloat(ethers.formatEther(totalSupply)),
        currentSupply: currentSupplyNumber,
        marketCap: currentSupplyNumber * priceNumber,
        price: priceNumber,
        change24h: 0, 
        volume24h: parseFloat(ethers.formatEther(totalVolume)),
        holders: 0,
        createdAt: new Date(),
        curveType: config.curveType === 0n ? 'linear' : 'exponential',
        bondingCurveProgress: parseFloat(ethers.formatUnits(graduation, 2)),
        ammAddress,
        isGraduated
      };

    } catch (error: unknown) {
      console.error('Failed to fetch token info:', error);
      return null;
    }
  }, [getReadProviderOrThrow, getTokenContract, getTokenAMMAddress, getBondingCurveContract, currentChainId]);

  return {
    isConnected,
    isInitialized,
    provider,
    readProvider: readProvider ?? provider,
    signer,
    getTokenFactoryContract,
    getBondingCurveContract,
    getTokenContract,
    createToken,
    getAllTokens,
    getTokenInfo,
    getTokenAMMAddress,
    executeTrade,
    getSwapQuote,
    // approveToken/getTokenBalance/getAllowance use standard ERC20 logic so we can keep them generic or use hooks
    approveToken: async (token: string, spender: string, amount: string) => {
       const c = getTokenContract(token);
       if (!wallet.address) throw new Error("No wallet");
       const tx = await c.approve(spender, ethers.parseEther(amount));
       return (await tx.wait()).hash;
    },
    getTokenBalance: async (token: string, user: string) => {
       const c = getTokenContract(token);
       return parseFloat(ethers.formatEther(await c.balanceOf(user)));
    },
    getAllowance: async (token: string, owner: string, spender: string) => {
       const c = getTokenContract(token);
       return parseFloat(ethers.formatEther(await c.allowance(owner, spender)));
    }
  };
}
