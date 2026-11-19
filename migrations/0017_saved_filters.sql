-- Named board filters each person saves for themselves ("Three Amigos", "7th grade team")
CREATE TABLE saved_filters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  people TEXT NOT NULL DEFAULT '[]',   -- ["u:<id>", "g:<id>"]: whose picks to show
  kinds TEXT NOT NULL DEFAULT '[]',    -- ["book", "tv"]; empty means every type
  via INTEGER NOT NULL DEFAULT 1,      -- 1: also what they passed along (entered for someone else)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX saved_filters_user ON saved_filters (user_id, name);
