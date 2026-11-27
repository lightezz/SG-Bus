import { ArrowRight, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { busApiService } from '../services/busApiService';
import type { SingaporeRegion } from '../types/bus';

interface StopDirectoryViewProps {
  onSelectStop: (busStopCode: string) => void;
  isFavorite: (busStopCode: string) => boolean;
  onToggleFavorite: (busStopCode: string) => void;
}

const REGIONS: Array<'All' | SingaporeRegion> = ['All', 'Central', 'East', 'West', 'North', 'North-East'];

export function StopDirectoryView({
  onSelectStop,
  isFavorite,
  onToggleFavorite,
}: StopDirectoryViewProps) {
  const [regionFilter, setRegionFilter] = useState<'All' | SingaporeRegion>('All');
  const [filterText, setFilterText] = useState('');

  const stops = useMemo(() => {
    const all = busApiService.getAllStops();
    const q = filterText.trim().toLowerCase();
    return all.filter((stop) => {
      if (regionFilter !== 'All' && stop.Region !== regionFilter) return false;
      if (!q) return true;
      return (
        stop.BusStopCode.includes(q) ||
        stop.Description.toLowerCase().includes(q) ||
        stop.RoadName.toLowerCase().includes(q) ||
        (stop.NearbyMrt && stop.NearbyMrt.toLowerCase().includes(q)) ||
        stop.Services.some((s) => s.toLowerCase() === q)
      );
    });
  }, [regionFilter, filterText]);

  return (
    <section aria-label="Singapore bus stop directory" className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Singapore Bus Stop Directory
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Browse major interchanges and MRT feeder stops by region, or filter by road and service number.
          </p>
        </div>

        <div className="relative flex items-center w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter stop, road, or bus no."
            aria-label="Filter directory"
            className="w-full min-h-[40px] pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Region Segmented Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
        {REGIONS.map((region) => (
          <button
            key={region}
            type="button"
            onClick={() => setRegionFilter(region)}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              regionFilter === region
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      {/* Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {stops.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No bus stops match your current filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setRegionFilter('All');
                setFilterText('');
              }}
              className="mt-3 min-h-[38px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stops.map((stop) => {
              const fav = isFavorite(stop.BusStopCode);
              return (
                <div
                  key={stop.BusStopCode}
                  className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono-tabular font-bold text-sm text-blue-700 dark:text-blue-400">
                        {stop.BusStopCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{stop.RoadName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{stop.Region}</span>
                      {stop.NearbyMrt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{stop.NearbyMrt}</span>
                        </>
                      )}
                    </div>
                    <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                      {stop.Description}
                    </h2>
                    <p className="mt-1 text-xs font-mono-tabular text-slate-500 dark:text-slate-400 truncate">
                      Services: {stop.Services.join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(stop.BusStopCode)}
                      aria-label={
                        fav
                          ? `Remove ${stop.Description} from favorites`
                          : `Save ${stop.Description} to favorites`
                      }
                      className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                        fav
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-500'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectStop(stop.BusStopCode)}
                      className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <span>Arrivals</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
