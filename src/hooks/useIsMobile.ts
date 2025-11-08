/**
 * useIsMobile Hook
 * Detects if the current device is mobile based on screen width
 *
 * REFACTORING: Replaces duplicated mobile detection code across 5+ pages
 * - page.tsx
 * - portfolio/page.tsx
 * - creator/page.tsx
 * - analytics/page.tsx
 * - favorites/page.tsx
 *
 * Usage:
 * ```typescript
 * const isMobile = useIsMobile();
 * const isMobile = useIsMobile(1024); // Custom breakpoint
 * ```
 *
 * @param breakpoint - Screen width breakpoint in pixels (default: 768)
 * @returns boolean - true if screen width is below breakpoint
 */

import { useState, useEffect } from 'react';

const DEFAULT_BREAKPOINT = 768; // px - Standard mobile breakpoint

export function useIsMobile(breakpoint: number = DEFAULT_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Initial check
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

/**
 * useBreakpoint Hook
 * More granular breakpoint detection
 *
 * Usage:
 * ```typescript
 * const breakpoint = useBreakpoint();
 * if (breakpoint === 'mobile') { ... }
 * ```
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;

      if (width < 640) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else if (width < 1536) {
        setBreakpoint('desktop');
      } else {
        setBreakpoint('wide');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);

    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * useMediaQuery Hook
 * Generic media query hook for custom breakpoints
 *
 * Usage:
 * ```typescript
 * const matches = useMediaQuery('(min-width: 1280px)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Initial check
    setMatches(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
}

/**
 * useWindowSize Hook
 * Returns current window dimensions
 *
 * Usage:
 * ```typescript
 * const { width, height } = useWindowSize();
 * ```
 */
export interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}
