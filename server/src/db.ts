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
