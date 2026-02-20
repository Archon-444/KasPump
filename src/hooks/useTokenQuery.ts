import { useQuery } from '@tanstack/react-query';
import { KasPumpToken } from '@/types';

// Matching the API response shape from our backend TokenService
interface TokenDetailsResponse {
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

interface PaginatedResponse {
  tokens: TokenDetailsResponse[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface UseTokenQueryParams {
  chainId?: number;
  page?: number;
  limit?: number;
  search?: string;
  creator?: string;
}

export function useTokenQuery(params: UseTokenQueryParams = {}) {
  // Construct a query key that uniquely identifies this request
  const queryKey = ['tokens', params.chainId, params.page, params.limit, params.search, params.creator];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.chainId) searchParams.append('chainId', params.chainId.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.creator) searchParams.append('creator', params.creator);

      const response = await fetch(`/api/tokens?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }

      const data: PaginatedResponse = await response.json();

      // Transform API response to match existing frontend KasPumpToken interface
      const transformedTokens: KasPumpToken[] = data.tokens.map((t) => ({
        address: t.address,
        name: t.name,
        symbol: t.symbol,
        description: t.description,
        image: t.imageUrl, // Map imageUrl -> image
        creator: t.creator,
        totalSupply: t.totalSupply,
        currentSupply: t.currentSupply,
        marketCap: t.marketCap,
        price: t.currentPrice, // Map currentPrice -> price
        change24h: t.analytics.priceChange24h,
        volume24h: t.volume24h,
        holders: t.analytics.holders,
        createdAt: new Date(t.createdAt), // Parse string date
        curveType: t.curveType,
        bondingCurveProgress: t.graduationProgress,
        ammAddress: t.ammAddress || '',
        isGraduated: t.isGraduated,
      }));

      return {
        tokens: transformedTokens,
        pagination: data.pagination,
      };
    },
    staleTime: 30000, // Keep data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus to save bandwidth
  });
}
