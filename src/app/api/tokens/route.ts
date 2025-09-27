import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// API endpoint for token data - enables partnerships and integrations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const factoryAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
    
    if (!factoryAddress) {
      return NextResponse.json({ error: 'Factory contract not deployed' }, { status: 500 });
    }

    const TOKEN_FACTORY_ABI = [
      "function getAllTokens() external view returns (address[])",
      "function getTokenConfig(address tokenAddress) external view returns (tuple(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType, uint256 graduationThreshold))"
    ];

    const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);

    if (address) {
      // Get specific token data
      const tokenData = await getTokenDetails(factoryContract, provider, address);
      return NextResponse.json(tokenData);
    } else {
      // Get all tokens with pagination
      const allTokens = await factoryContract.getAllTokens();
      const paginatedTokens = allTokens.slice(offset, offset + limit);
      
      const tokensWithData = await Promise.all(
        paginatedTokens.map(async (tokenAddress: string) => {
          try {
            return await getTokenDetails(factoryContract, provider, tokenAddress);
          } catch (error) {
            console.error(`Error fetching token ${tokenAddress}:`, error);
            return null;
          }
        })
      );

      const validTokens = tokensWithData.filter(token => token !== null);

      return NextResponse.json({
        tokens: validTokens,
        pagination: {
          total: allTokens.length,
          offset,
          limit,
          hasMore: offset + limit < allTokens.length
        }
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token data' },
      { status: 500 }
    );
  }
}

async function getTokenDetails(factoryContract: ethers.Contract, provider: ethers.JsonRpcProvider, tokenAddress: string) {
  try {
    // Get token config from factory
    const config = await factoryContract.getTokenConfig(tokenAddress);
    
    // Get AMM address and trading data
    const ammAddress = await getAMMAddress(tokenAddress, factoryContract);
    let tradingData = null;
    
    if (ammAddress) {
      tradingData = await getTradingData(provider, ammAddress);
    }

    // Calculate additional metrics
    const currentSupply = tradingData?.currentSupply || 0;
    const currentPrice = tradingData?.currentPrice || parseFloat(ethers.formatEther(config.basePrice));
    const marketCap = currentSupply * currentPrice;
    const graduationProgress = tradingData?.graduation || 0;

    return {
      address: tokenAddress,
      name: config.name,
      symbol: config.symbol,
      description: config.description,
      imageUrl: config.imageUrl,
      creator: await getTokenCreator(provider, tokenAddress),
      totalSupply: parseFloat(ethers.formatEther(config.totalSupply)),
      currentSupply,
      currentPrice,
      marketCap,
      basePrice: parseFloat(ethers.formatEther(config.basePrice)),
      slope: parseFloat(ethers.formatEther(config.slope)),
      curveType: config.curveType === 0 ? 'linear' : 'exponential',
      graduationThreshold: parseFloat(ethers.formatEther(config.graduationThreshold)),
      graduationProgress,
      volume24h: tradingData?.totalVolume || 0,
      isGraduated: tradingData?.isGraduated || false,
      ammAddress,
      createdAt: await getTokenCreationTime(provider, tokenAddress),
      // Strategic data for partnerships
      analytics: {
        holders: await getHolderCount(provider, tokenAddress),
        transactions24h: tradingData?.transactions24h || 0,
        priceChange24h: tradingData?.priceChange24h || 0,
        volumeChange24h: tradingData?.volumeChange24h || 0
      }
    };
  } catch (error) {
    console.error(`Error getting token details for ${tokenAddress}:`, error);
    throw error;
  }
}

async function getAMMAddress(tokenAddress: string, factoryContract: ethers.Contract): Promise<string | null> {
  try {
    // Try to get AMM address from factory
    const getTokenAMM = factoryContract.getFunction('getTokenAMM');
    if (getTokenAMM) {
      return await factoryContract.getTokenAMM(tokenAddress);
    }
    
    // Fallback: search for TokenCreated events
    const filter = factoryContract.filters.TokenCreated(tokenAddress);
    const events = await factoryContract.queryFilter(filter, 0, 'latest');
    
    if (events.length > 0) {
      return events[0].args.ammAddress;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting AMM address for ${tokenAddress}:`, error);
    return null;
  }
}

async function getTradingData(provider: ethers.JsonRpcProvider, ammAddress: string) {
  try {
    const BONDING_CURVE_ABI = [
      "function getTradingInfo() external view returns (uint256 _currentSupply, uint256 _currentPrice, uint256 _totalVolume, uint256 _graduation, bool _isGraduated)",
      "function getCurrentPrice() external view returns (uint256)"
    ];

    const ammContract = new ethers.Contract(ammAddress, BONDING_CURVE_ABI, provider);
    const [currentSupply, currentPrice, totalVolume, graduation, isGraduated] = await ammContract.getTradingInfo();

    return {
      currentSupply: parseFloat(ethers.formatEther(currentSupply)),
      currentPrice: parseFloat(ethers.formatEther(currentPrice)),
      totalVolume: parseFloat(ethers.formatEther(totalVolume)),
      graduation: parseFloat(ethers.formatUnits(graduation, 2)), // From basis points
      isGraduated,
      // Placeholder for additional analytics
      transactions24h: 0,
      priceChange24h: 0,
      volumeChange24h: 0
    };
  } catch (error) {
    console.error(`Error getting trading data for AMM ${ammAddress}:`, error);
    return null;
  }
}

async function getTokenCreator(provider: ethers.JsonRpcProvider, tokenAddress: string): Promise<string> {
  try {
    // Get creation transaction to find creator
    // This is a simplified approach - in production, we'd use event logs
    return "0x0000000000000000000000000000000000000000"; // Placeholder
  } catch (error) {
    return "0x0000000000000000000000000000000000000000";
  }
}

async function getTokenCreationTime(provider: ethers.JsonRpcProvider, tokenAddress: string): Promise<string> {
  try {
    // Get creation block timestamp
    // This is a placeholder - in production, we'd query TokenCreated events
    return new Date().toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

async function getHolderCount(provider: ethers.JsonRpcProvider, tokenAddress: string): Promise<number> {
  try {
    // Placeholder for holder count calculation
    // In production, we'd need to track Transfer events or use indexing service
    return 0;
  } catch (error) {
    return 0;
  }
}