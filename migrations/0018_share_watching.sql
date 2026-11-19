-- Sharing what you're watching: off unless you turn it on. Once on, every show shows except ones you mark private.
ALTER TABLE users ADD COLUMN share_watching INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tv_progress ADD COLUMN private INTEGER NOT NULL DEFAULT 0;
