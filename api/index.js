import { createApiApp } from '../scripts/api-fallback.mjs';
import { connectMongoDB } from '../scripts/db/mongodb.mjs';

const app = createApiApp();

app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: 'API endpoint not found.' });
});

export default async function handler(req, res) {
  if (typeof req?.url === 'string') {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const rewrittenPath = parsed.searchParams.get('__path');
      if (rewrittenPath) {
        parsed.searchParams.delete('__path');
        const qs = parsed.searchParams.toString();
        const cleanSubPath = rewrittenPath.replace(/^\/+/, '');
        req.url = `/api/${cleanSubPath}${qs ? `?${qs}` : ''}`;
      } else if (req.url === '/api/index' || req.url.startsWith('/api/index?')) {
        const orig =
          req.headers?.['x-vercel-original-uri'] ||
          req.headers?.['x-forwarded-uri'] ||
          req.headers?.['x-invoke-path'];
        if (typeof orig === 'string' && orig.startsWith('/api/')) {
          req.url = orig;
        }
      }
    } catch {
      // ignore URL parse issues
    }
  }
  await connectMongoDB().catch(() => {});
  return app(req, res);
}
