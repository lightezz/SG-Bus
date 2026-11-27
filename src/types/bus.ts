export type BusOperator = 'SBST' | 'SMRT' | 'TTS' | 'GAS';

export type BusLoad = 'SEA' | 'SDA' | 'LSD' | '';

export type BusType = 'SD' | 'DD' | 'BD' | '';

export type BusFeature = 'WAB' | '';

export type SingaporeRegion = 'Central' | 'East' | 'West' | 'North' | 'North-East';

export interface NextBusInfo {
  OriginCode: string;
  DestinationCode: string;
  EstimatedArrival: string; // ISO-8601 timestamp with +08:00 or UTC
  Monitored: number; // 1 = GPS monitored, 0 = scheduled
  Latitude: string;
  Longitude: string;
  VisitNumber: string;
  Load: BusLoad;
  Feature: BusFeature;
  Type: BusType;
}

export interface BusServiceArrival {
  ServiceNo: string;
  Operator: BusOperator;
  DestinationName: string;
  OriginName: string;
  FrequencyMinutes: string;
  NextBus: NextBusInfo;
  NextBus2: NextBusInfo;
  NextBus3: NextBusInfo;
}

export interface BusArrivalResponse {
  'odata.metadata'?: string;
  BusStopCode: string;
  Services: BusServiceArrival[];
  FetchedAt: string;
  IsSimulatedPreview?: boolean;
}

export interface BusStop {
  BusStopCode: string;
  RoadName: string;
  Description: string;
  Region: SingaporeRegion;
  NearbyMrt?: string;
  Latitude: number;
  Longitude: number;
  Services: string[];
}

export interface FavoriteStop {
  busStopCode: string;
  customLabel?: string;
  addedAt: number;
  pinnedServices: string[];
}

export type AppView = 'arrivals' | 'favorites' | 'directory' | 'api-guide';
