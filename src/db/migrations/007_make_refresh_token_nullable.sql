-- Migration 007: Make refresh_token nullable for OAuth compatibility
-- Linear OAuth may not always provide refresh tokens

-- Make refresh_token nullable in linear_tokens table
ALTER TABLE linear_tokens ALTER COLUMN refresh_token DROP NOT NULL;

-- Make refresh_token nullable in confluence_tokens table  
ALTER TABLE confluence_tokens ALTER COLUMN refresh_token DROP NOT NULL;
