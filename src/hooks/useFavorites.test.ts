/**
 * Tests for useFavorites hook
 * Tests localStorage persistence, validation, and favorite management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFavorites } from './useFavorites';

describe('useFavorites', () => {
  // Clear localStorage before each test
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty favorites', () => {
      const { result } = renderHook(() => useFavorites());

      expect(result.current.favorites).toEqual([]);
      expect(result.current.favoriteCount).toBe(0);
      expect(result.current.isLoading).toBe(false);
    });

    it('should load favorites from localStorage on mount', async () => {
      const storedFavorites = [
        { address: '0x123', chainId: 97, addedAt: Date.now() },
        { address: '0x456', chainId: 56, addedAt: Date.now() },
      ];
      localStorage.setItem('kaspump_favorites', JSON.stringify(storedFavorites));

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.favorites).toHaveLength(2);
      expect(result.current.favoriteCount).toBe(2);
    });

    it('should handle invalid localStorage data gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('kaspump_favorites', 'invalid json');

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.favorites).toEqual([]);
      expect(localStorage.getItem('kaspump_favorites')).toBeNull();

      consoleWarnSpy.mockRestore();
    });

    it('should clear corrupted data and reset to empty', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('kaspump_favorites', '{broken json');

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.favorites).toEqual([]);
      expect(localStorage.getItem('kaspump_favorites')).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid schema data', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Missing required fields
      const invalidData = [{ address: '0x123' }]; // Missing addedAt
      localStorage.setItem('kaspump_favorites', JSON.stringify(invalidData));

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.favorites).toEqual([]);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Adding Favorites', () => {
    it('should add a favorite token', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0xABC123', 97);
      });

      expect(result.current.favorites).toHaveLength(1);
      expect(result.current.favorites[0].address).toBe('0xABC123');
      expect(result.current.favorites[0].chainId).toBe(97);
      expect(result.current.favorites[0].addedAt).toBeLessThanOrEqual(Date.now());
      expect(result.current.favoriteCount).toBe(1);
    });

    it('should add favorite without chainId (cross-chain)', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0xDEF456');
      });

      expect(result.current.favorites).toHaveLength(1);
      expect(result.current.favorites[0].chainId).toBeUndefined();
    });

    it('should persist favorites to localStorage when adding', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97);
      });

      const stored = localStorage.getItem('kaspump_favorites');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].address).toBe('0x123');
    });

    it('should prevent duplicate favorites (same address and chain)', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97);
        result.current.addFavorite('0x123', 97); // Duplicate
      });

      expect(result.current.favorites).toHaveLength(1);
    });

    it('should allow same address on different chains', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97); // BSC Testnet
        result.current.addFavorite('0x123', 56); // BSC Mainnet
      });

      expect(result.current.favorites).toHaveLength(2);
    });

    it('should add multiple different favorites', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0xAAA', 97);
        result.current.addFavorite('0xBBB', 97);
        result.current.addFavorite('0xCCC', 56);
      });

      expect(result.current.favorites).toHaveLength(3);
      expect(result.current.favoriteCount).toBe(3);
    });
  });

  describe('Removing Favorites', () => {
    it('should remove a favorite token', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97);
        result.current.addFavorite('0x456', 97);
      });

      expect(result.current.favorites).toHaveLength(2);

      act(() => {
        result.current.removeFavorite('0x123', 97);
      });

      expect(result.current.favorites).toHaveLength(1);
      expect(result.current.favorites[0].address).toBe('0x456');
    });

    it('should update localStorage when removing', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97);
        result.current.addFavorite('0x456', 97);
      });

      act(() => {
        result.current.removeFavorite('0x123', 97);
      });

      const stored = localStorage.getItem('kaspump_favorites');
      const parsed = JSON.parse(stored!);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].address).toBe('0x456');
    });

    it('should handle case-insensitive address matching when removing', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0xABC123', 97);
      });

      act(() => {
        result.current.removeFavorite('0xabc123', 97); // Lowercase
      });

      expect(result.current.favorites).toHaveLength(0);
    });

    it('should only remove favorite from specific chain', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97);
        result.current.addFavorite('0x123', 56);
      });

      act(() => {
        result.current.removeFavorite('0x123', 97);
      });

      expect(result.current.favorites).toHaveLength(1);
      expect(result.current.favorites[0].chainId).toBe(56);
    });

    it('should handle removing non-existent favorite gracefully', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97);
      });

      act(() => {
        result.current.removeFavorite('0x999', 97); // Doesn't exist
      });

      expect(result.current.favorites).toHaveLength(1);
    });
  });

  describe('Checking Favorites', () => {
    it('should correctly identify if token is favorited', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97);
      });

      expect(result.current.isFavorite('0x123', 97)).toBe(true);
      expect(result.current.isFavorite('0x456', 97)).toBe(false);
    });

    it('should handle case-insensitive address checking', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0xABC123', 97);
      });

      expect(result.current.isFavorite('0xabc123', 97)).toBe(true);
      expect(result.current.isFavorite('0xABC123', 97)).toBe(true);
    });

    it('should distinguish between different chains', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97);
      });

      expect(result.current.isFavorite('0x123', 97)).toBe(true);
      expect(result.current.isFavorite('0x123', 56)).toBe(false);
    });

    it('should check cross-chain favorites when chainId is undefined', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123');
      });

      expect(result.current.isFavorite('0x123')).toBe(true);
      expect(result.current.isFavorite('0x123', undefined)).toBe(true);
    });
  });

  describe('Toggling Favorites', () => {
    it('should toggle favorite from off to on', () => {
      const { result } = renderHook(() => useFavorites());

      expect(result.current.isFavorite('0x123', 97)).toBe(false);

      act(() => {
        result.current.toggleFavorite('0x123', 97);
      });

      expect(result.current.isFavorite('0x123', 97)).toBe(true);
      expect(result.current.favorites).toHaveLength(1);
    });

    it('should toggle favorite from on to off', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97);
      });

      expect(result.current.isFavorite('0x123', 97)).toBe(true);

      act(() => {
        result.current.toggleFavorite('0x123', 97);
      });

      expect(result.current.isFavorite('0x123', 97)).toBe(false);
      expect(result.current.favorites).toHaveLength(0);
    });

    it('should toggle multiple times correctly', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.toggleFavorite('0x123', 97); // Add
        result.current.toggleFavorite('0x123', 97); // Remove
        result.current.toggleFavorite('0x123', 97); // Add again
      });

      expect(result.current.isFavorite('0x123', 97)).toBe(true);
      expect(result.current.favorites).toHaveLength(1);
    });
  });

  describe('Clearing Favorites', () => {
    it('should clear all favorites', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x111', 97);
        result.current.addFavorite('0x222', 56);
        result.current.addFavorite('0x333', 8453);
      });

      expect(result.current.favorites).toHaveLength(3);

      act(() => {
        result.current.clearFavorites();
      });

      expect(result.current.favorites).toHaveLength(0);
      expect(result.current.favoriteCount).toBe(0);
    });

    it('should update localStorage when clearing', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97);
      });

      act(() => {
        result.current.clearFavorites();
      });

      const stored = localStorage.getItem('kaspump_favorites');
      const parsed = JSON.parse(stored!);

      expect(parsed).toEqual([]);
    });

    it('should handle clearing when already empty', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.clearFavorites();
      });

      expect(result.current.favorites).toEqual([]);
    });
  });

  describe('Favorite Count', () => {
    it('should return correct count', () => {
      const { result } = renderHook(() => useFavorites());

      expect(result.current.favoriteCount).toBe(0);

      act(() => {
        result.current.addFavorite('0x111', 97);
      });
      expect(result.current.favoriteCount).toBe(1);

      act(() => {
        result.current.addFavorite('0x222', 97);
      });
      expect(result.current.favoriteCount).toBe(2);

      act(() => {
        result.current.removeFavorite('0x111', 97);
      });
      expect(result.current.favoriteCount).toBe(1);
    });
  });

  describe('LocalStorage Error Handling', () => {
    it('should handle localStorage.setItem errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('0x123', 97);
      });

      // Should not throw, but log error
      expect(consoleErrorSpy).toHaveBeenCalled();

      setItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle localStorage.getItem errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const { result } = renderHook(() => useFavorites());

      // Should not throw, and return empty state
      expect(result.current.favorites).toEqual([]);

      getItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
