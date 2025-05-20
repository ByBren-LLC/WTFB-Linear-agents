-- Migration to add Confluence tokens table

-- Create confluence_tokens table
CREATE TABLE IF NOT EXISTS confluence_tokens (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  site_url TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id) REFERENCES linear_tokens(organization_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_confluence_tokens_organization_id ON confluence_tokens(organization_id);
