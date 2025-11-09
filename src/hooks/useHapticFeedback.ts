/**
 * useHapticFeedback Hook
 * Provides haptic feedback (vibration) on mobile devices for enhanced UX
 *
 * Supports various vibration patterns for different interaction types.
 * Automatically detects device support for vibration API.
 *
 * @example
 * ```typescript
 * const { trigger, isSupported } = useHapticFeedback();
 *
 * // Trigger on button click
 * <Button onClick={() => trigger('light')}>Click me</Button>
 *
 * // Success feedback
 * if (success) trigger('success');
 *
 * // Check support before showing haptic options
 * {isSupported && <Toggle>Enable Haptics</Toggle>}
 * ```
 *
 * @returns Object with trigger function and isSupported boolean
 */

'use client';

import { useCallback } from 'react';

/**
 * Available haptic feedback patterns
 * - light: Quick, subtle vibration (10ms)
 * - medium: Standard vibration (20ms)
 * - heavy: Strong vibration (30ms)
 * - success: Double-pulse pattern for success actions
 * - error: Triple-pulse pattern for errors
 * - warning: Double-pulse pattern for warnings
 * - selection: Very brief vibration for selections (5ms)
 * - impact: Strong impact vibration (40ms)
 */
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

/**
 * Vibration patterns in milliseconds
 * Number: single vibration duration
 * Array: pattern of [vibrate, pause, vibrate, pause, ...]
 */
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

  /**
   * Triggers a haptic feedback vibration
   * @param pattern - The type of haptic pattern to trigger (default: 'medium')
   */
  const trigger = useCallback((pattern: HapticPattern = 'medium') => {
    if (!isSupported) return;

    const vibrationPattern = HAPTIC_PATTERNS[pattern];
    if (vibrationPattern !== undefined) {
      navigator.vibrate(vibrationPattern);
    }
  }, [isSupported]);

  return {
    /**
     * Function to trigger a haptic feedback pattern
     */
    trigger,
    /**
     * Whether the device supports vibration API
     */
    isSupported,
  };
};

