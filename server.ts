import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import busArrivalHandler from './api/busarrival.ts';
import healthHandler from './api/health.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Mount serverless API handlers on Express for local dev and production full-stack hosting
  app.get('/api/health', (req, res) => {
    void healthHandler(req, res);
  });

  app.get('/api/busarrival', (req, res) => {
    void busArrivalHandler(req, res);
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API route not found', code: 'NOT_FOUND' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NextBus SG server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NextBus SG server:', err);
  process.exit(1);
});
