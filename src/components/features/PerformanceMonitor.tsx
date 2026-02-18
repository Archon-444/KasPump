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
        if (lastEntry) {
          setMetrics(prev => ({ ...prev, lcp: Math.round(lastEntry.startTime) }));
        }
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

  // Track bundle size (approximate)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;

    // Calculate approximate bundle size from performance entries
    const calculateBundleSize = () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(r => r.name.includes('.js') && r.initiatorType === 'script');
      const totalSize = jsResources.reduce((sum, r) => {
        const size = (r as any).transferSize || 0;
        return sum + size;
      }, 0);
      
      return totalSize;
    };

    // Wait for resources to load
    setTimeout(() => {
      const bundleSize = calculateBundleSize();
      if (bundleSize > 0) {
        console.log(`[Performance] Approximate JS bundle size: ${(bundleSize / 1024).toFixed(2)}KB`);
      }
    }, 2000);
  }, []);

  // Only show in development and if metrics exist
  if (process.env.NODE_ENV !== 'development') return null;
  if (Object.keys(metrics).length === 0) return null;

  // Determine overall performance status
  const getPerformanceStatus = () => {
    const issues: string[] = [];
    if (metrics.lcp && metrics.lcp > 4000) issues.push('LCP slow');
    if (metrics.ttfb && metrics.ttfb > 800) issues.push('TTFB slow');
    if (metrics.cls !== undefined && metrics.cls > 0.1) issues.push('CLS high');
    if (metrics.fcp && metrics.fcp > 3000) issues.push('FCP slow');
    
    if (issues.length === 0) return { status: 'good', color: 'green-400' };
    if (issues.length <= 2) return { status: 'needs-improvement', color: 'yellow-400' };
    return { status: 'poor', color: 'red-400' };
  };

  const perfStatus = getPerformanceStatus();

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3 text-xs font-mono z-50 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Activity size={14} className={`text-${perfStatus.color}`} />
          <span className="text-white font-semibold">Performance</span>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] bg-${perfStatus.color}/20 text-${perfStatus.color}`}>
          {perfStatus.status.toUpperCase()}
        </div>
      </div>
      <div className="space-y-1 text-gray-300">
        {metrics.fcp && (
          <div className="flex justify-between">
            <span>FCP:</span>
            <span className={metrics.fcp < 1800 ? 'text-green-400' : metrics.fcp < 3000 ? 'text-yellow-400' : 'text-red-400'}>
              {metrics.fcp}ms
            </span>
          </div>
        )}
        {metrics.lcp && (
          <div className="flex justify-between">
            <span>LCP:</span>
            <span className={metrics.lcp < 2500 ? 'text-green-400' : metrics.lcp < 4000 ? 'text-yellow-400' : 'text-red-400'}>
              {metrics.lcp}ms
            </span>
          </div>
        )}
        {metrics.ttfb && (
          <div className="flex justify-between">
            <span>TTFB:</span>
            <span className={metrics.ttfb < 800 ? 'text-green-400' : 'text-yellow-400'}>
              {metrics.ttfb}ms
            </span>
          </div>
        )}
        {metrics.cls !== undefined && (
          <div className="flex justify-between">
            <span>CLS:</span>
            <span className={metrics.cls < 0.1 ? 'text-green-400' : 'text-red-400'}>
              {metrics.cls.toFixed(3)}
            </span>
          </div>
        )}
      </div>
      {/* Mobile-specific warning */}
      {typeof window !== 'undefined' && window.innerWidth < 768 && (
        <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-400">
          Mobile view - target: LCP &lt;2.5s, FCP &lt;1.8s
        </div>
      )}
    </div>
  );
};

