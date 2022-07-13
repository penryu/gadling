----------------------------------------
-- Up
----------------------------------------

CREATE TABLE karma (
  id INTEGER PRIMARY KEY,
  thing TEXT NOT NULL COLLATE NOCASE UNIQUE,
  value INT DEFAULT 0 NOT NULL
);

CREATE INDEX idx_karma ON karma(thing);

INSERT INTO karma (thing, value) VALUES
  ('hob', 1337),
  ('wesolows', -5000000);

----------------------------------------
-- Down
----------------------------------------

DROP INDEX idx_karma;

DROP TABLE karma;
