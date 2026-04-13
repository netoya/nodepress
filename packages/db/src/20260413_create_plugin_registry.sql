-- Migration: create plugin_registry table

CREATE TABLE IF NOT EXISTS plugin_registry (
  slug TEXT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'inactive',
  activated_at TIMESTAMPTZ,
  error_log TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS plugin_registry_status_idx ON plugin_registry (status);
