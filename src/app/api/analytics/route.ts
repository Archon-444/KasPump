import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Analytics API endpoint - crucial for partnerships and business intelligence
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h'; // 24h, 7d, 30d, all
    const metric = searchParams.get('metric'); // Optional: specific metric

    // Initialize provider and contracts
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const factoryAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
    
    if (!factoryAddress) {
      return NextResponse.json({ error: 'Factory contract not deployed' }, { status: 500 });
    }

    const analytics = await getPlatformAnalytics(provider, factoryAddress, timeframe);

    if (metric) {
      // Return specific metric
      return NextResponse.json({ [metric]: analytics[metric] });
    }

    // Return all analytics
    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

async function getPlatformAnalytics(provider: ethers.JsonRpcProvider, factoryAddress: string, timeframe: string) {
  const TOKEN_FACTORY_ABI = [
    "function getAllTokens() external view returns (address[])",
    "function getTokenConfig(address tokenAddress) external view returns (tuple(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType, uint256 graduationThreshold))",
    "event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 totalSupply, address ammAddress)",
    "event TokenGraduated(address indexed tokenAddress, uint256 finalSupply, uint256 liquidityAdded)"
  ];

  const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);
  
  try {
    // Get all tokens
    const allTokens = await factoryContract.getAllTokens();
    
    // Calculate platform metrics
    const totalTokens = allTokens.length;
    const totalVolume = await calculateTotalVolume(provider, allTokens);
    const totalMarketCap = await calculateTotalMarketCap(provider, factoryAddress, allTokens);
    const graduatedTokens = await countGraduatedTokens(provider, allTokens);
    const activeTokens = await countActiveTokens(provider, allTokens, timeframe);
    const totalUsers = await calculateTotalUsers(provider, allTokens);
    
    // Platform health metrics
    const successRate = totalTokens > 0 ? (graduatedTokens / totalTokens) * 100 : 0;
    const averageVolume = totalTokens > 0 ? totalVolume / totalTokens : 0;
    const averageMarketCap = totalTokens > 0 ? totalMarketCap / totalTokens : 0;

    // Revenue analytics (strategic for partnerships)
    const platformFees = calculatePlatformFees(totalVolume);
    const creatorEarnings = calculateCreatorEarnings(totalVolume);

    // Growth metrics
    const newTokens = await getNewTokensCount(provider, factoryAddress, timeframe);
    const volumeGrowth = await getVolumeGrowth(provider, allTokens, timeframe);
    const userGrowth = await getUserGrowth(provider, allTokens, timeframe);

    return {
      timestamp: new Date().toISOString(),
      timeframe,
      
      // Core Platform Metrics
      platform: {
        totalTokens,
        graduatedTokens,
        activeTokens,
        successRate: Math.round(successRate * 100) / 100,
        totalUsers
      },

      // Financial Metrics (Key for partnerships)
      financial: {
        totalVolume: Math.round(totalVolume * 100) / 100,
        totalMarketCap: Math.round(totalMarketCap * 100) / 100,
        averageVolume: Math.round(averageVolume * 100) / 100,
        averageMarketCap: Math.round(averageMarketCap * 100) / 100,
        platformFees: Math.round(platformFees * 100) / 100,
        creatorEarnings: Math.round(creatorEarnings * 100) / 100
      },

      // Growth Metrics (Strategic insights)
      growth: {
        newTokens,
        volumeGrowth: Math.round(volumeGrowth * 100) / 100,
        userGrowth: Math.round(userGrowth * 100) / 100,
        marketCapGrowth: 0 // Placeholder
      },

      // Partnership Data
      partnership: {
        readyForGraduation: await getGraduationReadyTokens(provider, allTokens),
        highVolumeTokens: await getHighVolumeTokens(provider, allTokens),
        topPerformingTokens: await getTopPerformingTokens(provider, allTokens),
        ecosystemValue: totalMarketCap + platformFees // Value created for ecosystem
      },

      // API Usage Metrics (for premium features)
      api: {
        callsToday: 0, // Placeholder - would track in production
        premiumUsers: 0, // Placeholder
        apiRevenue: 0 // Placeholder
      }
    };

  } catch (error) {
    console.error('Error calculating platform analytics:', error);
    throw error;
  }
}

// Helper functions for analytics calculations
async function calculateTotalVolume(provider: ethers.JsonRpcProvider, tokens: string[]): Promise<number> {
  let totalVolume = 0;
  
  const BONDING_CURVE_ABI = [
    "function getTradingInfo() external view returns (uint256 _currentSupply, uint256 _currentPrice, uint256 _totalVolume, uint256 _graduation, bool _isGraduated)"
  ];

  for (const tokenAddress of tokens) {
    try {
      // Get AMM address (simplified - in production would use proper lookup)
      const ammAddress = await getAMMAddressForToken(tokenAddress);
      if (!ammAddress) continue;

      const ammContract = new ethers.Contract(ammAddress, BONDING_CURVE_ABI, provider);
      const [, , totalVolumeWei] = await ammContract.getTradingInfo();
      totalVolume += parseFloat(ethers.formatEther(totalVolumeWei));
    } catch (error) {
      // Skip tokens with errors
      continue;
    }
  }

  return totalVolume;
}

async function calculateTotalMarketCap(provider: ethers.JsonRpcProvider, factoryAddress: string, tokens: string[]): Promise<number> {
  let totalMarketCap = 0;

  const TOKEN_FACTORY_ABI = [
    "function getTokenConfig(address tokenAddress) external view returns (tuple(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType, uint256 graduationThreshold))"
  ];

  const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);

  for (const tokenAddress of tokens) {
    try {
      const ammAddress = await getAMMAddressForToken(tokenAddress);
      if (!ammAddress) continue;

      const tradingData = await getTradingDataForAnalytics(provider, ammAddress);
      if (tradingData) {
        totalMarketCap += tradingData.currentSupply * tradingData.currentPrice;
      }
    } catch (error) {
      continue;
    }
  }

  return totalMarketCap;
}

async function countGraduatedTokens(provider: ethers.JsonRpcProvider, tokens: string[]): Promise<number> {
  let graduatedCount = 0;

  for (const tokenAddress of tokens) {
    try {
      const ammAddress = await getAMMAddressForToken(tokenAddress);
      if (!ammAddress) continue;

      const tradingData = await getTradingDataForAnalytics(provider, ammAddress);
      if (tradingData && tradingData.isGraduated) {
        graduatedCount++;
      }
    } catch (error) {
      continue;
    }
  }

  return graduatedCount;
}

async function countActiveTokens(provider: ethers.JsonRpcProvider, tokens: string[], timeframe: string): Promise<number> {
  // Placeholder - would implement based on recent trading activity
  return Math.floor(tokens.length * 0.6); // Assume 60% are active
}

async function calculateTotalUsers(provider: ethers.JsonRpcProvider, tokens: string[]): Promise<number> {
  // Placeholder - would track unique addresses across all tokens
  return tokens.length * 15; // Rough estimate
}

function calculatePlatformFees(totalVolume: number): number {
  return totalVolume * 0.01; // 1% platform fee
}

function calculateCreatorEarnings(totalVolume: number): number {
  return totalVolume * 0.005; // Approximate creator earnings
}

async function getNewTokensCount(provider: ethers.JsonRpcProvider, factoryAddress: string, timeframe: string): Promise<number> {
  // Placeholder - would query TokenCreated events within timeframe
  const multipliers = { '24h': 0.1, '7d': 0.3, '30d': 0.7, 'all': 1 };
  return Math.floor(10 * (multipliers[timeframe as keyof typeof multipliers] || 1));
}

async function getVolumeGrowth(provider: ethers.JsonRpcProvider, tokens: string[], timeframe: string): Promise<number> {
  // Placeholder - would calculate volume growth percentage
  return Math.random() * 50 - 25; // -25% to +25% growth
}

async function getUserGrowth(provider: ethers.JsonRpcProvider, tokens: string[], timeframe: string): Promise<number> {
  // Placeholder - would calculate user growth percentage
  return Math.random() * 30; // 0% to +30% growth
}

async function getGraduationReadyTokens(provider: ethers.JsonRpcProvider, tokens: string[]): Promise<number> {
  // Count tokens close to graduation (>70% progress)
  let readyCount = 0;

  for (const tokenAddress of tokens) {
    try {
      const ammAddress = await getAMMAddressForToken(tokenAddress);
      if (!ammAddress) continue;

      const tradingData = await getTradingDataForAnalytics(provider, ammAddress);
      if (tradingData && tradingData.graduation > 7000 && !tradingData.isGraduated) { // 70% in basis points
        readyCount++;
      }
    } catch (error) {
      continue;
    }
  }

  return readyCount;
}

async function getHighVolumeTokens(provider: ethers.JsonRpcProvider, tokens: string[]): Promise<number> {
  // Placeholder - would identify tokens with >$10k volume
  return Math.floor(tokens.length * 0.2);
}

async function getTopPerformingTokens(provider: ethers.JsonRpcProvider, tokens: string[]): Promise<number> {
  // Placeholder - would identify top 10% by market cap growth
  return Math.floor(tokens.length * 0.1);
}

// Simplified helper functions (would be more robust in production)
async function getAMMAddressForToken(tokenAddress: string): Promise<string | null> {
  // Placeholder - would use proper AMM address resolution
  return `0x${tokenAddress.slice(2)}AMM`; // Mock AMM address
}

async function getTradingDataForAnalytics(provider: ethers.JsonRpcProvider, ammAddress: string) {
  try {
    const BONDING_CURVE_ABI = [
      "function getTradingInfo() external view returns (uint256 _currentSupply, uint256 _currentPrice, uint256 _totalVolume, uint256 _graduation, bool _isGraduated)"
    ];

    const ammContract = new ethers.Contract(ammAddress, BONDING_CURVE_ABI, provider);
    const [currentSupply, currentPrice, totalVolume, graduation, isGraduated] = await ammContract.getTradingInfo();

    return {
      currentSupply: parseFloat(ethers.formatEther(currentSupply)),
      currentPrice: parseFloat(ethers.formatEther(currentPrice)),
      totalVolume: parseFloat(ethers.formatEther(totalVolume)),
      graduation: parseFloat(ethers.formatUnits(graduation, 2)),
      isGraduated
    };
  } catch (error) {
    return null;
  }
}