'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, Users, Award, Zap } from 'lucide-react';
import { Card } from '../ui';
import { cn, formatCurrency, formatPercentage } from '../../utils';

export interface AnalyticsData {
  timestamp?: string;
  timeframe?: string;
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
  growth: {
    newTokens: number;
    volumeGrowth: number;
    userGrowth: number;
    marketCapGrowth: number;
  };
  partnership?: {
    readyForGraduation: number;
    highVolumeTokens: number;
    topPerformingTokens: number;
    ecosystemValue: number;
  };
}

export interface PlatformStatsCardProps {
  data: AnalyticsData;
  className?: string;
}

const PlatformStatsCardComponent: React.FC<PlatformStatsCardProps> = ({
  data,
  className
}) => {
  const stats = [
    {
      label: 'Total Tokens',
      value: data.platform.totalTokens.toLocaleString(),
      icon: Coins,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    {
      label: 'Graduated',
      value: data.platform.graduatedTokens.toLocaleString(),
      subValue: `${formatPercentage(data.platform.successRate)}%`,
      icon: Award,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      label: 'Total Volume',
      value: formatCurrency(data.financial.totalVolume, 'USD', 0),
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      label: 'Total Users',
      value: data.platform.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/30',
    },
  ];

  // Mobile detection
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={cn(
      'grid gap-3',
      isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      className
    )}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={cn(
            'glassmorphism border-2 transition-all duration-300',
            isMobile ? 'p-3' : 'p-4',
            !isMobile && 'hover:scale-105',
            stat.borderColor
          )}>
            <div className={cn('flex items-center justify-between', isMobile ? 'mb-2' : 'mb-3')}>
              <div className={cn('rounded-lg', isMobile ? 'p-1.5' : 'p-2', stat.bgColor)}>
                <stat.icon className={cn(isMobile ? 'w-4 h-4' : 'w-5 h-5', stat.color)} />
              </div>
              {stat.subValue && (
                <div className={cn(
                  'text-xs font-semibold px-2 py-1 rounded',
                  isMobile && 'text-[10px] px-1.5 py-0.5',
                  stat.color, 
                  stat.bgColor
                )}>
                  {stat.subValue}
                </div>
              )}
            </div>
            <div className={cn('font-bold text-white mb-1', isMobile ? 'text-lg' : 'text-2xl')}>
              {stat.value}
            </div>
            <div className={cn('text-gray-400', isMobile ? 'text-xs' : 'text-sm')}>
              {stat.label}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

// Memoize to prevent re-renders when platform stats haven't changed
export const PlatformStatsCard = memo(PlatformStatsCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.data.platform.totalTokens === nextProps.data.platform.totalTokens &&
    prevProps.data.platform.graduatedTokens === nextProps.data.platform.graduatedTokens &&
    prevProps.data.platform.totalUsers === nextProps.data.platform.totalUsers &&
    prevProps.data.financial.totalVolume === nextProps.data.financial.totalVolume
  );
});

PlatformStatsCard.displayName = 'PlatformStatsCard';
