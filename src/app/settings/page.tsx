'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, Wallet, Bell, Shield, Palette, Save } from 'lucide-react';
import { useMultichainWallet } from '../../hooks/useMultichainWallet';
import { Card, Button, Input, Select } from '../../components/ui';
import { PushNotificationSettings } from '../../components/features/PushNotificationSettings';
import { cn } from '../../utils';
import { supportedChains, getDefaultChain, isTestnet } from '../../config/chains';
import { MobileNavigation } from '../../components/mobile';
import { z } from 'zod';

// Extended settings schema for this page
const ExtendedUserSettingsSchema = z.object({
  defaultChain: z.number().int().positive(),
  slippageTolerance: z.number().min(0.1).max(10),
  transactionDeadline: z.number().int().min(1).max(60),
  notifications: z.object({
    priceAlerts: z.boolean(),
    tradeConfirmations: z.boolean(),
    tokenGraduations: z.boolean(),
    platformUpdates: z.boolean(),
  }),
  privacy: z.object({
    showBalance: z.boolean(),
    showTrades: z.boolean(),
    analyticsOptIn: z.boolean(),
  }),
});

interface UserSettings {
  defaultChain: number;
  slippageTolerance: number;
  transactionDeadline: number;
  notifications: {
    priceAlerts: boolean;
    tradeConfirmations: boolean;
    tokenGraduations: boolean;
    platformUpdates: boolean;
  };
  privacy: {
    showBalance: boolean;
    showTrades: boolean;
    analyticsOptIn: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const wallet = useMultichainWallet();
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(() => {
    // Load from localStorage with validation
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('kaspump_settings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const validationResult = ExtendedUserSettingsSchema.safeParse(parsed);

          if (validationResult.success) {
            return validationResult.data;
          } else {
            console.warn('Invalid settings data in localStorage, using defaults:', validationResult.error);
            localStorage.removeItem('kaspump_settings');
          }
        } catch (e) {
          console.error('Failed to parse settings:', e);
          localStorage.removeItem('kaspump_settings');
        }
      }
    }
    return {
      defaultChain: getDefaultChain().id,
      slippageTolerance: 1.0,
      transactionDeadline: 20,
      notifications: {
        priceAlerts: true,
        tradeConfirmations: true,
        tokenGraduations: true,
        platformUpdates: false,
      },
      privacy: {
        showBalance: true,
        showTrades: false,
        analyticsOptIn: true,
      },
    };
  });

  // Mobile detection
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSave = () => {
    localStorage.setItem('kaspump_settings', JSON.stringify(settings));
    // Show success message
    alert('Settings saved successfully!');
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedSetting = <
    K extends keyof UserSettings,
    SK extends keyof UserSettings[K]
  >(
    category: K,
    key: SK,
    value: UserSettings[K][SK]
  ) => {
    setSettings(prev => {
      const categoryValue = prev[category];
      const isObject = categoryValue && typeof categoryValue === 'object' && !Array.isArray(categoryValue);
      return {
        ...prev,
        [category]: {
          ...(isObject ? categoryValue : {}),
          [key]: value,
        } as UserSettings[K],
      };
    });
  };

  const mainnetChains = supportedChains.filter(chain => !isTestnet(chain.id));

  return (
    <div className={cn('min-h-screen', isMobile && 'pb-20')}>
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <SettingsIcon className="text-yellow-400" size={24} />
              <h1 className="text-xl font-bold gradient-text">Settings</h1>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="flex items-center space-x-2"
            >
              <Save size={16} />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Wallet Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glassmorphism p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Wallet className="text-yellow-400" size={20} />
                <h2 className="text-lg font-semibold text-white">Wallet Settings</h2>
              </div>

              <div className="space-y-4">
                {/* Default Chain */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Chain
                  </label>
                  <Select
                    value={settings.defaultChain.toString()}
                    onChange={(value) => updateSetting('defaultChain', parseInt(value))}
                    options={mainnetChains.map(chain => ({
                      value: chain.id.toString(),
                      label: chain.name,
                    }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Chain to use by default for token creation and trading
                  </p>
                </div>

                {/* Connected Wallet Info */}
                {wallet.connected && wallet.address && (
                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white mb-1">Connected Wallet</div>
                        <div className="text-xs text-gray-400 font-mono">
                          {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (wallet.disconnectWallet) {
                            wallet.disconnectWallet();
                          } else {
                            console.warn('Disconnect function not available');
                          }
                        }}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Trading Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glassmorphism p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Palette className="text-blue-400" size={20} />
                <h2 className="text-lg font-semibold text-white">Trading Preferences</h2>
              </div>

              <div className="space-y-4">
                {/* Slippage Tolerance */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Slippage Tolerance (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.slippageTolerance.toString()}
                    onChange={(e) => updateSetting('slippageTolerance', parseFloat(e.target.value) || 1.0)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Maximum price slippage you're willing to accept
                  </p>
                </div>

                {/* Transaction Deadline */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Transaction Deadline (minutes)
                  </label>
                  <Input
                    type="number"
                    value={settings.transactionDeadline.toString()}
                    onChange={(e) => updateSetting('transactionDeadline', parseInt(e.target.value) || 20)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    How long to wait before transaction expires
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Push Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PushNotificationSettings />
          </motion.div>

          {/* In-App Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="glassmorphism p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Bell className="text-yellow-400" size={20} />
                <h2 className="text-lg font-semibold text-white">In-App Notifications</h2>
              </div>

              <div className="space-y-4">
                {Object.entries(settings.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {key.split(/(?=[A-Z])/).join(' ')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {key === 'priceAlerts' && 'Get notified when price alerts trigger'}
                        {key === 'tradeConfirmations' && 'Receive notifications for trade confirmations'}
                        {key === 'tokenGraduations' && 'Alert when your tokens graduate'}
                        {key === 'platformUpdates' && 'Platform news and updates'}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value as boolean}
                        onChange={(e) => updateNestedSetting('notifications', key as any, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Privacy Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glassmorphism p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Shield className="text-green-400" size={20} />
                <h2 className="text-lg font-semibold text-white">Privacy</h2>
              </div>

              <div className="space-y-4">
                {Object.entries(settings.privacy).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {key.split(/(?=[A-Z])/).join(' ')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {key === 'showBalance' && 'Display your balance in wallet UI'}
                        {key === 'showTrades' && 'Make your trades visible to others'}
                        {key === 'analyticsOptIn' && 'Help improve KasPump with anonymous analytics'}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value as boolean}
                        onChange={(e) => updateNestedSetting('privacy', key as any, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Reset Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glassmorphism p-6 border-red-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Reset Settings</h3>
                  <p className="text-sm text-gray-400">
                    Reset all settings to default values
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm('Are you sure you want to reset all settings?')) {
                      localStorage.removeItem('kaspump_settings');
                      window.location.reload();
                    }
                  }}
                >
                  Reset
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNavigation
          currentPage="profile"
          onNavigate={(page) => {
            if (page === 'home') router.push('/');
            else if (page === 'create') router.push('/');
            else if (page === 'profile') router.push('/portfolio');
          }}
        />
      )}
    </div>
  );
}

