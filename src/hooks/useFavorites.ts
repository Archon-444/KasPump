// Hook for managing user's favorite tokens across chains
import { useState, useEffect, useCallback } from 'react';
import { KasPumpToken } from '../types';

export interface FavoriteToken {
  address: string;
  chainId?: number;
  addedAt: number;
}

const FAVORITES_STORAGE_KEY = 'kaspump_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
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

