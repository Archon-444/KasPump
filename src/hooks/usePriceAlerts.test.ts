/**
 * Tests for usePriceAlerts hook
 * Tests price alert management, localStorage persistence, and validation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePriceAlerts, PriceAlert } from './usePriceAlerts';

describe('usePriceAlerts', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty alerts', () => {
      const { result } = renderHook(() => usePriceAlerts());

      expect(result.current.alerts).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should load alerts from localStorage on mount', async () => {
      const storedAlerts = [
        {
          id: 'alert-1',
          tokenAddress: '0x123',
          chainId: 56,
          tokenSymbol: 'TOKEN',
          targetPrice: 100,
          direction: 'above' as const,
          currentPrice: 90,
          createdAt: Date.now(),
          isActive: true,
          notified: false,
        },
      ];
      localStorage.setItem('kaspump_price_alerts', JSON.stringify(storedAlerts));

      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].tokenSymbol).toBe('TOKEN');
    });

    it('should handle invalid localStorage data gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('kaspump_price_alerts', 'invalid json');

      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.alerts).toEqual([]);
      expect(localStorage.getItem('kaspump_price_alerts')).toBeNull();

      consoleWarnSpy.mockRestore();
    });

    it('should clear corrupted data and reset to empty', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('kaspump_price_alerts', '{broken json');

      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.alerts).toEqual([]);
      expect(localStorage.getItem('kaspump_price_alerts')).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Creating Alerts', () => {
    it('should create a new price alert (above)', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let newAlert: PriceAlert | undefined;

      act(() => {
        newAlert = result.current.createAlert(
          '0xABC123',
          'TOKEN',
          100,
          'above',
          90,
          56
        );
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(newAlert).toBeDefined();
      expect(newAlert!.tokenAddress).toBe('0xABC123');
      expect(newAlert!.tokenSymbol).toBe('TOKEN');
      expect(newAlert!.targetPrice).toBe(100);
      expect(newAlert!.direction).toBe('above');
      expect(newAlert!.currentPrice).toBe(90);
      expect(newAlert!.chainId).toBe(56);
      expect(newAlert!.isActive).toBe(true);
      expect(newAlert!.notified).toBe(false);
    });

    it('should create a new price alert (below)', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let newAlert: PriceAlert | undefined;

      act(() => {
        newAlert = result.current.createAlert(
          '0xDEF456',
          'TOKEN2',
          50,
          'below',
          60,
          97
        );
      });

      expect(newAlert!.direction).toBe('below');
      expect(newAlert!.targetPrice).toBe(50);
      expect(newAlert!.currentPrice).toBe(60);
    });

    it('should generate unique alert IDs', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let alert1: PriceAlert;
      let alert2: PriceAlert;

      act(() => {
        alert1 = result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
      });

      act(() => {
        alert2 = result.current.createAlert('0x123', 'TOKEN', 200, 'below', 210);
      });

      expect(alert1.id).not.toBe(alert2.id);
    });

    it('should persist alerts to localStorage when creating', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
      });

      const stored = localStorage.getItem('kaspump_price_alerts');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].tokenSymbol).toBe('TOKEN');
    });

    it('should create alerts without chainId (cross-chain)', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let alert: PriceAlert;

      act(() => {
        alert = result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
      });

      expect(alert.chainId).toBeUndefined();
    });

    it('should add multiple alerts', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.createAlert('0xAAA', 'TOKEN1', 100, 'above', 90, 56);
        result.current.createAlert('0xBBB', 'TOKEN2', 50, 'below', 60, 97);
        result.current.createAlert('0xCCC', 'TOKEN3', 200, 'above', 180, 8453);
      });

      expect(result.current.alerts).toHaveLength(3);
    });
  });

  describe('Removing Alerts', () => {
    it('should remove an alert by ID', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let alertId: string;

      act(() => {
        const alert = result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
        alertId = alert.id;
      });

      expect(result.current.alerts).toHaveLength(1);

      act(() => {
        result.current.removeAlert(alertId);
      });

      expect(result.current.alerts).toHaveLength(0);
    });

    it('should update localStorage when removing', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let alertId: string;

      act(() => {
        const alert1 = result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
        result.current.createAlert('0x456', 'TOKEN2', 200, 'below', 210);
        alertId = alert1.id;
      });

      act(() => {
        result.current.removeAlert(alertId);
      });

      const stored = localStorage.getItem('kaspump_price_alerts');
      const parsed = JSON.parse(stored!);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].tokenAddress).toBe('0x456');
    });

    it('should handle removing non-existent alert gracefully', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
      });

      act(() => {
        result.current.removeAlert('non-existent-id');
      });

      expect(result.current.alerts).toHaveLength(1);
    });
  });

  describe('Updating Alerts', () => {
    it('should update alert properties', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let alertId: string;

      act(() => {
        const alert = result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
        alertId = alert.id;
      });

      act(() => {
        result.current.updateAlert(alertId, { targetPrice: 150, currentPrice: 140 });
      });

      const updatedAlert = result.current.alerts.find(a => a.id === alertId);
      expect(updatedAlert!.targetPrice).toBe(150);
      expect(updatedAlert!.currentPrice).toBe(140);
    });

    it('should mark alert as notified', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let alertId: string;

      act(() => {
        const alert = result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
        alertId = alert.id;
      });

      act(() => {
        result.current.updateAlert(alertId, { notified: true });
      });

      const updatedAlert = result.current.alerts.find(a => a.id === alertId);
      expect(updatedAlert!.notified).toBe(true);
    });

    it('should update localStorage when updating', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let alertId: string;

      act(() => {
        const alert = result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
        alertId = alert.id;
      });

      act(() => {
        result.current.updateAlert(alertId, { targetPrice: 200 });
      });

      const stored = localStorage.getItem('kaspump_price_alerts');
      const parsed = JSON.parse(stored!);

      expect(parsed[0].targetPrice).toBe(200);
    });
  });

  describe('Checking Alert Triggers', () => {
    it('should detect when price goes above target (above alert)', () => {
      const { result } = renderHook(() => usePriceAlerts());

      const alert: PriceAlert = {
        id: 'test-1',
        tokenAddress: '0x123',
        tokenSymbol: 'TOKEN',
        targetPrice: 100,
        direction: 'above',
        currentPrice: 90,
        createdAt: Date.now(),
        isActive: true,
        notified: false,
      };

      expect(result.current.checkAlert(alert, 90)).toBe(false);
      expect(result.current.checkAlert(alert, 99)).toBe(false);
      expect(result.current.checkAlert(alert, 100)).toBe(true);
      expect(result.current.checkAlert(alert, 110)).toBe(true);
    });

    it('should detect when price goes below target (below alert)', () => {
      const { result } = renderHook(() => usePriceAlerts());

      const alert: PriceAlert = {
        id: 'test-2',
        tokenAddress: '0x456',
        tokenSymbol: 'TOKEN',
        targetPrice: 50,
        direction: 'below',
        currentPrice: 60,
        createdAt: Date.now(),
        isActive: true,
        notified: false,
      };

      expect(result.current.checkAlert(alert, 60)).toBe(false);
      expect(result.current.checkAlert(alert, 51)).toBe(false);
      expect(result.current.checkAlert(alert, 50)).toBe(true);
      expect(result.current.checkAlert(alert, 40)).toBe(true);
    });

    it('should not trigger inactive alerts', () => {
      const { result } = renderHook(() => usePriceAlerts());

      const alert: PriceAlert = {
        id: 'test-3',
        tokenAddress: '0x789',
        tokenSymbol: 'TOKEN',
        targetPrice: 100,
        direction: 'above',
        currentPrice: 90,
        createdAt: Date.now(),
        isActive: false, // Inactive
        notified: false,
      };

      expect(result.current.checkAlert(alert, 150)).toBe(false);
    });

    it('should not trigger already notified alerts', () => {
      const { result } = renderHook(() => usePriceAlerts());

      const alert: PriceAlert = {
        id: 'test-4',
        tokenAddress: '0xAAA',
        tokenSymbol: 'TOKEN',
        targetPrice: 100,
        direction: 'above',
        currentPrice: 90,
        createdAt: Date.now(),
        isActive: true,
        notified: true, // Already notified
      };

      expect(result.current.checkAlert(alert, 150)).toBe(false);
    });
  });

  describe('Getting Alerts for Token', () => {
    it('should return alerts for specific token', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.createAlert('0x111', 'TOKEN1', 100, 'above', 90);
        result.current.createAlert('0x222', 'TOKEN2', 200, 'below', 210);
        result.current.createAlert('0x111', 'TOKEN1', 150, 'below', 160);
      });

      const alertsForToken = result.current.getAlertsForToken('0x111');

      expect(alertsForToken).toHaveLength(2);
      expect(alertsForToken.every(a => a.tokenAddress.toLowerCase() === '0x111')).toBe(true);
    });

    it('should handle case-insensitive address matching', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.createAlert('0xABC123', 'TOKEN', 100, 'above', 90);
      });

      const alertsLower = result.current.getAlertsForToken('0xabc123');
      const alertsUpper = result.current.getAlertsForToken('0xABC123');

      expect(alertsLower).toHaveLength(1);
      expect(alertsUpper).toHaveLength(1);
    });

    it('should filter by chain ID when provided', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90, 56);
        result.current.createAlert('0x123', 'TOKEN', 200, 'below', 210, 97);
      });

      const alertsChain56 = result.current.getAlertsForToken('0x123', 56);
      const alertsChain97 = result.current.getAlertsForToken('0x123', 97);

      expect(alertsChain56).toHaveLength(1);
      expect(alertsChain56[0].chainId).toBe(56);

      expect(alertsChain97).toHaveLength(1);
      expect(alertsChain97[0].chainId).toBe(97);
    });

    it('should only return active alerts', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let alertId: string;

      act(() => {
        const alert = result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
        result.current.createAlert('0x123', 'TOKEN', 200, 'below', 210);
        alertId = alert.id;
      });

      // Deactivate one alert
      act(() => {
        result.current.updateAlert(alertId, { isActive: false });
      });

      const activeAlerts = result.current.getAlertsForToken('0x123');

      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].targetPrice).toBe(200);
    });

    it('should return empty array for token with no alerts', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.createAlert('0x111', 'TOKEN1', 100, 'above', 90);
      });

      const alertsForNonExistent = result.current.getAlertsForToken('0x999');

      expect(alertsForNonExistent).toEqual([]);
    });
  });

  describe('Toggling Alerts', () => {
    it('should deactivate alert when toggling', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let alertId: string;

      act(() => {
        const alert = result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
        alertId = alert.id;
      });

      expect(result.current.alerts[0].isActive).toBe(true);

      act(() => {
        result.current.toggleAlert(alertId);
      });

      expect(result.current.alerts[0].isActive).toBe(false);
    });
  });

  describe('Clearing All Alerts', () => {
    it('should clear all alerts', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.createAlert('0x111', 'TOKEN1', 100, 'above', 90);
        result.current.createAlert('0x222', 'TOKEN2', 200, 'below', 210);
        result.current.createAlert('0x333', 'TOKEN3', 300, 'above', 280);
      });

      expect(result.current.alerts).toHaveLength(3);

      act(() => {
        result.current.clearAllAlerts();
      });

      expect(result.current.alerts).toHaveLength(0);
    });

    it('should update localStorage when clearing', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
      });

      act(() => {
        result.current.clearAllAlerts();
      });

      const stored = localStorage.getItem('kaspump_price_alerts');
      const parsed = JSON.parse(stored!);

      expect(parsed).toEqual([]);
    });

    it('should handle clearing when already empty', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.clearAllAlerts();
      });

      expect(result.current.alerts).toEqual([]);
    });
  });

  describe('LocalStorage Error Handling', () => {
    it('should handle localStorage.setItem errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
      });

      // Should not throw, but log error
      expect(consoleErrorSpy).toHaveBeenCalled();

      setItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid alert creation', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.createAlert(`0x${i}`, `TOKEN${i}`, 100 + i, 'above', 90 + i);
        }
      });

      expect(result.current.alerts).toHaveLength(10);
    });

    it('should handle updating non-existent alert', () => {
      const { result } = renderHook(() => usePriceAlerts());

      act(() => {
        result.current.createAlert('0x123', 'TOKEN', 100, 'above', 90);
      });

      act(() => {
        result.current.updateAlert('non-existent-id', { targetPrice: 200 });
      });

      // Should not throw, original alert unchanged
      expect(result.current.alerts[0].targetPrice).toBe(100);
    });

    it('should preserve alert data across multiple operations', () => {
      const { result } = renderHook(() => usePriceAlerts());

      let alert1Id: string;
      let alert2Id: string;

      act(() => {
        const a1 = result.current.createAlert('0x111', 'TOKEN1', 100, 'above', 90, 56);
        const a2 = result.current.createAlert('0x222', 'TOKEN2', 200, 'below', 210, 97);
        alert1Id = a1.id;
        alert2Id = a2.id;
      });

      act(() => {
        result.current.updateAlert(alert1Id, { currentPrice: 95 });
      });

      act(() => {
        result.current.removeAlert(alert2Id);
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].currentPrice).toBe(95);
      expect(result.current.alerts[0].tokenSymbol).toBe('TOKEN1');
    });
  });
});
