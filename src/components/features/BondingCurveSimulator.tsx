'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, ArrowRight, Info } from 'lucide-react';
import { Card, Badge } from '../ui';
import { cn } from '../../utils';

interface BondingCurveSimulatorProps {
  /** Current token price (0 for new token) */
  currentPrice?: number;
  /** Base price of the bonding curve */
  basePrice: number;
  /** Slope of the bonding curve */
  slope: number;
  /** Curve type */
  curveType: 'linear' | 'exponential';
  /** Total supply */
  totalSupply: number;
  /** Current supply sold (0 for preview) */
  currentSupply?: number;
  /** Native currency symbol */
  currencySymbol?: string;
  /** Compact mode for sidebar display */
  compact?: boolean;
  className?: string;
}

export const BondingCurveSimulator: React.FC<BondingCurveSimulatorProps> = ({
  currentPrice = 0,
  basePrice,
  slope,
  curveType,
  totalSupply,
  currentSupply = 0,
  currencySymbol = 'BNB',
  compact = false,
  className,
}) => {
  const [simulateAmount, setSimulateAmount] = useState('100');

  // Calculate price at a given supply point
  const priceAt = (supply: number): number => {
    if (curveType === 'exponential') {
      return basePrice * Math.pow(1 + slope, supply / 1000);
    }
    return basePrice + slope * supply;
  };

  // Generate curve points for visualization
  const curvePoints = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const supply = (totalSupply * i) / steps;
      points.push({ x: supply, y: priceAt(supply) });
    }
    return points;
  }, [totalSupply, basePrice, slope, curveType]);

  // Simulation results
  const simulation = useMemo(() => {
    const buyAmount = parseFloat(simulateAmount) || 0;
    if (buyAmount <= 0) return null;

    const priceBeforeBuy = priceAt(currentSupply);
    // Estimate tokens received (simplified)
    const avgPrice = priceBeforeBuy;
    const tokensReceived = buyAmount / avgPrice;
    const newSupply = currentSupply + tokensReceived;
    const priceAfterBuy = priceAt(newSupply);
    const priceImpact = ((priceAfterBuy - priceBeforeBuy) / priceBeforeBuy) * 100;

    return {
      tokensReceived: tokensReceived,
      priceBeforeBuy,
      priceAfterBuy,
      priceImpact,
    };
  }, [simulateAmount, currentSupply, basePrice, slope, curveType]);

  // SVG path for the curve
  const svgPath = useMemo(() => {
    if (curvePoints.length === 0) return '';
    const maxY = Math.max(...curvePoints.map(p => p.y));
    const maxX = Math.max(...curvePoints.map(p => p.x));
    const width = compact ? 200 : 300;
    const height = compact ? 80 : 120;

    const pathData = curvePoints.map((point, i) => {
      const x = (point.x / maxX) * width;
      const y = height - (point.y / maxY) * (height - 10);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');

    return pathData;
  }, [curvePoints, compact]);

  const svgWidth = compact ? 200 : 300;
  const svgHeight = compact ? 80 : 120;

  // Current position marker
  const currentPositionX = totalSupply > 0 ? (currentSupply / totalSupply) * svgWidth : 0;
  const maxY = Math.max(...curvePoints.map(p => p.y));
  const currentPositionY = maxY > 0
    ? svgHeight - (priceAt(currentSupply) / maxY) * (svgHeight - 10)
    : svgHeight;

  return (
    <Card className={cn('p-4', compact && 'p-3', className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={cn('font-semibold text-white flex items-center gap-2', compact ? 'text-sm' : 'text-base')}>
          <Calculator size={compact ? 14 : 16} className="text-yellow-400" />
          {compact ? 'Curve Preview' : 'Bonding Curve Preview'}
        </h4>
        <Badge variant="info">{curveType}</Badge>
      </div>

      {/* Curve Visualization */}
      <div className="bg-gray-800/30 rounded-lg p-2 mb-3">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
          style={{ height: compact ? '80px' : '120px' }}
        >
          {/* Grid lines */}
          <line x1="0" y1={svgHeight} x2={svgWidth} y2={svgHeight} stroke="#374151" strokeWidth="0.5" />
          <line x1="0" y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} stroke="#374151" strokeWidth="0.3" strokeDasharray="4" />

          {/* Curve line */}
          <path
            d={svgPath}
            fill="none"
            stroke="url(#curveGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Filled area under curve */}
          <path
            d={`${svgPath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`}
            fill="url(#areaGradient)"
            opacity="0.15"
          />

          {/* Current position marker */}
          {currentSupply > 0 && (
            <>
              <line
                x1={currentPositionX}
                y1={0}
                x2={currentPositionX}
                y2={svgHeight}
                stroke="#F59E0B"
                strokeWidth="1"
                strokeDasharray="3"
                opacity="0.6"
              />
              <circle
                cx={currentPositionX}
                cy={currentPositionY}
                r="4"
                fill="#F59E0B"
                stroke="#1F2937"
                strokeWidth="2"
              />
            </>
          )}

          {/* Gradients */}
          <defs>
            <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
          <span>0</span>
          <span>Supply</span>
          <span>{(totalSupply / 1e6).toFixed(0)}M</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className={cn('grid gap-2 mb-3', compact ? 'grid-cols-2' : 'grid-cols-3')}>
        <div className="bg-gray-800/30 rounded px-2 py-1.5">
          <div className="text-[10px] text-gray-400">Initial Price</div>
          <div className="text-xs font-mono text-white">{basePrice.toFixed(8)} {currencySymbol}</div>
        </div>
        <div className="bg-gray-800/30 rounded px-2 py-1.5">
          <div className="text-[10px] text-gray-400">Current Price</div>
          <div className="text-xs font-mono text-white">{priceAt(currentSupply).toFixed(8)} {currencySymbol}</div>
        </div>
        {!compact && (
          <div className="bg-gray-800/30 rounded px-2 py-1.5">
            <div className="text-[10px] text-gray-400">Max Price</div>
            <div className="text-xs font-mono text-white">{priceAt(totalSupply).toFixed(8)} {currencySymbol}</div>
          </div>
        )}
      </div>

      {/* Simulator Input */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 flex items-center gap-1">
          <TrendingUp size={12} />
          Simulate a buy
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={simulateAmount}
              onChange={(e) => setSimulateAmount(e.target.value)}
              placeholder="Amount"
              className={cn(
                'w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm',
                'focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30',
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              {currencySymbol}
            </span>
          </div>
        </div>

        {/* Simulation Results */}
        {simulation && parseFloat(simulateAmount) > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-gray-800/20 rounded-lg p-3 space-y-1.5 border border-gray-700/30"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">You receive (est.)</span>
              <span className="text-white font-mono font-medium">
                ~{simulation.tokensReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Price moves</span>
              <span className="text-white font-mono flex items-center gap-1">
                {simulation.priceBeforeBuy.toFixed(8)}
                <ArrowRight size={10} className="text-gray-500" />
                {simulation.priceAfterBuy.toFixed(8)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Price impact</span>
              <span className={cn(
                'font-medium',
                simulation.priceImpact > 5 ? 'text-red-400' :
                simulation.priceImpact > 2 ? 'text-yellow-400' : 'text-green-400'
              )}>
                {simulation.priceImpact.toFixed(2)}%
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </Card>
  );
};
