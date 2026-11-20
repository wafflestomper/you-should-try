-- One how-to video can be the "what is this?" intro on invite pages, watchable without signing in
ALTER TABLE videos ADD COLUMN on_invite INTEGER NOT NULL DEFAULT 0;
