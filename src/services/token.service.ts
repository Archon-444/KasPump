import { ethers } from 'ethers';
import { BlockchainService } from './blockchain';
import { MoralisService } from './moralis.service';
import { TokenFactory, BondingCurveAMM } from '../../typechain-types';

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
  // V2: per-token curve params are gone — curve shape is standardized
  // (BondingCurveMath sigmoid). The fields stay on this DTO so legacy UI
  // and indexer consumers keep working; they're populated from defaults
  // for V2 tokens.
  basePrice: number;
  slope: number;
  curveType: 'sigmoid' | 'linear' | 'exponential';
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
      // Validate address format before calling contract
      if (!ethers.isAddress(tokenAddress)) return null;
      
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
    offset: number = 0,
    search?: string
  ): Promise<PaginatedTokens> {
    const factory = BlockchainService.getTokenFactory(chainId);
    const allTokens = await factory.getAllTokens();

    let tokenAddresses = allTokens;

    if (search && search.trim()) {
      const query = search.trim().toLowerCase();

      if (ethers.isAddress(query)) {
        tokenAddresses = allTokens.filter(
          addr => addr.toLowerCase() === query
        );
      } else {
        const configs = await Promise.all(
          allTokens.map(async (addr) => {
            try {
              const config = await factory.getTokenConfig(addr);
              return { addr, name: config.name, symbol: config.symbol };
            } catch {
              return null;
            }
          })
        );

        tokenAddresses = configs
          .filter((c): c is NonNullable<typeof c> =>
            c !== null && (
              c.name.toLowerCase().includes(query) ||
              c.symbol.toLowerCase().includes(query)
            )
          )
          .map(c => c.addr);
      }
    }

    const paginatedAddresses = tokenAddresses.slice(offset, offset + limit);

    const tokensWithData = await Promise.all(
      paginatedAddresses.map(address => this.fetchTokenData(factory, chainId, address))
    );

    const validTokens = tokensWithData.filter((t): t is TokenDetails => t !== null);

    return {
      tokens: validTokens,
      pagination: {
        total: tokenAddresses.length,
        offset,
        limit,
        hasMore: offset + limit < tokenAddresses.length
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
      // V2: spot price comes from the AMM's live sigmoid evaluation. There is
      // no per-token basePrice on the config any more; fall back to the live
      // spot price when tradingData is missing.
      const currentPrice = tradingData?.currentPrice || 0;

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
        // V2: legacy fields surface defaults so older UI keeps rendering.
        basePrice: 0,
        slope: 0,
        curveType: 'sigmoid',
        graduationThreshold: parseFloat(ethers.formatEther(config.graduationThreshold)),
        graduationProgress: tradingData?.graduation || 0,
        volume24h: tradingData?.totalVolume || 0,
        isGraduated: tradingData?.isGraduated || false,
        ammAddress,
        createdAt: await this.getTokenCreationTime(factory, tokenAddress),
        analytics: {
          holders: await MoralisService.getHolderCount(tokenAddress, chainId),
          ...(ammAddress
            ? await this.get24hMetrics(chainId, ammAddress, currentPrice)
            : { transactions24h: 0, priceChange24h: 0, volumeChange24h: 0 })
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
    try {
      const filter = factory.filters.TokenCreated(tokenAddress);
      const events = await factory.queryFilter(filter);
      
      if (events.length > 0) {
        return events[0].args.ammAddress;
      }
    } catch (e) {
      console.warn(`Failed to filter events for ${tokenAddress}`, e);
    }
    return null;
  }

  private static async getTradingData(chainId: number, ammAddress: string) {
    try {
      const amm = BlockchainService.getAMM(ammAddress, chainId);
      const info = await amm.getTradingInfo();
      
      return {
        currentSupply: parseFloat(ethers.formatEther(info[0])), // currentSupply
        currentPrice: parseFloat(ethers.formatEther(info[1])),  // currentPrice
        totalVolume: parseFloat(ethers.formatEther(info[2])),   // totalVolume
        graduation: parseFloat(ethers.formatUnits(info[3], 2)), // graduation progress
        isGraduated: info[4] // isGraduated boolean
      };
    } catch {
      return null;
    }
  }

  private static readonly BLOCKS_PER_DAY: Record<number, number> = {
    56: 28_800,     // BSC: ~3s blocks
    97: 28_800,     // BSC Testnet: ~3s blocks
    42161: 345_600, // Arbitrum: ~0.25s blocks
    421614: 345_600,
    8453: 43_200,   // Base: ~2s blocks
    84532: 43_200,
  };

  private static metricsCache = new Map<string, { data: { transactions24h: number; priceChange24h: number; volumeChange24h: number }; expiresAt: number }>();
  private static readonly METRICS_CACHE_TTL = 120_000; // 2 minutes

  private static async get24hMetrics(
    chainId: number,
    ammAddress: string,
    currentPrice: number
  ): Promise<{ transactions24h: number; priceChange24h: number; volumeChange24h: number }> {
    const cacheKey = `${chainId}:${ammAddress.toLowerCase()}`;
    const cached = this.metricsCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const fallback = { transactions24h: 0, priceChange24h: 0, volumeChange24h: 0 };

    try {
      const provider = BlockchainService.getProvider(chainId);
      const amm = BlockchainService.getAMM(ammAddress, chainId);
      const currentBlock = await provider.getBlockNumber();
      const blocksPerDay = this.BLOCKS_PER_DAY[chainId] || 43_200;
      const fromBlock = Math.max(0, currentBlock - blocksPerDay);

      const tradeFilter = amm.filters.Trade();
      const events = await amm.queryFilter(tradeFilter, fromBlock, currentBlock);

      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 86_400;
      const recentTrades = events.filter(e => Number(e.args.timestamp) >= oneDayAgo);

      if (recentTrades.length === 0) {
        this.metricsCache.set(cacheKey, { data: fallback, expiresAt: Date.now() + this.METRICS_CACHE_TTL });
        return fallback;
      }

      const transactions24h = recentTrades.length;

      let volume24h = 0n;
      for (const event of recentTrades) {
        volume24h += event.args.nativeAmount;
      }

      const oldestTrade = recentTrades[0]!;
      const oldestPrice = parseFloat(ethers.formatEther(oldestTrade.args.newPrice));
      const priceChange24h = (oldestPrice > 1e-18 && Number.isFinite(currentPrice))
        ? ((currentPrice - oldestPrice) / oldestPrice) * 100
        : 0;

      const data = {
        transactions24h,
        priceChange24h: Number.isFinite(priceChange24h) ? Math.round(priceChange24h * 100) / 100 : 0,
        volumeChange24h: parseFloat(ethers.formatEther(volume24h)),
      };

      // Evict expired entries periodically to prevent unbounded growth
      if (this.metricsCache.size > 200) {
        const nowMs = Date.now();
        for (const [k, v] of this.metricsCache) {
          if (nowMs >= v.expiresAt) this.metricsCache.delete(k);
        }
      }

      this.metricsCache.set(cacheKey, { data, expiresAt: Date.now() + this.METRICS_CACHE_TTL });
      return data;
    } catch (error) {
      console.warn(`Failed to fetch 24h metrics for ${ammAddress}:`, error);
      return fallback;
    }
  }

  private static async getTokenCreator(factory: TokenFactory, tokenAddress: string): Promise<string> {
    try {
      const filter = factory.filters.TokenCreated(tokenAddress);
      const events = await factory.queryFilter(filter);
      return events.length > 0 ? events[0].args.creator : ethers.ZeroAddress;
    } catch {
      return ethers.ZeroAddress;
    }
  }

  private static async getTokenCreationTime(
    factory: TokenFactory, 
    tokenAddress: string
  ): Promise<string> {
    try {
      const filter = factory.filters.TokenCreated(tokenAddress);
      const events = await factory.queryFilter(filter);
      
      if (events.length > 0) {
        const block = await events[0].getBlock();
        return new Date(block.timestamp * 1000).toISOString();
      }
    } catch { /* ignore */ }
    return new Date().toISOString();
  }
}
