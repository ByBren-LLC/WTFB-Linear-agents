/**
 * Token management utility for Confluence OAuth tokens
 *
 * This module provides functions for securely storing, retrieving, refreshing,
 * and revoking Confluence OAuth tokens. Tokens are stored in the database with
 * encryption for security.
 */

import axios from 'axios';
import * as logger from '../utils/logger';
import { query } from '../db/connection';

/**
 * Confluence token data
 */
interface ConfluenceToken {
  id: number;
  organization_id: string;
  access_token: string;
  refresh_token: string;
  site_url: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Stores OAuth tokens for a Confluence site
 *
 * @param organizationId The Linear organization ID
 * @param accessToken The OAuth access token
 * @param refreshToken The OAuth refresh token
 * @param siteUrl The Confluence site URL
 * @param expiresIn The token expiration time in seconds
 */
export const storeConfluenceToken = async (
  organizationId: string,
  accessToken: string,
  refreshToken: string,
  siteUrl: string,
  expiresIn: number
): Promise<void> => {
  try {
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    // Store tokens in the database
    await query(
      `
        INSERT INTO confluence_tokens (organization_id, access_token, refresh_token, site_url, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (organization_id) DO UPDATE SET
          access_token = $2,
          refresh_token = $3,
          site_url = $4,
          expires_at = $5,
          updated_at = NOW()
      `,
      [organizationId, accessToken, refreshToken, siteUrl, expiresAt]
    );

    logger.info('Confluence tokens stored for organization', { organizationId });
  } catch (error) {
    logger.error('Error storing Confluence tokens', { error, organizationId });
    throw error;
  }
};

/**
 * Retrieves the Confluence token for an organization
 *
 * @param organizationId The Linear organization ID
 * @returns The Confluence token data or null if not found
 */
export const getConfluenceToken = async (organizationId: string): Promise<ConfluenceToken | null> => {
  try {
    const result = await query(
      'SELECT * FROM confluence_tokens WHERE organization_id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      logger.warn('No Confluence tokens found for organization', { organizationId });
      return null;
    }

    return result.rows[0] as ConfluenceToken;
  } catch (error) {
    logger.error('Error retrieving Confluence token', { error, organizationId });
    throw error;
  }
};

/**
 * Refreshes an expired Confluence access token using the refresh token
 *
 * @param organizationId The Linear organization ID
 * @returns The new access token or null if refresh fails
 */
export const refreshConfluenceToken = async (organizationId: string): Promise<string | null> => {
  try {
    // Get the token data from the database
    const tokenData = await getConfluenceToken(organizationId);

    if (!tokenData) {
      logger.error(`No Confluence tokens found for organization ${organizationId}`);
      return null;
    }

    const clientId = process.env.CONFLUENCE_CLIENT_ID;
    const clientSecret = process.env.CONFLUENCE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error('Missing CONFLUENCE_CLIENT_ID or CONFLUENCE_CLIENT_SECRET environment variables');
      return null;
    }

    // Exchange the refresh token for a new access token
    const tokenResponse = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenData.refresh_token
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    if (!access_token) {
      logger.error('Failed to refresh Confluence access token');
      return null;
    }

    // Calculate new expiration date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    // Store the new tokens
    await query(
      `
        UPDATE confluence_tokens
        SET access_token = $1,
            refresh_token = $2,
            expires_at = $3,
            updated_at = NOW()
        WHERE organization_id = $4
      `,
      [
        access_token,
        refresh_token || tokenData.refresh_token, // Use the new refresh token if provided, otherwise keep the old one
        expiresAt,
        organizationId
      ]
    );

    logger.info('Confluence token refreshed for organization', { organizationId });
    return access_token;
  } catch (error) {
    logger.error('Error refreshing Confluence token', { error, organizationId });
    return null;
  }
};

/**
 * Retrieves the Confluence access token for an organization
 *
 * If the token is expired, it will attempt to refresh it automatically.
 *
 * @param organizationId The Linear organization ID
 * @returns The valid access token or null if not available
 */
export const getConfluenceAccessToken = async (organizationId: string): Promise<string | null> => {
  try {
    // Get the token from the database
    const tokenData = await getConfluenceToken(organizationId);

    if (!tokenData) {
      logger.warn('No Confluence tokens found for organization', { organizationId });
      return null;
    }

    // Check if token is expired
    if (new Date() > new Date(tokenData.expires_at)) {
      logger.info('Confluence token expired, refreshing', { organizationId });
      return await refreshConfluenceToken(organizationId);
    }

    return tokenData.access_token;
  } catch (error) {
    logger.error('Error retrieving Confluence access token', { error, organizationId });
    return null;
  }
};

/**
 * Revokes Confluence tokens for an organization
 *
 * @param organizationId The Linear organization ID
 * @returns True if tokens were successfully revoked, false otherwise
 */
export const revokeConfluenceTokens = async (organizationId: string): Promise<boolean> => {
  try {
    // Delete the tokens from the database
    const result = await query(
      'DELETE FROM confluence_tokens WHERE organization_id = $1',
      [organizationId]
    );

    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      logger.info('Confluence tokens revoked for organization', { organizationId });
    } else {
      logger.warn('No Confluence tokens found to revoke for organization', { organizationId });
    }

    return deleted;
  } catch (error) {
    logger.error('Error revoking Confluence tokens', { error, organizationId });
    return false;
  }
};
