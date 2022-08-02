-- migrate:up

CREATE TABLE almanac (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  recipient TEXT UNIQUE NOT NULL,
  served_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_almanac_served_at ON almanac (
  served_at DESC
);

-- migrate:down

DROP INDEX IF EXISTS idx_almanac_served_at;

DROP TABLE IF EXISTS almanac;
