/**
 * Hook for managing push notifications on mobile devices
 * Supports Web Push API for price alerts, trade updates, and platform notifications
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

type PermissionValue = NotificationPermission | null;

interface NotificationActionOption {
  action: string;
  title: string;
  icon?: string;
}

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
  actions?: NotificationActionOption[];
}

export interface PushPermissionState {
  status: PermissionValue;
  isSupported: boolean;
  canRequest: boolean;
}

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<PushPermissionState>({
    status: null,
    isSupported: false,
    canRequest: false,
  });
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Check browser support and current permission status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
    const currentPermission: PermissionValue = isSupported ? Notification.permission : null;
    const canRequest = currentPermission === 'default' || currentPermission === null;

    setPermission({
      status: currentPermission,
      isSupported,
      canRequest,
    });

    // Check for existing subscription
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager?.getSubscription().then((sub) => {
          setSubscription(sub);
        });
      });
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!permission.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission({
        ...permission,
        status: result,
        canRequest: result === 'default',
      });
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [permission]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!permission.isSupported || permission.status !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID public key (should be in environment variables)
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured');
        return null;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      setSubscription(subscription);
      
      // Send subscription to backend (would need API endpoint)
      // await fetch('/api/push/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(subscription),
      // });

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }, [permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;

    try {
      const unsubscribed = await subscription.unsubscribe();
      if (unsubscribed) {
        setSubscription(null);
        
        // Notify backend (would need API endpoint)
        // await fetch('/api/push/unsubscribe', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ endpoint: subscription.endpoint }),
        // });
      }
      return unsubscribed;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }, [subscription]);

  // Show local notification (for immediate notifications)
  const showNotification = useCallback((options: PushNotificationOptions) => {
    if (!permission.isSupported || permission.status !== 'granted' || typeof Notification === 'undefined') {
      console.warn('Cannot show notification: permission not granted');
      return null;
    }

    try {
      const notificationOptions: NotificationOptions = {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-192x192.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        data: options.data,
      };

      // Notification API in some environments doesn't support actions, so guard with cast.
      if (options.actions && options.actions.length > 0) {
        (notificationOptions as NotificationOptions & { actions?: NotificationActionOption[] }).actions = options.actions;
      }

      const notification = new Notification(options.title, notificationOptions);

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 5000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [permission]);

  // Show price alert notification
  const showPriceAlert = useCallback((tokenSymbol: string, currentPrice: number, targetPrice: number, direction: 'above' | 'below') => {
    const reached = direction === 'above' ? currentPrice >= targetPrice : currentPrice <= targetPrice;
    const emoji = reached ? '🚀' : '📊';
    
    return showNotification({
      title: `${emoji} Price Alert: ${tokenSymbol}`,
      body: `Price ${reached ? 'reached' : 'is approaching'} ${direction === 'above' ? 'above' : 'below'} ${targetPrice.toFixed(8)} KAS`,
      tag: `price-alert-${tokenSymbol}`,
      data: { type: 'price-alert', tokenSymbol, currentPrice, targetPrice },
    });
  }, [showNotification]);

  // Show trade update notification
  const showTradeUpdate = useCallback((type: 'buy' | 'sell', tokenSymbol: string, amount: number, status: 'pending' | 'success' | 'failed') => {
    const emoji = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⏳';
    const statusText = status === 'success' ? 'completed' : status === 'failed' ? 'failed' : 'pending';
    
    return showNotification({
      title: `${emoji} Trade ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
      body: `${type.toUpperCase()} ${amount} ${tokenSymbol} ${statusText}`,
      tag: `trade-${type}-${tokenSymbol}`,
      requireInteraction: status === 'failed',
      data: { type: 'trade-update', tradeType: type, tokenSymbol, amount, status },
      actions: status === 'failed' ? [
        { action: 'retry', title: 'Retry' },
        { action: 'view', title: 'View Details' },
      ] : undefined,
    });
  }, [showNotification]);

  return {
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    showPriceAlert,
    showTradeUpdate,
    isSubscribed: subscription !== null,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
