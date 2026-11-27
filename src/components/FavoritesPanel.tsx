import { ArrowRight, MapPin, Pin, Star, Trash2 } from 'lucide-react';
import { busApiService } from '../services/busApiService';
import type { FavoriteStop } from '../types/bus';

interface FavoritesPanelProps {
  favorites: FavoriteStop[];
  activeStopCode: string;
  onSelectStop: (busStopCode: string) => void;
  onRemoveFavorite: (busStopCode: string) => void;
  variant: 'sidebar' | 'full';
}

export function FavoritesPanel({
  favorites,
  activeStopCode,
  onSelectStop,
  onRemoveFavorite,
  variant,
}: FavoritesPanelProps) {
  if (variant === 'sidebar') {
    return (
      <aside
        aria-label="Saved favorite bus stops"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-current" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Saved Stops
            </h2>
          </div>
          <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            {favorites.length}
          </span>
        </div>

        {favorites.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No saved stops yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Star any bus stop to keep it one click away.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {favorites.map((fav) => {
              const stop = busApiService.getStopByCode(fav.busStopCode);
              const isActive = fav.busStopCode === activeStopCode;

              return (
                <div
                  key={fav.busStopCode}
                  className={`flex items-center justify-between gap-2 px-4 py-3 transition-colors ${
                    isActive
                      ? 'bg-blue-50/70 dark:bg-blue-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectStop(fav.busStopCode)}
                    className="flex-1 min-w-0 text-left cursor-pointer py-0.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono-tabular text-xs font-bold ${
                          isActive
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {fav.busStopCode}
                      </span>
                      {fav.customLabel && (
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 truncate">
                          {fav.customLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {stop?.Description ?? `Bus Stop ${fav.busStopCode}`}
                    </p>
                    {fav.pinnedServices.length > 0 && (
                      <p className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Pinned: {fav.pinnedServices.join(', ')}
                      </p>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveFavorite(fav.busStopCode)}
                    aria-label={`Remove ${stop?.Description ?? fav.busStopCode} from saved stops`}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    );
  }

  // Full-page Favorites View
  return (
    <section aria-label="All favorite bus stops" className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Saved Commute Stops
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Jump straight to your bookmarked stops and pinned bus services.
          </p>
        </div>
        <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
          {favorites.length} {favorites.length === 1 ? 'stop saved' : 'stops saved'}
        </span>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Star className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            Your favorites list is empty
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Search for a 5-digit bus stop code above and click Save Stop to build your daily commute board.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => {
            const stop = busApiService.getStopByCode(fav.busStopCode);
            return (
              <div
                key={fav.busStopCode}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                          {fav.busStopCode}
                        </span>
                        {fav.customLabel && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              {fav.customLabel}
                            </span>
                          </>
                        )}
                      </div>
                      <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {stop?.Description ?? `Bus Stop ${fav.busStopCode}`}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {stop?.RoadName ?? 'Singapore'}
                          {stop?.NearbyMrt ? ` · ${stop.NearbyMrt}` : ''}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveFavorite(fav.busStopCode)}
                      aria-label={`Remove ${stop?.Description ?? fav.busStopCode} from favorites`}
                      className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {fav.pinnedServices.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Pin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                      <span className="font-mono-tabular">
                        Pinned buses: {fav.pinnedServices.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectStop(fav.busStopCode)}
                  className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs sm:text-sm font-medium hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>View Live Arrivals</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
