import type { IncomingMessage, ServerResponse } from 'node:http';

const LTA_BUS_ARRIVAL_ENDPOINT =
  'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival';

const BUS_STOP_CODE_REGEX = /^\d{5}$/;
const SERVICE_NO_REGEX = /^[A-Za-z0-9]{1,6}$/;
const HEADER_SAFE_REGEX = /^[\x21-\x7E]+$/;

export interface ServerlessRequest extends IncomingMessage {
  query?: Record<string, unknown>;
}

export interface ServerlessResponse extends ServerResponse {
  status?: (code: number) => ServerlessResponse;
  json?: (body: unknown) => void;
}

function sendJson(res: ServerlessResponse, statusCode: number, payload: unknown): void {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    const statusRes = res.status(statusCode);
    if (typeof statusRes.json === 'function') {
      statusRes.json(payload);
      return;
    }
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function getQueryParam(req: ServerlessRequest, key: string): string | undefined {
  if (req.query && key in req.query) {
    const val = req.query[key];
    if (typeof val === 'string') return val;
    if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  }
  if (req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const val = parsed.searchParams.get(key);
      return val ?? undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function sanitizeAccountKey(rawKey: string | undefined): string {
  if (!rawKey) return '';
  return rawKey.trim().replace(/^["']|["']$/g, '').trim();
}

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse
): Promise<void> {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const accountKey = sanitizeAccountKey(process.env.LTA_ACCOUNT_KEY);
  if (!accountKey) {
    res.setHeader('Cache-Control', 'no-store');
    sendJson(res, 503, {
      error: 'LTA_ACCOUNT_KEY is not configured on the server.',
      code: 'MISSING_API_KEY',
    });
    return;
  }

  if (!HEADER_SAFE_REGEX.test(accountKey)) {
    res.setHeader('Cache-Control', 'no-store');
    sendJson(res, 500, {
      error: 'LTA_ACCOUNT_KEY contains invalid characters or whitespace.',
      code: 'INVALID_API_KEY_FORMAT',
    });
    return;
  }

  const rawBusStopCode = (
    getQueryParam(req, 'BusStopCode') ??
    getQueryParam(req, 'busStopCode') ??
    ''
  ).trim();

  if (!BUS_STOP_CODE_REGEX.test(rawBusStopCode)) {
    sendJson(res, 400, {
      error: 'Invalid BusStopCode. Expected a 5-digit Singapore bus stop code (e.g. 04121).',
      code: 'INVALID_BUS_STOP_CODE',
    });
    return;
  }

  const rawServiceNo = (
    getQueryParam(req, 'ServiceNo') ??
    getQueryParam(req, 'serviceNo') ??
    ''
  ).trim();

  if (rawServiceNo && !SERVICE_NO_REGEX.test(rawServiceNo)) {
    sendJson(res, 400, {
      error: 'Invalid ServiceNo format.',
      code: 'INVALID_SERVICE_NO',
    });
    return;
  }

  const upstreamUrl = new URL(LTA_BUS_ARRIVAL_ENDPOINT);
  upstreamUrl.searchParams.set('BusStopCode', rawBusStopCode);
  if (rawServiceNo) {
    upstreamUrl.searchParams.set('ServiceNo', rawServiceNo);
  }

  try {
    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        AccountKey: accountKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    const rawBody = await upstreamRes.text();

    if (!upstreamRes.ok) {
      const status =
        upstreamRes.status === 401 || upstreamRes.status === 403 ? 502 : upstreamRes.status;
      sendJson(res, status, {
        error: `LTA DataMall request failed with status ${upstreamRes.status}.`,
        code: 'UPSTREAM_ERROR',
      });
      return;
    }

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(rawBody);
    } catch {
      sendJson(res, 502, {
        error: 'LTA DataMall returned a non-JSON response.',
        code: 'UPSTREAM_INVALID_JSON',
      });
      return;
    }

    // LTA DataMall v3 refreshes every 20 seconds
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=5');
    sendJson(res, 200, parsedData);
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    sendJson(res, isTimeout ? 504 : 502, {
      error: isTimeout
        ? 'Timed out waiting for LTA DataMall.'
        : 'Unable to reach LTA DataMall service.',
      code: 'UPSTREAM_UNREACHABLE',
    });
  }
}
