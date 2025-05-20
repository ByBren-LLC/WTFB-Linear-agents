-- Initial database schema for Linear Planning Agent

-- Create linear_tokens table
CREATE TABLE IF NOT EXISTS linear_tokens (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  app_user_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create planning_sessions table
CREATE TABLE IF NOT EXISTS planning_sessions (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL,
  confluence_page_url TEXT NOT NULL,
  planning_title TEXT NOT NULL,
  epic_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id) REFERENCES linear_tokens(organization_id)
);

-- Create planning_features table
CREATE TABLE IF NOT EXISTS planning_features (
  id SERIAL PRIMARY KEY,
  planning_session_id INTEGER NOT NULL,
  feature_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (planning_session_id) REFERENCES planning_sessions(id)
);

-- Create planning_stories table
CREATE TABLE IF NOT EXISTS planning_stories (
  id SERIAL PRIMARY KEY,
  planning_feature_id INTEGER NOT NULL,
  story_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (planning_feature_id) REFERENCES planning_features(id)
);

-- Create planning_enablers table
CREATE TABLE IF NOT EXISTS planning_enablers (
  id SERIAL PRIMARY KEY,
  planning_session_id INTEGER NOT NULL,
  enabler_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  enabler_type TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (planning_session_id) REFERENCES planning_sessions(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_linear_tokens_organization_id ON linear_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_planning_sessions_organization_id ON planning_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_planning_features_planning_session_id ON planning_features(planning_session_id);
CREATE INDEX IF NOT EXISTS idx_planning_stories_planning_feature_id ON planning_stories(planning_feature_id);
CREATE INDEX IF NOT EXISTS idx_planning_enablers_planning_session_id ON planning_enablers(planning_session_id);
