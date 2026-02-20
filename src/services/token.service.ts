import { ethers } from 'ethers';
import { BlockchainService } from './blockchain';
import { TokenFactory } from '../../typechain-types';

export interface TokenDetails {
  address: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  creator: string;
  totalSupply: number;
  currentSupply: number;
  currentPrice: number;
  marketCap: number;
  basePrice: number;
  slope: number;
  curveType: 'linear' | 'exponential';
  graduationThreshold: number;
  graduationProgress: number;
  volume24h: number;
  isGraduated: boolean;
  ammAddress: string | null;
  createdAt: string;
  analytics: {
    holders: number;
    transactions24h: number;
    priceChange24h: number;
    volumeChange24h: number;
  };
}

export interface PaginatedTokens {
  tokens: TokenDetails[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export class TokenService {
  /**
   * Fetch a single token's full details
   */
  static async getTokenDetails(chainId: number, tokenAddress: string): Promise<TokenDetails | null> {
    try {
      const factory = BlockchainService.getTokenFactory(chainId);
      return await this.fetchTokenData(factory, chainId, tokenAddress);
    } catch (error) {
      console.error(`Error fetching token details for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Fetch a paginated list of tokens
   */
  static async getTokens(
    chainId: number, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<PaginatedTokens> {
    const factory = BlockchainService.getTokenFactory(chainId);
    const allTokens = await factory.getAllTokens();
    
    // Slice for pagination
    const paginatedAddresses = allTokens.slice(offset, offset + limit);

    // Fetch details in parallel
    const tokensWithData = await Promise.all(
      paginatedAddresses.map(address => this.fetchTokenData(factory, chainId, address))
    );

    const validTokens = tokensWithData.filter((t): t is TokenDetails => t !== null);

    return {
      tokens: validTokens,
      pagination: {
        total: allTokens.length,
        offset,
        limit,
        hasMore: offset + limit < allTokens.length
      }
    };
  }

  // --- Helper Methods ---

  private static async fetchTokenData(
    factory: TokenFactory, 
    chainId: number, 
    tokenAddress: string
  ): Promise<TokenDetails | null> {
    try {
      const config = await factory.getTokenConfig(tokenAddress);
      const ammAddress = await this.getAMMAddress(factory, tokenAddress);
      
      let tradingData = null;
      if (ammAddress) {
        tradingData = await this.getTradingData(chainId, ammAddress);
      }

      const currentSupply = tradingData?.currentSupply || 0;
      const currentPrice = tradingData?.currentPrice || parseFloat(ethers.formatEther(config.basePrice));
      
      return {
        address: tokenAddress,
        name: config.name,
        symbol: config.symbol,
        description: config.description,
        imageUrl: config.imageUrl,
        creator: await this.getTokenCreator(factory, tokenAddress),
        totalSupply: parseFloat(ethers.formatEther(config.totalSupply)),
        currentSupply,
        currentPrice,
        marketCap: currentSupply * currentPrice,
        basePrice: parseFloat(ethers.formatEther(config.basePrice)),
        slope: parseFloat(ethers.formatEther(config.slope)),
        curveType: config.curveType === 0n ? 'linear' : 'exponential',
        graduationThreshold: parseFloat(ethers.formatEther(config.graduationThreshold)),
        graduationProgress: tradingData?.graduation || 0,
        volume24h: tradingData?.totalVolume || 0,
        isGraduated: tradingData?.isGraduated || false,
        ammAddress,
        createdAt: await this.getTokenCreationTime(factory, chainId, tokenAddress),
        analytics: {
          holders: 0, // Placeholder
          transactions24h: 0,
          priceChange24h: 0,
          volumeChange24h: 0
        }
      };
    } catch (error) {
      console.error(`Error processing token ${tokenAddress}:`, error);
      return null;
    }
  }

  private static async getAMMAddress(factory: TokenFactory, tokenAddress: string): Promise<string | null> {
    try {
      const amm = await factory.getTokenAMM(tokenAddress);
      if (amm && amm !== ethers.ZeroAddress) return amm;
    } catch { /* method might not exist on older ABI */ }

    // Fallback to event filtering using TypeChain filters
    const filter = factory.filters.TokenCreated(tokenAddress);
    const events = await factory.queryFilter(filter);
    
    if (events.length > 0) {
      return events[0].args.ammAddress;
    }
    return null;
  }

  private static async getTradingData(chainId: number, ammAddress: string) {
    try {
      const amm = BlockchainService.getAMM(ammAddress, chainId);
      const info = await amm.getTradingInfo();
      
      return {
        currentSupply: parseFloat(ethers.formatEther(info.virtualTokenReserves)), // Assuming reserves track supply
        currentPrice: parseFloat(ethers.formatEther(info.currentPrice)),
        totalVolume: parseFloat(ethers.formatEther(info.totalVolume)),
        graduation: parseFloat(ethers.formatUnits(info.graduationThreshold, 2)), // Adjust decimals as needed
        isGraduated: info.isGraduated
      };
    } catch {
      return null;
    }
  }

  private static async getTokenCreator(factory: TokenFactory, tokenAddress: string): Promise<string> {
    const filter = factory.filters.TokenCreated(tokenAddress);
    const events = await factory.queryFilter(filter);
    return events.length > 0 ? events[0].args.creator : ethers.ZeroAddress;
  }

  private static async getTokenCreationTime(
    factory: TokenFactory, 
    chainId: number, 
    tokenAddress: string
  ): Promise<string> {
    const filter = factory.filters.TokenCreated(tokenAddress);
    const events = await factory.queryFilter(filter);
    
    if (events.length > 0) {
      const block = await events[0].getBlock();
      return new Date(block.timestamp * 1000).toISOString();
    }
    return new Date().toISOString();
  }
}
