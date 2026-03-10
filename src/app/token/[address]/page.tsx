'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { TokenTradingPage } from '@/components/features/TokenTradingPage';
import { AmbientBackground } from '@/components/ui/enhanced';
import { KasPumpToken } from '@/types';
import { Loader } from 'lucide-react';

export default function TokenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;
  const [token, setToken] = useState<KasPumpToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !ethers.isAddress(address)) {
      setError('Invalid token address');
      setLoading(false);
      return;
    }

    const fetchToken = async () => {
      try {
        const res = await fetch(`/api/tokens?address=${address}`);
        if (!res.ok) throw new Error('Token not found');

        const data = await res.json();

        const t: KasPumpToken = {
          address: data.address,
          name: data.name,
          symbol: data.symbol,
          description: data.description,
          image: data.imageUrl,
          creator: data.creator,
          totalSupply: data.totalSupply,
          currentSupply: data.currentSupply,
          marketCap: data.marketCap,
          price: data.currentPrice,
          change24h: data.analytics?.priceChange24h || 0,
          volume24h: data.volume24h,
          holders: data.analytics?.holders || 0,
          createdAt: new Date(data.createdAt),
          curveType: data.curveType,
          bondingCurveProgress: data.graduationProgress,
          ammAddress: data.ammAddress || '',
          isGraduated: data.isGraduated,
        };

        setToken(t);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [address]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <AmbientBackground colorScheme="yellow" />
        <div className="text-center z-10">
          <Loader className="mx-auto h-10 w-10 animate-spin text-yellow-500 mb-4" />
          <p className="text-gray-400 text-sm">Loading token...</p>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <AmbientBackground colorScheme="yellow" />
        <div className="text-center z-10 max-w-md mx-auto px-4">
          <h2 className="text-xl font-semibold text-white mb-2">Token Not Found</h2>
          <p className="text-gray-400 text-sm mb-6">{error || 'This token does not exist or has not been indexed yet.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-400 transition-colors"
          >
            Browse Tokens
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-0">
      <TokenTradingPage
        token={token}
        onBack={() => router.push('/')}
      />
    </div>
  );
}
