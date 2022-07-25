-- migrate:up

CREATE EXTENSION IF NOT EXISTS CITEXT;

CREATE TABLE facts (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  thing CITEXT NOT NULL,
  fact CITEXT NOT NULL,
  inactive BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (thing, fact)
);

INSERT INTO facts (thing, fact) VALUES
  ('hob', 'not playing a mug''s game'),
  ('ryecock', 'a sovereign human'),
  ('ryecock', 'a very bad communist'),
  ('ryecock', 'home'),
  ('ryecock', 'much too large to be an elf');

-- migrate:down

DROP TABLE IF EXISTS facts;
