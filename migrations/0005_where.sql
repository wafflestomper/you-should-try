-- Where to get things: streaming (TMDB / JustWatch) and Libby availability (via Shelf Check).
ALTER TABLE items ADD COLUMN tmdb_ref TEXT;          -- 'movie:123' or 'tv:456'; '' when TMDB has no match

CREATE TABLE user_libraries (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lib_key TEXT NOT NULL,                             -- Libby library key, e.g. 'henrico'
  name TEXT NOT NULL,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, lib_key)
);

CREATE TABLE where_cache (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,                               -- 'stream' or 'lib:<key>'
  data TEXT NOT NULL,                                -- JSON
  fetched_at INTEGER NOT NULL,                       -- epoch ms
  PRIMARY KEY (item_id, scope)
);
