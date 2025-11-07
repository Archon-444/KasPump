/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: 'gateway.ipfs.io' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
      { protocol: 'https', hostname: 'ipfs.filebase.io' },
      { protocol: 'https', hostname: 'nftstorage.link' },
      { protocol: 'https', hostname: 'dweb.link' },
    ],
    // Optimize images for mobile
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimum quality for compression
    minimumCacheTTL: 60,
    // Disable static image optimization in development
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Webpack config to ignore optional dependencies and optimize for mobile
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'pino-pretty': false,
      };
      
      // Code splitting optimizations
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for heavy libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
              maxSize: 200000, // ~200KB chunks for better mobile performance
              minSize: 20000, // Minimum chunk size
            },
            // Separate chunk for ethers.js (large library)
            ethers: {
              name: 'ethers',
              test: /[\\/]node_modules[\\/](ethers|@ethersproject)[\\/]/,
              chunks: 'all',
              priority: 35,
              maxSize: 300000, // Ethers is large, allow bigger chunk
            },
            // Separate chunk for chart libraries
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](lightweight-charts|recharts)[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // Separate chunk for framer-motion
            animations: {
              name: 'animations',
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              chunks: 'all',
              priority: 25,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    // Optimize package imports
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Compression
  compress: true,
  // Output standalone for better deployment
  output: 'standalone',
  // Power optimization
  poweredByHeader: false,
  // React strict mode for better performance
  reactStrictMode: true,
  // Note: NEXT_PUBLIC_* variables from .env.local are automatically exposed by Next.js
  // No need to define them in the env section
}

module.exports = nextConfig;
