-- Migration number: 0002  2025-12-19
-- Convert submissions table to per-flag rows (no flag plaintext stored)
-- Enforces: one accepted (correct) submission per student per flag_index
--
-- NOTE: This migration tries to preserve existing data by mapping historical
-- correct submissions to flag_index=1..3 in chronological order per student.

PRAGMA foreign_keys=OFF;

-- If submissions already has flag_index, do nothing.
-- (SQLite doesn't have IF column exists, so we rebuild safely via rename.)

ALTER TABLE submissions RENAME TO submissions_legacy;

CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  flag_index INTEGER NOT NULL, -- 1..3
  is_correct INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  UNIQUE(student_id, flag_index)
);

-- Backfill: take up to the first 3 correct submissions per student as flag_index 1..3.
INSERT INTO submissions (student_id, name, flag_index, is_correct, created_at, ip_hash, user_agent)
SELECT
  student_id,
  name,
  rn AS flag_index,
  1 AS is_correct,
  created_at,
  ip_hash,
  user_agent
FROM (
  SELECT
    student_id,
    name,
    created_at,
    ip_hash,
    user_agent,
    ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at ASC, id ASC) AS rn
  FROM submissions_legacy
  WHERE is_correct = 1
)
WHERE rn BETWEEN 1 AND 3;

CREATE INDEX IF NOT EXISTS idx_submissions_student_created
ON submissions(student_id, created_at);

PRAGMA foreign_keys=ON;
