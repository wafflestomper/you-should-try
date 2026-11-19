-- Genres (from TMDB / Open Library) and moods (guessed by AI, fixable by anyone) for each item
CREATE TABLE item_facets (
  item_id TEXT NOT NULL REFERENCES items(id),
  type TEXT NOT NULL,          -- genre | mood
  tag TEXT NOT NULL,
  source TEXT NOT NULL,        -- db | ai | user
  PRIMARY KEY (item_id, type, tag)
);
CREATE INDEX item_facets_tag ON item_facets (type, tag);
ALTER TABLE items ADD COLUMN facets_at TEXT;        -- when genres and moods were last worked out
ALTER TABLE items ADD COLUMN moods_by_user INTEGER NOT NULL DEFAULT 0;  -- someone fixed the moods: AI leaves them alone
