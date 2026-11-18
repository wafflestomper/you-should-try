-- People asking for an invite from the sign-in page
CREATE TABLE invite_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  knows TEXT NOT NULL,
  note TEXT,
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'new',      -- new | invited | dismissed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX invite_requests_status ON invite_requests (status, created_at);
