'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Coins, DollarSign, Users, Award, TrendingUp, Activity } from 'lucide-react';
import { Card } from '../ui';
import { CreatorStats } from '../../hooks/useCreatorTokens';
import { cn, formatCurrency } from '../../utils';

export interface CreatorStatsCardProps {
  stats: CreatorStats;
  className?: string;
}

export const CreatorStatsCard: React.FC<CreatorStatsCardProps> = ({
  stats,
  className
}) => {
  const statItems = [
    {
      label: 'Total Tokens',
      value: stats.totalTokens.toLocaleString(),
      icon: Coins,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Total Earnings',
      value: formatCurrency(stats.totalEarnings, 'USD', 2),
      icon: DollarSign,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Total Volume',
      value: formatCurrency(stats.totalVolume, 'USD', 0),
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Holders',
      value: stats.totalHolders.toLocaleString(),
      icon: Users,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
    },
    {
      label: 'Graduated',
      value: stats.graduatedTokens.toLocaleString(),
      icon: Award,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Active',
      value: stats.activeTokens.toLocaleString(),
      icon: Activity,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4', className)}>
      {statItems.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className={cn(
            'glassmorphism p-4 flex flex-col items-center text-center',
            'hover:scale-105 transition-transform duration-300'
          )}>
            <div className={cn('p-2 rounded-lg mb-2', item.bgColor)}>
              <item.icon className={cn('w-5 h-5', item.color)} />
            </div>
            <div className={cn('text-xl font-bold mb-1', item.color)}>
              {item.value}
            </div>
            <div className="text-xs text-gray-400">
              {item.label}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

