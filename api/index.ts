import { createApiApp } from '../scripts/api-fallback.mjs';
import { connectMongoDB } from '../scripts/db/mongodb.mjs';

const app = createApiApp();

app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: 'API endpoint not found.' });
});

export default async function handler(req: any, res: any) {
  await connectMongoDB().catch(() => {});
  return app(req, res);
}
