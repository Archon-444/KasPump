/**
 * Performance optimization utilities
 * Includes bundle size monitoring, lazy loading helpers, and performance metrics
 */

'use client';

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
  Array.from(document.querySelectorAll('script[src]')).forEach((script) => {
    const src = (script as HTMLScriptElement).src;
    // In production, this would fetch and measure actual sizes
    // For now, return estimated sizes
  });

  // Calculate style size
  Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach((link) => {
    const href = (link as HTMLLinkElement).href;
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
  const memory = (navigator as any).deviceMemory || 4;
  
  // Check connection (if available)
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const effectiveType = connection?.effectiveType || '4g';
  
  // Consider low-end if: < 4 cores, < 4GB RAM, or slow connection
  return cores < 4 || memory < 4 || (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g');
}

// Note: useLazyImage hook has been moved to src/hooks/useLazyImage.ts
// This keeps utility functions separate from React hooks

