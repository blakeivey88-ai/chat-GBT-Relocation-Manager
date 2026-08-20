-- Truck seats JSON for plan fairness + remaining capacity (partials).
-- Default '[]' means seats are synthesized from plan limit until first save.
ALTER TABLE accounts ADD COLUMN truck_seats TEXT NOT NULL DEFAULT '[]';
