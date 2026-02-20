'use client';

import React from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Lock, Unlock, Eye, TrendingUp } from 'lucide-react';
import { Card, Badge } from '../ui';
import { KasPumpToken } from '../../types';
import { cn } from '../../utils';

interface RiskIndicator {
  label: string;
  status: 'safe' | 'warning' | 'danger' | 'neutral';
  description: string;
  icon: React.ReactNode;
}

interface RiskIndicatorsProps {
  token: KasPumpToken;
  className?: string;
  compact?: boolean;
}

export const RiskIndicators: React.FC<RiskIndicatorsProps> = ({
  token,
  className,
  compact = false,
}) => {
  // Compute risk indicators based on token data
  const indicators: RiskIndicator[] = [
    {
      label: 'Bonding Curve',
      status: token.isGraduated ? 'safe' : token.bondingCurveProgress > 80 ? 'warning' : 'neutral',
      description: token.isGraduated
        ? 'Graduated to AMM - full liquidity'
        : `${token.bondingCurveProgress.toFixed(0)}% progress to graduation`,
      icon: <TrendingUp size={14} />,
    },
    {
      label: 'Liquidity',
      status: token.marketCap > 10000 ? 'safe' : token.marketCap > 1000 ? 'warning' : 'danger',
      description: token.marketCap > 10000
        ? 'Healthy liquidity pool'
        : token.marketCap > 1000
        ? 'Moderate liquidity - trade carefully'
        : 'Low liquidity - high slippage risk',
      icon: <Lock size={14} />,
    },
    {
      label: 'Holder Distribution',
      status: token.holders > 50 ? 'safe' : token.holders > 10 ? 'warning' : 'danger',
      description: token.holders > 50
        ? `${token.holders} holders - well distributed`
        : token.holders > 10
        ? `${token.holders} holders - growing`
        : `Only ${token.holders} holders - concentrated`,
      icon: <Eye size={14} />,
    },
    {
      label: 'Volume Activity',
      status: (token.volume24h || 0) > 5000 ? 'safe' : (token.volume24h || 0) > 500 ? 'neutral' : 'warning',
      description: (token.volume24h || 0) > 5000
        ? 'High trading volume'
        : (token.volume24h || 0) > 500
        ? 'Moderate trading volume'
        : 'Low trading volume',
      icon: <TrendingUp size={14} />,
    },
  ];

  const overallRisk = indicators.filter(i => i.status === 'danger').length > 0
    ? 'High Risk'
    : indicators.filter(i => i.status === 'warning').length > 1
    ? 'Medium Risk'
    : 'Lower Risk';

  const overallColor = overallRisk === 'High Risk'
    ? 'text-red-400'
    : overallRisk === 'Medium Risk'
    ? 'text-yellow-400'
    : 'text-green-400';

  const statusColors = {
    safe: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: <CheckCircle size={14} className="text-green-400" /> },
    warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: <AlertTriangle size={14} className="text-yellow-400" /> },
    danger: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: <XCircle size={14} className="text-red-400" /> },
    neutral: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', icon: <Shield size={14} className="text-gray-400" /> },
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        <Badge
          variant={overallRisk === 'High Risk' ? 'danger' : overallRisk === 'Medium Risk' ? 'warning' : 'success'}
        >
          <Shield size={12} className="mr-1" />
          {overallRisk}
        </Badge>
        {indicators.map((indicator, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]',
              statusColors[indicator.status].bg,
              statusColors[indicator.status].text,
            )}
            title={indicator.description}
          >
            {statusColors[indicator.status].icon}
            <span className="hidden sm:inline">{indicator.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield size={16} className="text-yellow-400" />
          Risk Assessment
        </h4>
        <span className={cn('text-xs font-medium', overallColor)}>
          {overallRisk}
        </span>
      </div>

      <div className="space-y-2">
        {indicators.map((indicator, i) => {
          const colors = statusColors[indicator.status];
          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-3 p-2.5 rounded-lg border',
                colors.bg,
                colors.border,
              )}
            >
              <div className="mt-0.5">{colors.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">{indicator.label}</span>
                  <span className="flex items-center gap-1 text-[10px]">{indicator.icon}</span>
                </div>
                <p className={cn('text-[11px] mt-0.5', colors.text)}>
                  {indicator.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
