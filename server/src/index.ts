import 'dotenv/config';
import express from 'express';
import http from 'http';
import { getLeaderboard } from './db';
import { attachWebSocketServer } from './ws';

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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
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
server.listen(port, () => {
  console.log(`Knowdown server listening on :${port}`);
});
