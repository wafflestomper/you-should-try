-- Recipes (and anything else) can carry a link and/or the written-out details, added any time.
ALTER TABLE items ADD COLUMN details TEXT;
ALTER TABLE items ADD COLUMN details_by TEXT REFERENCES users(id);
ALTER TABLE items ADD COLUMN details_at TEXT;
UPDATE items SET details = 'Brown 1 cup butter until nutty. Cool. Beat with 2 cups sugar, 5 eggs one at a time, 1 tsp vanilla. Fold in 2 cups flour, 1/2 tsp salt. Bake 325°F in a greased loaf pan about 70 minutes.', details_by = 'u-liz', details_at = datetime('now', '-3 days')
  WHERE id = 'c1' AND EXISTS (SELECT 1 FROM users WHERE id = 'u-liz');
