----------------------------------------
-- Up
----------------------------------------

CREATE TABLE facts (
  id INTEGER PRIMARY KEY,
  thing TEXT NOT NULL COLLATE NOCASE,
  fact TEXT NOT NULL COLLATE NOCASE,
  inactive BOOLEAN DEFAULT FALSE NOT NULL,
  UNIQUE(thing, fact)
);

CREATE INDEX idx_facts ON facts(thing, fact);

INSERT INTO facts (thing, fact) VALUES
  ('hob', 'not playing a mug''s game'),
  ('ryecock', 'a sovereign human'),
  ('ryecock', 'a very bad communist'),
  ('ryecock', 'home'),
  ('ryecock', 'much too large to be an elf');

----------------------------------------
-- Down
----------------------------------------

DROP INDEX idx_facts;

DROP TABLE facts;
