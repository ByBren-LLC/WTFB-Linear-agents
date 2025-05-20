/**
 * Token management utility for Linear OAuth tokens
 *
 * This module provides functions for securely storing, retrieving, refreshing,
 * and revoking Linear OAuth tokens. Tokens are stored in the database with
 * encryption for security.
 */
import axios from 'axios';
import * as logger from '../utils/logger';
import * as encryption from '../utils/encryption';
import { query } from '../db/connection';

/**
 * Stores OAuth tokens for a Linear organization
 *
 * @param organizationId The Linear organization ID
 * @param organizationName The Linear organization name
 * @param accessToken The OAuth access token
 * @param refreshToken The OAuth refresh token
 * @param appUserId The Linear app user ID
 * @param expiresIn The token expiration time in seconds
 */
export const storeTokens = async (
  organizationId: string,
  organizationName: string,
  accessToken: string,
  refreshToken: string,
  appUserId: string,
  expiresIn: number
): Promise<void> => {
  try {
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    // Encrypt tokens before storing
    const encryptedAccessToken = encryption.encrypt(accessToken);
    const encryptedRefreshToken = encryption.encrypt(refreshToken);

    // First, ensure the organization exists
    await query(
      `
        INSERT INTO organizations (id, name)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET name = $2
      `,
      [organizationId, organizationName]
    );

    // Then, store the encrypted tokens
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
      [organizationId, encryptedAccessToken, encryptedRefreshToken, appUserId, expiresAt]
    );

    logger.info('Tokens stored for organization', { organizationId });
  } catch (error) {
    logger.error('Error storing tokens', { error, organizationId });
    throw error;
  }
};

/**
 * Refreshes an expired access token using the refresh token
 *
 * @param organizationId The Linear organization ID
 * @param refreshToken The OAuth refresh token
 * @returns The new access token and expiration time
 */
export const refreshAccessToken = async (
  organizationId: string,
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> => {
  try {
    const clientId = process.env.LINEAR_CLIENT_ID;
    const clientSecret = process.env.LINEAR_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing LINEAR_CLIENT_ID or LINEAR_CLIENT_SECRET environment variables');
    }

    // Call Linear's token refresh endpoint
    const response = await axios.post('https://api.linear.app/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      throw new Error('Failed to refresh access token');
    }

    logger.info('Access token refreshed for organization', { organizationId });

    return {
      accessToken: access_token,
      expiresIn: expires_in
    };
  } catch (error) {
    logger.error('Error refreshing access token', { error, organizationId });
    throw error;
  }
};

/**
 * Retrieves the access token for a Linear organization
 *
 * If the token is expired, it will attempt to refresh it automatically.
 *
 * @param organizationId The Linear organization ID
 * @returns The valid access token or null if not available
 */
export const getAccessToken = async (organizationId: string): Promise<string | null> => {
  try {
    // Query the database for tokens
    const result = await query(
      'SELECT access_token, refresh_token, app_user_id, expires_at FROM tokens WHERE organization_id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      logger.warn('No tokens found for organization', { organizationId });
      return null;
    }

    const { access_token, refresh_token, app_user_id, expires_at } = result.rows[0];

    // Decrypt tokens
    const accessToken = encryption.decrypt(access_token);
    const refreshToken = encryption.decrypt(refresh_token);

    // Check if token is expired
    if (new Date() > new Date(expires_at)) {
      logger.info('Token expired for organization, attempting refresh', { organizationId });

      try {
        // Refresh the token
        const { accessToken: newAccessToken, expiresIn } = await refreshAccessToken(
          organizationId,
          refreshToken
        );

        // Store the new token
        await storeTokens(
          organizationId,
          '', // We don't have the organization name here, but it's already in the database
          newAccessToken,
          refreshToken,
          app_user_id,
          expiresIn
        );

        return newAccessToken;
      } catch (refreshError) {
        logger.error('Failed to refresh token', { error: refreshError, organizationId });
        return null;
      }
    }

    return accessToken;
  } catch (error) {
    logger.error('Error retrieving access token', { error, organizationId });
    throw error;
  }
};

/**
 * Retrieves the app user ID for a Linear organization
 *
 * @param organizationId The Linear organization ID
 * @returns The app user ID or null if not available
 */
export const getAppUserId = async (organizationId: string): Promise<string | null> => {
  try {
    const result = await query(
      'SELECT app_user_id FROM tokens WHERE organization_id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      logger.warn('No tokens found for organization', { organizationId });
      return null;
    }

    return result.rows[0].app_user_id;
  } catch (error) {
    logger.error('Error retrieving app user ID', { error, organizationId });
    throw error;
  }
};

/**
 * Revokes tokens for a Linear organization
 *
 * @param organizationId The Linear organization ID
 * @returns True if tokens were successfully revoked, false otherwise
 */
export const revokeTokens = async (organizationId: string): Promise<boolean> => {
  try {
    // Get the access token before deleting it
    const accessToken = await getAccessToken(organizationId);

    if (!accessToken) {
      logger.warn('No tokens to revoke for organization', { organizationId });
      return false;
    }

    // Delete tokens from the database
    const result = await query(
      'DELETE FROM tokens WHERE organization_id = $1',
      [organizationId]
    );

    if (result.rowCount === 0) {
      logger.warn('No tokens found to revoke for organization', { organizationId });
      return false;
    }

    // Optionally call Linear's token revocation endpoint
    // Note: Linear doesn't currently have a token revocation endpoint,
    // but this is where we would call it if they add one in the future

    logger.info('Tokens revoked for organization', { organizationId });
    return true;
  } catch (error) {
    logger.error('Error revoking tokens', { error, organizationId });
    throw error;
  }
};
