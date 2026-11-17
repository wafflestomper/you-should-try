-- More outside labels (TMDB genres, Open Library subjects) mapped to suggested tags
INSERT OR IGNORE INTO tag_map (label, tag) VALUES
 ('sci-fi & fantasy', 'sci-fi'), ('action & adventure', 'adventure'), ('animation', 'animated'),
 ('documentary', 'nonfiction'), ('war', 'war'), ('war & politics', 'war'), ('music', 'music'),
 ('kids', 'family'), ('history', 'historical'), ('thrillers', 'thriller'), ('suspense fiction', 'thriller'),
 ('detective and mystery stories', 'mystery'), ('mystery fiction', 'mystery'), ('fiction, mystery & detective, general', 'mystery'),
 ('fiction, thrillers, general', 'thriller'), ('fiction, thrillers, suspense', 'thriller'), ('fiction, science fiction, general', 'sci-fi'),
 ('fiction, historical, general', 'historical'), ('fiction, fantasy, general', 'fantasy'), ('fiction, romance, general', 'romance'),
 ('fiction, humorous, general', 'funny'), ('humor', 'funny'), ('humorous fiction', 'funny'), ('science fiction', 'sci-fi'),
 ('fantasy fiction', 'fantasy'), ('love stories', 'romance'), ('biography', 'memoir'), ('autobiography', 'memoir'),
 ('cooking', 'cooking'), ('young adult fiction', 'young-adult'), ('juvenile fiction', 'kids'), ('classic literature', 'classic'),
 ('psychological fiction', 'thoughtful'), ('literary fiction', 'literary'), ('family', 'family'), ('crime', 'crime');
