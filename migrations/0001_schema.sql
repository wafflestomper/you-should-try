-- You Should Try: database tables

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  color TEXT NOT NULL DEFAULT '#2A2E2C',
  is_admin INTEGER NOT NULL DEFAULT 0,
  is_guest INTEGER NOT NULL DEFAULT 0,
  invited_by TEXT REFERENCES users(id),
  knows_note TEXT,
  status TEXT NOT NULL DEFAULT 'active',      -- active | revoked
  reviewed INTEGER NOT NULL DEFAULT 0,         -- admin has kept this person
  joined_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE circles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',           -- ok | pending
  suggested_by TEXT REFERENCES users(id),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE circle_members (
  circle_id TEXT NOT NULL REFERENCES circles(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (circle_id, user_id)
);

CREATE TABLE invites (
  code TEXT PRIMARY KEY,
  created_by TEXT NOT NULL REFERENCES users(id),
  circle_id TEXT REFERENCES circles(id),
  name TEXT,
  email TEXT,
  knows_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  used_by TEXT REFERENCES users(id),
  used_at TEXT
);

-- Main top tens
CREATE TABLE categories (
  id TEXT PRIMARY KEY,                         -- slug, e.g. mysteries
  name TEXT NOT NULL,
  kind TEXT NOT NULL,                          -- book | audiobook | movie | tv | restaurant | recipe | mixed
  sort INTEGER NOT NULL DEFAULT 0
);

-- Every book, show, place, or recipe, stored once
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,                          -- book | audiobook | movie | tv | restaurant | recipe
  title TEXT NOT NULL,
  creator TEXT,                                -- author, director, network, restaurant, recipe source
  year INTEGER,
  narrator TEXT,                               -- audiobooks
  work_id TEXT REFERENCES items(id),           -- audiobook -> the book
  city TEXT,                                   -- restaurants
  address TEXT,
  url TEXT,                                    -- recipe link, restaurant website
  image_url TEXT,
  source TEXT,                                 -- tmdb | openlibrary | hardcover | osm | link | manual | demo
  source_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source, source_id)
);

-- Suggested tags pulled from outside sources
CREATE TABLE item_tags (
  item_id TEXT NOT NULL REFERENCES items(id),
  label TEXT NOT NULL,
  PRIMARY KEY (item_id, label)
);

CREATE TABLE lists (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  category_id TEXT REFERENCES categories(id),
  custom_subtitle TEXT,                        -- used when category_id is null
  kind TEXT NOT NULL,
  title TEXT NOT NULL,                         -- the clever title
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE list_tags (
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (list_id, tag)
);

CREATE TABLE list_entries (
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id),
  position INTEGER NOT NULL,                   -- 1 = best; over 10 = honorable mention
  why TEXT,
  dish TEXT,                                   -- restaurants: what to order
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (list_id, item_id)
);
CREATE INDEX list_entries_item ON list_entries(item_id);

-- For the year-in-review animation
CREATE TABLE list_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  taken_at TEXT NOT NULL DEFAULT (datetime('now')),
  entries TEXT NOT NULL                        -- JSON array of item ids in order
);

CREATE TABLE try_items (
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  from_user_id TEXT REFERENCES users(id),
  from_list_id TEXT REFERENCES lists(id),
  from_rank INTEGER,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open',         -- open | done
  reaction TEXT,                               -- loved | fine | not_for_me
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  done_at TEXT,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id),
  to_user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  seen_at TEXT
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),  -- who sees it
  type TEXT NOT NULL,                          -- saved_your_pick | tried_your_pick | sent_you | new_list | library_ready
  actor_id TEXT REFERENCES users(id),
  item_id TEXT REFERENCES items(id),
  list_id TEXT REFERENCES lists(id),
  data TEXT,                                   -- JSON extras, e.g. {"rank":3}
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);
CREATE INDEX notifications_user ON notifications(user_id, created_at);

-- Admin tag cleanup: anything typed on the left becomes the tag on the right
CREATE TABLE tag_merges (
  alias TEXT PRIMARY KEY,
  canonical TEXT NOT NULL
);

-- How outside labels (Hardcover, TMDB, Open Library) turn into suggested tags
CREATE TABLE tag_map (
  label TEXT PRIMARY KEY,
  tag TEXT NOT NULL
);
