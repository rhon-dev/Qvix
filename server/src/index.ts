import 'dotenv/config';
import express from 'express';
import http from 'http';
import { dbHealth, getLeaderboard, initDb } from './db';
import { attachWebSocketServer, roomCount } from './ws';

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/health', async (_req, res) => {
  const db = await dbHealth();
  res.json({
    status: 'ok',
    db,
    rooms: roomCount(),
    uptime: Math.round(process.uptime()),
  });
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const rows = await getLeaderboard(10);
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error('[api] leaderboard failed', err);
    res.status(500).json({ error: 'failed to load leaderboard' });
  }
});

const server = http.createServer(app);
attachWebSocketServer(server);

const port = Number(process.env.PORT) || 4000;

async function main(): Promise<void> {
  await initDb();
  server.listen(port, () => {
    console.log(`Knowdown server listening on :${port}`);
  });
}

main().catch((err) => {
  console.error('[server] fatal startup error', err);
  process.exit(1);
});

// Graceful shutdown so platforms (Railway/Heroku) can recycle the dyno cleanly.
function shutdown(signal: string): void {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
  // Force-exit if connections don't drain in time.
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
