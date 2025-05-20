/**
 * Tests for token management functionality
 */
import * as tokenManager from '../../src/auth/tokens';
import * as encryption from '../../src/utils/encryption';
import { query } from '../../src/db/connection';
import axios from 'axios';

// Mock dependencies
jest.mock('../../src/utils/encryption');
jest.mock('../../src/db/connection');
jest.mock('axios');

describe('Token Management', () => {
  // Mock data
  const organizationId = 'test-org-id';
  const organizationName = 'Test Organization';
  const accessToken = 'test-access-token';
  const refreshToken = 'test-refresh-token';
  const appUserId = 'test-app-user-id';
  const expiresIn = 3600;
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
    
    // Mock environment variables
    process.env.LINEAR_CLIENT_ID = 'test-client-id';
    process.env.LINEAR_CLIENT_SECRET = 'test-client-secret';
    
    // Mock encryption functions
    (encryption.encrypt as jest.Mock).mockImplementation((text) => `encrypted-${text}`);
    (encryption.decrypt as jest.Mock).mockImplementation((text) => text.replace('encrypted-', ''));
    
    // Mock database query
    (query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  });
  
  describe('storeTokens', () => {
    it('should encrypt tokens and store them in the database', async () => {
      // Mock query to return success
      (query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });
      (query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });
      
      await tokenManager.storeTokens(
        organizationId,
        organizationName,
        accessToken,
        refreshToken,
        appUserId,
        expiresIn
      );
      
      // Verify encryption was called
      expect(encryption.encrypt).toHaveBeenCalledWith(accessToken);
      expect(encryption.encrypt).toHaveBeenCalledWith(refreshToken);
      
      // Verify database queries were executed
      expect(query).toHaveBeenCalledTimes(2);
      
      // Verify organization insert/update
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organizations'),
        [organizationId, organizationName]
      );
      
      // Verify token insert/update with encrypted tokens
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tokens'),
        [
          organizationId,
          `encrypted-${accessToken}`,
          `encrypted-${refreshToken}`,
          appUserId,
          expect.any(Date)
        ]
      );
    });
    
    it('should throw an error if database query fails', async () => {
      // Mock query to throw an error
      const dbError = new Error('Database error');
      (query as jest.Mock).mockRejectedValueOnce(dbError);
      
      await expect(
        tokenManager.storeTokens(
          organizationId,
          organizationName,
          accessToken,
          refreshToken,
          appUserId,
          expiresIn
        )
      ).rejects.toThrow(dbError);
    });
  });
  
  describe('getAccessToken', () => {
    it('should return null if no tokens are found', async () => {
      // Mock query to return empty result
      (query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      
      const result = await tokenManager.getAccessToken(organizationId);
      
      expect(result).toBeNull();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [organizationId]
      );
    });
    
    it('should decrypt and return the access token if valid', async () => {
      // Mock query to return a valid token
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour
      
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          access_token: `encrypted-${accessToken}`,
          refresh_token: `encrypted-${refreshToken}`,
          app_user_id: appUserId,
          expires_at: expiresAt
        }],
        rowCount: 1
      });
      
      const result = await tokenManager.getAccessToken(organizationId);
      
      expect(result).toBe(accessToken);
      expect(encryption.decrypt).toHaveBeenCalledWith(`encrypted-${accessToken}`);
    });
    
    it('should attempt to refresh the token if expired', async () => {
      // Mock query to return an expired token
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 1); // Token expired 1 hour ago
      
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          access_token: `encrypted-${accessToken}`,
          refresh_token: `encrypted-${refreshToken}`,
          app_user_id: appUserId,
          expires_at: expiredDate
        }],
        rowCount: 1
      });
      
      // Mock refreshAccessToken
      const newAccessToken = 'new-access-token';
      const newExpiresIn = 7200;
      
      // Mock axios for token refresh
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: newAccessToken,
          expires_in: newExpiresIn
        }
      });
      
      const result = await tokenManager.getAccessToken(organizationId);
      
      expect(result).toBe(newAccessToken);
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.linear.app/oauth/token',
        expect.objectContaining({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      );
    });
    
    it('should return null if token refresh fails', async () => {
      // Mock query to return an expired token
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 1); // Token expired 1 hour ago
      
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          access_token: `encrypted-${accessToken}`,
          refresh_token: `encrypted-${refreshToken}`,
          app_user_id: appUserId,
          expires_at: expiredDate
        }],
        rowCount: 1
      });
      
      // Mock axios to throw an error during token refresh
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Refresh failed'));
      
      const result = await tokenManager.getAccessToken(organizationId);
      
      expect(result).toBeNull();
    });
  });
  
  describe('revokeTokens', () => {
    it('should delete tokens from the database', async () => {
      // Mock getAccessToken to return a valid token
      jest.spyOn(tokenManager, 'getAccessToken').mockResolvedValueOnce(accessToken);
      
      // Mock query for delete operation
      (query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });
      
      const result = await tokenManager.revokeTokens(organizationId);
      
      expect(result).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM tokens'),
        [organizationId]
      );
    });
    
    it('should return false if no tokens are found', async () => {
      // Mock getAccessToken to return null
      jest.spyOn(tokenManager, 'getAccessToken').mockResolvedValueOnce(null);
      
      const result = await tokenManager.revokeTokens(organizationId);
      
      expect(result).toBe(false);
      expect(query).not.toHaveBeenCalled();
    });
    
    it('should return false if delete operation affects no rows', async () => {
      // Mock getAccessToken to return a valid token
      jest.spyOn(tokenManager, 'getAccessToken').mockResolvedValueOnce(accessToken);
      
      // Mock query for delete operation with no affected rows
      (query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      
      const result = await tokenManager.revokeTokens(organizationId);
      
      expect(result).toBe(false);
    });
  });
});
