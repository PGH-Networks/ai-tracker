-- AI Project Tracker — Azure PostgreSQL Schema
-- Reference only: server.js auto-creates these tables on startup (CREATE TABLE IF NOT EXISTS).
-- To create them manually: psql "your-connection-string" -f schema.sql

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL,
  dept        TEXT,
  description TEXT,
  tool        TEXT,
  use_case    TEXT,
  status      TEXT        DEFAULT 'next',   -- 'next' | 'doing' | 'done'
  pct         INTEGER     DEFAULT 0,        -- 0–100
  notes       TEXT,
  next_steps  TEXT,
  champion    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roadmap (
  id         SERIAL  PRIMARY KEY,
  bucket     TEXT    NOT NULL,              -- 'soon' | 'mid' | 'later'
  title      TEXT    NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tool_links (
  id         SERIAL      PRIMARY KEY,
  label      TEXT        NOT NULL,
  url        TEXT        NOT NULL,
  sort_order INTEGER     DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
