import { Request, Response } from 'express';
import axios from 'axios';

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
    
    // TODO: Store the tokens securely in the database
    console.log('Access token obtained:', access_token);
    
    // Get the app user ID
    const appUserResponse = await axios.post(
      'https://api.linear.app/graphql',
      {
        query: `
          query Me {
            viewer {
              id
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
    
    const appUserId = appUserResponse.data.data.viewer.id;
    
    // TODO: Store the app user ID alongside the tokens
    console.log('App user ID:', appUserId);
    
    // Redirect to a success page
    res.send('Authorization successful! You can close this window.');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Failed to complete OAuth flow' });
  }
};
