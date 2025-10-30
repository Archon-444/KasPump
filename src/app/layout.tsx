import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '../providers/Web3Provider';

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
      <body className={inter.className}>
        <Web3Provider>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
            {children}
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
