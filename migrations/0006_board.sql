-- Reshape: one shared board of "you should try" recommendations.

CREATE TABLE realms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO realms (id, name) VALUES ('main', 'Main board');

ALTER TABLE users ADD COLUMN realm_id TEXT NOT NULL DEFAULT 'main';
ALTER TABLE users ADD COLUMN how_known TEXT;               -- "St. Chris", "Tennis"...

-- People who recommended something but aren't members (yet).
CREATE TABLE guests (
  id TEXT PRIMARY KEY,
  realm_id TEXT NOT NULL DEFAULT 'main',
  name TEXT NOT NULL,
  email TEXT,
  added_by TEXT REFERENCES users(id),
  user_id TEXT REFERENCES users(id),                        -- set once they join
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per "X recommended Y". Several rows can point at the same item.
CREATE TABLE recs (
  id TEXT PRIMARY KEY,
  realm_id TEXT NOT NULL DEFAULT 'main',
  item_id TEXT NOT NULL REFERENCES items(id),
  by_user_id TEXT REFERENCES users(id),                     -- recommender, if a member
  by_guest_id TEXT REFERENCES guests(id),                   -- recommender, if not
  added_by TEXT NOT NULL REFERENCES users(id),              -- who typed it in
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX recs_item ON recs(item_id);
CREATE INDEX recs_realm_time ON recs(realm_id, created_at);

-- Each person's own relationship to an item on the board.
CREATE TABLE reactions (
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  state TEXT NOT NULL,                                      -- saved | hidden | done
  reaction TEXT,                                            -- loved | liked | not_for_me
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO settings (key, value) VALUES ('match_min_shared', '5');
