'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../ui';
import { cn } from '../../utils';

import { AnalyticsData } from './PlatformStatsCard';

export interface GrowthChartProps {
  data: AnalyticsData;
  className?: string;
}

// Mock data for demonstration (in production, this would come from historical API data)
const generateMockTimeSeries = (timeframe?: string) => {
  const tf = timeframe || '24h';
  const points = tf === '24h' ? 24 : tf === '7d' ? 7 : tf === '30d' ? 30 : 90;
  return Array.from({ length: points }, (_, i) => ({
    date: `${i + 1}`,
    volume: Math.random() * 1000000 + 500000,
    users: Math.random() * 1000 + 500,
    tokens: Math.random() * 100 + 50,
  }));
};

export const GrowthChart: React.FC<GrowthChartProps> = ({
  data,
  className
}) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const timeSeriesData = generateMockTimeSeries(data.timeframe);

  return (
    <Card className={cn('glassmorphism', className, isMobile && 'p-4')}>
      <h3 className={cn('font-semibold text-white mb-4', isMobile ? 'text-base' : 'text-lg')}>Growth Trends</h3>
      <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
        <LineChart data={timeSeriesData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#9CA3AF"
            style={{ fontSize: isMobile ? '10px' : '12px' }}
            tick={{ fill: '#9CA3AF' }}
          />
          <YAxis 
            stroke="#9CA3AF"
            style={{ fontSize: isMobile ? '10px' : '12px' }}
            tick={{ fill: '#9CA3AF' }}
            width={isMobile ? 40 : 60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Legend 
            wrapperStyle={{ color: '#9CA3AF', fontSize: isMobile ? '10px' : '12px' }}
            iconSize={isMobile ? 10 : 12}
          />
          <Line 
            type="monotone" 
            dataKey="volume" 
            stroke="#8B5CF6" 
            strokeWidth={2}
            name="Volume (USD)"
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="users" 
            stroke="#EC4899" 
            strokeWidth={2}
            name="Users"
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="tokens" 
            stroke="#10B981" 
            strokeWidth={2}
            name="New Tokens"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {data.growth && (
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-400 mb-1">Volume Growth</div>
            <div className={cn(
              'text-lg font-semibold',
              data.growth.volumeGrowth >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {data.growth.volumeGrowth >= 0 ? '+' : ''}{data.growth.volumeGrowth.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">User Growth</div>
            <div className={cn(
              'text-lg font-semibold',
              data.growth.userGrowth >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {data.growth.userGrowth >= 0 ? '+' : ''}{data.growth.userGrowth.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">New Tokens</div>
            <div className="text-lg font-semibold text-white">
              {data.growth.newTokens}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

