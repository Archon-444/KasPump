'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../ui';
import { cn, formatCurrency } from '../../utils';

import { AnalyticsData } from './PlatformStatsCard';

export interface GrowthChartProps {
  data: AnalyticsData;
  className?: string;
}

const formatBucketTime = (time: number, timeframe: string): string => {
  const d = new Date(time * 1000);
  if (timeframe === '24h') {
    return `${String(d.getHours()).padStart(2, '0')}:00`;
  }
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
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

  const series = data.series.map((point) => ({
    ...point,
    label: formatBucketTime(point.time, data.timeframe),
  }));
  // volume/activeTraders only exist on 24h buckets (Trade scans are bounded
  // to a day until the subgraph indexes history).
  const hasActivity = series.some((p) => p.volume !== undefined);

  return (
    <Card className={cn('glassmorphism', className, isMobile && 'p-4')}>
      <h3 className={cn('font-semibold text-white mb-4', isMobile ? 'text-base' : 'text-lg')}>Growth Trends</h3>
      {series.length === 0 ? (
        <div
          className="flex items-center justify-center text-center text-gray-400 text-sm px-6"
          style={{ height: isMobile ? 250 : 300 }}
        >
          Historical series for this timeframe requires an indexer.
          Lifetime totals are shown in the cards above.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="label"
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
              dataKey="tokensCreated"
              stroke="#10B981"
              strokeWidth={2}
              name="New Tokens"
              dot={false}
            />
            {hasActivity && (
              <Line
                type="monotone"
                dataKey="volume"
                stroke="#8B5CF6"
                strokeWidth={2}
                name="Volume (BNB)"
                dot={false}
              />
            )}
            {hasActivity && (
              <Line
                type="monotone"
                dataKey="activeTraders"
                stroke="#EC4899"
                strokeWidth={2}
                name="Active Traders"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-gray-400 mb-1">Volume (24h)</div>
          <div className="text-lg font-semibold text-white">
            {formatCurrency(data.financial.volume24h, 'BNB', 2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Active Traders (24h)</div>
          <div className="text-lg font-semibold text-white">
            {data.platform.activeTraders24h.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">New Tokens</div>
          <div className="text-lg font-semibold text-white">
            {data.newTokensInWindow}
          </div>
        </div>
      </div>

      {data.scan.partial && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          Volume metrics scan the newest {data.scan.tokensScanned} tokens.
        </div>
      )}
    </Card>
  );
};
