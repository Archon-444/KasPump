/**
 * Hook for pull-to-refresh functionality on mobile
 * Provides haptic feedback and refresh callback
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Distance in pixels to trigger refresh
  enabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const isRefreshing = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const element = elementRef.current || document.documentElement;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger when at top of scrollable area
      if ((element === document.documentElement ? window.scrollY : (element as HTMLElement).scrollTop) !== 0) {
        return;
      }

      touchStartY = e.touches[0]!.clientY;
      startY.current = touchStartY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      if (isRefreshing.current) return;

      const currentY = e.touches[0]!.clientY;
      const distance = currentY - startY.current;

      // Only allow downward pull
      if (distance > 0) {
        const maxDistance = threshold * 2;
        const clampedDistance = Math.min(distance, maxDistance);
        
        setPullDistance(clampedDistance);
        setIsPulling(true);

        // Provide haptic feedback at threshold
        if (clampedDistance >= threshold && navigator.vibrate) {
          navigator.vibrate(10);
        }

        // Prevent default scrolling when pulling
        if (clampedDistance > 0) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (startY.current === null || !isPulling) {
        startY.current = null;
        return;
      }

      if (pullDistance >= threshold && !isRefreshing.current) {
        isRefreshing.current = true;
        
        // Haptic feedback for refresh trigger
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 50]);
        }

        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh error:', error);
        } finally {
          isRefreshing.current = false;
        }
      }

      // Reset state
      setIsPulling(false);
      setPullDistance(0);
      startY.current = null;
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onRefresh, threshold, isPulling, pullDistance]);

  return {
    elementRef,
    isPulling,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
    canRefresh: pullDistance >= threshold,
  };
};

