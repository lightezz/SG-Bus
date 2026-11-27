import { SG_BUS_STOPS, getServiceMetadata } from '../data/sgBusData';
import type {
  BusArrivalResponse,
  BusFeature,
  BusLoad,
  BusServiceArrival,
  BusStop,
  BusType,
  NextBusInfo,
} from '../types/bus';

/**
 * Clean interface for swapping in a real backend / LTA DataMall proxy later.
 * To connect your real API later:
 * 1. Set VITE_BUS_API_BASE_URL in .env (e.g. "/api" pointing to your Express/Cloud proxy)
 * 2. Implement fetchFromApiProvider(busStopCode) calling `${baseUrl}/bus-arrival?BusStopCode=${busStopCode}`
 */
export interface BusDataProvider {
  getBusArrivals(busStopCode: string): Promise<BusArrivalResponse>;
  searchBusStops(query: string): BusStop[];
  getStopByCode(busStopCode: string): BusStop | undefined;
  getAllStops(): BusStop[];
}

// Deterministic hash helper so simulated buses feel consistent per stop/service while advancing smoothly over time
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
  // Time bucket advances every 15 seconds so countdowns tick realistically in real time
  const tickBucket = Math.floor(nowMs / 15_000);

  return serviceNos.map((serviceNo) => {
    const meta = getServiceMetadata(serviceNo);
    const seed = hashCode(`${busStopCode}:${serviceNo}`);
    const headway = 7 + (seed % 8); // 7 to 14 min headway

    // Compute smooth cyclical countdowns in minutes (with fractional seconds feel)
    const elapsedQuarterMins = tickBucket + (seed % 40);
    const cycleQuarterMins = headway * 4;
    const remainingQuarterMins = cycleQuarterMins - (elapsedQuarterMins % cycleQuarterMins);

    const firstMin = Math.max(0, Math.round((remainingQuarterMins / 4) * 10) / 10);
    const secondMin = firstMin + headway + (seed % 2);
    const thirdMin = secondMin + headway + ((seed >> 2) % 3);

    // Occasionally simulate a last-bus / unscheduled 3rd slot late at night or on rare routes
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

class LocalSimulationBusProvider implements BusDataProvider {
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
      // Prioritize exact or prefix bus stop code matches
      const aCodeMatch = a.BusStopCode.startsWith(q) ? 0 : 1;
      const bCodeMatch = b.BusStopCode.startsWith(q) ? 0 : 1;
      if (aCodeMatch !== bCodeMatch) return aCodeMatch - bCodeMatch;
      return a.BusStopCode.localeCompare(b.BusStopCode);
    });
  }

  async getBusArrivals(busStopCode: string): Promise<BusArrivalResponse> {
    // Brief realistic async delay (~140ms) for smooth loading transitions
    await new Promise((resolve) => setTimeout(resolve, 140));

    const cleanCode = busStopCode.trim();
    const knownStop = this.getStopByCode(cleanCode);

    if (knownStop) {
      return {
        BusStopCode: knownStop.BusStopCode,
        Services: generateSimulatedServices(knownStop.BusStopCode, knownStop.Services),
        FetchedAt: new Date().toISOString(),
        IsSimulatedPreview: false,
      };
    }

    // Fallback deterministic services if user enters an unlisted valid 5-digit Singapore stop code
    const seed = hashCode(cleanCode);
    const pool = ['7', '14', '36', '65', '97', '106', '133', '147', '174', '190', '858', '960'];
    const count = 4 + (seed % 4);
    const chosen: string[] = [];
    for (let i = 0; i < count; i++) {
      const candidate = pool[(seed + i * 3) % pool.length];
      if (!chosen.includes(candidate)) chosen.push(candidate);
    }

    return {
      BusStopCode: cleanCode,
      Services: generateSimulatedServices(cleanCode, chosen),
      FetchedAt: new Date().toISOString(),
      IsSimulatedPreview: true,
    };
  }
}

/**
 * Drop-in adapter template for connecting your live LTA DataMall proxy later:
 *
 * export class LtaProxyBusProvider implements BusDataProvider {
 *   constructor(private baseUrl: string) {}
 *   async getBusArrivals(busStopCode: string): Promise<BusArrivalResponse> {
 *     const res = await fetch(`${this.baseUrl}/bus-arrival?BusStopCode=${encodeURIComponent(busStopCode)}`);
 *     if (!res.ok) throw new Error(`Failed to fetch arrivals (${res.status})`);
 *     return res.json();
 *   }
 *   ...
 * }
 */

export const busApiService: BusDataProvider = new LocalSimulationBusProvider();

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
