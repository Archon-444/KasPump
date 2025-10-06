// Enhanced Smart Contract Integration with AMM Address Resolution
import { useCallback, useMemo, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  KasPumpToken, 
  TradeData, 
  SwapQuote, 
  TokenCreationForm,
  ContractError,
  BondingCurveConfig 
} from '../types';
import { useKasplexWallet } from './useWallet';

// Enhanced ABI definitions with events
const TOKEN_CREATED_EVENT_LEGACY = "event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 totalSupply, address ammAddress)";
const TOKEN_CREATED_EVENT_ENHANCED = "event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 totalSupply, address ammAddress, uint8 tier, uint256 fee)";

const TOKEN_FACTORY_ABI = [
  "function createToken(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType) external payable returns (address, address)",
  "function getAllTokens() external view returns (address[])",
  "function getTokenConfig(address tokenAddress) external view returns (tuple(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType, uint256 graduationThreshold))",
  "function getTokenAMM(address tokenAddress) external view returns (address)",
  "function isKasPumpToken(address tokenAddress) external view returns (bool)",
  TOKEN_CREATED_EVENT_ENHANCED
];

const BONDING_CURVE_AMM_ABI = [
  "function buyTokens(uint256 minTokensOut) external payable",
  "function sellTokens(uint256 tokenAmount, uint256 minKasOut) external",
  "function getCurrentPrice() external view returns (uint256)",
  "function getTradingInfo() external view returns (uint256 currentSupply, uint256 currentPrice, uint256 totalVolume, uint256 graduation, bool isGraduated)",
  "function calculateTokensOut(uint256 kasIn, uint256 supply) external view returns (uint256)",
  "function calculateKasOut(uint256 tokensIn, uint256 supply) external view returns (uint256)",
  "function getPriceImpact(uint256 amount, bool isBuy) external view returns (uint256)",
  "function token() external view returns (address)",
  "function currentSupply() external view returns (uint256)",
  "function totalVolume() external view returns (uint256)",
  "function isGraduated() external view returns (bool)",
  "event Trade(address indexed trader, bool indexed isBuy, uint256 kasAmount, uint256 tokenAmount, uint256 newPrice, uint256 fee)"
];

const KRC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)"
];

// Contract addresses from environment
const CONTRACT_ADDRESSES = {
  tokenFactory: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS!,
  feeRecipient: process.env.NEXT_PUBLIC_FEE_RECIPIENT!,
};

const NETWORK_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID!),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
};

// AMM address cache for performance
const ammAddressCache = new Map<string, string>();

export function useContracts() {
  const wallet = useKasplexWallet();
  const [isInitialized, setIsInitialized] = useState(false);

  // Create ethers provider and signer
  const { provider, signer } = useMemo(() => {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const signer = wallet.connected && wallet.address ? 
      provider.getSigner(wallet.address) : null;
    
    return { provider, signer };
  }, [wallet.connected, wallet.address]);

  // Initialize contract validation
  useEffect(() => {
    const validateContracts = async () => {
      try {
        if (!CONTRACT_ADDRESSES.tokenFactory) {
          console.warn('Token factory address not configured');
          return;
        }

        const factory = new ethers.Contract(CONTRACT_ADDRESSES.tokenFactory, TOKEN_FACTORY_ABI, provider);
        
        // Test contract connectivity
        await factory.getAllTokens();
        setIsInitialized(true);
      } catch (error) {
        console.error('Contract initialization failed:', error);
      }
    };

    validateContracts();
  }, [provider]);

  // Get contract instances
  const getTokenFactoryContract = useCallback(() => {
    if (!signer) throw new Error('Wallet not connected');
    return new ethers.Contract(CONTRACT_ADDRESSES.tokenFactory, TOKEN_FACTORY_ABI, signer);
  }, [signer]);

  const getBondingCurveContract = useCallback((ammAddress: string) => {
    if (!provider) throw new Error('Provider not available');
    const signerOrProvider = signer || provider;
    return new ethers.Contract(ammAddress, BONDING_CURVE_AMM_ABI, signerOrProvider);
  }, [provider, signer]);

  const getTokenContract = useCallback((tokenAddress: string) => {
    if (!provider) throw new Error('Provider not available');
    const signerOrProvider = signer || provider;
    return new ethers.Contract(tokenAddress, KRC20_ABI, signerOrProvider);
  }, [provider, signer]);

  // Resolve AMM address for a token (with caching)
  const getTokenAMMAddress = useCallback(async (tokenAddress: string): Promise<string> => {
    // Check cache first
    if (ammAddressCache.has(tokenAddress)) {
      return ammAddressCache.get(tokenAddress)!;
    }

    try {
      const factoryContract = new ethers.Contract(CONTRACT_ADDRESSES.tokenFactory, TOKEN_FACTORY_ABI, provider);

      // Check if we have a getTokenAMM function (newer factory version)
      try {
        const ammAddress = await factoryContract.getTokenAMM(tokenAddress);

        if (ammAddress && ammAddress !== ethers.ZeroAddress) {
          ammAddressCache.set(tokenAddress, ammAddress);
          return ammAddress;
        }
      } catch (error) {
        // Ignore and try fallback resolution path
        console.debug('getTokenAMM lookup failed, trying event resolution', error);
      }

      // Fallback: search TokenCreated events (supports legacy + enhanced factories)
      const interfaces = [
        new ethers.Interface([TOKEN_CREATED_EVENT_ENHANCED]),
        new ethers.Interface([TOKEN_CREATED_EVENT_LEGACY])
      ];

      for (const iface of interfaces) {
        try {
          const topic = iface.getEventTopic('TokenCreated');
          const logs = await provider.getLogs({
            address: CONTRACT_ADDRESSES.tokenFactory,
            topics: [
              topic,
              ethers.zeroPadValue(tokenAddress, 32)
            ],
            fromBlock: 0,
            toBlock: 'latest'
          });

          if (logs.length === 0) {
            continue;
          }

          // Use the most recent event for accuracy
          const parsed = iface.parseLog(logs[logs.length - 1]);
          const resolvedAmm = parsed.args.ammAddress as string;

          if (resolvedAmm && resolvedAmm !== ethers.ZeroAddress) {
            ammAddressCache.set(tokenAddress, resolvedAmm);
            return resolvedAmm;
          }
        } catch (eventError) {
          console.debug('TokenCreated event parsing failed for interface', eventError);
        }
      }

      throw new Error('AMM address not found for token');
    } catch (error) {
      console.error('Failed to resolve AMM address:', error);
      throw new Error(`Failed to resolve AMM address for token ${tokenAddress}`);
    }
  }, [provider]);

  // Create a new token with bonding curve
  const createToken = useCallback(async (tokenData: TokenCreationForm): Promise<{ tokenAddress: string; ammAddress: string; txHash: string }> => {
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
      const gasEstimate = await contract.createToken.estimateGas(
        tokenData.name,
        tokenData.symbol,
        tokenData.description,
        '', // Image URL placeholder - would be IPFS hash in production
        totalSupply,
        basePrice,
        slope,
        curveType
      );

      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * 120n) / 100n;

      // Execute transaction
      const tx = await contract.createToken(
        tokenData.name,
        tokenData.symbol,
        tokenData.description,
        '', // Image URL
        totalSupply,
        basePrice,
        slope,
        curveType,
        { gasLimit }
      );

      const receipt = await tx.wait();
      
      // Parse the TokenCreated event to get addresses
      const eventInterfaces = [contract.interface, new ethers.Interface([TOKEN_CREATED_EVENT_LEGACY])];

      let decodedEvent: ethers.LogDescription | null = null;

      for (const log of receipt.logs) {
        for (const iface of eventInterfaces) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === 'TokenCreated') {
              decodedEvent = parsed;
              break;
            }
          } catch {
            // Ignore parse errors for mismatched interfaces
          }
        }

        if (decodedEvent) {
          break;
        }
      }

      if (!decodedEvent) {
        throw new Error('TokenCreated event not found');
      }

      const tokenAddress = decodedEvent.args.tokenAddress;
      const ammAddress = decodedEvent.args.ammAddress;
      
      // Cache the AMM address
      ammAddressCache.set(tokenAddress, ammAddress);
      
      return {
        tokenAddress,
        ammAddress,
        txHash: receipt.hash
      };

    } catch (error: any) {
      console.error('Token creation failed:', error);
      throw parseContractError(error);
    }
  }, [wallet.connected, isInitialized, getTokenFactoryContract]);

  // Execute a trade (buy or sell)
  const executeTrade = useCallback(async (trade: TradeData): Promise<string> => {
    if (!wallet.connected) throw new Error('Wallet not connected');
    if (!isInitialized) throw new Error('Contracts not initialized');
    
    try {
      // Get AMM address for the token
      const ammAddress = await getTokenAMMAddress(trade.tokenAddress);
      const ammContract = getBondingCurveContract(ammAddress);
      
      if (trade.action === 'buy') {
        const kasAmount = ethers.parseEther(trade.baseAmount.toString());
        const minTokensOut = ethers.parseEther((trade.expectedOutput * (1 - trade.slippageTolerance / 100)).toString());
        
        // Estimate gas
        const gasEstimate = await ammContract.buyTokens.estimateGas(minTokensOut, { value: kasAmount });
        const gasLimit = (gasEstimate * 120n) / 100n;
        
        const tx = await ammContract.buyTokens(minTokensOut, { 
          value: kasAmount,
          gasLimit 
        });
        const receipt = await tx.wait();
        return receipt.hash;
        
      } else {
        const tokenContract = getTokenContract(trade.tokenAddress);
        const tokenAmount = ethers.parseEther(trade.baseAmount.toString());
        const minKasOut = ethers.parseEther((trade.expectedOutput * (1 - trade.slippageTolerance / 100)).toString());
        
        // Check and approve tokens if needed
        const allowance = await tokenContract.allowance(wallet.address, ammAddress);
        if (allowance < tokenAmount) {
          const approveTx = await tokenContract.approve(ammAddress, tokenAmount);
          await approveTx.wait();
        }
        
        // Execute sell
        const gasEstimate = await ammContract.sellTokens.estimateGas(tokenAmount, minKasOut);
        const gasLimit = (gasEstimate * 120n) / 100n;
        
        const tx = await ammContract.sellTokens(tokenAmount, minKasOut, { gasLimit });
        const receipt = await tx.wait();
        return receipt.hash;
      }

    } catch (error: any) {
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
        const kasOut = await ammContract.calculateKasOut(amountWei, currentSupply);
        const priceImpact = await ammContract.getPriceImpact(amountWei, false);
        
        return {
          inputAmount: amount,
          outputAmount: parseFloat(ethers.formatEther(kasOut)),
          priceImpact: parseFloat(ethers.formatUnits(priceImpact, 2)),
          slippage: 0.5,
          gasFee: 0.001,
          route: isGraduated ? 'amm' : 'bonding-curve',
          minimumOutput: parseFloat(ethers.formatEther(kasOut)) * 0.995
        };
      }
      
    } catch (error: any) {
      console.error('Quote calculation failed:', error);
      throw parseContractError(error);
    }
  }, [getTokenAMMAddress, getBondingCurveContract]);

  // Get all tokens created through the factory
  const getAllTokens = useCallback(async (): Promise<string[]> => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.tokenFactory, TOKEN_FACTORY_ABI, provider);
      return await contract.getAllTokens();
    } catch (error: any) {
      console.error('Failed to fetch tokens:', error);
      throw parseContractError(error);
    }
  }, [provider]);

  // Get detailed token information with real blockchain data
  const getTokenInfo = useCallback(async (tokenAddress: string): Promise<KasPumpToken | null> => {
    try {
      const factoryContract = new ethers.Contract(CONTRACT_ADDRESSES.tokenFactory, TOKEN_FACTORY_ABI, provider);
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
      
    } catch (error: any) {
      console.error('Failed to fetch token info:', error);
      return null;
    }
  }, [provider, getTokenContract, getTokenAMMAddress, getBondingCurveContract]);

  return {
    createToken,
    executeTrade,
    getSwapQuote,
    getAllTokens,
    getTokenInfo,
    getTokenAMMAddress,
    isConnected: wallet.connected,
    walletAddress: wallet.address,
    isInitialized,
  };
}

// Enhanced error parsing utility
function parseContractError(error: any): ContractError {
  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return {
      code: 'GAS_ESTIMATION_FAILED',
      message: 'Unable to estimate gas. Transaction may fail.',
    };
  }
  
  if (error.code === 'INSUFFICIENT_FUNDS') {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient KAS balance for transaction and gas fees.',
    };
  }
  
  if (error.message?.includes('user rejected')) {
    return {
      code: 'USER_REJECTED',
      message: 'Transaction was rejected by user.',
    };
  }
  
  if (error.message?.includes('nonce too low')) {
    return {
      code: 'NONCE_ERROR',
      message: 'Transaction nonce error. Please try again.',
    };
  }
  
  if (error.message?.includes('slippage')) {
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
  
  const approveToken = useCallback(async (tokenAddress: string, spenderAddress: string, amount: string): Promise<string> => {
    if (!contracts.isConnected) throw new Error('Wallet not connected');
    
    try {
      const tokenContract = new ethers.Contract(tokenAddress, KRC20_ABI, await new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl).getSigner(contracts.walletAddress!));
      const amountWei = ethers.parseEther(amount);
      
      const tx = await tokenContract.approve(spenderAddress, amountWei);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      throw parseContractError(error);
    }
  }, [contracts]);
  
  const getTokenBalance = useCallback(async (tokenAddress: string, userAddress: string): Promise<number> => {
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const tokenContract = new ethers.Contract(tokenAddress, KRC20_ABI, provider);
      
      const balance = await tokenContract.balanceOf(userAddress);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
      return 0;
    }
  }, []);

  const getAllowance = useCallback(async (tokenAddress: string, owner: string, spender: string): Promise<number> => {
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const tokenContract = new ethers.Contract(tokenAddress, KRC20_ABI, provider);
      
      const allowance = await tokenContract.allowance(owner, spender);
      return parseFloat(ethers.formatEther(allowance));
    } catch (error) {
      console.error('Failed to fetch allowance:', error);
      return 0;
    }
  }, []);
  
  return {
    approveToken,
    getTokenBalance,
    getAllowance,
  };
}
