import type { IncomingMessage, ServerResponse } from 'node:http';

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

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse
): Promise<void> {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const hasAccountKey = Boolean(process.env.LTA_ACCOUNT_KEY?.trim());

  res.setHeader('Cache-Control', 'no-store');
  sendJson(res, 200, {
    status: 'ok',
    service: 'nextbus-sg-api',
    ltaConfigured: hasAccountKey,
    timestamp: new Date().toISOString(),
  });
}
