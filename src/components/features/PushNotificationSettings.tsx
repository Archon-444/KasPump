/**
 * Component for managing push notification settings
 * Allows users to enable/disable notifications and configure preferences
 */

'use client';

import React, { useState } from 'react';
import { Bell, BellOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, Button } from '../ui';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { cn } from '../../utils';

export interface PushNotificationSettingsProps {
  className?: string;
}

export const PushNotificationSettings: React.FC<PushNotificationSettingsProps> = ({
  className
}) => {
  const {
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    isSubscribed,
  } = usePushNotifications();

  const [loading, setLoading] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({
    priceAlerts: true,
    tradeUpdates: true,
    newTokens: false,
    socialActivity: false,
  });

  const handleToggleSubscription = async () => {
    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        if (permission.status !== 'granted') {
          const granted = await requestPermission();
          if (!granted) {
            alert('Notification permission is required to enable push notifications');
            setLoading(false);
            return;
          }
        }
        await subscribe();
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      alert('Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      await requestPermission();
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!permission.isSupported) {
    return (
      <Card className={cn('glassmorphism p-6', className)}>
        <div className="flex items-center space-x-3 text-gray-400">
          <BellOff size={20} />
          <div>
            <div className="font-semibold text-white mb-1">Push Notifications Not Supported</div>
            <div className="text-sm">
              Your browser does not support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('glassmorphism p-6', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="text-purple-400" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-white">Push Notifications</h3>
              <p className="text-sm text-gray-400">
                Get notified about price changes and trade updates
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={cn(
            'px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1',
            permission.status === 'granted' && isSubscribed
              ? 'bg-green-500/20 text-green-400'
              : permission.status === 'denied'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-yellow-500/20 text-yellow-400'
          )}>
            {permission.status === 'granted' && isSubscribed ? (
              <>
                <CheckCircle size={12} />
                <span>Enabled</span>
              </>
            ) : permission.status === 'denied' ? (
              <>
                <AlertCircle size={12} />
                <span>Blocked</span>
              </>
            ) : (
              <>
                <BellOff size={12} />
                <span>Disabled</span>
              </>
            )}
          </div>
        </div>

        {/* Permission Status */}
        {permission.status === 'default' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-yellow-400 mb-1">
                  Notification Permission Required
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  Allow notifications to receive alerts about price changes and trade updates
                </div>
                <Button
                  onClick={handleRequestPermission}
                  disabled={loading}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Enable Notifications
                </Button>
              </div>
            </div>
          </div>
        )}

        {permission.status === 'denied' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-400 mb-1">
                  Notifications Blocked
                </div>
                <div className="text-xs text-gray-400">
                  Notifications are blocked in your browser settings. Please enable them in your browser preferences.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Toggle */}
        {permission.status === 'granted' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
              <div>
                <div className="font-semibold text-white mb-1">Push Notifications</div>
                <div className="text-sm text-gray-400">
                  {isSubscribed 
                    ? 'You will receive push notifications for selected events'
                    : 'Enable push notifications to receive alerts'}
                </div>
              </div>
              <Button
                onClick={handleToggleSubscription}
                disabled={loading}
                variant={isSubscribed ? 'outline' : 'primary'}
                size="sm"
              >
                {loading ? 'Loading...' : isSubscribed ? 'Disable' : 'Enable'}
              </Button>
            </div>

            {/* Notification Preferences */}
            {isSubscribed && (
              <div className="space-y-3 pt-4 border-t border-gray-700/50">
                <div className="text-sm font-semibold text-gray-300 mb-3">Notification Preferences</div>
                
                {Object.entries(notificationPreferences).map(([key, value]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-white capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {key === 'priceAlerts' && 'Get notified when token prices hit your target'}
                        {key === 'tradeUpdates' && 'Receive updates on your trade status'}
                        {key === 'newTokens' && 'Get notified about new token launches'}
                        {key === 'socialActivity' && 'Receive notifications for likes, comments, and shares'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setNotificationPreferences({
                        ...notificationPreferences,
                        [key]: e.target.checked,
                      })}
                      className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

