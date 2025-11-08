/**
 * Sentry Edge Runtime Configuration
 * Tracks errors in middleware and edge functions
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,

  // Lower sampling for edge (high volume)
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.05 : 1.0,

  // Before send
  beforeSend(event) {
    if (ENVIRONMENT === 'development' && !process.env.SENTRY_DEBUG) {
      return null;
    }
    return event;
  },
});
