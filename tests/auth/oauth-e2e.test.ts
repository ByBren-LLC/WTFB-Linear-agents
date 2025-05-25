import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import axios from 'axios';
import * as models from '../../src/db/models';

// Mock external dependencies
jest.mock('axios');
jest.mock('../../src/db/models');
jest.mock('../../src/utils/logger');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedModels = models as jest.Mocked<typeof models>;

// Import the actual OAuth functions (not mocked)
import { initiateOAuth, handleOAuthCallback } from '../../src/auth/oauth';
import { initiateConfluenceOAuth, handleConfluenceCallback } from '../../src/auth/confluence-oauth';

describe('OAuth End-to-End Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create a test Express app
    app = express();
    app.use(express.json());

    // Session middleware
    app.use(session({
      secret: 'test-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
      }
    }));

    // OAuth routes
    app.get('/auth', initiateOAuth);
    app.get('/auth/callback', handleOAuthCallback);
    app.get('/auth/confluence', initiateConfluenceOAuth);
    app.get('/auth/confluence/callback', handleConfluenceCallback);

    // Success page
    app.get('/auth/confluence/success', (req, res) => {
      const organizationId = req.query.organizationId;
      res.send(`Success for ${organizationId}`);
    });

    // Setup environment variables
    process.env.LINEAR_CLIENT_ID = 'test-linear-client-id';
    process.env.LINEAR_CLIENT_SECRET = 'test-linear-client-secret';
    process.env.LINEAR_REDIRECT_URI = 'http://localhost:3000/auth/callback';
    process.env.CONFLUENCE_CLIENT_ID = 'test-confluence-client-id';
    process.env.CONFLUENCE_CLIENT_SECRET = 'test-confluence-client-secret';
    process.env.APP_URL = 'http://localhost:3000';

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.LINEAR_CLIENT_ID;
    delete process.env.LINEAR_CLIENT_SECRET;
    delete process.env.LINEAR_REDIRECT_URI;
    delete process.env.CONFLUENCE_CLIENT_ID;
    delete process.env.CONFLUENCE_CLIENT_SECRET;
    delete process.env.APP_URL;
  });

  describe('Linear OAuth E2E Flow', () => {
    it('should complete the full Linear OAuth flow', async () => {
      // Step 1: Initiate OAuth
      const initiateResponse = await request(app)
        .get('/auth')
        .expect(302);

      expect(initiateResponse.headers.location).toContain('https://linear.app/oauth/authorize');
      expect(initiateResponse.headers.location).toContain('client_id=test-linear-client-id');

      // Step 2: Mock the token exchange
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600
        }
      });

      // Mock the user info request
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: {
            viewer: {
              id: 'test-user-id',
              organization: {
                id: 'test-org-id',
                name: 'Test Organization'
              }
            }
          }
        }
      });

      // Mock token storage
      mockedModels.storeTokens = jest.fn().mockResolvedValueOnce(undefined);

      // Step 3: Handle callback
      const callbackResponse = await request(app)
        .get('/auth/callback?code=test-auth-code')
        .expect(200);

      expect(callbackResponse.text).toContain('Authorization Successful!');
      expect(callbackResponse.text).toContain('Test Organization');

      // Verify token exchange was called
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.linear.app/oauth/token',
        expect.objectContaining({
          client_id: 'test-linear-client-id',
          client_secret: 'test-linear-client-secret',
          code: 'test-auth-code',
          grant_type: 'authorization_code'
        })
      );

      // Verify token storage was called
      expect(mockedModels.storeTokens).toHaveBeenCalledWith(
        'test-org-id',
        'Test Organization',
        'test-access-token',
        'test-refresh-token',
        'test-user-id',
        3600
      );
    });

    it('should handle Linear OAuth errors gracefully', async () => {
      // Test missing authorization code
      const response = await request(app)
        .get('/auth/callback')
        .expect(400);

      expect(response.body.error).toBe('Missing authorization code');
    });
  });

  describe('Confluence OAuth E2E Flow', () => {
    it('should complete the full Confluence OAuth flow', async () => {
      const agent = request.agent(app);

      // Step 1: Initiate Confluence OAuth
      const initiateResponse = await agent
        .get('/auth/confluence?organizationId=test-org-id')
        .expect(302);

      expect(initiateResponse.headers.location).toContain('https://auth.atlassian.com/authorize');
      expect(initiateResponse.headers.location).toContain('client_id=test-confluence-client-id');
      expect(initiateResponse.headers.location).toContain('state=test-org-id');

      // Step 2: Mock the token exchange
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-confluence-access-token',
          refresh_token: 'test-confluence-refresh-token',
          expires_in: 3600,
          scope: 'read:confluence-content.all'
        }
      });

      // Mock the accessible resources request
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            id: 'test-site-id',
            name: 'Test Confluence Site',
            url: 'https://test-site.atlassian.net'
          }
        ]
      });

      // Mock token storage
      mockedModels.storeConfluenceToken = jest.fn().mockResolvedValueOnce(undefined);

      // Step 3: Handle callback
      const callbackResponse = await agent
        .get('/auth/confluence/callback?code=test-auth-code&state=test-org-id')
        .expect(302);

      expect(callbackResponse.headers.location).toBe('/auth/confluence/success?organizationId=test-org-id');

      // Step 4: Check success page
      const successResponse = await agent
        .get('/auth/confluence/success?organizationId=test-org-id')
        .expect(200);

      expect(successResponse.text).toContain('Success for test-org-id');

      // Verify token exchange was called
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://auth.atlassian.com/oauth/token',
        expect.objectContaining({
          grant_type: 'authorization_code',
          client_id: 'test-confluence-client-id',
          client_secret: 'test-confluence-client-secret',
          code: 'test-auth-code'
        })
      );

      // Verify accessible resources was called
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.atlassian.com/oauth/token/accessible-resources',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-confluence-access-token',
            'Accept': 'application/json'
          }
        })
      );

      // Verify token storage was called
      expect(mockedModels.storeConfluenceToken).toHaveBeenCalledWith(
        'test-org-id',
        'test-confluence-access-token',
        'test-confluence-refresh-token',
        'https://api.atlassian.com/ex/confluence/test-site-id',
        expect.any(Date)
      );
    });

    it('should handle Confluence OAuth errors gracefully', async () => {
      // Test missing authorization code
      const response = await request(app)
        .get('/auth/confluence/callback')
        .expect(400);

      expect(response.body.error).toBe('No authorization code received');
    });

    it('should handle missing organization ID', async () => {
      const response = await request(app)
        .get('/auth/confluence/callback?code=test-code')
        .expect(400);

      expect(response.body.error).toBe('Invalid state parameter');
    });
  });

  describe('Environment Variable Validation', () => {
    it('should handle missing Linear OAuth environment variables', async () => {
      delete process.env.LINEAR_CLIENT_ID;

      const response = await request(app)
        .get('/auth')
        .expect(500);

      expect(response.body.error).toContain('Missing LINEAR_CLIENT_ID');
    });

    it('should handle missing Confluence OAuth environment variables', async () => {
      delete process.env.CONFLUENCE_CLIENT_ID;

      const response = await request(app)
        .get('/auth/confluence?organizationId=test-org')
        .expect(500);

      expect(response.body.error).toBe('Server configuration error');
    });
  });

  describe('Session State Management', () => {
    it('should maintain session state between Confluence OAuth requests', async () => {
      const agent = request.agent(app);

      // Initiate OAuth (sets session)
      await agent
        .get('/auth/confluence?organizationId=test-org-id')
        .expect(302);

      // Mock successful token exchange
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_in: 3600
        }
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: [{ id: 'site-id', name: 'Site', url: 'https://site.atlassian.net' }]
      });

      mockedModels.storeConfluenceToken = jest.fn().mockResolvedValueOnce(undefined);

      // Handle callback (should use session data)
      const response = await agent
        .get('/auth/confluence/callback?code=test-code')
        .expect(302);

      expect(response.headers.location).toContain('organizationId=test-org-id');
    });
  });
});
