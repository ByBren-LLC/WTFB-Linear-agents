import { Request, Response } from 'express';
import axios from 'axios';
import * as logger from '../utils/logger';
import * as tokenManager from './tokens';

/**
 * Initiates the OAuth flow by redirecting to Linear's authorization page
 */
export const initiateOAuth = (req: Request, res: Response) => {
  const clientId = process.env.LINEAR_CLIENT_ID;
  const redirectUri = process.env.LINEAR_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    logger.error('Missing LINEAR_CLIENT_ID or LINEAR_REDIRECT_URI environment variables');
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

  logger.info('Initiating OAuth flow', { redirectUri });

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
      logger.error('Missing authorization code');
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const clientId = process.env.LINEAR_CLIENT_ID;
    const clientSecret = process.env.LINEAR_CLIENT_SECRET;
    const redirectUri = process.env.LINEAR_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      logger.error('Missing OAuth environment variables');
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

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    if (!access_token) {
      logger.error('Failed to obtain access token');
      return res.status(500).json({ error: 'Failed to obtain access token' });
    }

    logger.info('Access token obtained');

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

    logger.info('User and organization info retrieved', {
      appUserId,
      organizationId,
      organizationName
    });

    // Store the tokens securely in the database
    try {
      await tokenManager.storeTokens(
        organizationId,
        organizationName,
        access_token,
        refresh_token,
        appUserId,
        expires_in
      );

      logger.info('Tokens stored successfully', { organizationId, appUserId });
    } catch (storageError) {
      logger.error('Failed to store tokens', { error: storageError });
      return res.status(500).json({ error: 'Failed to store tokens' });
    }

    // Redirect to a success page
    res.send(`
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              margin-top: 50px;
            }
            .success {
              color: #4CAF50;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .info {
              color: #555;
              margin-bottom: 30px;
            }
            .org {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="success">Authorization Successful!</div>
          <div class="info">The Linear Planning Agent has been authorized for <span class="org">${organizationName}</span>.</div>
          <div>You can close this window now.</div>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('OAuth callback error', { error });
    res.status(500).json({ error: 'Failed to complete OAuth flow' });
  }
};
