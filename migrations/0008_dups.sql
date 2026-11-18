-- Admin review of possible duplicate cards on the board.
CREATE TABLE dup_dismissed (
  a TEXT NOT NULL,           -- item ids, a < b
  b TEXT NOT NULL,
  dismissed_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (a, b)
);
CREATE TABLE item_merges (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  merged_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Demo: a near-duplicate of Dungeon Crawler Carl so the review has something to show
INSERT INTO items (id, kind, title, creator, source, source_id)
  SELECT 'dup-dcc', 'audiobook', 'Dungeon Crawl Carl', NULL, 'manual', 'dup-dcc' WHERE EXISTS (SELECT 1 FROM items WHERE id = 'a5');
INSERT INTO recs (id, item_id, by_user_id, added_by, note, created_at)
  SELECT 'rc-dup1', 'dup-dcc', 'u-amy', 'u-amy', 'Stick with it through the first book.', datetime('now', '-1 hours')
  WHERE EXISTS (SELECT 1 FROM items WHERE id = 'dup-dcc') AND EXISTS (SELECT 1 FROM users WHERE id = 'u-amy');
