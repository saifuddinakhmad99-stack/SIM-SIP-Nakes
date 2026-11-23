// Enforce Asia/Jakarta (WIB) timezone before loading Express & scheduler modules
process.env.TZ = 'Asia/Jakarta';

import express from 'express';
import path from 'path';
import { serverConfig } from './src/server/config/env.ts';
import {
  apiRateLimiter,
  corsMiddleware,
  helmetMiddleware,
  sanitizeBodyMiddleware,
} from './src/server/middlewares/security.middleware.ts';
import { v1Router } from './src/server/routes/v1.routes.ts';
import { startCronScheduler } from './src/server/services/cronReminder.service.ts';

async function bootstrapServer() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(sanitizeBodyMiddleware);

  // Healthcheck endpoint (no DB probe at startup)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'SIM-SIP NAKES RSUD Sidoarjo Barat',
      timezone: serverConfig.timezone,
      serverTimeWib: new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
      }),
    });
  });

  // Mount versioned REST API v1 with rate limiting
  app.use('/api/v1', apiRateLimiter, v1Router);

  // Start daily 08.00 WIB Cron Job scheduler
  startCronScheduler();

  if (serverConfig.nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(serverConfig.port, '0.0.0.0', () => {
    console.log(
      `[SIM-SIP NAKES] Server berjalan di http://0.0.0.0:${serverConfig.port} (TZ=${process.env.TZ})`
    );
  });
}

bootstrapServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
