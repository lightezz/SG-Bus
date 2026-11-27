import { Check, Copy, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { busApiService } from '../services/busApiService';
import type { BusArrivalResponse, HealthCheckResponse } from '../types/bus';

interface ApiGuideViewProps {
  activeStopCode: string;
  arrivalData: BusArrivalResponse | null;
}

export function ApiGuideView({ activeStopCode, arrivalData }: ApiGuideViewProps) {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const runHealthCheck = async () => {
    setCheckingHealth(true);
    setHealthError(null);
    try {
      const result = await busApiService.checkHealth();
      setHealth(result);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Unable to reach /api/health');
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    void runHealthCheck();
  }, []);

  const endpointSample = `/api/busarrival?BusStopCode=${activeStopCode}`;

  const ltaSamplePayload = arrivalData
    ? JSON.stringify(
        {
          BusStopCode: arrivalData.BusStopCode,
          DataSource: arrivalData.DataSource ?? 'simulation',
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

  const handleCopyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(endpointSample);
      setCopiedEndpoint(true);
      window.setTimeout(() => setCopiedEndpoint(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <section aria-label="Serverless LTA DataMall API" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          LTA DataMall Serverless Connection
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Serverless endpoints in <span className="font-mono-tabular">/api/health.ts</span> and{' '}
          <span className="font-mono-tabular">/api/busarrival.ts</span> proxy requests to LTA DataMall v3 using your server-side{' '}
          <span className="font-mono-tabular">LTA_ACCOUNT_KEY</span> environment variable.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Serverless Endpoint Status
            </h2>
            <button
              type="button"
              onClick={runHealthCheck}
              disabled={checkingHealth}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
              <span>Test /api/health</span>
            </button>
          </div>

          {healthError ? (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {healthError}
            </div>
          ) : health ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Health Endpoint</span>
                <span className="font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                  {health.status.toUpperCase()} (/api/health)
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">LTA_ACCOUNT_KEY</span>
                <span
                  className={`font-semibold ${
                    health.ltaConfigured
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {health.ltaConfigured ? 'Configured on server' : 'Not set yet'}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Checked At</span>
                <span className="font-mono-tabular text-slate-700 dark:text-slate-300">
                  {new Date(health.timestamp).toLocaleTimeString('en-SG', { hour12: false })}
                </span>
              </div>
            </div>
          ) : null}

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Proxy Request URL (optional &amp;ServiceNo=7)
              </span>
              <button
                type="button"
                onClick={handleCopyEndpoint}
                className="min-h-[32px] px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedEndpoint ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEndpoint ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono-tabular overflow-x-auto">
              <code>GET {endpointSample}</code>
            </pre>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Add <span className="font-mono-tabular">LTA_ACCOUNT_KEY</span> in your environment variables or AI Studio Secrets panel. The server forwards it via the{' '}
              <span className="font-mono-tabular">AccountKey</span> header to{' '}
              <span className="font-mono-tabular">datamall2.mytransport.sg/ltaodataservice/v3/BusArrival</span>.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Active Stop Response Preview
            </h2>
            <span className="font-mono-tabular text-xs font-semibold text-blue-700 dark:text-blue-400">
              Stop {activeStopCode}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Current response returned for stop <span className="font-mono-tabular">{activeStopCode}</span>:
          </p>

          <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono-tabular overflow-x-auto leading-relaxed max-h-[320px]">
            <code>{ltaSamplePayload}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
