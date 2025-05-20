-- Program Increments Migration

-- Create program_increments table
CREATE TABLE IF NOT EXISTS program_increments (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL,
  pi_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on organization_id for faster lookups
CREATE INDEX IF NOT EXISTS program_increments_organization_id_idx ON program_increments(organization_id);

-- Create index on pi_id for faster lookups
CREATE INDEX IF NOT EXISTS program_increments_pi_id_idx ON program_increments(pi_id);

-- Create pi_features table
CREATE TABLE IF NOT EXISTS pi_features (
  id SERIAL PRIMARY KEY,
  program_increment_id INTEGER NOT NULL REFERENCES program_increments(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  confidence INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on program_increment_id for faster lookups
CREATE INDEX IF NOT EXISTS pi_features_program_increment_id_idx ON pi_features(program_increment_id);

-- Create index on feature_id for faster lookups
CREATE INDEX IF NOT EXISTS pi_features_feature_id_idx ON pi_features(feature_id);

-- Create pi_objectives table
CREATE TABLE IF NOT EXISTS pi_objectives (
  id SERIAL PRIMARY KEY,
  program_increment_id INTEGER NOT NULL REFERENCES program_increments(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  description TEXT NOT NULL,
  business_value INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on program_increment_id for faster lookups
CREATE INDEX IF NOT EXISTS pi_objectives_program_increment_id_idx ON pi_objectives(program_increment_id);

-- Create pi_risks table
CREATE TABLE IF NOT EXISTS pi_risks (
  id SERIAL PRIMARY KEY,
  program_increment_id INTEGER NOT NULL REFERENCES program_increments(id) ON DELETE CASCADE,
  risk_id TEXT NOT NULL,
  description TEXT NOT NULL,
  impact INTEGER NOT NULL DEFAULT 3,
  likelihood INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'identified',
  mitigation_plan TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on program_increment_id for faster lookups
CREATE INDEX IF NOT EXISTS pi_risks_program_increment_id_idx ON pi_risks(program_increment_id);
