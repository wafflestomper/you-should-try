-- Short how-to videos (files live in the R2 bucket yst-videos)
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  blurb TEXT,
  topic TEXT,             -- where a "Show me" link points to it: add, board, filter, watching, invite
  file_key TEXT NOT NULL,
  poster_key TEXT,
  bytes INTEGER,
  seconds REAL,
  width INTEGER,
  height INTEGER,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
