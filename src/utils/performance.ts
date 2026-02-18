/**
 * Performance optimization utilities
 * Includes bundle size monitoring, lazy loading helpers, and performance metrics
 */

'use client';

/**
 * Extended Navigator interface with experimental features
 */
interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

/**
 * Network Information API interface
 */
interface NetworkInformation {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  [key: string]: unknown;
}

/**
 * Get current bundle size information (client-side only)
 */
export function getBundleSize(): {
  scripts: number;
  styles: number;
  total: number;
} {
  if (typeof window === 'undefined') {
    return { scripts: 0, styles: 0, total: 0 };
  }

  let scripts = 0;
  let styles = 0;

  // Calculate script size
  Array.from(document.querySelectorAll('script[src]')).forEach(() => {
    // In production, this would fetch and measure actual sizes
    // For now, return estimated sizes
  });

  // Calculate style size
  Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(() => {
    // In production, this would fetch and measure actual sizes
  });

  return { scripts, styles, total: scripts + styles };
}

/**
 * Measure component render time
 */
export function measureRenderTime<T>(
  componentName: string,
  renderFn: () => T
): T {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return renderFn();
  }

  const start = performance.now();
  const result = renderFn();
  const end = performance.now();
  
  const renderTime = end - start;
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
  }

  // Report to analytics in production
  if (process.env.NODE_ENV === 'production' && renderTime > 100) {
    // Would send to analytics service
    console.warn(`[Performance Warning] ${componentName} took ${renderTime.toFixed(2)}ms to render`);
  }

  return result;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if device is low-end (for performance optimizations)
 */
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined' || !('navigator' in window)) {
    return false;
  }

  // Check hardware concurrency
  const cores = navigator.hardwareConcurrency || 2;

  // Check device memory (if available)
  const nav = navigator as ExtendedNavigator;
  const memory = nav.deviceMemory || 4;

  // Check connection (if available)
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  const effectiveType = connection?.effectiveType || '4g';
  
  // Consider low-end if: < 4 cores, < 4GB RAM, or slow connection
  return cores < 4 || memory < 4 || (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g');
}

// Note: useLazyImage hook has been moved to src/hooks/useLazyImage.ts
// This keeps utility functions separate from React hooks

