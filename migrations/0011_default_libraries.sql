-- Libraries everyone checks unless they pick their own (set on the Admin page).
ALTER TABLE users ADD COLUMN libs_custom INTEGER NOT NULL DEFAULT 0;
INSERT OR IGNORE INTO settings (key, value) VALUES ('default_libraries', '[]');
-- Anyone who already picked libraries keeps their own list.
UPDATE users SET libs_custom = 1 WHERE id IN (SELECT DISTINCT user_id FROM user_libraries);
