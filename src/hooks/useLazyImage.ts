/**
 * Hook for lazy loading images with Intersection Observer
 * Optimizes mobile performance by loading images only when visible
 */

'use client';

import { useState, useEffect, useRef } from 'react';

export function useLazyImage(
  src: string,
  fallback?: string
): {
  ref: (node: HTMLImageElement | null) => void;
  src: string | undefined;
  isLoading: boolean;
  error: boolean;
} {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | undefined>(fallback);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!imgRef.current || !('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoading(false);
      };
      img.onerror = () => {
        setError(true);
        if (fallback) {
          setImageSrc(fallback);
        }
        setIsLoading(false);
      };
      img.src = src;
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && isLoading) {
            const img = new Image();
            img.onload = () => {
              setImageSrc(src);
              setIsLoading(false);
              setError(false);
            };
            img.onerror = () => {
              setError(true);
              if (fallback) {
                setImageSrc(fallback);
              }
              setIsLoading(false);
            };
            img.src = src;
            
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      { 
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01 
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [src, fallback, isLoading]);

  return {
    ref: (node: HTMLImageElement | null) => {
      imgRef.current = node;
    },
    src: imageSrc,
    isLoading,
    error,
  };
}

