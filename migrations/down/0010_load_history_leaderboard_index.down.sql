-- Reverse of 0010_load_history_leaderboard_index.up.sql. Index-only; safe to
-- drop with no data impact.
DROP INDEX IF EXISTS idx_load_history_verified_completed;
