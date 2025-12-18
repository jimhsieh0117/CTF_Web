-- Migration number: 0001 	 2025-12-18T11:51:54.819Z
CREATE TABLE IF NOT EXISTS allowed_students (
  student_id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS players (
  student_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER NOT NULL,
  first_correct_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_players_first_correct_at
ON players(first_correct_at);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ip_hash TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
