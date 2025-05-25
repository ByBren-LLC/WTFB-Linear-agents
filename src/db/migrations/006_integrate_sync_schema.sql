-- Database Schema Integration Migration
-- This migration ensures sync tables are properly integrated and removes any conflicts

-- Ensure sync_state table exists with proper structure
CREATE TABLE IF NOT EXISTS sync_state (
  id SERIAL PRIMARY KEY,
  confluence_page_id TEXT NOT NULL,
  linear_team_id TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(confluence_page_id, linear_team_id)
);

-- Ensure conflicts table exists with proper structure
CREATE TABLE IF NOT EXISTS conflicts (
  id TEXT PRIMARY KEY,
  linear_change TEXT NOT NULL,
  confluence_change TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolution_strategy TEXT,
  resolved_change TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure sync_history table exists with proper structure
CREATE TABLE IF NOT EXISTS sync_history (
  id SERIAL PRIMARY KEY,
  confluence_page_id TEXT NOT NULL,
  linear_team_id TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error TEXT,
  created_issues INTEGER NOT NULL DEFAULT 0,
  updated_issues INTEGER NOT NULL DEFAULT 0,
  confluence_changes INTEGER NOT NULL DEFAULT 0,
  conflicts_detected INTEGER NOT NULL DEFAULT 0,
  conflicts_resolved INTEGER NOT NULL DEFAULT 0,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all indexes exist
CREATE INDEX IF NOT EXISTS idx_sync_state_confluence_page_id ON sync_state(confluence_page_id);
CREATE INDEX IF NOT EXISTS idx_sync_state_linear_team_id ON sync_state(linear_team_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_is_resolved ON conflicts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_sync_history_confluence_page_id ON sync_history(confluence_page_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_linear_team_id ON sync_history(linear_team_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_timestamp ON sync_history(timestamp);

-- Add updated_at trigger for sync_state
CREATE OR REPLACE FUNCTION update_sync_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_state_updated_at_trigger ON sync_state;
CREATE TRIGGER sync_state_updated_at_trigger
  BEFORE UPDATE ON sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_state_updated_at();

-- Add updated_at trigger for conflicts
CREATE OR REPLACE FUNCTION update_conflicts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conflicts_updated_at_trigger ON conflicts;
CREATE TRIGGER conflicts_updated_at_trigger
  BEFORE UPDATE ON conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_conflicts_updated_at();
