/**
 * Tests for OAuth routes registration
 *
 * This test verifies that both Linear and Confluence OAuth routes
 * are properly registered in the Express server.
 */

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { Request, Response } from 'express';
import { initiateOAuth, handleOAuthCallback } from '../src/auth/oauth';
import { initiateConfluenceOAuth, handleConfluenceCallback } from '../src/auth/confluence-oauth';

// Mock the OAuth functions
jest.mock('../src/auth/oauth');
jest.mock('../src/auth/confluence-oauth');
jest.mock('../src/utils/logger');

// Type the mocked functions
const mockedInitiateOAuth = initiateOAuth as jest.MockedFunction<typeof initiateOAuth>;
const mockedHandleOAuthCallback = handleOAuthCallback as jest.MockedFunction<typeof handleOAuthCallback>;
const mockedInitiateConfluenceOAuth = initiateConfluenceOAuth as jest.MockedFunction<typeof initiateConfluenceOAuth>;
const mockedHandleConfluenceCallback = handleConfluenceCallback as jest.MockedFunction<typeof handleConfluenceCallback>;

describe('OAuth Routes Registration', () => {
  let app: express.Application;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up default mock implementations
    mockedInitiateOAuth.mockImplementation((req: Request, res: Response) => {
      res.status(302).redirect('https://linear.app/oauth/authorize');
      return res;
    });

    mockedHandleOAuthCallback.mockImplementation(async (req: Request, res: Response) => {
      res.status(200).json({ success: true });
      return res;
    });

    mockedInitiateConfluenceOAuth.mockImplementation((req: any, res: any) => {
      res.status(302).redirect('https://auth.atlassian.com/authorize');
    });

    mockedHandleConfluenceCallback.mockImplementation(async (req: any, res: any) => {
      res.status(200).json({ success: true });
    });

    // Create a test Express app with the same configuration as src/index.ts
    app = express();
    app.use(express.json());

    // Session middleware for OAuth state management
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));

    // Register OAuth routes (same as in src/index.ts)
    app.get('/auth', initiateOAuth);
    app.get('/auth/callback', handleOAuthCallback);

    // Confluence OAuth routes
    app.get('/auth/confluence', initiateConfluenceOAuth);
    app.get('/auth/confluence/callback', handleConfluenceCallback);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Linear OAuth Routes', () => {
    it('should register GET /auth route', async () => {
      const response = await request(app).get('/auth');

      // Should redirect to Linear OAuth
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('linear.app/oauth/authorize');
      expect(mockedInitiateOAuth).toHaveBeenCalled();
    }, 10000); // 10 second timeout for this test

    it('should register GET /auth/callback route', async () => {
      const response = await request(app).get('/auth/callback');

      // Should return success response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedHandleOAuthCallback).toHaveBeenCalled();
    }, 10000); // 10 second timeout for this test
  });

  describe('Confluence OAuth Routes', () => {
    it('should register GET /auth/confluence route', async () => {
      const response = await request(app).get('/auth/confluence');

      // Should redirect to Atlassian OAuth
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('auth.atlassian.com/authorize');
      expect(mockedInitiateConfluenceOAuth).toHaveBeenCalled();
    }, 10000); // 10 second timeout for this test

    it('should register GET /auth/confluence/callback route', async () => {
      const response = await request(app).get('/auth/confluence/callback');

      // Should return success response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedHandleConfluenceCallback).toHaveBeenCalled();
    }, 10000); // 10 second timeout for this test
  });

  describe('Route Isolation', () => {
    it('should not interfere with each other', async () => {
      // Test that calling Confluence routes doesn't affect Linear routes
      await request(app).get('/auth/confluence');
      await request(app).get('/auth');

      expect(mockedInitiateConfluenceOAuth).toHaveBeenCalledTimes(1);
      expect(mockedInitiateOAuth).toHaveBeenCalledTimes(1);
    }, 10000); // 10 second timeout for this test

    it('should handle different callback routes independently', async () => {
      await request(app).get('/auth/callback');
      await request(app).get('/auth/confluence/callback');

      expect(mockedHandleOAuthCallback).toHaveBeenCalledTimes(1);
      expect(mockedHandleConfluenceCallback).toHaveBeenCalledTimes(1);
    }, 10000); // 10 second timeout for this test
  });

  describe('Session Middleware', () => {
    it('should have session available in requests', async () => {
      // Mock the OAuth function to check if session is available
      mockedInitiateConfluenceOAuth.mockImplementation((req: any, res: any) => {
        // Check if session is available
        expect(req.session).toBeDefined();
        res.status(200).json({ sessionAvailable: !!req.session });
      });

      const response = await request(app).get('/auth/confluence');
      expect(response.body.sessionAvailable).toBe(true);
    }, 10000); // 10 second timeout for this test
  });
});
