'use client';

import Link from 'next/link';
import { Home, Search } from 'lucide-react';
import { Button } from '../components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-yellow-900 to-orange-900 p-4">
      <div className="max-w-md w-full glassmorphism rounded-2xl p-8 text-center">
        <div className="mb-6">
          <div className="text-6xl font-bold text-yellow-500 mb-4">404</div>
          <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
          <p className="text-gray-400 text-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="primary" className="w-full sm:w-auto flex items-center justify-center gap-2">
              <Home size={16} />
              Go Home
            </Button>
          </Link>
          <Link href="/portfolio">
            <Button variant="secondary" className="w-full sm:w-auto flex items-center justify-center gap-2">
              <Search size={16} />
              Browse Tokens
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

