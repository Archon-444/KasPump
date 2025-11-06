/**
 * Component for monitoring and reporting performance metrics
 * Only active in development mode
 */

'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<{
    fcp?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
  }>({});

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;
    if (!('PerformanceObserver' in window)) return;

    // First Contentful Paint (FCP)
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({ ...prev, fcp: Math.round(entry.startTime) }));
          }
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      // Ignore errors
    }

    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, lcp: Math.round(lastEntry.startTime) }));
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // Ignore errors
    }

    // Time to First Byte (TTFB)
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart;
        setMetrics(prev => ({ ...prev, ttfb: Math.round(ttfb) }));
      }
    } catch (e) {
      // Ignore errors
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            setMetrics(prev => ({ ...prev, cls: Math.round(clsValue * 1000) / 1000 }));
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Ignore errors
    }
  }, []);

  // Only show in development and if metrics exist
  if (process.env.NODE_ENV !== 'development') return null;
  if (Object.keys(metrics).length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3 text-xs font-mono z-50">
      <div className="flex items-center space-x-2 mb-2">
        <Activity size={14} className="text-purple-400" />
        <span className="text-white font-semibold">Performance</span>
      </div>
      <div className="space-y-1 text-gray-300">
        {metrics.fcp && (
          <div>FCP: <span className="text-green-400">{metrics.fcp}ms</span></div>
        )}
        {metrics.lcp && (
          <div>LCP: <span className={metrics.lcp < 2500 ? 'text-green-400' : metrics.lcp < 4000 ? 'text-yellow-400' : 'text-red-400'}>
            {metrics.lcp}ms
          </span></div>
        )}
        {metrics.ttfb && (
          <div>TTFB: <span className={metrics.ttfb < 800 ? 'text-green-400' : 'text-yellow-400'}>
            {metrics.ttfb}ms
          </span></div>
        )}
        {metrics.cls !== undefined && (
          <div>CLS: <span className={metrics.cls < 0.1 ? 'text-green-400' : 'text-red-400'}>
            {metrics.cls.toFixed(3)}
          </span></div>
        )}
      </div>
    </div>
  );
};

