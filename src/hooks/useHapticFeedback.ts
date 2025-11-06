/**
 * Hook for haptic feedback on mobile devices
 * Provides different vibration patterns for various actions
 */

'use client';

import { useCallback } from 'react';

export type HapticPattern = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'success' 
  | 'error' 
  | 'warning'
  | 'selection'
  | 'impact';

interface HapticPatterns {
  [key: string]: number | number[];
}

const HAPTIC_PATTERNS: HapticPatterns = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [50, 30, 50],
  error: [100, 50, 100, 50, 100],
  warning: [50, 100, 50],
  selection: 5,
  impact: 40,
};

export const useHapticFeedback = () => {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const trigger = useCallback((pattern: HapticPattern = 'medium') => {
    if (!isSupported) return;

    const vibrationPattern = HAPTIC_PATTERNS[pattern];
    if (vibrationPattern !== undefined) {
      navigator.vibrate(vibrationPattern);
    }
  }, [isSupported]);

  return {
    trigger,
    isSupported,
  };
};

