import { query } from './connection';
import * as logger from '../utils/logger';

/**
 * Initializes the database schema
 */
export const initializeDatabase = async () => {
  try {
    // Create organizations table
    await query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create tokens table
    await query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id SERIAL PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        app_user_id TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create planning_sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS planning_sessions (
        id SERIAL PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        confluence_page_url TEXT NOT NULL,
        planning_title TEXT NOT NULL,
        epic_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    logger.info('Database schema initialized');
  } catch (error) {
    logger.error('Error initializing database schema', { error });
    throw error;
  }
};

/**
 * Stores OAuth tokens for an organization
 */
export const storeTokens = async (
  organizationId: string,
  organizationName: string,
  accessToken: string,
  refreshToken: string,
  appUserId: string,
  expiresAt: Date
) => {
  try {
    // First, ensure the organization exists
    await query(
      `
        INSERT INTO organizations (id, name)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET name = $2
      `,
      [organizationId, organizationName]
    );
    
    // Then, store the tokens
    await query(
      `
        INSERT INTO tokens (organization_id, access_token, refresh_token, app_user_id, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (organization_id) DO UPDATE SET
          access_token = $2,
          refresh_token = $3,
          app_user_id = $4,
          expires_at = $5,
          updated_at = NOW()
      `,
      [organizationId, accessToken, refreshToken, appUserId, expiresAt]
    );
    
    logger.info('Tokens stored for organization', { organizationId });
  } catch (error) {
    logger.error('Error storing tokens', { error, organizationId });
    throw error;
  }
};

/**
 * Retrieves the access token for an organization
 */
export const getAccessToken = async (organizationId: string): Promise<string | null> => {
  try {
    const result = await query(
      'SELECT access_token, expires_at FROM tokens WHERE organization_id = $1',
      [organizationId]
    );
    
    if (result.rows.length === 0) {
      logger.warn('No tokens found for organization', { organizationId });
      return null;
    }
    
    const { access_token, expires_at } = result.rows[0];
    
    // Check if token is expired
    if (new Date() > new Date(expires_at)) {
      logger.warn('Token expired for organization', { organizationId });
      // TODO: Implement token refresh
      return null;
    }
    
    return access_token;
  } catch (error) {
    logger.error('Error retrieving access token', { error, organizationId });
    throw error;
  }
};
