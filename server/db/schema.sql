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
