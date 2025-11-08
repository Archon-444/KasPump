/**
 * Sentry Client Configuration
 * Tracks errors and performance in the browser
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,

  // Adjust sampling rates for production
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

  // Session replay for debugging
  replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0.5,
  replaysOnErrorSampleRate: 1.0,

  // Integrations
  integrations: [
    new Sentry.BrowserTracing({
      // Trace navigation and user interactions
      tracePropagationTargets: [
        'localhost',
        /^\//,  // Same origin
      ],
    }),
    new Sentry.Replay({
      // Mask sensitive data in session replays
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Before send hook - filter sensitive data
  beforeSend(event, hint) {
    // Don't send events in development (unless explicitly enabled)
    if (ENVIRONMENT === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
      return null;
    }

    // Filter out sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }

    // Filter private keys from context
    if (event.contexts?.wallet) {
      delete event.contexts.wallet.privateKey;
    }

    return event;
  },

  // Ignore common errors that aren't actionable
  ignoreErrors: [
    // Browser extensions
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    // Wallet connection cancellations
    'User rejected',
    'User denied',
    // Network errors (handled by app)
    'NetworkError',
    'Failed to fetch',
  ],
});
