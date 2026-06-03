import { Pool } from 'pg';

export interface PlayerResult {
  name: string;
  score: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  room_code: string;
  played_at: string;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[db] DATABASE_URL not set — persistence disabled');
}

export const pool = connectionString
  ? new Pool({ connectionString })
  : null;

pool?.on('error', (err) => {
  console.error('[db] pool error', err);
});

/** Schema, kept in sync with db/schema.sql. Applied idempotently on boot. */
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS rooms (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'lobby',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  id       SERIAL PRIMARY KEY,
  room_id  INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  score    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id              SERIAL PRIMARY KEY,
  room_id         INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  options         JSONB NOT NULL,
  correct_answer  TEXT NOT NULL,
  order_index     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS players_room_id_idx ON players(room_id);
CREATE INDEX IF NOT EXISTS players_score_idx ON players(score DESC);
CREATE INDEX IF NOT EXISTS questions_room_id_order_idx ON questions(room_id, order_index);
`;

/**
 * Apply the schema if a database is configured. Safe to run on every boot, so
 * Railway/Heroku deploys never need a manual migration step. Returns false when
 * persistence is disabled or the database is unreachable (the game still runs).
 */
export async function initDb(): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query(SCHEMA_SQL);
    console.log('[db] schema ready');
    return true;
  } catch (err) {
    console.error('[db] schema init failed — persistence may be degraded', err);
    return false;
  }
}

/** Lightweight connectivity probe for the /health endpoint. */
export async function dbHealth(): Promise<'up' | 'down' | 'disabled'> {
  if (!pool) return 'disabled';
  try {
    await pool.query('SELECT 1');
    return 'up';
  } catch {
    return 'down';
  }
}

export async function saveGameResult(
  roomCode: string,
  players: PlayerResult[],
): Promise<void> {
  if (!pool) return;
  if (players.length === 0) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roomRes = await client.query<{ id: number }>(
      `INSERT INTO rooms (code, status)
       VALUES ($1, 'ended')
       ON CONFLICT (code) DO UPDATE SET status = 'ended'
       RETURNING id`,
      [roomCode],
    );
    const roomId = roomRes.rows[0].id;

    const values: string[] = [];
    const params: (string | number)[] = [];
    players.forEach((p, i) => {
      const base = i * 3;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      params.push(roomId, p.name, p.score);
    });
    await client.query(
      `INSERT INTO players (room_id, name, score) VALUES ${values.join(', ')}`,
      params,
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[db] saveGameResult failed', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  if (!pool) return [];
  const res = await pool.query<LeaderboardEntry>(
    `SELECT p.name, p.score, r.code AS room_code, r.created_at AS played_at
     FROM players p
     JOIN rooms r ON r.id = p.room_id
     ORDER BY p.score DESC, p.id DESC
     LIMIT $1`,
    [limit],
  );
  return res.rows;
}
