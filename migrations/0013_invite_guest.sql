-- An invite can be for someone who's already on the board by name (a guest), so their picks move over when they join.
ALTER TABLE invites ADD COLUMN guest_id TEXT REFERENCES guests(id);
