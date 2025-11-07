/**
 * PWA Install Banner Component
 * Shows smart install prompt after 2+ page views
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Button } from '../ui';
import { cn } from '../../utils';

export const PWAInstallBanner: React.FC<{ className?: string }> = ({ className }) => {
  const { showPrompt, install, dismissPrompt, isStandalone } = usePWAInstall();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't show if already installed or not mounted
  if (!mounted || isStandalone || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md',
            'bg-gradient-to-r from-yellow-600 to-orange-600',
            'rounded-xl shadow-2xl border-2 border-yellow-400/30',
            'p-4 mobile-safe-area',
            className
          )}
        >
          <div className="flex items-start space-x-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg mb-1">
                Install KasPump
              </h3>
              <p className="text-white/90 text-sm mb-3">
                Get faster access, offline support, and push notifications for price alerts!
              </p>

              {/* Buttons */}
              <div className="flex space-x-2">
                <Button
                  onClick={install}
                  className="flex-1 bg-white text-yellow-600 hover:bg-gray-100 font-semibold min-h-[44px]"
                  icon={<Download size={18} />}
                >
                  Install Now
                </Button>
                <button
                  onClick={dismissPrompt}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Dismiss"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Benefits list (collapsed by default, expandable) */}
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="grid grid-cols-3 gap-2 text-xs text-white/80">
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                <span>Offline Access</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                <span>Faster Loading</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                <span>Price Alerts</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

