import { SG_BUS_STOPS, getServiceMetadata } from '../data/sgBusData';
import type {
  BusArrivalResponse,
  BusFeature,
  BusLoad,
  BusOperator,
  BusServiceArrival,
  BusStop,
  BusType,
  HealthCheckResponse,
  NextBusInfo,
} from '../types/bus';

export interface BusDataProvider {
  getBusArrivals(busStopCode: string, serviceNo?: string): Promise<BusArrivalResponse>;
  checkHealth(): Promise<HealthCheckResponse>;
  searchBusStops(query: string): BusStop[];
  getStopByCode(busStopCode: string): BusStop | undefined;
  getAllStops(): BusStop[];
}

interface RawLtaBusArrivalResponse {
  'odata.metadata'?: string;
  BusStopCode: string;
  Services: Array<{
    ServiceNo: string;
    Operator: BusOperator;
    NextBus: NextBusInfo;
    NextBus2: NextBusInfo;
    NextBus3: NextBusInfo;
  }>;
}

const BUS_STOP_CODE_REGEX = /^\d{5}$/;

async function safeParseJson<T>(res: Response): Promise<{ ok: true; data: T } | { ok: false; isHtml: boolean }> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const rawText = await res.text();
  const trimmed = rawText.trim();

  if (!trimmed || trimmed.startsWith('<') || contentType.includes('text/html')) {
    return { ok: false, isHtml: true };
  }

  try {
    return { ok: true, data: JSON.parse(trimmed) as T };
  } catch {
    return { ok: false, isHtml: false };
  }
}

// Deterministic hash helper for offline preview fallback when LTA_ACCOUNT_KEY is not yet configured
function hashCode(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildSimulatedBus(
  seed: number,
  minutesFromNow: number,
  nowMs: number,
  busStopCode: string
): NextBusInfo {
  const arrivalTime = new Date(nowMs + minutesFromNow * 60_000);
  const loads: BusLoad[] = ['SEA', 'SEA', 'SDA', 'SEA', 'LSD', 'SDA'];
  const types: BusType[] = ['SD', 'DD', 'DD', 'SD', 'BD'];
  const features: BusFeature[] = ['WAB', 'WAB', 'WAB', 'WAB', ''];

  return {
    OriginCode: busStopCode,
    DestinationCode: String((seed % 89000) + 10000),
    EstimatedArrival: arrivalTime.toISOString(),
    Monitored: 1,
    Latitude: '1.3048',
    Longitude: '103.8321',
    VisitNumber: '1',
    Load: loads[seed % loads.length],
    Feature: features[seed % features.length],
    Type: types[seed % types.length],
  };
}

function createEmptyNextBus(): NextBusInfo {
  return {
    OriginCode: '',
    DestinationCode: '',
    EstimatedArrival: '',
    Monitored: 0,
    Latitude: '0',
    Longitude: '0',
    VisitNumber: '1',
    Load: '',
    Feature: '',
    Type: '',
  };
}

function generateSimulatedServices(busStopCode: string, serviceNos: string[]): BusServiceArrival[] {
  const nowMs = Date.now();
  const tickBucket = Math.floor(nowMs / 20_000);

  return serviceNos.map((serviceNo) => {
    const meta = getServiceMetadata(serviceNo);
    const seed = hashCode(`${busStopCode}:${serviceNo}`);
    const headway = 7 + (seed % 8);

    const elapsedBuckets = tickBucket + (seed % 30);
    const cycleBuckets = headway * 3;
    const remainingBuckets = cycleBuckets - (elapsedBuckets % cycleBuckets);

    const firstMin = Math.max(0, Math.round((remainingBuckets / 3) * 10) / 10);
    const secondMin = firstMin + headway + (seed % 2);
    const thirdMin = secondMin + headway + ((seed >> 2) % 3);
    const hasThird = (seed % 11) !== 0;

    return {
      ServiceNo: serviceNo,
      Operator: meta.operator,
      OriginName: meta.origin,
      DestinationName: meta.destination,
      FrequencyMinutes: meta.frequency,
      NextBus: buildSimulatedBus(seed + 1, firstMin, nowMs, busStopCode),
      NextBus2: buildSimulatedBus(seed + 2, secondMin, nowMs, busStopCode),
      NextBus3: hasThird
        ? buildSimulatedBus(seed + 3, thirdMin, nowMs, busStopCode)
        : createEmptyNextBus(),
    };
  });
}

class LtaHybridBusProvider implements BusDataProvider {
  getAllStops(): BusStop[] {
    return SG_BUS_STOPS;
  }

  getStopByCode(busStopCode: string): BusStop | undefined {
    const normalized = busStopCode.trim();
    return SG_BUS_STOPS.find((stop) => stop.BusStopCode === normalized);
  }

  searchBusStops(query: string): BusStop[] {
    const q = query.trim().toLowerCase();
    if (!q) return SG_BUS_STOPS;

    return SG_BUS_STOPS.filter((stop) => {
      return (
        stop.BusStopCode.includes(q) ||
        stop.Description.toLowerCase().includes(q) ||
        stop.RoadName.toLowerCase().includes(q) ||
        (stop.NearbyMrt && stop.NearbyMrt.toLowerCase().includes(q)) ||
        stop.Services.some((s) => s.toLowerCase() === q)
      );
    }).sort((a, b) => {
      const aCodeMatch = a.BusStopCode.startsWith(q) ? 0 : 1;
      const bCodeMatch = b.BusStopCode.startsWith(q) ? 0 : 1;
      if (aCodeMatch !== bCodeMatch) return aCodeMatch - bCodeMatch;
      return a.BusStopCode.localeCompare(b.BusStopCode);
    });
  }

  async checkHealth(): Promise<HealthCheckResponse> {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const parsed = await safeParseJson<HealthCheckResponse>(res);
      if (!parsed.ok) {
        throw new Error(
          parsed.isHtml
            ? 'Serverless /api/health endpoint is unavailable in static preview mode.'
            : `Health endpoint returned an unexpected response (status ${res.status}).`
        );
      }
      if (!res.ok) {
        throw new Error(`Health endpoint failed with status ${res.status}.`);
      }
      return parsed.data;
    } catch (err) {
      if (err instanceof TypeError || err instanceof SyntaxError) {
        throw new Error('Serverless /api/health endpoint is unreachable in this preview.');
      }
      throw err;
    }
  }

  private buildSimulationResponse(busStopCode: string, apiNote: string, serviceNo?: string): BusArrivalResponse {
    const knownStop = this.getStopByCode(busStopCode);
    if (knownStop) {
      const targetServices = serviceNo
        ? knownStop.Services.filter((s) => s.toLowerCase() === serviceNo.toLowerCase())
        : knownStop.Services;
      return {
        BusStopCode: knownStop.BusStopCode,
        Services: generateSimulatedServices(
          knownStop.BusStopCode,
          targetServices.length ? targetServices : [serviceNo || '7']
        ),
        FetchedAt: new Date().toISOString(),
        DataSource: 'simulation',
        ApiNote: apiNote,
        IsSimulatedPreview: false,
      };
    }

    const seed = hashCode(busStopCode);
    const pool = ['7', '14', '36', '65', '97', '106', '133', '147', '174', '190', '858', '960'];
    const count = 4 + (seed % 4);
    const chosen: string[] = [];
    for (let i = 0; i < count; i++) {
      const candidate = pool[(seed + i * 3) % pool.length];
      if (!chosen.includes(candidate)) chosen.push(candidate);
    }

    return {
      BusStopCode: busStopCode,
      Services: generateSimulatedServices(busStopCode, serviceNo ? [serviceNo] : chosen),
      FetchedAt: new Date().toISOString(),
      DataSource: 'simulation',
      ApiNote: apiNote,
      IsSimulatedPreview: true,
    };
  }

  async getBusArrivals(busStopCode: string, serviceNo?: string): Promise<BusArrivalResponse> {
    const cleanCode = busStopCode.trim();
    if (!BUS_STOP_CODE_REGEX.test(cleanCode)) {
      throw new Error('Please enter a valid 5-digit Singapore bus stop code (e.g. 04121).');
    }

    const params = new URLSearchParams({ BusStopCode: cleanCode });
    if (serviceNo?.trim()) {
      params.set('ServiceNo', serviceNo.trim());
    }

    try {
      const res = await fetch(`/api/busarrival?${params.toString()}`, {
        cache: 'no-store',
      });

      const parsed = await safeParseJson<RawLtaBusArrivalResponse & { error?: string; code?: string }>(res);

      // If static hosting returns index.html instead of a serverless JSON response, fall back cleanly
      if (!parsed.ok) {
        return this.buildSimulationResponse(
          cleanCode,
          'Serverless /api/busarrival endpoint is not active in this static preview. Showing simulated arrival data.',
          serviceNo
        );
      }

      if (res.ok && Array.isArray(parsed.data.Services)) {
        const raw = parsed.data;
        const enrichedServices: BusServiceArrival[] = raw.Services.map((svc) => {
          const meta = getServiceMetadata(svc.ServiceNo);
          const destCode = svc.NextBus?.DestinationCode;
          const destStop = destCode ? this.getStopByCode(destCode) : undefined;
          return {
            ServiceNo: svc.ServiceNo,
            Operator: svc.Operator || meta.operator,
            OriginName: meta.origin,
            DestinationName: destStop ? destStop.Description : meta.destination,
            FrequencyMinutes: meta.frequency,
            NextBus: svc.NextBus ?? createEmptyNextBus(),
            NextBus2: svc.NextBus2 ?? createEmptyNextBus(),
            NextBus3: svc.NextBus3 ?? createEmptyNextBus(),
          };
        });

        return {
          'odata.metadata': raw['odata.metadata'],
          BusStopCode: raw.BusStopCode || cleanCode,
          Services: enrichedServices,
          FetchedAt: new Date().toISOString(),
          DataSource: 'lta-live',
          IsSimulatedPreview: false,
        };
      }

      if (res.status === 503 && parsed.data?.code === 'MISSING_API_KEY') {
        return this.buildSimulationResponse(
          cleanCode,
          'LTA_ACCOUNT_KEY is not configured yet. Showing simulated preview until your key is added.',
          serviceNo
        );
      }

      throw new Error(parsed.data?.error || `Serverless proxy returned status ${res.status}.`);
    } catch (err) {
      if (err instanceof TypeError || err instanceof SyntaxError) {
        return this.buildSimulationResponse(
          cleanCode,
          'Serverless API endpoint unreachable. Showing local preview.',
          serviceNo
        );
      }
      throw err;
    }
  }
}

export const busApiService: BusDataProvider = new LtaHybridBusProvider();

export function getMinutesUntilArrival(estimatedArrivalIso: string, nowMs = Date.now()): number | null {
  if (!estimatedArrivalIso) return null;
  const targetMs = Date.parse(estimatedArrivalIso);
  if (Number.isNaN(targetMs)) return null;
  const diffMin = Math.floor((targetMs - nowMs) / 60_000);
  return Math.max(0, diffMin);
}

export function formatClockTimeSG(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatLoadLabel(load: BusLoad): { label: string; shortLabel: string; tone: 'emerald' | 'amber' | 'crimson' | 'neutral' } {
  switch (load) {
    case 'SEA':
      return { label: 'Seats Available', shortLabel: 'Seats', tone: 'emerald' };
    case 'SDA':
      return { label: 'Standing Available', shortLabel: 'Standing', tone: 'amber' };
    case 'LSD':
      return { label: 'Limited Standing', shortLabel: 'Crowded', tone: 'crimson' };
    default:
      return { label: 'Unknown Load', shortLabel: 'N/A', tone: 'neutral' };
  }
}

export function formatBusTypeLabel(type: BusType): { label: string; shortLabel: string } {
  switch (type) {
    case 'DD':
      return { label: 'Double Deck', shortLabel: 'DD' };
    case 'BD':
      return { label: 'Bendy Bus', shortLabel: 'BD' };
    case 'SD':
      return { label: 'Single Deck', shortLabel: 'SD' };
    default:
      return { label: 'Standard', shortLabel: '—' };
  }
}
