-- Synchronization schema for Linear Planning Agent

-- Create sync_configs table
CREATE TABLE IF NOT EXISTS sync_configs (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  confluence_page_url TEXT NOT NULL,
  direction TEXT NOT NULL,
  frequency TEXT NOT NULL,
  last_sync_time TIMESTAMP,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id) REFERENCES linear_tokens(organization_id)
);

-- Create sync_history table
CREATE TABLE IF NOT EXISTS sync_history (
  id SERIAL PRIMARY KEY,
  sync_config_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  direction TEXT NOT NULL,
  changes_created INTEGER NOT NULL DEFAULT 0,
  changes_updated INTEGER NOT NULL DEFAULT 0,
  changes_deleted INTEGER NOT NULL DEFAULT 0,
  conflicts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (sync_config_id) REFERENCES sync_configs(id)
);

-- Create sync_conflicts table
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id SERIAL PRIMARY KEY,
  sync_history_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  confluence_data JSONB NOT NULL,
  linear_data JSONB NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (sync_history_id) REFERENCES sync_history(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_configs_organization_id ON sync_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_configs_team_id ON sync_configs(team_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_sync_config_id ON sync_history(sync_config_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_sync_history_id ON sync_conflicts(sync_history_id);
