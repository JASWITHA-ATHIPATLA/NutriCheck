import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createApiApp } from './scripts/api-fallback.mjs';
import { connectMongoDB } from './scripts/db/mongodb.mjs';

async function startServer() {
  const port = Number(process.env.PORT) || 3000;
  const host = '0.0.0.0';

  const app = createApiApp();

  // Ensure unmatched /api/* routes always return JSON 404 rather than HTML/plain text
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'API endpoint not found.' });
  });

  const distDir = path.resolve(process.cwd(), 'dist');
  const distIndex = path.join(distDir, 'index.html');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (existsSync(distIndex)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(distIndex);
    });
  }

  void connectMongoDB();

  app.listen(port, host, () => {
    console.log(`[NutriCheck] Full-stack server running on http://${host}:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[NutriCheck] Failed to start server:', err);
  process.exit(1);
});
