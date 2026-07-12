/**
 * API endpoint for push notification subscription
 * Stores subscription in database for server-side push notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, 'strict');
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers });
  }

  try {
    const body = await request.json();
    const { subscription, userId, preferences } = body ?? {};

    // A Web Push subscription is { endpoint: https URL, keys: { p256dh, auth } }.
    // Validate the shape so we don't persist junk (or an attacker-supplied
    // non-push endpoint we'd later POST to).
    if (
      !subscription ||
      typeof subscription.endpoint !== 'string' ||
      !isHttpsUrl(subscription.endpoint) ||
      !subscription.keys ||
      typeof subscription.keys.p256dh !== 'string' ||
      typeof subscription.keys.auth !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }
    if (userId !== undefined && typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }
    if (preferences !== undefined && (typeof preferences !== 'object' || preferences === null)) {
      return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 });
    }

    // TODO: Store subscription in database
    // Example:
    // await db.pushSubscriptions.create({
    //   endpoint: subscription.endpoint,
    //   userId: userId,
    //   subscription: JSON.stringify(subscription),
    //   preferences: preferences,
    //   createdAt: new Date(),
    // });

    console.log('[Push] Subscription received:', {
      endpoint: subscription.endpoint,
      userId,
      preferences,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription saved successfully',
    });
  } catch (error: any) {
    console.error('[Push] Subscription error:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const rl = await rateLimit(request, 'strict');
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers });
  }

  try {
    const body = await request.json();
    const { endpoint } = body ?? {};

    if (typeof endpoint !== 'string' || !isHttpsUrl(endpoint)) {
      return NextResponse.json({ error: 'Valid endpoint required' }, { status: 400 });
    }

    // TODO: Remove subscription from database
    // Example:
    // await db.pushSubscriptions.delete({
    //   endpoint: endpoint,
    // });

    console.log('[Push] Unsubscription:', { endpoint });

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully',
    });
  } catch (error: any) {
    console.error('[Push] Unsubscription error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}

