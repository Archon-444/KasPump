/**
 * Optimized Image Component
 * Uses Next.js Image with lazy loading and fallback support
 * Optimized for mobile performance
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '../../utils';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallback?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 200,
  height = 200,
  className,
  fallback = '/icons/icon-192.png',
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  objectFit = 'cover',
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isError, setIsError] = useState(false);

  const handleError = () => {
    if (!isError && fallback) {
      setIsError(true);
      setImgSrc(fallback);
    }
  };

  // If src is empty or invalid, use fallback
  if (!src || src === '') {
    return (
      <div
        className={cn(
          'bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold',
          className
        )}
        style={{ width, height }}
      >
        {alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  // Check if it's an IPFS URL or external URL
  const isExternal = src.startsWith('http://') || src.startsWith('https://') || src.startsWith('ipfs://');

  if (isExternal) {
    return (
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={handleError}
        priority={priority}
        sizes={sizes}
        quality={85}
        loading={priority ? 'eager' : 'lazy'}
        style={{ objectFit }}
        unoptimized={src.startsWith('ipfs://')} // IPFS URLs may need special handling
      />
    );
  }

  // For local images, use Next.js Image
  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      priority={priority}
      sizes={sizes}
      quality={85}
      loading={priority ? 'eager' : 'lazy'}
      style={{ objectFit }}
    />
  );
};

