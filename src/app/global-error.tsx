'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-yellow-900 to-orange-900 p-4">
        <div className="max-w-md w-full glassmorphism rounded-2xl p-8 text-center">
          <div className="mb-6">
            <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Application Error</h1>
            <p className="text-gray-400 text-sm mb-4">
              {error.message || 'A critical error occurred'}
            </p>
            {error.digest && (
              <p className="text-gray-500 text-xs font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <button
            onClick={reset}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}

