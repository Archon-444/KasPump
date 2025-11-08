// Enhanced Smart Contract Integration with AMM Address Resolution
import { useCallback, useMemo, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  KasPumpToken,
  TradeData,
  SwapQuote,
  TokenCreationForm,
  ContractError,
  BondingCurveConfig,
  EIP1193Provider,
  TokenCreatedEventArgs,
  EthersError
} from '../types';
import { useMultichainWallet } from './useMultichainWallet';
import { getTokenFactoryAddress, getFeeRecipientAddress, getChainName, getSupportedChains } from '../config/contracts';

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

// Network configuration from environment
const NETWORK_CONFIG = {
  chainId: Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? '97'),
  rpcUrl: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL ?? 'https://data-seed-prebsc-1-s1.binance.org:8545',
};

// AMM address cache for performance
const ammAddressCache = new Map<string, string>();

export function useContracts() {
  const wallet = useMultichainWallet();
  const [isInitialized, setIsInitialized] = useState(false);
  const [browserProvider, setBrowserProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // Get contract addresses for current chain
  const currentChainId = wallet.chainId ?? NETWORK_CONFIG.chainId;
  const CONTRACT_ADDRESSES = {
    tokenFactory: getTokenFactoryAddress(currentChainId) ?? '',
    feeRecipient: getFeeRecipientAddress(currentChainId) ?? '',
  };

  // Create ethers provider
  const provider = useMemo(() => {
    if (!NETWORK_CONFIG.rpcUrl) {
      console.warn('NEXT_PUBLIC_RPC_URL is not set. Read-only blockchain access disabled.');
      return null;
    }

    try {
      return new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    } catch (error) {
      console.error('Failed to create RPC provider:', error);
      return null;
    }
  }, []);

  // Create signer when wallet is connected
  useEffect(() => {
    let cancelled = false;

    const initializeSigner = async () => {
      if (!wallet.connected || !wallet.address) {
        setBrowserProvider(null);
        setSigner(null);
        return;
      }

      try {
        let externalProvider: EIP1193Provider | null = null;

        if (wallet.connector?.getProvider) {
          externalProvider = await wallet.connector.getProvider();
        }

        if (!externalProvider && typeof window !== 'undefined') {
          externalProvider = window.ethereum ?? null;
        }

        if (!externalProvider) {
          throw new Error('Wallet provider not available');
        }

        const targetChainId = wallet.chainId ?? (NETWORK_CONFIG.chainId || undefined);
        const browser = new ethers.BrowserProvider(externalProvider, targetChainId);
        const signerInstance = await browser.getSigner();

        if (!cancelled) {
          setBrowserProvider(browser);
          setSigner(signerInstance);
        }
      } catch (error) {
        console.error('Failed to initialize wallet signer:', error);
        if (!cancelled) {
          setBrowserProvider(null);
          setSigner(null);
        }
      }
    };

    initializeSigner();

    return () => {
      cancelled = true;
    };
  }, [wallet.connected, wallet.connector, wallet.address, wallet.chainId]);

  // Initialize contract validation
  useEffect(() => {
    const validateContracts = async () => {
      if (!provider) {
        console.warn('RPC provider not available; skipping contract validation.');
        return;
      }

      try {
        const factoryAddress = getTokenFactoryAddress(currentChainId);
        if (!factoryAddress) {
          console.warn(`Token factory address not configured for chain ${currentChainId}`);
          return;
        }

        const factory = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);
        
        // Validate contract instance before calling methods
        if (!factory || typeof factory.getAllTokens !== 'function') {
          throw new Error('Invalid factory contract instance');
        }
        
        // Test contract connectivity with defensive check
        try {
          await factory.getAllTokens();
          setIsInitialized(true);
        } catch (callError: unknown) {
          // If the call fails, log but don't crash - contract might not be deployed yet
          const errorMessage = callError instanceof Error ? callError.message : String(callError);
          console.warn('Contract connectivity test failed:', errorMessage);
          // Still mark as initialized if contract exists (might just be empty)
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Contract initialization failed:', error);
      }
    };

    validateContracts();
  }, [provider, currentChainId]);

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
    if (signer && typeof signer === 'object') return signer;
    if (provider && typeof provider === 'object') return provider;
    if (browserProvider && typeof browserProvider === 'object') return browserProvider;
    throw new Error('Blockchain provider not available');
  }, [signer, provider, browserProvider]);

  const getReadProviderOrThrow = useCallback((): ethers.AbstractProvider => {
    if (provider && typeof provider === 'object') return provider;
    if (browserProvider && typeof browserProvider === 'object') return browserProvider;
    throw new Error('Blockchain provider not available');
  }, [provider, browserProvider]);

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
        const ammAddress = await factoryContract.getTokenAMM(tokenAddress);
        if (!ammAddress || ammAddress === ethers.ZeroAddress) {
          throw new Error('AMM address not found');
        }
        ammAddressCache.set(tokenAddress, ammAddress);
        return ammAddress;
      } catch (error) {
        // Fallback: search TokenCreated events
        const filter = factoryContract.filters.TokenCreated(tokenAddress);
        const events = await factoryContract.queryFilter(filter);
        
        if (events.length > 0) {
          const event = events[0];
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
      const gasEstimate = await contract.createToken.estimateGas(
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
      const tx = await contract.createToken(
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
        const gasEstimate = await ammContract.buyTokens.estimateGas(minTokensOut, { value: nativeAmount });
        const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

        const tx = await ammContract.buyTokens(minTokensOut, {
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
        const allowance = await tokenContract.allowance(wallet.address, ammAddress);
        if (allowance < tokenAmount) {
          const approveTx = await tokenContract.approve(ammAddress, tokenAmount);
          await approveTx.wait();
        }
        
        // Execute sell
        const gasEstimate = await ammContract.sellTokens.estimateGas(tokenAmount, minNativeOut);
        const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

        const tx = await ammContract.sellTokens(tokenAmount, minNativeOut, { gasLimit });
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
      const [currentSupply, currentPrice, totalVolume, graduation, isGraduated] = await ammContract.getTradingInfo();
      
      if (action === 'buy') {
        const tokensOut = await ammContract.calculateTokensOut(amountWei, currentSupply);
        const priceImpact = await ammContract.getPriceImpact(amountWei, true);
        
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
      const isKasPumpToken = await factoryContract.isKasPumpToken(tokenAddress);
      if (!isKasPumpToken) return null;
      
      // Get config and basic token info
      const [config, name, symbol, totalSupply] = await Promise.all([
        factoryContract.getTokenConfig(tokenAddress),
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.totalSupply()
      ]);
      
      // Get AMM address and trading info
      const ammAddress = await getTokenAMMAddress(tokenAddress);
      const ammContract = getBondingCurveContract(ammAddress);
      
      const [currentSupply, currentPrice, totalVolume, graduation, isGraduated] = await ammContract.getTradingInfo();
      
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

  return {
    createToken,
    executeTrade,
    getSwapQuote,
    getAllTokens,
    getTokenInfo,
    getTokenAMMAddress,
    getTokenContract,
    getBondingCurveContract,
    readProvider: provider ?? browserProvider,
    hasSigner: Boolean(signer),
    isConnected: wallet.connected,
    walletAddress: wallet.address,
    isInitialized,
  };
}

// Enhanced error parsing utility with type guards
function parseContractError(error: unknown): ContractError {
  // Type guard for EthersError
  const isEthersError = (err: unknown): err is EthersError => {
    return err instanceof Error;
  };

  if (!isEthersError(error)) {
    return {
      code: 'CONTRACT_ERROR',
      message: 'An unknown error occurred',
    };
  }

  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return {
      code: 'GAS_ESTIMATION_FAILED',
      message: 'Unable to estimate gas. Transaction may fail.',
    };
  }

  if (error.code === 'INSUFFICIENT_FUNDS') {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient balance for transaction and gas fees.',
    };
  }

  if (error.message.includes('user rejected')) {
    return {
      code: 'USER_REJECTED',
      message: 'Transaction was rejected by user.',
    };
  }

  if (error.message.includes('nonce too low')) {
    return {
      code: 'NONCE_ERROR',
      message: 'Transaction nonce error. Please try again.',
    };
  }

  if (error.message.includes('slippage')) {
    return {
      code: 'SLIPPAGE_ERROR',
      message: 'Transaction failed due to slippage. Try increasing slippage tolerance.',
    };
  }

  return {
    code: 'CONTRACT_ERROR',
    message: error.reason || error.message || 'Contract interaction failed',
    txHash: error.transactionHash,
  };
}

// Enhanced token operations hook
export function useTokenOperations() {
  const contracts = useContracts();
  const {
    getTokenContract,
    isConnected,
    hasSigner,
  } = contracts;
  
  const approveToken = useCallback(async (tokenAddress: string, spenderAddress: string, amount: string): Promise<string> => {
    if (!isConnected || !hasSigner) {
      throw new Error('Wallet not connected');
    }

    try {
      const tokenContract = getTokenContract(tokenAddress);
      const amountWei = ethers.parseEther(amount);

      const tx = await tokenContract.approve(spenderAddress, amountWei);
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      throw parseContractError(error);
    }
  }, [getTokenContract, isConnected, hasSigner]);

  const getTokenBalance = useCallback(async (tokenAddress: string, userAddress: string): Promise<number> => {
    try {
      const tokenContract = getTokenContract(tokenAddress);
      const balance = await tokenContract.balanceOf(userAddress);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
      return 0;
    }
  }, [getTokenContract]);

  const getAllowance = useCallback(async (tokenAddress: string, owner: string, spender: string): Promise<number> => {
    try {
      const tokenContract = getTokenContract(tokenAddress);
      const allowance = await tokenContract.allowance(owner, spender);
      return parseFloat(ethers.formatEther(allowance));
    } catch (error) {
      console.error('Failed to fetch allowance:', error);
      return 0;
    }
  }, [getTokenContract]);
  
  return {
    approveToken,
    getTokenBalance,
    getAllowance,
  };
}
