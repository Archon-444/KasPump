import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const TOKEN_FACTORY_ABI = [
  "function getAllTokens() external view returns (address[])",
  "function getTokenConfig(address tokenAddress) external view returns (tuple(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType, uint256 graduationThreshold))",
  "function getTokenAMM(address tokenAddress) external view returns (address)",
  "event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 totalSupply, address ammAddress)",
  "event TokenGraduated(address indexed tokenAddress, uint256 finalSupply, uint256 liquidityAdded)"
];

const BONDING_CURVE_ABI = [
  "function getTradingInfo() external view returns (uint256 _currentSupply, uint256 _currentPrice, uint256 _totalVolume, uint256 _graduation, bool _isGraduated)"
];

// Analytics API endpoint - crucial for partnerships and business intelligence
export const dynamic = 'force-dynamic'; // API routes are always dynamic
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h'; // 24h, 7d, 30d, all
    const metric = searchParams.get('metric'); // Optional: specific metric

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    const factoryAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;

    if (!rpcUrl || !factoryAddress) {
      return NextResponse.json({ error: 'Factory contract not deployed' }, { status: 500 });
    }

    // Initialize provider and contracts
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);
    
    const analytics = await getPlatformAnalytics(provider, factoryContract, timeframe);

    if (metric) {
      // Return specific metric
      return NextResponse.json({ [metric]: (analytics as any)[metric] });
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

async function getPlatformAnalytics(
  provider: ethers.JsonRpcProvider,
  factoryContract: ethers.Contract,
  timeframe: string
) {

  try {
    // Get all tokens
    const getAllTokens = factoryContract.getAllTokens as (() => Promise<string[]>) | undefined;
    if (!getAllTokens) {
      throw new Error('getAllTokens method not available on contract');
    }
    const allTokens = await getAllTokens();

    // Calculate platform metrics
    const totalTokens = allTokens.length;
    const totalVolume = await calculateTotalVolume(provider, factoryContract, allTokens);
    const totalMarketCap = await calculateTotalMarketCap(provider, factoryContract, allTokens);
    const graduatedTokens = await countGraduatedTokens(provider, factoryContract, allTokens);
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
    const newTokens = await getNewTokensCount(factoryContract, timeframe);
    // Note: volumeGrowth and userGrowth require historical data tracking
    // const volumeGrowth = await getVolumeGrowth(provider, allTokens, timeframe);
    // const userGrowth = await getUserGrowth(provider, allTokens, timeframe);

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
      // Note: Historical metrics require event indexing or database
      growth: {
        newTokens,
        // Growth percentages would require historical data tracking
        // Removed placeholder random values for production accuracy
      },

      // Partnership Data
      partnership: {
        readyForGraduation: await getGraduationReadyTokens(provider, factoryContract, allTokens),
        highVolumeTokens: await getHighVolumeTokens(provider, factoryContract, allTokens),
        topPerformingTokens: await getTopPerformingTokens(provider, factoryContract, allTokens),
        ecosystemValue: totalMarketCap + platformFees // Value created for ecosystem
      }

      // Note: API usage metrics would require request tracking middleware
      // Removed placeholder metrics for production accuracy
    };

  } catch (error) {
    console.error('Error calculating platform analytics:', error);
    throw error;
  }
}

// Helper functions for analytics calculations
async function calculateTotalVolume(
  provider: ethers.JsonRpcProvider,
  factoryContract: ethers.Contract,
  tokens: string[]
): Promise<number> {
  let totalVolume = 0;

  for (const tokenAddress of tokens) {
    try {
      // Get AMM address (simplified - in production would use proper lookup)
      const ammAddress = await getAMMAddressForToken(factoryContract, tokenAddress);
      if (!ammAddress) continue;

      const ammContract = new ethers.Contract(ammAddress, BONDING_CURVE_ABI, provider);
      const getTradingInfo = ammContract.getTradingInfo as (() => Promise<[bigint, bigint, bigint, bigint, boolean]>) | undefined;
      if (!getTradingInfo) continue;
      const [, , totalVolumeWei] = await getTradingInfo();
      totalVolume += parseFloat(ethers.formatEther(totalVolumeWei));
    } catch (error) {
      // Skip tokens with errors
      continue;
    }
  }

  return totalVolume;
}

async function calculateTotalMarketCap(
  provider: ethers.JsonRpcProvider,
  factoryContract: ethers.Contract,
  tokens: string[]
): Promise<number> {
  let totalMarketCap = 0;

  for (const tokenAddress of tokens) {
    try {
      const ammAddress = await getAMMAddressForToken(factoryContract, tokenAddress);
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

async function countGraduatedTokens(
  provider: ethers.JsonRpcProvider,
  factoryContract: ethers.Contract,
  tokens: string[]
): Promise<number> {
  let graduatedCount = 0;

  for (const tokenAddress of tokens) {
    try {
      const ammAddress = await getAMMAddressForToken(factoryContract, tokenAddress);
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

async function countActiveTokens(provider: ethers.JsonRpcProvider, tokens: string[], _timeframe: string): Promise<number> {
  // Count tokens with recent trading activity (volume > 0 and not graduated)
  // In production, this would query recent Trade events within the timeframe
  let activeCount = 0;

  for (const tokenAddress of tokens) {
    try {
      const ammContract = new ethers.Contract(tokenAddress, BONDING_CURVE_ABI, provider);
      const getTradingInfo = ammContract.getTradingInfo as (() => Promise<[bigint, bigint, bigint, bigint, boolean]>) | undefined;
      if (!getTradingInfo) continue;
      const [, , totalVolume, , isGraduated] = await getTradingInfo();

      // Consider active if has volume and not graduated
      if (parseFloat(ethers.formatEther(totalVolume)) > 0 && !isGraduated) {
        activeCount++;
      }
    } catch {
      continue;
    }
  }

  return activeCount;
}

async function calculateTotalUsers(_provider: ethers.JsonRpcProvider, _tokens: string[]): Promise<number> {
  // Accurate user count would require:
  // 1. Parsing all Trade events across all tokens
  // 2. Tracking unique trader addresses
  // 3. Event indexing service or subgraph
  // Returning 0 instead of estimate for production accuracy
  return 0; // Would require event indexing to track unique traders
}

function calculatePlatformFees(totalVolume: number): number {
  return totalVolume * 0.01; // 1% platform fee
}

function calculateCreatorEarnings(totalVolume: number): number {
  return totalVolume * 0.005; // Approximate creator earnings
}

async function getNewTokensCount(factoryContract: ethers.Contract, timeframe: string): Promise<number> {
  // Query TokenCreated events within the timeframe
  // For accurate counts, would need to parse events from a specific block range
  try {
    const currentBlock = await factoryContract.runner?.provider?.getBlockNumber();
    if (!currentBlock) return 0;

    // Calculate block range based on timeframe (approximate: ~3s per block on BSC)
    const blocksPerDay = (24 * 60 * 60) / 3;
    const timeframeBlocks = {
      '24h': Math.floor(blocksPerDay),
      '7d': Math.floor(blocksPerDay * 7),
      '30d': Math.floor(blocksPerDay * 30),
      'all': currentBlock
    };

    const fromBlock = Math.max(0, currentBlock - (timeframeBlocks[timeframe as keyof typeof timeframeBlocks] || currentBlock));
    const filtersObj = factoryContract.filters as { TokenCreated?: () => ethers.ContractEventName } | undefined;
    if (!filtersObj?.TokenCreated) return 0;
    const filter = filtersObj.TokenCreated();
    const events = await factoryContract.queryFilter(filter, fromBlock, currentBlock);

    return events.length;
  } catch {
    // If event querying fails, return 0
    return 0;
  }
}

async function getVolumeGrowth(_provider: ethers.JsonRpcProvider, _tokens: string[], _timeframe: string): Promise<number> {
  // Volume growth requires historical volume tracking
  // Would need to store snapshots or parse Trade events with timestamps
  // Removed random placeholder for production accuracy
  return 0; // Would require historical data tracking
}

async function getUserGrowth(_provider: ethers.JsonRpcProvider, _tokens: string[], _timeframe: string): Promise<number> {
  // User growth requires tracking unique addresses over time
  // Would need event indexing to track new vs returning traders
  // Removed random placeholder for production accuracy
  return 0; // Would require event indexing and historical tracking
}

async function getGraduationReadyTokens(
  provider: ethers.JsonRpcProvider,
  factoryContract: ethers.Contract,
  tokens: string[]
): Promise<number> {
  // Count tokens close to graduation (>70% progress)
  let readyCount = 0;

  for (const tokenAddress of tokens) {
    try {
      const ammAddress = await getAMMAddressForToken(factoryContract, tokenAddress);
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

async function getHighVolumeTokens(
  provider: ethers.JsonRpcProvider,
  factoryContract: ethers.Contract,
  tokens: string[]
): Promise<number> {
  // Count tokens with volume > $10,000 USD
  const HIGH_VOLUME_THRESHOLD = 10000;
  let highVolumeCount = 0;

  for (const tokenAddress of tokens) {
    try {
      const ammAddress = await getAMMAddressForToken(factoryContract, tokenAddress);
      if (!ammAddress) continue;

      const tradingData = await getTradingDataForAnalytics(provider, ammAddress);
      if (tradingData && tradingData.totalVolume > HIGH_VOLUME_THRESHOLD) {
        highVolumeCount++;
      }
    } catch {
      continue;
    }
  }

  return highVolumeCount;
}

async function getTopPerformingTokens(
  provider: ethers.JsonRpcProvider,
  factoryContract: ethers.Contract,
  tokens: string[]
): Promise<number> {
  // Count tokens with high bonding curve progress (>50%) and significant volume
  let topPerformingCount = 0;

  for (const tokenAddress of tokens) {
    try {
      const ammAddress = await getAMMAddressForToken(factoryContract, tokenAddress);
      if (!ammAddress) continue;

      const tradingData = await getTradingDataForAnalytics(provider, ammAddress);
      // Consider "top performing" if >50% to graduation and volume > $1000
      if (tradingData && tradingData.graduation > 5000 && tradingData.totalVolume > 1000) {
        topPerformingCount++;
      }
    } catch {
      continue;
    }
  }

  return topPerformingCount;
}

// Simplified helper functions (would be more robust in production)
async function getAMMAddressForToken(factoryContract: ethers.Contract, tokenAddress: string): Promise<string | null> {
  try {
    const getTokenAMM = factoryContract.getTokenAMM as ((addr: string) => Promise<string>) | undefined;
    if (getTokenAMM) {
      const ammAddress = await getTokenAMM(tokenAddress);
      if (ammAddress && ammAddress !== ethers.ZeroAddress) {
        return ammAddress;
      }
    }
  } catch {
    // Method might not exist, fall through to events
  }

  try {
    const filtersObj = factoryContract.filters as { TokenCreated?: (addr: string) => ethers.ContractEventName } | undefined;
    if (!filtersObj?.TokenCreated) return null;
    const filter = filtersObj.TokenCreated(tokenAddress);
    const events = await factoryContract.queryFilter(filter);

    if (events.length > 0) {
      const event = events[0];
      if (event && 'args' in event && event.args) {
        return (event.args as { ammAddress?: string }).ammAddress ?? null;
      }
    }
  } catch {
    // Event querying failed
  }

  return null;
}

async function getTradingDataForAnalytics(provider: ethers.JsonRpcProvider, ammAddress: string) {
  try {
    const ammContract = new ethers.Contract(ammAddress, BONDING_CURVE_ABI, provider);
    const getTradingInfo = ammContract.getTradingInfo as (() => Promise<[bigint, bigint, bigint, bigint, boolean]>) | undefined;
    if (!getTradingInfo) return null;
    const [currentSupply, currentPrice, totalVolume, graduation, isGraduated] = await getTradingInfo();

    return {
      currentSupply: parseFloat(ethers.formatEther(currentSupply)),
      currentPrice: parseFloat(ethers.formatEther(currentPrice)),
      totalVolume: parseFloat(ethers.formatEther(totalVolume)),
      graduation: parseFloat(ethers.formatUnits(graduation, 2)),
      isGraduated
    };
  } catch {
    return null;
  }
}
