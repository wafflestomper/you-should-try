-- Episode tracking for TV shows. Private to each person.
-- (season, episode) is the last episode watched; season 1, episode 0 means "haven't started".
CREATE TABLE tv_progress (
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  season INTEGER NOT NULL DEFAULT 1,
  episode INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'watching',   -- watching | stopped
  caught_up_at TEXT,                          -- set while there's nothing left to watch; drives the "New episode" tag
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX tv_progress_user ON tv_progress (user_id, status, updated_at);

-- Show facts from TMDB (seasons, episode counts, last and next episode), refreshed every few hours
CREATE TABLE tv_meta (item_id TEXT PRIMARY KEY REFERENCES items(id), data TEXT NOT NULL, fetched_at INTEGER NOT NULL);
-- Episode names and air dates for one season, fetched when someone opens that season
CREATE TABLE tv_season (item_id TEXT NOT NULL REFERENCES items(id), season INTEGER NOT NULL, data TEXT NOT NULL, fetched_at INTEGER NOT NULL, PRIMARY KEY (item_id, season));
