import 'dotenv/config';
import express from 'express';
import http from 'http';
import { attachWebSocketServer } from './ws';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
attachWebSocketServer(server);

const port = Number(process.env.PORT) || 3001;
server.listen(port, () => {
  console.log(`Knowdown server listening on :${port}`);
});
