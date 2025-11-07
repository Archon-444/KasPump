import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProviders } from '../components/providers/AppProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KasPump - BSC Meme Coin Launchpad',
  description: 'Launch and trade meme coins instantly on BNB Smart Chain (BSC). No presale, no team allocation - fair launch for everyone.',
  keywords: ['BSC', 'BNB Chain', 'Binance Smart Chain', 'meme coins', 'DeFi', 'crypto', 'bonding curve', 'token launch'],
  authors: [{ name: 'KasPump Team' }],
  openGraph: {
    title: 'KasPump - BSC Meme Coin Launchpad',
    description: 'Launch and trade meme coins instantly on BNB Smart Chain (BSC)',
    url: 'https://kaspump.io',
    siteName: 'KasPump',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'KasPump - BSC Meme Coin Launchpad',
      },
    ],
    locale: 'en-US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KasPump - BSC Meme Coin Launchpad',
    description: 'Launch and trade meme coins on BNB Smart Chain (BSC)',
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
        {/* Note: Service workers should not be preloaded - they are registered asynchronously */}
        
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
