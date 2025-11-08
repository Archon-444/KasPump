/**
 * Sentry Server Configuration
 * Tracks errors in API routes and server-side rendering
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,

  // Adjust sampling for server-side (higher than client)
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0,

  // Integrations
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],

  // Before send hook
  beforeSend(event, hint) {
    // Don't send in development
    if (ENVIRONMENT === 'development' && !process.env.SENTRY_DEBUG) {
      return null;
    }

    // Remove sensitive environment variables
    if (event.contexts?.runtime?.environment) {
      const env = event.contexts.runtime.environment;
      Object.keys(env).forEach(key => {
        if (
          key.includes('KEY') ||
          key.includes('SECRET') ||
          key.includes('TOKEN') ||
          key.includes('PASSWORD')
        ) {
          delete env[key];
        }
      });
    }

    return event;
  },

  // Ignore errors
  ignoreErrors: [
    // Contract expected errors
    'execution reverted',
    'insufficient funds',
    'user rejected transaction',
  ],
});
