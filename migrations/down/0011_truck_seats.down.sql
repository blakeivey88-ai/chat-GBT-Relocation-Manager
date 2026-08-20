-- SQLite cannot DROP COLUMN on all older versions; leave column if present.
-- No-op down for safety in production.
SELECT 1;
