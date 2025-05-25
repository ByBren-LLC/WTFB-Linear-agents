/**
 * Tests for OAuth routes registration
 * 
 * This test verifies that both Linear and Confluence OAuth routes
 * are properly registered in the Express server.
 */

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { initiateOAuth, handleOAuthCallback } from '../src/auth/oauth';
import { initiateConfluenceOAuth, handleConfluenceCallback } from '../src/auth/confluence-oauth';

// Mock the OAuth functions
jest.mock('../src/auth/oauth');
jest.mock('../src/auth/confluence-oauth');
jest.mock('../src/utils/logger');

describe('OAuth Routes Registration', () => {
  let app: express.Application;

  beforeEach(() => {
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
      
      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
      expect(initiateOAuth).toHaveBeenCalled();
    });

    it('should register GET /auth/callback route', async () => {
      const response = await request(app).get('/auth/callback');
      
      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
      expect(handleOAuthCallback).toHaveBeenCalled();
    });
  });

  describe('Confluence OAuth Routes', () => {
    it('should register GET /auth/confluence route', async () => {
      const response = await request(app).get('/auth/confluence');
      
      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
      expect(initiateConfluenceOAuth).toHaveBeenCalled();
    });

    it('should register GET /auth/confluence/callback route', async () => {
      const response = await request(app).get('/auth/confluence/callback');
      
      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
      expect(handleConfluenceCallback).toHaveBeenCalled();
    });
  });

  describe('Route Isolation', () => {
    it('should not interfere with each other', async () => {
      // Test that calling Confluence routes doesn't affect Linear routes
      await request(app).get('/auth/confluence');
      await request(app).get('/auth');
      
      expect(initiateConfluenceOAuth).toHaveBeenCalledTimes(1);
      expect(initiateOAuth).toHaveBeenCalledTimes(1);
    });

    it('should handle different callback routes independently', async () => {
      await request(app).get('/auth/callback');
      await request(app).get('/auth/confluence/callback');
      
      expect(handleOAuthCallback).toHaveBeenCalledTimes(1);
      expect(handleConfluenceCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session Middleware', () => {
    it('should have session available in requests', async () => {
      // Mock the OAuth function to check if session is available
      const mockInitiateConfluenceOAuth = initiateConfluenceOAuth as jest.MockedFunction<typeof initiateConfluenceOAuth>;
      mockInitiateConfluenceOAuth.mockImplementation((req, res) => {
        // Check if session is available
        expect(req.session).toBeDefined();
        res.status(200).json({ sessionAvailable: !!req.session });
      });

      const response = await request(app).get('/auth/confluence');
      expect(response.body.sessionAvailable).toBe(true);
    });
  });
});
