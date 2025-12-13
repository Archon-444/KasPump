import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { rateLimit } from '@/lib/rate-limit';
import { TokenFilterParamsSchema } from '@/schemas';

const TOKEN_FACTORY_ABI = [
  "function getAllTokens() external view returns (address[])",
  "function getTokenConfig(address tokenAddress) external view returns (tuple(string name, string symbol, string description, string imageUrl, uint256 totalSupply, uint256 basePrice, uint256 slope, uint8 curveType, uint256 graduationThreshold))",
  "function getTokenAMM(address tokenAddress) external view returns (address)",
  "event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 totalSupply, address ammAddress)"
];

const BONDING_CURVE_ABI = [
  "function getTradingInfo() external view returns (uint256 _currentSupply, uint256 _currentPrice, uint256 _totalVolume, uint256 _graduation, bool _isGraduated)",
  "function getCurrentPrice() external view returns (uint256)"
];

// API endpoint for token data - enables partnerships and integrations
export const dynamic = 'force-dynamic'; // API routes are always dynamic
export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - 60 requests per minute
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: rateLimitResult.headers['Retry-After'],
      },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    // SECURITY: Validate query parameters with Zod
    const parseResult = TokenFilterParamsSchema.safeParse({
      search: searchParams.get('search'),
      chainId: searchParams.get('chainId'),
      creator: searchParams.get('creator'),
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize') || searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { pageSize: limit, offset } = parseResult.data;
    const address = searchParams.get('address');

    // Initialize provider
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    const factoryAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;

    if (!rpcUrl || !factoryAddress) {
      return NextResponse.json({ error: 'Factory contract not deployed' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);

    if (address) {
      // Get specific token data
      const tokenData = await getTokenDetails(factoryContract, provider, address);
      return NextResponse.json(tokenData);
    }

    // Get all tokens with pagination
    const getAllTokens = factoryContract.getAllTokens as (() => Promise<string[]>) | undefined;
    if (!getAllTokens) {
      return NextResponse.json({ error: 'getAllTokens method not available' }, { status: 500 });
    }
    const allTokens = await getAllTokens();
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

    const validTokens = tokensWithData.filter((token): token is NonNullable<typeof token> => token !== null);

    return NextResponse.json({
      tokens: validTokens,
      pagination: {
        total: allTokens.length,
        offset,
        limit,
        hasMore: offset + limit < allTokens.length,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token data' },
      { status: 500 },
    );
  }
}

async function getTokenDetails(
  factoryContract: ethers.Contract,
  provider: ethers.JsonRpcProvider,
  tokenAddress: string
) {
  try {
    // Get token config from factory
    const getTokenConfig = factoryContract.getTokenConfig as ((addr: string) => Promise<{
      name: string;
      symbol: string;
      description: string;
      imageUrl: string;
      totalSupply: bigint;
      basePrice: bigint;
      slope: bigint;
      curveType: number;
      graduationThreshold: bigint;
    }>) | undefined;
    if (!getTokenConfig) {
      throw new Error('getTokenConfig method not available');
    }
    const config = await getTokenConfig(tokenAddress);
    
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
      creator: await getTokenCreator(factoryContract, tokenAddress),
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
      createdAt: await getTokenCreationTime(factoryContract, provider, tokenAddress),
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
    // Try to get AMM address from factory (if function exists)
    try {
      const getTokenAMM = factoryContract.getTokenAMM as ((addr: string) => Promise<string>) | undefined;
      if (getTokenAMM) {
        const ammAddress = await getTokenAMM(tokenAddress);
        if (ammAddress && ammAddress !== ethers.ZeroAddress) {
          return ammAddress;
        }
      }
    } catch {
      // Function doesn't exist or failed, fall back to events
    }

    // Fallback: search for TokenCreated events
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
  } catch (error) {
    console.error(`Error getting AMM address for ${tokenAddress}:`, error);
    return null;
  }
}

async function getTradingData(provider: ethers.JsonRpcProvider, ammAddress: string) {
  try {
    const ammContract = new ethers.Contract(ammAddress, BONDING_CURVE_ABI, provider);
    const getTradingInfo = ammContract.getTradingInfo as (() => Promise<[bigint, bigint, bigint, bigint, boolean]>) | undefined;
    if (!getTradingInfo) return null;
    const [currentSupply, currentPrice, totalVolume, graduation, isGraduated] = await getTradingInfo();

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

async function getTokenCreator(
  factoryContract: ethers.Contract,
  tokenAddress: string
): Promise<string> {
  try {
    // Query TokenCreated events to find the creator
    const filtersObj = factoryContract.filters as { TokenCreated?: (addr: string) => ethers.ContractEventName } | undefined;
    if (!filtersObj?.TokenCreated) return ethers.ZeroAddress;
    const filter = filtersObj.TokenCreated(tokenAddress);
    const events = await factoryContract.queryFilter(filter);

    if (events.length > 0) {
      const event = events[0];
      if (event && 'args' in event && event.args) {
        return (event.args as { creator?: string }).creator ?? ethers.ZeroAddress;
      }
    }

    // If no event found, return zero address
    return ethers.ZeroAddress;
  } catch (error) {
    console.error(`Error getting creator for token ${tokenAddress}:`, error);
    return ethers.ZeroAddress;
  }
}

async function getTokenCreationTime(
  factoryContract: ethers.Contract,
  provider: ethers.JsonRpcProvider,
  tokenAddress: string
): Promise<string> {
  try {
    // Query TokenCreated events to find creation block
    const filtersObj = factoryContract.filters as { TokenCreated?: (addr: string) => ethers.ContractEventName } | undefined;
    if (!filtersObj?.TokenCreated) return new Date().toISOString();
    const filter = filtersObj.TokenCreated(tokenAddress);
    const events = await factoryContract.queryFilter(filter);

    if (events.length > 0) {
      const event = events[0];
      if (event) {
        const block = await provider.getBlock(event.blockNumber);
        if (block) {
          return new Date(block.timestamp * 1000).toISOString();
        }
      }
    }

    // Fallback to current time if no event found
    return new Date().toISOString();
  } catch (error) {
    console.error(`Error getting creation time for token ${tokenAddress}:`, error);
    return new Date().toISOString();
  }
}

async function getHolderCount(_provider: ethers.JsonRpcProvider, _tokenAddress: string): Promise<number> {
  // Placeholder for holder count calculation
  // In production, we'd need to track Transfer events or use indexing service
  return 0;
}
