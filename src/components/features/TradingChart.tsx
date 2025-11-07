'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, UTCTimestamp } from 'lightweight-charts';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, Volume2, Maximize2 } from 'lucide-react';
import { Card } from '../ui';
import { KasPumpToken } from '../../types';
import { cn } from '../../utils';

export interface TradingChartProps {
  token: KasPumpToken;
  className?: string;
  height?: number;
  showVolume?: boolean;
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  onTimeframeChange?: (timeframe: string) => void;
}

export interface PriceData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  token,
  className,
  height = 400,
  showVolume = true,
  timeframe = '1h',
  onTimeframeChange
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const timeframes = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' }
  ];

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#d1d5db',
        fontSize: isMobile ? 10 : 12,
      },
      grid: {
        vertLines: {
          color: 'rgba(107, 114, 128, 0.2)',
          visible: !isMobile, // Hide vertical lines on mobile for cleaner look
        },
        horzLines: {
          color: 'rgba(107, 114, 128, 0.2)',
        },
      },
      crosshair: {
        mode: isMobile ? 0 : 1, // Disable crosshair on mobile for better touch interaction
        vertLine: {
          color: 'rgba(243, 186, 47, 0.5)',
          labelBackgroundColor: '#F3BA2F',
          visible: !isMobile,
        },
        horzLine: {
          color: 'rgba(243, 186, 47, 0.5)',
          labelBackgroundColor: '#F3BA2F',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(107, 114, 128, 0.3)',
        textColor: '#d1d5db',
        autoScale: true,
        scaleMargins: {
          top: isMobile ? 0.05 : 0.1,
          bottom: isMobile ? 0.05 : 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(107, 114, 128, 0.3)',
        timeVisible: !isMobile, // Hide time labels on mobile
        secondsVisible: false,
      },
      // Mobile optimizations
      handleScroll: {
        mouseWheel: !isMobile, // Disable mouse wheel on mobile
        pressedMouseMove: !isMobile,
        horzTouchDrag: isMobile, // Enable horizontal touch drag on mobile
        vertTouchDrag: false, // Disable vertical drag
      },
      handleScale: {
        axisPressedMouseMove: !isMobile,
        mouseWheel: !isMobile,
        pinch: isMobile, // Enable pinch-to-zoom on mobile
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Add volume series if enabled
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: 'rgba(76, 175, 80, 0.4)',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      volumeSeriesRef.current = volumeSeries;

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    }

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
      const newRect = entries[0].contentRect;
      chart.applyOptions({ width: newRect.width, height: height });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [height, showVolume, isMobile]);

  // Generate mock price data (replace with real data)
  useEffect(() => {
    const generateMockData = (): PriceData[] => {
      const data: PriceData[] = [];
      const now = Math.floor(Date.now() / 1000);
      let currentPrice = token.price;
      
      for (let i = 100; i >= 0; i--) {
        const time = (now - i * 60 * 60) as UTCTimestamp; // 1 hour intervals
        const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
        const open = currentPrice;
        const close = open * (1 + variation);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.random() * 1000 + 100;

        data.push({
          time,
          open,
          high,
          low,
          close,
          volume
        });

        currentPrice = close;
      }

      return data;
    };

    const mockData = generateMockData();
    setPriceData(mockData);
    setLoading(false);

    // Update chart with data
    if (candlestickSeriesRef.current) {
      candlestickSeriesRef.current.setData(mockData);
    }

    if (volumeSeriesRef.current && showVolume) {
      const volumeData = mockData.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
      }));
      volumeSeriesRef.current.setData(volumeData);
    }
  }, [token.address, token.price, showVolume, timeframe]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const currentPrice = priceData.length > 0 ? priceData[priceData.length - 1].close : token.price;
  const priceChange = priceData.length > 1 
    ? ((currentPrice - priceData[priceData.length - 2].close) / priceData[priceData.length - 2].close) * 100
    : token.change24h;

  if (loading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          <span className="ml-3 text-gray-400">Loading chart...</span>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative',
        isFullscreen && 'fixed inset-0 z-50 bg-gray-900',
        className
      )}
    >
      <Card className={cn(
        'overflow-hidden',
        isFullscreen && 'h-full rounded-none border-none'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="text-yellow-500" size={20} />
              <h3 className="font-semibold text-white">{token.symbol}/BNB</h3>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-white font-mono text-lg">
                {currentPrice.toFixed(8)}
              </span>
              <span className={cn(
                'text-sm font-medium flex items-center',
                priceChange >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                <TrendingUp size={14} className="mr-1" />
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Timeframe Selector */}
            <div className="flex items-center space-x-1 bg-gray-800/50 rounded-lg p-1">
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => onTimeframeChange?.(tf.value)}
                  className={cn(
                    'px-2 py-1 text-xs rounded transition-colors',
                    timeframe === tf.value
                      ? 'bg-yellow-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {/* Chart Container - Mobile optimized */}
        <div 
          ref={chartContainerRef}
          className={cn(
            'relative bg-transparent touch-manipulation gpu-accelerated',
            isMobile && 'rounded-lg overflow-hidden',
            isFullscreen && 'flex-1'
          )}
          style={{ 
            height: isFullscreen ? 'calc(100vh - 80px)' : height,
            // Prevent text selection on mobile during chart interaction
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
        />

        {/* Chart Stats Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700/50 bg-gray-800/20">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-1 text-gray-400">
              <Volume2 size={14} />
              <span>Vol: {token.volume24h.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center space-x-1 text-gray-400">
              <Clock size={14} />
              <span>24h: {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%</span>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Simplified chart component for smaller displays
export const MiniTradingChart: React.FC<{
  token: KasPumpToken;
  className?: string;
}> = ({ token, className }) => {
  return (
    <div className={cn('h-24 w-full', className)}>
      <TradingChart
        token={token}
        height={96}
        showVolume={false}
        className="border-none"
      />
    </div>
  );
};