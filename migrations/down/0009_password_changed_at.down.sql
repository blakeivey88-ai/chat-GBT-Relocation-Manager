-- SQLite/D1 cannot safely drop this column in place during an auth rollback.
-- Leaving an unused timestamp is backward-compatible; code rollback stops
-- reading and writing it.
SELECT 1;
