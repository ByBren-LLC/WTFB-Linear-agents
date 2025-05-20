import { Request, Response } from 'express';
import axios from 'axios';
import * as tokenManager from './tokens';
import * as logger from '../utils/logger';

/**
 * Initiates the OAuth flow by redirecting to Linear's authorization page
 */
export const initiateOAuth = (req: Request, res: Response) => {
  const clientId = process.env.LINEAR_CLIENT_ID;
  const redirectUri = process.env.LINEAR_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: 'Missing LINEAR_CLIENT_ID or LINEAR_REDIRECT_URI environment variables'
    });
  }

  // Construct the authorization URL
  const authUrl = new URL('https://linear.app/oauth/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'read write app:assignable app:mentionable');
  authUrl.searchParams.append('actor', 'app');

  // Redirect the user to Linear's authorization page
  res.redirect(authUrl.toString());
};

/**
 * Handles the OAuth callback from Linear
 */
export const handleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const clientId = process.env.LINEAR_CLIENT_ID;
    const clientSecret = process.env.LINEAR_CLIENT_SECRET;
    const redirectUri = process.env.LINEAR_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(500).json({
        error: 'Missing OAuth environment variables'
      });
    }

    // Exchange the authorization code for an access token
    const tokenResponse = await axios.post('https://api.linear.app/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(500).json({ error: 'Failed to obtain access token' });
    }

    // Get the app user ID and organization information
    const appUserResponse = await axios.post(
      'https://api.linear.app/graphql',
      {
        query: `
          query Me {
            viewer {
              id
              organization {
                id
                name
              }
            }
          }
        `
      },
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { id: appUserId, organization } = appUserResponse.data.data.viewer;
    const { id: organizationId, name: organizationName } = organization;

    // Store the tokens securely in the database
    try {
      await tokenManager.storeTokens(
        organizationId,
        organizationName,
        access_token,
        refresh_token,
        appUserId,
        tokenResponse.data.expires_in
      );

      logger.info('Tokens stored successfully', { organizationId, appUserId });
    } catch (storageError) {
      logger.error('Failed to store tokens', { error: storageError });
      return res.status(500).json({ error: 'Failed to store tokens' });
    }

    // Redirect to a success page
    res.send('Authorization successful! You can close this window.');
  } catch (error) {
    logger.error('OAuth callback error:', { error });
    res.status(500).json({ error: 'Failed to complete OAuth flow' });
  }
};
