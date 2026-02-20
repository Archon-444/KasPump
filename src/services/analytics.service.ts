import { ethers } from 'ethers';
import { BlockchainService } from './blockchain';
import { TokenFactory } from '../../typechain-types';

export interface PlatformMetrics {
  timestamp: string;
  platform: {
    totalTokens: number;
    graduatedTokens: number;
    activeTokens: number;
    successRate: number;
    totalUsers: number;
  };
  financial: {
    totalVolume: number;
    totalMarketCap: number;
    averageVolume: number;
    averageMarketCap: number;
    platformFees: number;
    creatorEarnings: number;
  };
}

export class AnalyticsService {
  /**
   * Fetch core platform metrics using the blockchain service
   */
  static async getPlatformMetrics(chainId: number): Promise<PlatformMetrics> {
    try {
      const factory = BlockchainService.getTokenFactory(chainId);
      const allTokens = await factory.getAllTokens();
      
      const totalTokens = allTokens.length;
      
      // Parallelize heavy operations
      const [
        totalVolume, 
        totalMarketCap, 
        graduatedTokens
      ] = await Promise.all([
        this.calculateTotalVolume(factory, allTokens, chainId),
        this.calculateTotalMarketCap(factory, allTokens, chainId),
        this.countGraduatedTokens(factory, allTokens, chainId)
      ]);

      const successRate = totalTokens > 0 ? (graduatedTokens / totalTokens) * 100 : 0;
      const averageVolume = totalTokens > 0 ? totalVolume / totalTokens : 0;
      const averageMarketCap = totalTokens > 0 ? totalMarketCap / totalTokens : 0;
      
      return {
        timestamp: new Date().toISOString(),
        platform: {
          totalTokens,
          graduatedTokens,
          activeTokens: 0, // Placeholder for optimization
          successRate,
          totalUsers: 0 // Requires indexer
        },
        financial: {
          totalVolume,
          totalMarketCap,
          averageVolume,
          averageMarketCap,
          platformFees: totalVolume * 0.01,
          creatorEarnings: totalVolume * 0.005
        }
      };

    } catch (error) {
      console.error(`Analytics Error [Chain ${chainId}]:`, error);
      throw error;
    }
  }

  // --- Helper Methods ---

  private static async calculateTotalVolume(
    factory: TokenFactory, 
    tokens: string[],
    chainId: number
  ): Promise<number> {
    let volume = 0;
    // Batch these in production or use Multicall
    for (const token of tokens) {
      try {
        const ammAddress = await factory.getTokenAMM(token);
        if (ammAddress === ethers.ZeroAddress) continue;
        
        const amm = BlockchainService.getAMM(ammAddress, chainId);
        const info = await amm.getTradingInfo();
        volume += parseFloat(ethers.formatEther(info.totalVolume));
      } catch { continue; }
    }
    return volume;
  }

  private static async calculateTotalMarketCap(
    factory: TokenFactory, 
    tokens: string[],
    chainId: number
  ): Promise<number> {
    let mcap = 0;
    for (const token of tokens) {
      try {
        const ammAddress = await factory.getTokenAMM(token);
        if (ammAddress === ethers.ZeroAddress) continue;
        
        const amm = BlockchainService.getAMM(ammAddress, chainId);
        const info = await amm.getTradingInfo();
        
        const supply = parseFloat(ethers.formatEther(info.virtualTokenReserves));
        const price = parseFloat(ethers.formatEther(info.currentPrice));
        mcap += supply * price;
      } catch { continue; }
    }
    return mcap;
  }

  private static async countGraduatedTokens(
    factory: TokenFactory, 
    tokens: string[],
    chainId: number
  ): Promise<number> {
    let count = 0;
    for (const token of tokens) {
      try {
        const ammAddress = await factory.getTokenAMM(token);
        if (ammAddress === ethers.ZeroAddress) continue;
        
        const amm = BlockchainService.getAMM(ammAddress, chainId);
        const info = await amm.getTradingInfo();
        if (info.isGraduated) count++;
      } catch { continue; }
    }
    return count;
  }
}
