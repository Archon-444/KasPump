'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Rocket,
  TrendingUp,
  Coins,
  BarChart3,
  Loader,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { AmbientBackground } from '@/components/ui/enhanced';
import { cn, formatCurrency, truncateAddress, copyToClipboard } from '@/utils';

interface ProfileToken {
  address: string;
  name: string;
  symbol: string;
  isGraduated: boolean;
  currentPrice: number;
  totalVolume: number;
  graduationProgress: number;
}

interface ProfileData {
  address: string;
  tokensCreated: ProfileToken[];
  stats: {
    totalCreated: number;
    graduated: number;
    graduationRate: number;
    totalVolume: number;
  };
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address || !ethers.isAddress(address)) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/tokens?creator=${address}&limit=100`);
        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        const tokens: ProfileToken[] = (data.tokens || []).map((t: any) => ({
          address: t.address,
          name: t.name,
          symbol: t.symbol,
          isGraduated: t.isGraduated,
          currentPrice: t.currentPrice,
          totalVolume: t.volume24h,
          graduationProgress: t.graduationProgress,
        }));

        const graduated = tokens.filter(t => t.isGraduated).length;
        const totalVolume = tokens.reduce((sum, t) => sum + t.totalVolume, 0);

        setProfile({
          address,
          tokensCreated: tokens,
          stats: {
            totalCreated: tokens.length,
            graduated,
            graduationRate: tokens.length > 0 ? (graduated / tokens.length) * 100 : 0,
            totalVolume,
          },
        });
      } catch (err) {
        console.error('Profile fetch error:', err);
        setProfile({
          address,
          tokensCreated: [],
          stats: { totalCreated: 0, graduated: 0, graduationRate: 0, totalVolume: 0 },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [address]);

  const handleCopy = async () => {
    await copyToClipboard(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <AmbientBackground colorScheme="yellow" />
        <Loader className="h-10 w-10 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <AmbientBackground colorScheme="yellow" showOrbs={true} showStars={true} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-glow-sm">
                {address.slice(2, 4).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <code className="text-white font-mono text-sm">
                    {truncateAddress(address, 6, 6)}
                  </code>
                  <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors">
                    <Copy size={14} className={copied ? 'text-green-400' : ''} />
                  </button>
                  <a
                    href={`https://testnet.bscscan.com/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
                <p className="text-xs text-gray-500 mt-1">Token Creator</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/[0.03] rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Rocket size={12} className="text-yellow-400" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Created</span>
                </div>
                <div className="text-lg font-bold text-white tabular-nums">
                  {profile?.stats.totalCreated || 0}
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={12} className="text-green-400" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Graduated</span>
                </div>
                <div className="text-lg font-bold text-white tabular-nums">
                  {profile?.stats.graduated || 0}
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 size={12} className="text-blue-400" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Grad Rate</span>
                </div>
                <div className="text-lg font-bold text-white tabular-nums">
                  {(profile?.stats.graduationRate || 0).toFixed(0)}%
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Coins size={12} className="text-purple-400" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Volume</span>
                </div>
                <div className="text-lg font-bold text-white tabular-nums">
                  {formatCurrency(profile?.stats.totalVolume || 0, 'BNB')}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Tokens Created */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-base font-semibold text-white mb-3">
            Tokens Created ({profile?.tokensCreated.length || 0})
          </h2>

          {!profile?.tokensCreated.length ? (
            <Card className="p-8 text-center">
              <Rocket size={32} className="mx-auto mb-3 text-gray-500 opacity-40" />
              <p className="text-sm text-gray-500">No tokens created yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {profile.tokensCreated.map((token, i) => (
                <motion.div
                  key={token.address}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className="p-4 cursor-pointer hover:border-white/[0.12] transition-all"
                    onClick={() => router.push(`/token/${token.address}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs">
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium text-sm">{token.name}</span>
                            <span className="text-gray-500 text-xs">${token.symbol}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {token.isGraduated ? (
                              <Badge variant="success" className="text-[9px]">Graduated</Badge>
                            ) : (
                              <span className="text-[10px] text-gray-500 tabular-nums">
                                {token.graduationProgress.toFixed(0)}% progress
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-mono text-sm tabular-nums">
                          {formatCurrency(token.currentPrice, 'BNB', 8)}
                        </div>
                        <div className="text-[10px] text-gray-500 tabular-nums">
                          Vol: {formatCurrency(token.totalVolume, 'BNB')}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
