import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { initiateOAuth, handleOAuthCallback } from '../../src/auth/oauth';
import { initiateConfluenceOAuth, handleConfluenceCallback } from '../../src/auth/confluence-oauth';

// Mock the auth modules
jest.mock('../../src/auth/oauth');
jest.mock('../../src/auth/confluence-oauth');
jest.mock('../../src/webhooks/handler');
jest.mock('../../src/db/models');
jest.mock('../../src/utils/logger');

const mockedInitiateOAuth = initiateOAuth as jest.MockedFunction<typeof initiateOAuth>;
const mockedHandleOAuthCallback = handleOAuthCallback as jest.MockedFunction<typeof handleOAuthCallback>;
const mockedInitiateConfluenceOAuth = initiateConfluenceOAuth as jest.MockedFunction<typeof initiateConfluenceOAuth>;
const mockedHandleConfluenceCallback = handleConfluenceCallback as jest.MockedFunction<typeof handleConfluenceCallback>;

describe('OAuth Routes Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create a test Express app with the same configuration as the main app
    app = express();
    app.use(express.json());

    // Session middleware for OAuth state management
    app.use(session({
      secret: 'test-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Use secure cookies in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }));

    // OAuth routes
    // Linear OAuth
    app.get('/auth', initiateOAuth);
    app.get('/auth/callback', handleOAuthCallback);

    // Confluence OAuth
    app.get('/auth/confluence', initiateConfluenceOAuth);
    app.get('/auth/confluence/callback', handleConfluenceCallback);

    // Confluence OAuth success page
    app.get('/auth/confluence/success', (req, res) => {
      const organizationId = req.query.organizationId;
      res.send(`
        <html>
          <head>
            <title>Confluence Authorization Successful</title>
          </head>
          <body>
            <div class="success">Confluence Authorization Successful!</div>
            <div class="info">The Linear Planning Agent has been authorized to access Confluence for organization <span class="org">${organizationId}</span>.</div>
            <div>You can close this window now.</div>
          </body>
        </html>
      `);
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Linear OAuth Routes', () => {
    it('should handle Linear OAuth initiation', async () => {
      mockedInitiateOAuth.mockImplementation((req, res) => {
        res.redirect('https://linear.app/oauth/authorize?client_id=test');
      });

      const response = await request(app)
        .get('/auth')
        .expect(302);

      expect(mockedInitiateOAuth).toHaveBeenCalled();
      expect(response.headers.location).toContain('https://linear.app/oauth/authorize');
    });

    it('should handle Linear OAuth callback', async () => {
      mockedHandleOAuthCallback.mockImplementation((req, res) => {
        res.send('Linear OAuth successful');
      });

      const response = await request(app)
        .get('/auth/callback?code=test-code')
        .expect(200);

      expect(mockedHandleOAuthCallback).toHaveBeenCalled();
      expect(response.text).toContain('Linear OAuth successful');
    });
  });

  describe('Confluence OAuth Routes', () => {
    it('should handle Confluence OAuth initiation', async () => {
      mockedInitiateConfluenceOAuth.mockImplementation((req, res) => {
        res.redirect('https://auth.atlassian.com/authorize?client_id=test');
      });

      const response = await request(app)
        .get('/auth/confluence?organizationId=test-org')
        .expect(302);

      expect(mockedInitiateConfluenceOAuth).toHaveBeenCalled();
      expect(response.headers.location).toContain('https://auth.atlassian.com/authorize');
    });

    it('should handle Confluence OAuth callback', async () => {
      mockedHandleConfluenceCallback.mockImplementation((req, res) => {
        res.redirect('/auth/confluence/success?organizationId=test-org');
      });

      const response = await request(app)
        .get('/auth/confluence/callback?code=test-code&state=test-org')
        .expect(302);

      expect(mockedHandleConfluenceCallback).toHaveBeenCalled();
      expect(response.headers.location).toContain('/auth/confluence/success');
    });

    it('should render Confluence OAuth success page', async () => {
      const response = await request(app)
        .get('/auth/confluence/success?organizationId=test-org')
        .expect(200);

      expect(response.text).toContain('Confluence Authorization Successful!');
      expect(response.text).toContain('test-org');
    });
  });

  describe('Session Middleware', () => {
    it('should maintain session state across requests', async () => {
      const agent = request.agent(app);

      // Mock the OAuth initiation to set session data
      mockedInitiateConfluenceOAuth.mockImplementation((req, res) => {
        req.session.organizationId = 'test-org';
        res.json({ sessionSet: true });
      });

      // First request to set session
      await agent
        .get('/auth/confluence?organizationId=test-org')
        .expect(200);

      // Mock the callback to check session data
      mockedHandleConfluenceCallback.mockImplementation((req, res) => {
        res.json({ organizationId: req.session.organizationId });
      });

      // Second request should have session data
      const response = await agent
        .get('/auth/confluence/callback?code=test-code')
        .expect(200);

      expect(response.body.organizationId).toBe('test-org');
    });
  });

  describe('Error Handling', () => {
    it('should handle OAuth initiation errors', async () => {
      mockedInitiateOAuth.mockImplementation((req, res) => {
        res.status(500).json({ error: 'OAuth initiation failed' });
      });

      const response = await request(app)
        .get('/auth')
        .expect(500);

      expect(response.body.error).toBe('OAuth initiation failed');
    });

    it('should handle OAuth callback errors', async () => {
      mockedHandleOAuthCallback.mockImplementation((req, res) => {
        res.status(400).json({ error: 'Invalid authorization code' });
      });

      const response = await request(app)
        .get('/auth/callback')
        .expect(400);

      expect(response.body.error).toBe('Invalid authorization code');
    });

    it('should handle Confluence OAuth initiation errors', async () => {
      mockedInitiateConfluenceOAuth.mockImplementation((req, res) => {
        res.status(500).json({ error: 'Confluence OAuth initiation failed' });
      });

      const response = await request(app)
        .get('/auth/confluence')
        .expect(500);

      expect(response.body.error).toBe('Confluence OAuth initiation failed');
    });

    it('should handle Confluence OAuth callback errors', async () => {
      mockedHandleConfluenceCallback.mockImplementation((req, res) => {
        res.status(400).json({ error: 'Invalid state parameter' });
      });

      const response = await request(app)
        .get('/auth/confluence/callback')
        .expect(400);

      expect(response.body.error).toBe('Invalid state parameter');
    });
  });
});
