-- "New" on the board: what each person has already seen
CREATE TABLE board_seen (
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_id)
);
-- Everything older than this counts as seen (set on someone's first visit, so newcomers don't get a board full of "New")
ALTER TABLE users ADD COLUMN seen_base TEXT;
