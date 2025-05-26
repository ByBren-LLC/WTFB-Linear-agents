/**
 * Tests for token management functionality
 */
import * as tokenManager from '../../src/auth/tokens';
import * as models from '../../src/db/models';
import axios from 'axios';

// Mock dependencies
jest.mock('../../src/db/models');
jest.mock('axios');

const mockedModels = models as jest.Mocked<typeof models>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

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
  });

  describe('storeTokens', () => {
    it('should store tokens in the database', async () => {
      // Mock storeLinearToken to succeed
      mockedModels.storeLinearToken.mockResolvedValueOnce(undefined);

      await tokenManager.storeTokens(
        organizationId,
        organizationName,
        accessToken,
        refreshToken,
        appUserId,
        expiresIn
      );

      // Verify storeLinearToken was called with correct parameters
      expect(mockedModels.storeLinearToken).toHaveBeenCalledWith(
        organizationId,
        accessToken,
        refreshToken,
        appUserId,
        expect.any(Date)
      );
    });

    it('should throw an error if database query fails', async () => {
      // Mock storeLinearToken to throw an error
      const dbError = new Error('Database error');
      mockedModels.storeLinearToken.mockRejectedValueOnce(dbError);

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
      // Mock getAccessToken from models to return null
      mockedModels.getAccessToken.mockResolvedValueOnce(null);

      const result = await tokenManager.getAccessToken(organizationId);

      expect(result).toBeNull();
      expect(mockedModels.getAccessToken).toHaveBeenCalledWith(organizationId);
    });

    it('should return the access token if valid', async () => {
      // Mock getAccessToken from models to return a valid token
      mockedModels.getAccessToken.mockResolvedValueOnce(accessToken);

      const result = await tokenManager.getAccessToken(organizationId);

      expect(result).toBe(accessToken);
      expect(mockedModels.getAccessToken).toHaveBeenCalledWith(organizationId);
    });

    it('should attempt to refresh the token if expired', async () => {
      // Mock getAccessToken to return null first (expired), then refreshToken to return new token
      const newAccessToken = 'new-access-token';
      mockedModels.getAccessToken.mockResolvedValueOnce(null);

      // Mock getLinearToken for refresh process
      const tokenData = {
        id: 1,
        organization_id: organizationId,
        access_token: accessToken,
        refresh_token: refreshToken,
        app_user_id: appUserId,
        expires_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };
      mockedModels.getLinearToken.mockResolvedValueOnce(tokenData);

      // Mock axios for token refresh
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: newAccessToken,
          expires_in: 7200
        }
      });

      // Mock storeLinearToken for storing refreshed token
      mockedModels.storeLinearToken.mockResolvedValueOnce(undefined);

      const result = await tokenManager.getAccessToken(organizationId);

      expect(result).toBe(newAccessToken);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.linear.app/oauth/token',
        expect.objectContaining({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      );
    });

    it('should return null if token refresh fails', async () => {
      // Mock getAccessToken to return null (no valid token)
      mockedModels.getAccessToken.mockResolvedValueOnce(null);

      // Mock getLinearToken for refresh process
      const tokenData = {
        id: 1,
        organization_id: organizationId,
        access_token: accessToken,
        refresh_token: refreshToken,
        app_user_id: appUserId,
        expires_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };
      mockedModels.getLinearToken.mockResolvedValueOnce(tokenData);

      // Mock axios to throw an error during token refresh
      mockedAxios.post.mockRejectedValueOnce(new Error('Refresh failed'));

      const result = await tokenManager.getAccessToken(organizationId);

      expect(result).toBeNull();
    });
  });

  describe('revokeTokens', () => {
    it('should delete tokens from the database', async () => {
      // Mock deleteLinearToken to return true (successful deletion)
      mockedModels.deleteLinearToken.mockResolvedValueOnce(true);

      const result = await tokenManager.revokeTokens(organizationId);

      expect(result).toBe(true);
      expect(mockedModels.deleteLinearToken).toHaveBeenCalledWith(organizationId);
    });

    it('should return false if no tokens are found', async () => {
      // Mock deleteLinearToken to return false (no tokens found)
      mockedModels.deleteLinearToken.mockResolvedValueOnce(false);

      const result = await tokenManager.revokeTokens(organizationId);

      expect(result).toBe(false);
      expect(mockedModels.deleteLinearToken).toHaveBeenCalledWith(organizationId);
    });

    it('should return false if delete operation fails', async () => {
      // Mock deleteLinearToken to throw an error
      mockedModels.deleteLinearToken.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await tokenManager.revokeTokens(organizationId);

      expect(result).toBe(false);
      expect(mockedModels.deleteLinearToken).toHaveBeenCalledWith(organizationId);
    });
  });
});
