import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import type { BusArrivalResponse } from '../types/bus';

interface ApiGuideViewProps {
  activeStopCode: string;
  arrivalData: BusArrivalResponse | null;
}

const ADAPTER_SNIPPET = `// src/services/busApiService.ts
export class LtaProxyBusProvider implements BusDataProvider {
  constructor(private baseUrl: string) {}

  async getBusArrivals(busStopCode: string): Promise<BusArrivalResponse> {
    const res = await fetch(
      \`\${this.baseUrl}/bus-arrival?BusStopCode=\${encodeURIComponent(busStopCode)}\`
    );
    if (!res.ok) throw new Error(\`LTA proxy error: \${res.status}\`);
    return res.json();
  }
}

// Swap the exported provider when your backend proxy is ready:
// export const busApiService: BusDataProvider = new LtaProxyBusProvider('/api');`;

export function ApiGuideView({ activeStopCode, arrivalData }: ApiGuideViewProps) {
  const [copied, setCopied] = useState(false);

  const ltaSamplePayload = arrivalData
    ? JSON.stringify(
        {
          BusStopCode: arrivalData.BusStopCode,
          Services: arrivalData.Services.slice(0, 2).map((s) => ({
            ServiceNo: s.ServiceNo,
            Operator: s.Operator,
            NextBus: {
              EstimatedArrival: s.NextBus.EstimatedArrival,
              Load: s.NextBus.Load,
              Feature: s.NextBus.Feature,
              Type: s.NextBus.Type,
            },
            NextBus2: {
              EstimatedArrival: s.NextBus2.EstimatedArrival,
              Load: s.NextBus2.Load,
              Feature: s.NextBus2.Feature,
              Type: s.NextBus2.Type,
            },
          })),
        },
        null,
        2
      )
    : '{}';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ADAPTER_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <section aria-label="API connection guide" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          LTA DataMall API Integration
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          This frontend is structured around the LTA DataMall v3 BusArrival schema so you can connect a server-side proxy later without rewriting any UI components.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Provider Adapter Interface
            </h2>
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Snippet'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            LTA DataMall requires an <span className="font-mono-tabular">AccountKey</span> header, which should live in a backend route (<span className="font-mono-tabular">/api/bus-arrival</span>) to avoid exposing keys in the browser and to avoid CORS blocks.
          </p>

          <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono-tabular overflow-x-auto leading-relaxed">
            <code>{ADAPTER_SNIPPET}</code>
          </pre>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Active Stop Schema Preview
            </h2>
            <span className="font-mono-tabular text-xs font-semibold text-blue-700 dark:text-blue-400">
              Stop {activeStopCode}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Current simulated response payload matching LTA DataMall field names (<span className="font-mono-tabular">EstimatedArrival</span>, <span className="font-mono-tabular">Load</span>, <span className="font-mono-tabular">Feature</span>, <span className="font-mono-tabular">Type</span>):
          </p>

          <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono-tabular overflow-x-auto leading-relaxed max-h-[320px]">
            <code>{ltaSamplePayload}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
