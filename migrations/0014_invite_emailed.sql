-- When the site itself emailed an invite, and how many times (keeps resends in check)
ALTER TABLE invites ADD COLUMN emailed_at TEXT;
ALTER TABLE invites ADD COLUMN emailed_count INTEGER NOT NULL DEFAULT 0;
