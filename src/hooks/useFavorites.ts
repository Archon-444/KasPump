/**
 * useFavorites Hook
 * Manages user's favorite tokens with localStorage persistence and Zod validation
 *
 * Features:
 * - Multi-chain support (favorites can be chain-specific or global)
 * - Automatic localStorage sync with validation
 * - Invalid data auto-recovery
 * - Duplicate prevention
 *
 * @example
 * ```typescript
 * const {
 *   favorites,
 *   isLoading,
 *   isFavorite,
 *   addFavorite,
 *   removeFavorite,
 *   toggleFavorite,
 *   favoriteCount,
 *   clearFavorites
 * } = useFavorites();
 *
 * // Check if token is favorited
 * const favorited = isFavorite('0x123...', 97);
 *
 * // Toggle favorite status
 * <Button onClick={() => toggleFavorite(token.address, chainId)}>
 *   {isFavorite(token.address, chainId) ? '★' : '☆'}
 * </Button>
 *
 * // Add to favorites
 * addFavorite('0x123...', 97);
 * ```
 *
 * @returns Object containing favorites state and management functions
 */

import { useState, useEffect, useCallback } from 'react';
import { KasPumpToken } from '../types';
import { FavoritesArraySchema, FavoriteTokenData } from '../schemas';

/**
 * Favorite token data structure
 */
export interface FavoriteToken {
  /** Token contract address */
  address: string;
  /** Optional chain ID (omit for cross-chain favorites) */
  chainId?: number;
  /** Timestamp when added to favorites */
  addedAt: number;
}

const FAVORITES_STORAGE_KEY = 'kaspump_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from localStorage with validation
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Validate with Zod schema
        const validationResult = FavoritesArraySchema.safeParse(parsed);

        if (validationResult.success) {
          // Type assertion needed because Zod infers partial types
          setFavorites(validationResult.data as FavoriteToken[]);
        } else {
          console.warn('Invalid favorites data in localStorage, resetting:', validationResult.error);
          // Clear invalid data
          localStorage.removeItem(FAVORITES_STORAGE_KEY);
          setFavorites([]);
        }
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
      // Clear corrupted data
      localStorage.removeItem(FAVORITES_STORAGE_KEY);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites: FavoriteToken[]) => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }, []);

  // Check if a token is favorited
  const isFavorite = useCallback((address: string, chainId?: number): boolean => {
    return favorites.some(
      fav => fav.address.toLowerCase() === address.toLowerCase() &&
        (chainId === undefined || fav.chainId === chainId)
    );
  }, [favorites]);

  // Add a token to favorites
  const addFavorite = useCallback((address: string, chainId?: number) => {
    if (isFavorite(address, chainId)) {
      return; // Already favorited
    }

    const newFavorite: FavoriteToken = {
      address,
      chainId,
      addedAt: Date.now(),
    };

    saveFavorites([...favorites, newFavorite]);
  }, [favorites, isFavorite, saveFavorites]);

  // Remove a token from favorites
  const removeFavorite = useCallback((address: string, chainId?: number) => {
    const newFavorites = favorites.filter(
      fav => !(
        fav.address.toLowerCase() === address.toLowerCase() &&
        (chainId === undefined || fav.chainId === chainId)
      )
    );
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback((address: string, chainId?: number) => {
    if (isFavorite(address, chainId)) {
      removeFavorite(address, chainId);
    } else {
      addFavorite(address, chainId);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  // Get favorite count
  const favoriteCount = favorites.length;

  // Clear all favorites
  const clearFavorites = useCallback(() => {
    saveFavorites([]);
  }, [saveFavorites]);

  return {
    favorites,
    isLoading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    favoriteCount,
    clearFavorites,
  };
}

