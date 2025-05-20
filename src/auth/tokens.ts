/**
 * Token management utility for Linear OAuth tokens
 *
 * This module provides functions for storing, retrieving, and managing
 * Linear OAuth tokens in the database.
 */

import * as logger from '../utils/logger';
import { storeLinearToken, getLinearToken, getAccessToken as getDbAccessToken, deleteLinearToken } from '../db/models';
import axios from 'axios';

/**
 * Stores OAuth tokens for a Linear organization
 */
export const storeTokens = async (
  organizationId: string,
  accessToken: string,
  refreshToken: string,
  appUserId: string,
  expiresIn: number
): Promise<void> => {
  try {
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    // Store tokens in the database
    await storeLinearToken(
      organizationId,
      accessToken,
      refreshToken,
      appUserId,
      expiresAt
    );

    logger.info(`Tokens stored for organization ${organizationId}`);
  } catch (error) {
    logger.error('Error storing tokens', { error, organizationId });
    throw error;
  }
};

/**
 * Refreshes an expired access token using the refresh token
 */
export const refreshToken = async (organizationId: string): Promise<string | null> => {
  try {
    // Get the token data from the database
    const tokenData = await getLinearToken(organizationId);

    if (!tokenData) {
      logger.error(`No tokens found for organization ${organizationId}`);
      return null;
    }

    const clientId = process.env.LINEAR_CLIENT_ID;
    const clientSecret = process.env.LINEAR_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error('Missing LINEAR_CLIENT_ID or LINEAR_CLIENT_SECRET environment variables');
      return null;
    }

    // Exchange the refresh token for a new access token
    const tokenResponse = await axios.post('https://api.linear.app/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token'
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    if (!access_token) {
      logger.error('Failed to refresh access token');
      return null;
    }

    // Calculate new expiration date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    // Store the new tokens
    await storeLinearToken(
      organizationId,
      access_token,
      refresh_token || tokenData.refresh_token, // Use the new refresh token if provided, otherwise keep the old one
      tokenData.app_user_id,
      expiresAt
    );

    logger.info(`Token refreshed for organization ${organizationId}`);
    return access_token;
  } catch (error) {
    logger.error('Error refreshing token', { error, organizationId });
    return null;
  }
};

/**
 * Retrieves the access token for a Linear organization
 * If the token is expired, it will attempt to refresh it
 */
export const getAccessToken = async (organizationId: string): Promise<string | null> => {
  try {
    // Get the token from the database
    const token = await getDbAccessToken(organizationId);

    if (token) {
      return token;
    }

    // If no valid token was found, try to refresh it
    return await refreshToken(organizationId);
  } catch (error) {
    logger.error('Error retrieving access token', { error, organizationId });
    return null;
  }
};

/**
 * Retrieves the app user ID for a Linear organization
 */
export const getAppUserId = async (organizationId: string): Promise<string | null> => {
  try {
    // Get the token data from the database
    const tokenData = await getLinearToken(organizationId);

    if (!tokenData) {
      logger.error(`No tokens found for organization ${organizationId}`);
      return null;
    }

    return tokenData.app_user_id;
  } catch (error) {
    logger.error('Error retrieving app user ID', { error, organizationId });
    return null;
  }
};

/**
 * Revokes tokens for a Linear organization
 */
export const revokeTokens = async (organizationId: string): Promise<boolean> => {
  try {
    // Delete the tokens from the database
    const deleted = await deleteLinearToken(organizationId);

    if (deleted) {
      logger.info(`Tokens revoked for organization ${organizationId}`);
    } else {
      logger.warn(`No tokens found to revoke for organization ${organizationId}`);
    }

    return deleted;
  } catch (error) {
    logger.error('Error revoking tokens', { error, organizationId });
    return false;
  }
};
