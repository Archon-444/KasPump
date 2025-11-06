'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../components/ui';
import { useRouter } from 'next/navigation';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
      <div className="max-w-md w-full glassmorphism rounded-2xl p-8 text-center">
        <div className="mb-6">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong!</h1>
          <p className="text-gray-400 text-sm mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <p className="text-gray-500 text-xs font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            variant="primary"
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Try Again
          </Button>
          <Button
            onClick={() => router.push('/')}
            variant="secondary"
            className="flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

