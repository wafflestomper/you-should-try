-- Groups picked on the invite ("Family", "St. Chris"): the new person starts in these when they join
ALTER TABLE invites ADD COLUMN groups TEXT;
