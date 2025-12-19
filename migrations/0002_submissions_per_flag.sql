-- Migration number: 0002  2025-12-19
-- Convert submissions table to per-flag rows (no flag plaintext stored)
-- Enforces: one correct submission per student per flag_index

PRAGMA foreign_keys=OFF;

-- If an old submissions table exists, replace it with the new shape.
-- D1/SQLite doesn't support DROP COLUMN cleanly, so rebuild the table.

CREATE TABLE IF NOT EXISTS submissions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  flag_index INTEGER NOT NULL, -- 1..3
  is_correct INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(student_id, flag_index)
);

-- Best-effort backfill: only keep rows that can be inferred.
-- Old schema stored flag TEXT; we can't infer which flag_index it was, so we skip copying.

DROP TABLE IF EXISTS submissions;
ALTER TABLE submissions_new RENAME TO submissions;

CREATE INDEX IF NOT EXISTS idx_submissions_student_created
ON submissions(student_id, created_at);

PRAGMA foreign_keys=ON;
