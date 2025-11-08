/**
 * Next.js Instrumentation
 * Initializes monitoring and observability tools
 *
 * This file is automatically loaded by Next.js before the app starts
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry for server-side error tracking
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialize Sentry for edge runtime
    await import('./sentry.edge.config');
  }

  // Log initialization (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Instrumentation initialized');
  }
}
