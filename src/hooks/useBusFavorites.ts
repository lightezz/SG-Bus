import { useCallback, useEffect, useState } from 'react';
import type { FavoriteStop } from '../types/bus';

const FAVORITES_STORAGE_KEY = 'nextbus_sg_favorites_v1';
const RECENT_STOPS_STORAGE_KEY = 'nextbus_sg_recent_v1';

const DEFAULT_FAVORITES: FavoriteStop[] = [
  {
    busStopCode: '09047',
    customLabel: 'Orchard Shopping',
    addedAt: 1700000000001,
    pinnedServices: ['106', '190'],
  },
  {
    busStopCode: '03218',
    customLabel: 'Marina Bay Office',
    addedAt: 1700000000002,
    pinnedServices: ['97', '133'],
  },
  {
    busStopCode: '75009',
    customLabel: 'East Hub',
    addedAt: 1700000000003,
    pinnedServices: ['65', '27'],
  },
];

const DEFAULT_RECENT_STOPS = ['09047', '03218', '01113', '14141'];

function loadFavoritesFromStorage(): FavoriteStop[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return DEFAULT_FAVORITES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return DEFAULT_FAVORITES;
  } catch {
    return DEFAULT_FAVORITES;
  }
}

function loadRecentStopsFromStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_STOPS_STORAGE_KEY);
    if (!raw) return DEFAULT_RECENT_STOPS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return DEFAULT_RECENT_STOPS;
  } catch {
    return DEFAULT_RECENT_STOPS;
  }
}

export function useBusFavorites() {
  const [favorites, setFavorites] = useState<FavoriteStop[]>(loadFavoritesFromStorage);
  const [recentStops, setRecentStops] = useState<string[]>(loadRecentStopsFromStorage);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Ignore storage quota errors
    }
  }, [favorites]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RECENT_STOPS_STORAGE_KEY, JSON.stringify(recentStops));
    } catch {
      // Ignore storage quota errors
    }
  }, [recentStops]);

  const isFavorite = useCallback(
    (busStopCode: string) => favorites.some((f) => f.busStopCode === busStopCode),
    [favorites]
  );

  const getFavorite = useCallback(
    (busStopCode: string) => favorites.find((f) => f.busStopCode === busStopCode),
    [favorites]
  );

  const toggleFavorite = useCallback((busStopCode: string) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.busStopCode === busStopCode);
      if (exists) {
        return prev.filter((f) => f.busStopCode !== busStopCode);
      }
      return [
        {
          busStopCode,
          addedAt: Date.now(),
          pinnedServices: [],
        },
        ...prev,
      ];
    });
  }, []);

  const removeFavorite = useCallback((busStopCode: string) => {
    setFavorites((prev) => prev.filter((f) => f.busStopCode !== busStopCode));
  }, []);

  const updateFavoriteLabel = useCallback((busStopCode: string, customLabel: string) => {
    const trimmed = customLabel.trim();
    setFavorites((prev) =>
      prev.map((f) =>
        f.busStopCode === busStopCode
          ? { ...f, customLabel: trimmed || undefined }
          : f
      )
    );
  }, []);

  const isServicePinned = useCallback(
    (busStopCode: string, serviceNo: string) => {
      const fav = favorites.find((f) => f.busStopCode === busStopCode);
      return fav ? fav.pinnedServices.includes(serviceNo) : false;
    },
    [favorites]
  );

  const togglePinnedService = useCallback((busStopCode: string, serviceNo: string) => {
    setFavorites((prev) => {
      const existing = prev.find((f) => f.busStopCode === busStopCode);
      if (!existing) {
        // Auto-favorite the stop when user pins a specific bus service at that stop
        return [
          {
            busStopCode,
            addedAt: Date.now(),
            pinnedServices: [serviceNo],
          },
          ...prev,
        ];
      }

      const hasService = existing.pinnedServices.includes(serviceNo);
      const nextPinned = hasService
        ? existing.pinnedServices.filter((s) => s !== serviceNo)
        : [...existing.pinnedServices, serviceNo];

      return prev.map((f) =>
        f.busStopCode === busStopCode ? { ...f, pinnedServices: nextPinned } : f
      );
    });
  }, []);

  const recordRecentStop = useCallback((busStopCode: string) => {
    setRecentStops((prev) => {
      const filtered = prev.filter((code) => code !== busStopCode);
      return [busStopCode, ...filtered].slice(0, 6);
    });
  }, []);

  const clearRecentStops = useCallback(() => {
    setRecentStops([]);
  }, []);

  return {
    favorites,
    recentStops,
    isFavorite,
    getFavorite,
    toggleFavorite,
    removeFavorite,
    updateFavoriteLabel,
    isServicePinned,
    togglePinnedService,
    recordRecentStop,
    clearRecentStops,
  };
}
