import {
  Accessibility,
  ChevronDown,
  ChevronUp,
  Clock,
  Pause,
  Pencil,
  Pin,
  Play,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  formatBusTypeLabel,
  formatClockTimeSG,
  formatLoadLabel,
  getMinutesUntilArrival,
} from '../services/busApiService';
import type {
  BusArrivalResponse,
  BusServiceArrival,
  BusStop,
  FavoriteStop,
  NextBusInfo,
} from '../types/bus';
import { BusDeckIcon } from './BusDeckIcon';

interface ArrivalBoardProps {
  stop: BusStop | undefined;
  busStopCode: string;
  arrivalData: BusArrivalResponse | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  secondsToNextRefresh: number;
  autoRefreshEnabled: boolean;
  onToggleAutoRefresh: () => void;
  onManualRefresh: () => void;
  favoriteEntry: FavoriteStop | undefined;
  onToggleFavorite: (busStopCode: string) => void;
  onUpdateFavoriteLabel: (busStopCode: string, label: string) => void;
  onTogglePinnedService: (busStopCode: string, serviceNo: string) => void;
}

type ServiceFilterMode = 'all' | 'pinned' | 'soon';

function ArrivalSlot({
  bus,
  isPrimary,
  nowMs,
}: {
  bus: NextBusInfo;
  isPrimary: boolean;
  nowMs: number;
}) {
  const mins = getMinutesUntilArrival(bus.EstimatedArrival, nowMs);
  if (mins === null) {
    return (
      <div className="flex flex-col justify-center">
        <span className="font-mono-tabular text-sm text-slate-400 dark:text-slate-600">—</span>
        <span className="text-[11px] text-slate-400 dark:text-slate-600">No data</span>
      </div>
    );
  }

  const loadInfo = formatLoadLabel(bus.Load);
  const typeInfo = formatBusTypeLabel(bus.Type);
  const clockTime = formatClockTimeSG(bus.EstimatedArrival);
  const isArriving = mins <= 1;

  const loadToneClass =
    loadInfo.tone === 'emerald'
      ? 'text-emerald-700 dark:text-emerald-400'
      : loadInfo.tone === 'amber'
      ? 'text-amber-700 dark:text-amber-400'
      : loadInfo.tone === 'crimson'
      ? 'text-red-700 dark:text-red-400'
      : 'text-slate-500 dark:text-slate-400';

  const loadBarClass =
    loadInfo.tone === 'emerald'
      ? 'bg-emerald-600 dark:bg-emerald-400'
      : loadInfo.tone === 'amber'
      ? 'bg-amber-600 dark:bg-amber-400'
      : loadInfo.tone === 'crimson'
      ? 'bg-red-600 dark:bg-red-400'
      : 'bg-slate-400';

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-mono-tabular font-bold tracking-tight leading-none ${
            isPrimary
              ? isArriving
                ? 'text-2xl text-emerald-700 dark:text-emerald-400'
                : 'text-2xl text-slate-900 dark:text-white'
              : isArriving
              ? 'text-base text-emerald-700 dark:text-emerald-400'
              : 'text-base text-slate-800 dark:text-slate-200'
          }`}
        >
          {isArriving ? 'Arr' : mins}
        </span>
        {!isArriving && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">min</span>
        )}
        <span className="text-[11px] font-mono-tabular text-slate-400 dark:text-slate-500 ml-1">
          {clockTime}
        </span>
      </div>

      {/* Explicit load text + color indicator + bus deck icon + WAB */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1.5 font-medium ${loadToneClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${loadBarClass}`} aria-hidden="true" />
          <span>{loadInfo.shortLabel}</span>
        </span>
        <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
          ·
        </span>
        <span
          className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400"
          title={typeInfo.label}
        >
          <BusDeckIcon type={bus.Type} className="w-4 h-3" />
          <span className="font-mono-tabular text-[11px]">{typeInfo.shortLabel}</span>
        </span>
        {bus.Feature === 'WAB' && (
          <span
            className="inline-flex items-center text-blue-700 dark:text-blue-400"
            title="Wheelchair Accessible Bus"
          >
            <Accessibility className="w-3.5 h-3.5" aria-label="Wheelchair accessible" />
          </span>
        )}
      </div>
    </div>
  );
}

export function ArrivalBoard({
  stop,
  busStopCode,
  arrivalData,
  isLoading,
  error,
  lastUpdated,
  secondsToNextRefresh,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  onManualRefresh,
  favoriteEntry,
  onToggleFavorite,
  onUpdateFavoriteLabel,
  onTogglePinnedService,
}: ArrivalBoardProps) {
  const [filterMode, setFilterMode] = useState<ServiceFilterMode>('all');
  const [serviceQuery, setServiceQuery] = useState('');
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Tick local clock every 10s so displayed minutes remain accurate between fetches
  useEffect(() => {
    setNowMs(Date.now());
  }, [arrivalData]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setIsEditingLabel(false);
    setExpandedService(null);
    setServiceQuery('');
    setFilterMode('all');
  }, [busStopCode]);

  const isFav = Boolean(favoriteEntry);
  const pinnedServices = favoriteEntry?.pinnedServices ?? [];

  const sortedAndFilteredServices = useMemo(() => {
    const services = arrivalData?.Services ?? [];
    const q = serviceQuery.trim().toLowerCase();

    const filtered = services.filter((svc) => {
      if (q && !svc.ServiceNo.toLowerCase().includes(q) && !svc.DestinationName.toLowerCase().includes(q)) {
        return false;
      }
      if (filterMode === 'pinned') {
        return pinnedServices.includes(svc.ServiceNo);
      }
      if (filterMode === 'soon') {
        const mins = getMinutesUntilArrival(svc.NextBus.EstimatedArrival, nowMs);
        return mins !== null && mins <= 5;
      }
      return true;
    });

    // Sort pinned services to the top, then natural numeric bus order
    return [...filtered].sort((a, b) => {
      const aPinned = pinnedServices.includes(a.ServiceNo) ? 0 : 1;
      const bPinned = pinnedServices.includes(b.ServiceNo) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;

      const aNum = parseInt(a.ServiceNo.replace(/\D/g, ''), 10) || 0;
      const bNum = parseInt(b.ServiceNo.replace(/\D/g, ''), 10) || 0;
      if (aNum !== bNum) return aNum - bNum;
      return a.ServiceNo.localeCompare(b.ServiceNo);
    });
  }, [arrivalData, serviceQuery, filterMode, pinnedServices, nowMs]);

  const handleStartEditLabel = () => {
    setLabelDraft(favoriteEntry?.customLabel || '');
    setIsEditingLabel(true);
  };

  const handleSaveLabel = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateFavoriteLabel(busStopCode, labelDraft);
    setIsEditingLabel(false);
  };

  const stopTitle = stop?.Description ?? `Bus Stop ${busStopCode}`;
  const stopRoad = stop?.RoadName ?? 'Singapore Public Bus Network';

  return (
    <section
      aria-label="Real-time bus arrival board"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
    >
      {/* Stop Identity & Favorite Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono-tabular font-bold text-sm text-blue-700 dark:text-blue-400">
                Stop {busStopCode}
              </span>
              <span aria-hidden="true">·</span>
              <span>{stopRoad}</span>
              {stop?.NearbyMrt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Near {stop.NearbyMrt}</span>
                </>
              )}
              {stop && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{stop.Region}</span>
                </>
              )}
            </div>

            <div className="mt-1.5 flex items-center flex-wrap gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
                {stopTitle}
              </h1>
              {favoriteEntry?.customLabel && !isEditingLabel && (
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  ({favoriteEntry.customLabel})
                </span>
              )}
            </div>

            {isFav && isEditingLabel && (
              <form onSubmit={handleSaveLabel} className="mt-3 flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  placeholder="Nickname (e.g. Home, Office)"
                  maxLength={28}
                  autoFocus
                  className="flex-1 min-h-[38px] px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingLabel(false)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>

          {/* Primary Stop Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isFav && !isEditingLabel && (
              <button
                type="button"
                onClick={handleStartEditLabel}
                className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{favoriteEntry?.customLabel ? 'Rename' : 'Add Label'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggleFavorite(busStopCode)}
              aria-pressed={isFav}
              className={`min-h-[40px] px-4 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                isFav
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/70 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Star className={`w-4 h-4 ${isFav ? 'fill-current text-amber-500' : ''}`} aria-hidden="true" />
              <span>{isFav ? 'Saved' : 'Save Stop'}</span>
            </button>
          </div>
        </div>

        {/* Data source notice when awaiting LTA_ACCOUNT_KEY or unlisted 5-digit stop */}
        {arrivalData?.DataSource === 'simulation' && (
          <div className="mt-4 px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300">
            {arrivalData.ApiNote ??
              `Stop ${busStopCode} is displaying simulated arrival data until LTA_ACCOUNT_KEY is configured.`}
          </div>
        )}

        {/* Toolbar: Service Filters & Refresh Controls */}
        <div className="mt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Segmented Filter */}
            <div
              role="tablist"
              aria-label="Filter bus services"
              className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              <button
                type="button"
                role="tab"
                aria-selected={filterMode === 'all'}
                onClick={() => setFilterMode('all')}
                className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Services ({arrivalData?.Services.length ?? 0})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterMode === 'pinned'}
                onClick={() => setFilterMode('pinned')}
                className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterMode === 'pinned'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Pinned ({pinnedServices.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterMode === 'soon'}
                onClick={() => setFilterMode('soon')}
                className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterMode === 'soon'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Arriving ≤ 5m
              </button>
            </div>

            {/* Filter by bus service number */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                placeholder="Filter bus no."
                aria-label="Filter bus service number"
                className="min-h-[38px] w-36 sm:w-44 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Live Refresh Timing Controls */}
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-mono-tabular">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString('en-SG', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                    })}`
                  : 'Loading...'}
              </span>
            </span>

            <button
              type="button"
              onClick={onToggleAutoRefresh}
              className="min-h-[34px] px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              title={autoRefreshEnabled ? 'Pause automatic refresh' : 'Resume automatic refresh'}
            >
              {autoRefreshEnabled ? (
                <>
                  <Pause className="w-3 h-3" aria-hidden="true" />
                  <span className="font-mono-tabular">{secondsToNextRefresh}s</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" aria-hidden="true" />
                  <span>Paused</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onManualRefresh}
              disabled={isLoading}
              aria-label="Refresh bus arrivals now"
              className="min-h-[34px] px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Column Headers (Desktop) */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-2.5 bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
        <div className="col-span-4">Service &amp; Destination</div>
        <div className="col-span-3">Next Bus</div>
        <div className="col-span-2">2nd Bus</div>
        <div className="col-span-2">3rd Bus</div>
        <div className="col-span-1 text-right">Details</div>
      </div>

      {/* Arrival Rows */}
      {error ? (
        <div className="p-8 text-center">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={onManualRefresh}
            className="mt-3 min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : isLoading && !arrivalData ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="px-6 py-5 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-8 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2">
                  <div className="w-36 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="w-24 h-3 rounded bg-slate-100 dark:bg-slate-800/60" />
                </div>
              </div>
              <div className="w-28 h-8 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : sortedAndFilteredServices.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-base font-medium text-slate-800 dark:text-slate-200">
            No matching bus services found
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {filterMode === 'pinned'
              ? 'Click the pin icon next to any service number to pin your regular buses here.'
              : 'Try clearing the service filter or switching back to all services.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              setServiceQuery('');
            }}
            className="mt-4 min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer"
          >
            Show All Services
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedAndFilteredServices.map((svc: BusServiceArrival) => {
            const isPinned = pinnedServices.includes(svc.ServiceNo);
            const isExpanded = expandedService === svc.ServiceNo;

            return (
              <div key={svc.ServiceNo} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                <div className="px-4 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Service Number & Route */}
                  <div className="md:col-span-4 flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onTogglePinnedService(busStopCode, svc.ServiceNo)}
                      aria-label={
                        isPinned
                          ? `Unpin service ${svc.ServiceNo}`
                          : `Pin service ${svc.ServiceNo} to top`
                      }
                      aria-pressed={isPinned}
                      className={`min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg transition-colors shrink-0 cursor-pointer ${
                        isPinned
                          ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950/70'
                          : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-mono-tabular text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                          {svc.ServiceNo}
                        </span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {svc.Operator}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        To {svc.DestinationName}
                      </p>
                    </div>

                    {/* Mobile expand toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedService(isExpanded ? null : svc.ServiceNo)}
                      aria-expanded={isExpanded}
                      aria-label={`Toggle details for service ${svc.ServiceNo}`}
                      className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Mobile 3-column arrival strip vs Desktop aligned columns */}
                  <div className="grid grid-cols-3 md:contents gap-3 pt-1 md:pt-0 border-t border-slate-100 dark:border-slate-800/80 md:border-0">
                    <div className="md:col-span-3">
                      <span className="md:hidden block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1">
                        Next
                      </span>
                      <ArrivalSlot bus={svc.NextBus} isPrimary={true} nowMs={nowMs} />
                    </div>

                    <div className="md:col-span-2">
                      <span className="md:hidden block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1">
                        2nd Bus
                      </span>
                      <ArrivalSlot bus={svc.NextBus2} isPrimary={false} nowMs={nowMs} />
                    </div>

                    <div className="md:col-span-2">
                      <span className="md:hidden block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1">
                        3rd Bus
                      </span>
                      <ArrivalSlot bus={svc.NextBus3} isPrimary={false} nowMs={nowMs} />
                    </div>
                  </div>

                  {/* Desktop Expand Toggle */}
                  <div className="hidden md:flex md:col-span-1 justify-end">
                    <button
                      type="button"
                      onClick={() => setExpandedService(isExpanded ? null : svc.ServiceNo)}
                      aria-expanded={isExpanded}
                      aria-label={`Toggle details for service ${svc.ServiceNo}`}
                      className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Inline Route & Telemetry Details */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-4 pt-1 bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/70">
                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400 py-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {svc.OriginName} → {svc.DestinationName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Typical headway: {svc.FrequencyMinutes}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {svc.NextBus.Monitored === 1 ? 'GPS monitored' : 'Scheduled timetable'}
                        </span>
                      </div>
                      <div className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
                        ETAs: {formatClockTimeSG(svc.NextBus.EstimatedArrival)} /{' '}
                        {formatClockTimeSG(svc.NextBus2.EstimatedArrival)} /{' '}
                        {formatClockTimeSG(svc.NextBus3.EstimatedArrival)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
