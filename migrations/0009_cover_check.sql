-- Remember when we last looked for a missing cover so we don't keep asking.
ALTER TABLE items ADD COLUMN cover_checked_at INTEGER;
