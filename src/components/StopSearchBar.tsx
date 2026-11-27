import { ArrowRight, Search, Star, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { busApiService } from '../services/busApiService';
import type { BusStop } from '../types/bus';

interface StopSearchBarProps {
  activeStopCode: string;
  onSelectStop: (busStopCode: string) => void;
  isFavorite: (busStopCode: string) => boolean;
  onToggleFavorite: (busStopCode: string) => void;
  recentStops: string[];
}

export function StopSearchBar({
  activeStopCode,
  onSelectStop,
  isFavorite,
  onToggleFavorite,
  recentStops,
}: StopSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [validationHint, setValidationHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const isFiveDigitCode = /^\d{5}$/.test(trimmedQuery);

  const matches = useMemo(() => {
    if (!trimmedQuery) {
      return busApiService.getAllStops().slice(0, 7);
    }
    return busApiService.searchBusStops(trimmedQuery).slice(0, 8);
  }, [trimmedQuery]);

  // Global "/" keyboard shortcut to focus search
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const commitStopSelection = (stopCode: string) => {
    setValidationHint(null);
    onSelectStop(stopCode);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedQuery) return;

    // Exact 5-digit code works immediately (even if unlisted, shows live preview state)
    if (isFiveDigitCode) {
      commitStopSelection(trimmedQuery);
      return;
    }

    if (matches.length > 0) {
      const target = matches[highlightedIndex] || matches[0];
      commitStopSelection(target.BusStopCode);
      return;
    }

    if (/^\d+$/.test(trimmedQuery) && trimmedQuery.length !== 5) {
      setValidationHint('Singapore bus stop codes are exactly 5 digits (e.g. 09047).');
      return;
    }

    setValidationHint(`No matching stops found for "${trimmedQuery}". Try a 5-digit code like 09047 or 75009.`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (matches.length ? (prev + 1) % matches.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        matches.length ? (prev - 1 + matches.length) % matches.length : 0
      );
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const recentStopObjects = useMemo(
    () =>
      recentStops
        .map((code) => busApiService.getStopByCode(code))
        .filter((s): s is BusStop => Boolean(s)),
    [recentStops]
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} role="search" aria-label="Search Singapore bus stops">
        <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-600 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-600/15 transition-all">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 ml-4 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIndex(0);
              setValidationHint(null);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Enter 5-digit bus stop code (e.g. 09047), road, MRT, or bus no."
            aria-label="Bus stop code or name"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            className="w-full min-h-[48px] bg-transparent px-3.5 py-3 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />

          <div className="flex items-center gap-1.5 pr-2 shrink-0">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setValidationHint(null);
                  inputRef.current?.focus();
                }}
                aria-label="Clear search query"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <span className="hidden sm:inline-flex items-center px-2 py-1 text-[11px] font-mono-tabular text-slate-400 dark:text-slate-500 select-none">
              /
            </span>

            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs sm:text-sm font-medium hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Check Stop</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>

      {validationHint && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
          {validationHint}
        </p>
      )}

      {/* Quick Recent Stop Chips (interactive buttons, single-line) */}
      {recentStopObjects.length > 0 && (
        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            Recent:
          </span>
          {recentStopObjects.map((stop) => {
            const isCurrent = stop.BusStopCode === activeStopCode;
            return (
              <button
                key={stop.BusStopCode}
                type="button"
                onClick={() => commitStopSelection(stop.BusStopCode)}
                className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors border cursor-pointer flex items-center gap-2 ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-blue-600 dark:border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className="font-mono-tabular font-semibold">{stop.BusStopCode}</span>
                <span className="truncate max-w-[140px] opacity-85">{stop.Description}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Autocomplete Search Results Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Matching bus stops"
          className="absolute left-0 right-0 top-[54px] z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden"
        >
          {isFiveDigitCode && !busApiService.getStopByCode(trimmedQuery) && (
            <button
              type="button"
              onClick={() => commitStopSelection(trimmedQuery)}
              className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 bg-blue-50/70 dark:bg-blue-950/40 border-b border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-tabular font-bold text-sm text-blue-700 dark:text-blue-400">
                    {trimmedQuery}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Look up stop code {trimmedQuery}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Not in offline directory · Opens simulated arrival preview until live API is connected
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            </button>
          )}

          {matches.length > 0 ? (
            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
              {matches.map((stop, idx) => {
                const fav = isFavorite(stop.BusStopCode);
                const isHighlighted = idx === highlightedIndex;
                return (
                  <div
                    key={stop.BusStopCode}
                    role="option"
                    aria-selected={isHighlighted}
                    className={`flex items-center justify-between gap-3 px-4 py-2.5 transition-colors ${
                      isHighlighted
                        ? 'bg-slate-50 dark:bg-slate-800/70'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => commitStopSelection(stop.BusStopCode)}
                      className="flex-1 min-w-0 text-left flex items-center gap-3.5 py-1 cursor-pointer"
                    >
                      <span className="font-mono-tabular text-sm font-bold text-slate-900 dark:text-white shrink-0 w-14">
                        {stop.BusStopCode}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {stop.Description}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {stop.RoadName}
                          {stop.NearbyMrt ? ` · ${stop.NearbyMrt}` : ''}
                          {` · ${stop.Services.length} services`}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(stop.BusStopCode);
                      }}
                      aria-label={
                        fav
                          ? `Remove ${stop.Description} from favorites`
                          : `Save ${stop.Description} to favorites`
                      }
                      className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0 ${
                        fav
                          ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            !isFiveDigitCode && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No bus stops match &ldquo;{trimmedQuery}&rdquo;
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter a 5-digit Singapore bus stop code (e.g. 09047, 03218, 75009) or MRT name.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
