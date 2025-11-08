import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { AnalyticsEventSchema, AnalyticsEventsArraySchema } from '@/schemas';

// Analytics events collection endpoint
export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting - 100 events per minute
  const rateLimitResult = await rateLimit(request, 'analytics');
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: rateLimitResult.headers['Retry-After'],
      },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  try {
    const body = await request.json();

    // Handle both single event and batch events
    const events = body.events || [body];

    // SECURITY: Validate events with Zod
    const parseResult = AnalyticsEventsArraySchema.safeParse(events);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid event data', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const validatedEvents = parseResult.data;

    // In production, this would:
    // 1. ✅ Validate events (done with Zod)
    // 2. Store in database (PostgreSQL/ClickHouse for analytics)
    // 3. Send to analytics service (Mixpanel, PostHog, etc.)
    // 4. Trigger real-time alerts for critical events

    console.log('📊 Analytics Events Received:', {
      count: validatedEvents.length,
      events: validatedEvents.map((e) => ({
        event: e.event,
        category: e.properties?.category,
        userId: e.userId,
        timestamp: new Date(e.timestamp).toISOString()
      }))
    });

    // Process each event
    for (const event of validatedEvents) {
      await processAnalyticsEvent(event);
    }

    return NextResponse.json({
      success: true,
      processed: validatedEvents.length,
      message: 'Events processed successfully'
    });

  } catch (error) {
    console.error('Analytics Events Error:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics events' },
      { status: 500 }
    );
  }
}

async function processAnalyticsEvent(event: any) {
  // Event validation
  if (!event.event || !event.timestamp || !event.sessionId) {
    console.warn('Invalid analytics event:', event);
    return;
  }

  // Log different event types for development
  switch (event.properties?.category) {
    case 'token_lifecycle':
      console.log(`🎯 Token Event: ${event.event}`, {
        tokenAddress: event.properties.tokenAddress,
        creator: event.properties.creator
      });
      break;
      
    case 'trading':
      console.log(`💱 Trading Event: ${event.event}`, {
        action: event.properties.action,
        amount: event.properties.amount,
        tokenAddress: event.properties.tokenAddress
      });
      break;
      
    case 'revenue':
      console.log(`💰 Revenue Event: ${event.event}`, {
        source: event.properties.source,
        amount: event.properties.amount,
        currency: event.properties.currency
      });
      break;
      
    case 'partnership':
      console.log(`🤝 Partnership Event: ${event.event}`, {
        partner: event.properties.partner,
        action: event.properties.action
      });
      break;
      
    case 'error':
      console.error(`❌ Error Event: ${event.event}`, {
        errorMessage: event.properties.errorMessage,
        context: event.properties
      });
      break;
      
    default:
      console.log(`📝 General Event: ${event.event}`, event.properties);
  }

  // In production, store in database:
  // await storeEvent(event);
  
  // Send to external analytics service:
  // await sendToMixpanel(event);
  
  // Trigger alerts for critical events:
  // if (event.event === 'error_occurred') {
  //   await sendAlert(event);
  // }
}

// Placeholder for database storage
async function storeEvent(event: any) {
  // Would store in database table like:
  // INSERT INTO analytics_events (event_name, properties, user_id, session_id, timestamp)
  // VALUES (?, ?, ?, ?, ?)
}

// Placeholder for external analytics service
async function sendToMixpanel(event: any) {
  // Would send to external service for advanced analytics
}

// Placeholder for alerting system
async function sendAlert(event: any) {
  // Would send alerts for critical events (errors, security issues, etc.)
}