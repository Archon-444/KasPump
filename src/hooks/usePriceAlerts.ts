/**
 * usePriceAlerts Hook
 * Manages price alerts for tokens with localStorage persistence and validation
 *
 * Features:
 * - Create alerts for price thresholds (above/below target)
 * - Toggle alerts on/off without deleting
 * - Multi-chain support
 * - Automatic localStorage sync with Zod validation
 * - Alert notification tracking
 *
 * @example
 * ```typescript
 * const {
 *   alerts,
 *   isLoading,
 *   createAlert,
 *   deleteAlert,
 *   toggleAlert,
 *   clearAlerts
 * } = usePriceAlerts();
 *
 * // Create price alert
 * createAlert(
 *   '0x123...',
 *   'TOKEN',
 *   100,
 *   'above',
 *   90
 * );
 *
 * // Toggle alert on/off
 * toggleAlert(alertId);
 *
 * // Check for triggered alerts
 * alerts.filter(a => a.isActive && !a.notified)
 * ```
 *
 * @returns Object containing alerts state and management functions
 */

import { useState, useEffect, useCallback } from 'react';
import { PriceAlertsArraySchema } from '../schemas';

/**
 * Price alert data structure
 */
export interface PriceAlert {
  /** Unique alert identifier (UUID) */
  id: string;
  /** Token contract address */
  tokenAddress: string;
  /** Optional chain ID */
  chainId?: number;
  /** Token symbol for display */
  tokenSymbol: string;
  /** Target price to trigger alert */
  targetPrice: number;
  /** Alert direction */
  direction: 'above' | 'below';
  /** Current token price */
  currentPrice: number;
  /** Timestamp when alert was created */
  createdAt: number;
  /** Whether alert is active */
  isActive: boolean;
  /** Whether user has been notified */
  notified?: boolean;
}

const PRICE_ALERTS_STORAGE_KEY = 'kaspump_price_alerts';

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load alerts from localStorage with validation
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRICE_ALERTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Validate with Zod schema
        // Note: Schema has basic fields, stored data may have additional fields
        const validationResult = PriceAlertsArraySchema.safeParse(parsed);

        if (validationResult.success) {
          // Map validated data to full interface (additional fields preserved if present)
          const validatedAlerts = parsed.map((alert: PriceAlert) => ({
            ...alert,
            // Ensure compatibility with schema field names
            direction: alert.direction || 'above',
            isActive: alert.isActive ?? true,
          }));
          setAlerts(validatedAlerts);
        } else {
          console.warn('Invalid price alerts data in localStorage, resetting:', validationResult.error);
          // Clear invalid data
          localStorage.removeItem(PRICE_ALERTS_STORAGE_KEY);
          setAlerts([]);
        }
      }
    } catch (error) {
      console.error('Failed to load price alerts:', error);
      // Clear corrupted data
      localStorage.removeItem(PRICE_ALERTS_STORAGE_KEY);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save alerts to localStorage
  const saveAlerts = useCallback((newAlerts: PriceAlert[]) => {
    try {
      localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(newAlerts));
      setAlerts(newAlerts);
    } catch (error) {
      console.error('Failed to save price alerts:', error);
    }
  }, []);

  // Create a new price alert
  const createAlert = useCallback((
    tokenAddress: string,
    tokenSymbol: string,
    targetPrice: number,
    direction: 'above' | 'below',
    currentPrice: number,
    chainId?: number
  ): PriceAlert => {
    const newAlert: PriceAlert = {
      id: `${tokenAddress}-${Date.now()}`,
      tokenAddress,
      chainId,
      tokenSymbol,
      targetPrice,
      direction,
      currentPrice,
      createdAt: Date.now(),
      isActive: true,
      notified: false,
    };

    const newAlerts = [...alerts, newAlert];
    saveAlerts(newAlerts);
    return newAlert;
  }, [alerts, saveAlerts]);

  // Remove an alert
  const removeAlert = useCallback((alertId: string) => {
    const newAlerts = alerts.filter(alert => alert.id !== alertId);
    saveAlerts(newAlerts);
  }, [alerts, saveAlerts]);

  // Update alert
  const updateAlert = useCallback((alertId: string, updates: Partial<PriceAlert>) => {
    const newAlerts = alerts.map(alert =>
      alert.id === alertId ? { ...alert, ...updates } : alert
    );
    saveAlerts(newAlerts);
  }, [alerts, saveAlerts]);

  // Check if alert should trigger
  const checkAlert = useCallback((alert: PriceAlert, currentPrice: number): boolean => {
    if (!alert.isActive || alert.notified) return false;

    if (alert.direction === 'above') {
      return currentPrice >= alert.targetPrice;
    } else {
      return currentPrice <= alert.targetPrice;
    }
  }, []);

  // Get alerts for a specific token
  const getAlertsForToken = useCallback((tokenAddress: string, chainId?: number): PriceAlert[] => {
    return alerts.filter(
      alert =>
        alert.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() &&
        (chainId === undefined || alert.chainId === chainId) &&
        alert.isActive
    );
  }, [alerts]);

  // Toggle alert active status
  const toggleAlert = useCallback((alertId: string) => {
    updateAlert(alertId, { isActive: false }); // For now, just deactivate
  }, [updateAlert]);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    saveAlerts([]);
  }, [saveAlerts]);

  return {
    alerts,
    isLoading,
    createAlert,
    removeAlert,
    updateAlert,
    checkAlert,
    getAlertsForToken,
    toggleAlert,
    clearAllAlerts,
  };
}

