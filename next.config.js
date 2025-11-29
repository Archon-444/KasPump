/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers including Content Security Policy
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // Script sources
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              // Style sources
              "style-src 'self' 'unsafe-inline'",
              // Image sources - allow IPFS gateways and data URIs
              "img-src 'self' data: blob: https://ipfs.io https://gateway.ipfs.io https://gateway.pinata.cloud https://ipfs.filebase.io https://nftstorage.link https://dweb.link",
              // Font sources
              "font-src 'self' data:",
              // Connect sources - allow blockchain RPC endpoints and IPFS
              "connect-src 'self' https://*.bsc.nodereal.io https://*.nodereal.io https://bsc-dataseed.binance.org https://bsc-dataseed1.defibit.io https://bsc-dataseed1.ninicoin.io https://rpc.ankr.com https://arbitrum-mainnet.infura.io https://arb1.arbitrum.io https://base.llamarpc.com https://mainnet.base.org https://ipfs.io https://gateway.ipfs.io https://gateway.pinata.cloud https://api.pinata.cloud https://api.web3.storage https://api.nft.storage wss://*.bsc.nodereal.io wss://*.nodereal.io wss://bsc-dataseed.binance.org",
              // Frame sources - restrict to same origin only
              "frame-src 'self'",
              // Object sources - disallow plugins
              "object-src 'none'",
              // Base URI
              "base-uri 'self'",
              // Form action
              "form-action 'self'",
              // Frame ancestors - prevent clickjacking
              "frame-ancestors 'none'",
              // Upgrade insecure requests in production
              process.env.NODE_ENV === 'production' ? 'upgrade-insecure-requests' : '',
            ].filter(Boolean).join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
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
  // Turbopack config (Next.js 16+ default bundler)
  // Resolve aliases for optional dependencies that should not be bundled client-side
  turbopack: {
    resolveAlias: {
      '@react-native-async-storage/async-storage': { browser: '' },
      'pino-pretty': { browser: '' },
    },
  },
  // Webpack config (fallback for --webpack flag)
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
