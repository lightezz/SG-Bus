import { BookOpen, Compass, MapPin, Moon, RefreshCw, Star, Sun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ApiGuideView } from './components/ApiGuideView';
import { ArrivalBoard } from './components/ArrivalBoard';
import { BusDeckIcon } from './components/BusDeckIcon';
import { FavoritesPanel } from './components/FavoritesPanel';
import { StopDirectoryView } from './components/StopDirectoryView';
import { StopSearchBar } from './components/StopSearchBar';
import { useBusFavorites } from './hooks/useBusFavorites';
import { busApiService } from './services/busApiService';
import type { AppView, BusArrivalResponse } from './types/bus';

const AUTO_REFRESH_INTERVAL_SEC = 15;
const THEME_STORAGE_KEY = 'nextbus_sg_theme_v1';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('arrivals');
  const [activeStopCode, setActiveStopCode] = useState<string>('09047');
  const [arrivalData, setArrivalData] = useState<BusArrivalResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [secondsToNextRefresh, setSecondsToNextRefresh] = useState<number>(AUTO_REFRESH_INTERVAL_SEC);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
    } catch {
      // Ignore storage access errors
    }
    return false;
  });

  const {
    favorites,
    recentStops,
    isFavorite,
    getFavorite,
    toggleFavorite,
    removeFavorite,
    updateFavoriteLabel,
    togglePinnedService,
    recordRecentStop,
  } = useBusFavorites();

  // Sync dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore
    }
  }, [isDark]);

  const fetchArrivals = useCallback(async (stopCode: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await busApiService.getBusArrivals(stopCode);
      setArrivalData(response);
      setLastUpdated(new Date());
      setSecondsToNextRefresh(AUTO_REFRESH_INTERVAL_SEC);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load bus arrivals.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch when activeStopCode changes
  useEffect(() => {
    fetchArrivals(activeStopCode);
  }, [activeStopCode, fetchArrivals]);

  // 15-second auto-refresh countdown
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const timer = window.setInterval(() => {
      setSecondsToNextRefresh((prev) => {
        if (prev <= 1) {
          fetchArrivals(activeStopCode);
          return AUTO_REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [autoRefreshEnabled, activeStopCode, fetchArrivals]);

  const handleSelectStop = useCallback(
    (stopCode: string) => {
      const clean = stopCode.trim();
      if (!clean) return;
      setActiveStopCode(clean);
      recordRecentStop(clean);
      setActiveView('arrivals');
    },
    [recordRecentStop]
  );

  const handleManualRefresh = useCallback(() => {
    fetchArrivals(activeStopCode);
    setActiveView('arrivals');
  }, [activeStopCode, fetchArrivals]);

  const activeStopInfo = busApiService.getStopByCode(activeStopCode);
  const activeFavorite = getFavorite(activeStopCode);

  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'arrivals', label: 'Arrivals' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'directory', label: 'Directory' },
    { id: 'api-guide', label: 'API Guide' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 transition-colors">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveView('arrivals')}
            className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            NextBus SG
          </button>

          {/* Zone 2: Clean Single-Line Text Nav Links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-blue-600 text-slate-900 dark:text-white font-semibold'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="min-h-[38px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-14 space-y-6">
        {/* Workspace Search Bar + Theme Switch Toolbar */}
        <div className="flex flex-col md:flex-row md:items-start gap-3">
          <div className="flex-1 min-w-0">
            <StopSearchBar
              activeStopCode={activeStopCode}
              onSelectStop={handleSelectStop}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              recentStops={recentStops}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="self-end md:self-start min-h-[48px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-2 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        {/* Active View Content */}
        {activeView === 'arrivals' && (
          <div className="grid grid-cols-1 lg:grid-cols-[310px_1fr] gap-6 items-start">
            {/* Desktop Left Rail: Saved Favorites + Commuter Legend */}
            <div className="hidden lg:flex flex-col gap-5">
              <FavoritesPanel
                favorites={favorites}
                activeStopCode={activeStopCode}
                onSelectStop={handleSelectStop}
                onRemoveFavorite={removeFavorite}
                variant="sidebar"
              />

              {/* Transit Legend */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white tracking-wide">
                  Arrival Guide
                </h2>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      Seats
                    </span>
                    <span>Seats available (SEA)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400" />
                      Standing
                    </span>
                    <span>Standing room (SDA)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-2 text-red-700 dark:text-red-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
                      Crowded
                    </span>
                    <span>Limited standing (LSD)</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 font-mono-tabular text-slate-800 dark:text-slate-200">
                      <BusDeckIcon type="SD" className="w-4 h-3" />
                      SD
                    </span>
                    <span>Single Deck Bus</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 font-mono-tabular text-slate-800 dark:text-slate-200">
                      <BusDeckIcon type="DD" className="w-4 h-3" />
                      DD
                    </span>
                    <span>Double Deck Bus</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 font-mono-tabular text-slate-800 dark:text-slate-200">
                      <BusDeckIcon type="BD" className="w-4 h-3" />
                      BD
                    </span>
                    <span>Bendy Articulated</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Live Arrival Board */}
            <ArrivalBoard
              stop={activeStopInfo}
              busStopCode={activeStopCode}
              arrivalData={arrivalData}
              isLoading={isLoading}
              error={error}
              lastUpdated={lastUpdated}
              secondsToNextRefresh={secondsToNextRefresh}
              autoRefreshEnabled={autoRefreshEnabled}
              onToggleAutoRefresh={() => setAutoRefreshEnabled((prev) => !prev)}
              onManualRefresh={handleManualRefresh}
              favoriteEntry={activeFavorite}
              onToggleFavorite={toggleFavorite}
              onUpdateFavoriteLabel={updateFavoriteLabel}
              onTogglePinnedService={togglePinnedService}
            />
          </div>
        )}

        {activeView === 'favorites' && (
          <FavoritesPanel
            favorites={favorites}
            activeStopCode={activeStopCode}
            onSelectStop={handleSelectStop}
            onRemoveFavorite={removeFavorite}
            variant="full"
          />
        )}

        {activeView === 'directory' && (
          <StopDirectoryView
            onSelectStop={handleSelectStop}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {activeView === 'api-guide' && (
          <ApiGuideView activeStopCode={activeStopCode} arrivalData={arrivalData} />
        )}
      </main>

      {/* Mobile Bottom Tab Bar (Compact <= 15% Mobile Viewport Height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800"
      >
        <div className="grid grid-cols-4 h-14">
          <button
            type="button"
            onClick={() => setActiveView('arrivals')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
              activeView === 'arrivals'
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <MapPin className="w-4 h-4" aria-hidden="true" />
            <span>Arrivals</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('favorites')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
              activeView === 'favorites'
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Star className={`w-4 h-4 ${activeView === 'favorites' ? 'fill-current' : ''}`} aria-hidden="true" />
            <span>Favorites</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('directory')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
              activeView === 'directory'
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span>Directory</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('api-guide')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
              activeView === 'api-guide'
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>API</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
