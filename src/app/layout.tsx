import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProviders } from '../components/providers/AppProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KasPump - Multichain Meme Coin Launchpad',
  description: 'Launch and trade meme coins instantly on BSC, Arbitrum, and Base. No presale, no team allocation - fair launch for everyone.',
  keywords: ['BSC', 'Arbitrum', 'Base', 'meme coins', 'DeFi', 'crypto', 'bonding curve', 'token launch', 'multichain'],
  authors: [{ name: 'KasPump Team' }],
  openGraph: {
    title: 'KasPump - Multichain Meme Coin Launchpad',
    description: 'Launch and trade meme coins instantly on BSC, Arbitrum, and Base',
    url: 'https://kaspump.io',
    siteName: 'KasPump',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'KasPump - Multichain Meme Coin Launchpad',
      },
    ],
    locale: 'en-US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KasPump - Multichain Meme Coin Launchpad',
    description: 'Launch and trade meme coins on BSC, Arbitrum, and Base',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Add your Google Search Console verification
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* DNS Prefetch for external resources */}
        <link rel="dns-prefetch" href="https://ipfs.io" />
        <link rel="dns-prefetch" href="https://gateway.pinata.cloud" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/manifest.json" as="manifest" />
        <link rel="preload" href="/sw.js" as="script" />
        
        {/* Resource hints for faster navigation */}
        <link rel="prefetch" href="/portfolio" />
        <link rel="prefetch" href="/analytics" />
        <link rel="prefetch" href="/creator" />
      </head>
      <body className={inter.className}>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
