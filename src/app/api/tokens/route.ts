import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import BondingCurveAMMABI from '@/abis/BondingCurveAMM.json';
import TokenFactoryABI from '@/abis/TokenFactory.json';
import { getChainById, getDefaultChain } from '@/config/chains';
import { getTokenFactoryAddress } from '@/config/contracts';
import { rateLimit } from '@/lib/rate-limit';
import { TokenFilterParamsSchema } from '@/schemas';

const RPC_URLS_BY_CHAIN: Record<number, string | undefined> = {
  56: process.env.NEXT_PUBLIC_BSC_RPC_URL,
  97: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL,
  42161: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL,
  421614: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL,
  8453: process.env.NEXT_PUBLIC_BASE_RPC_URL,
  84532: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
};

const DEFAULT_CHAIN_ID = getDefaultChain().id;

function resolveRpcUrl(chainId: number): string | undefined {
  return RPC_URLS_BY_CHAIN[chainId] || getChainById(chainId)?.rpcUrls?.default?.http?.[0];
}

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

    const { pageSize: limit, offset, chainId } = parseResult.data;
    const resolvedChainId = chainId ?? DEFAULT_CHAIN_ID;
    const address = searchParams.get('address');

    // Initialize provider
    const rpcUrl = resolveRpcUrl(resolvedChainId);
    const factoryAddress = getTokenFactoryAddress(resolvedChainId);

    if (!rpcUrl || !factoryAddress) {
      return NextResponse.json(
        { error: 'Factory contract not configured for requested chain' },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const factoryContract = new ethers.Contract(factoryAddress, TokenFactoryABI.abi, provider);

    if (address) {
      // Get specific token data
      const tokenData = await getTokenDetails(factoryContract, provider, address);
      return NextResponse.json(tokenData);
    }

    // Get all tokens with pagination
    const allTokens = await factoryContract.getFunction('getAllTokens')();
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
    const config = await factoryContract.getFunction('getTokenConfig')(tokenAddress);
    
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
      const ammAddress = await factoryContract.getFunction('getTokenAMM')(tokenAddress);
      if (ammAddress && ammAddress !== ethers.ZeroAddress) {
        return ammAddress;
      }
    } catch (error) {
      // Function doesn't exist or failed, fall back to events
    }
    
    // Fallback: search for TokenCreated events
    const filter = factoryContract.filters.TokenCreated(tokenAddress);
    const events = await factoryContract.queryFilter(filter);

    if (events.length > 0 && 'args' in events[0]) {
      return events[0].args.ammAddress as string;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting AMM address for ${tokenAddress}:`, error);
    return null;
  }
}

async function getTradingData(provider: ethers.JsonRpcProvider, ammAddress: string) {
  try {
    const ammContract = new ethers.Contract(ammAddress, BondingCurveAMMABI.abi, provider);
    const [currentSupply, currentPrice, totalVolume, graduation, isGraduated] = await ammContract.getFunction('getTradingInfo')();

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
    const filter = factoryContract.filters.TokenCreated(tokenAddress);
    const events = await factoryContract.queryFilter(filter);

    if (events.length > 0 && 'args' in events[0]) {
      return events[0].args.creator as string;
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
    const filter = factoryContract.filters.TokenCreated(tokenAddress);
    const events = await factoryContract.queryFilter(filter);

    if (events.length > 0) {
      const event = events[0];
      const block = await provider.getBlock(event.blockNumber);
      if (block) {
        return new Date(block.timestamp * 1000).toISOString();
      }
    }

    // Fallback to current time if no event found
    return new Date().toISOString();
  } catch (error) {
    console.error(`Error getting creation time for token ${tokenAddress}:`, error);
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
