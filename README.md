# Knowdown

Real-time multiplayer trivia game. Players join a room by 6-char code, race to answer questions, fastest correct answers score most.

Monorepo: `/client` (Vite + React + TS) and `/server` (Express + ws + Postgres + TS).

## Features

- **Live multiplayer rooms** — create or join by 6-char code, host migration if the host leaves.
- **Randomized rounds** — questions are drawn from a categorized bank and re-shuffled (questions *and* answer order) every game, so no two rounds repeat.
- **Time-weighted scoring** with a **consecutive-correct streak bonus** — answer fast and keep your streak alive.
- **Keyboard play** — answer with `A`/`B`/`C`/`D` or `1`–`4`.
- **Quality-of-life UX** — name is remembered across sessions, one-click room-code copy, auto-reconnect, category badges, per-round score deltas.
- **Hall of Fame** — top scores persisted to Postgres and shown on the end screen.
- **Resilient server** — heartbeat ping/pong, input sanitization, per-room/global capacity limits, graceful shutdown, and an auto-applied schema migration on boot.

## Local setup

Requires Node 18+ and Postgres 14+.

### 1. Install

```bash
npm install
```

(Root `package.json` declares both workspaces, so this installs deps for client and server.)

### 2. Database

```bash
createdb knowdown
psql -d knowdown -f server/db/schema.sql
```

### 3. Environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env`:

```
DATABASE_URL=postgres://USER@localhost:5432/knowdown
PORT=4000
CORS_ORIGIN=*
```

For local dev, leave `client/.env` empty — the client falls back to `ws://localhost:4000` and `http://localhost:4000`.

### 4. Run

```bash
npm run dev
```

Starts client on `http://localhost:5173` and server on `http://localhost:4000` concurrently.

Useful single-side scripts: `npm run dev:client`, `npm run dev:server`.

## Architecture

- **WebSocket** (`server/src/ws.ts`) — room lifecycle, player tracking, heartbeat, input sanitization, capacity limits, host migration
- **Game engine** (`server/src/gameEngine.ts`) — round loop, 15s timer, streak-aware scoring, persistence on `GAME_OVER`
- **Question bank** (`server/src/questions.ts`) — categorized questions + deterministic-testable shuffle/pick
- **Scoring** (`server/src/scoring.ts`) — pure `timeScore` / `streakBonus` helpers
- **DB layer** (`server/src/db.ts`) — `pg` pool, boot-time `initDb` migration, `dbHealth`, `saveGameResult`, `getLeaderboard`
- **REST** (`server/src/index.ts`) — `GET /health` (status + db + room count + uptime), `GET /api/leaderboard`
- **Client state machine** (`client/src/App.tsx`) — `home → lobby → question → results → end`

Message types are mirrored in [`client/src/types.ts`](client/src/types.ts).

## Testing & CI

```bash
npm test        # vitest — scoring, question bank, input sanitization
npm run typecheck
npm run build
```

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs typecheck → test → build on every push and PR to `main`.

## Deploy

### Frontend — Vercel

1. Import the repo in Vercel, set **Root Directory** to `client`.
2. Vercel auto-detects Vite via [`client/vercel.json`](client/vercel.json) (build: `vite build`, output: `dist`).
3. Add env vars in Vercel project settings:
   - `VITE_WS_URL` = `wss://your-railway-app.up.railway.app`
   - `VITE_API_URL` = `https://your-railway-app.up.railway.app`
4. Deploy.

### Backend — Railway

1. New project → Deploy from GitHub repo, set **Root Directory** to `server`.
2. Railway reads [`server/railway.toml`](server/railway.toml): build = `npm install && npm run build`, start = `node dist/index.js`. ([`Procfile`](server/Procfile) provided as fallback.)
3. Add a **Postgres** plugin in the same project → `DATABASE_URL` is injected automatically.
4. Set env vars:
   - `CORS_ORIGIN` = `https://your-vercel-app.vercel.app` (comma-separate multiple)
   - `PORT` is set by Railway, do not override.
   - Optional tuning: `QUESTION_COUNT` (default 10), `MAX_PLAYERS_PER_ROOM` (default 12), `MAX_ROOMS` (default 1000).
5. The schema is applied automatically on boot (`initDb` runs idempotently), so no manual migration step is required. If you prefer to run it by hand:

   ```bash
   psql "$RAILWAY_DATABASE_URL" -f server/db/schema.sql
   ```

6. Copy the public URL back into Vercel's `VITE_WS_URL` / `VITE_API_URL` and redeploy the frontend.

### Notes

- WebSocket URL must use `wss://` in production (Vercel serves HTTPS, mixed-content blocks `ws://`).
- Railway's hostname is the same for HTTP and WS — no separate WS endpoint needed.
- `CORS_ORIGIN=*` is fine for dev, but lock it down to the Vercel domain in production.
