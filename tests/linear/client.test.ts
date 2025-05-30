import { LinearClientWrapper } from '../../src/linear/client';
import { handleLinearError } from '../../src/linear/error-handler';
import { RateLimiter } from '../../src/linear/rate-limiter';
import { retry } from '../../src/linear/retry';
import { LinearAuthenticationError } from '../../src/linear/errors';

// Mock dependencies
jest.mock('@linear/sdk', () => ({
  LinearClient: jest.fn().mockImplementation(() => ({
    issue: jest.fn(),
    issueCreate: jest.fn(),
    issueUpdate: jest.fn(),
    issues: jest.fn(),
    teams: jest.fn(),
    team: jest.fn(),
    issueLabels: jest.fn(),
    commentCreate: jest.fn(),
    viewer: jest.fn()
  }))
}));

jest.mock('../../src/linear/error-handler', () => ({
  handleLinearError: jest.fn()
}));

const mockRateLimiterInstance = {
  throttle: jest.fn().mockResolvedValue(undefined)
};

const MockRateLimiter = jest.fn().mockImplementation(() => mockRateLimiterInstance);

jest.mock('../../src/linear/rate-limiter', () => ({
  RateLimiter: MockRateLimiter
}));

jest.mock('../../src/linear/retry', () => ({
  retry: jest.fn()
}));

jest.mock('../../src/auth/tokens', () => ({
  refreshToken: jest.fn()
}));

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Linear Client Wrapper', () => {
  let linearClientWrapper: LinearClientWrapper;
  const accessToken = 'test-token';
  const organizationId = 'test-org-id';

  beforeEach(() => {
    jest.clearAllMocks();
    linearClientWrapper = new LinearClientWrapper(accessToken, organizationId);
  });

  describe('executeQuery', () => {
    it('should throttle requests and execute the query', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue({ id: 'test-id' });
      (retry as jest.Mock).mockImplementation(async (fn) => fn());

      const result = await linearClientWrapper.executeQuery(mockQueryFn, 'testEndpoint');

      // Should throttle the request
      expect(mockRateLimiterInstance.throttle).toHaveBeenCalledWith('testEndpoint');

      // Should execute the query
      expect(mockQueryFn).toHaveBeenCalled();

      // Should return the result
      expect(result).toEqual({ id: 'test-id' });
    });

    it('should handle errors using the error handler', async () => {
      const mockError = new Error('Test error');
      const mockQueryFn = jest.fn().mockRejectedValue(mockError);
      const mockHandledError = new Error('Handled error');
      (handleLinearError as jest.Mock).mockReturnValue(mockHandledError);
      (retry as jest.Mock).mockImplementation(async (fn) => {
        try {
          return await fn();
        } catch (error) {
          throw error;
        }
      });

      await expect(linearClientWrapper.executeQuery(mockQueryFn, 'testEndpoint')).rejects.toThrow('Handled error');

      // Should throttle the request
      expect(mockRateLimiterInstance.throttle).toHaveBeenCalledWith('testEndpoint');

      // Should execute the query
      expect(mockQueryFn).toHaveBeenCalled();

      // Should handle the error
      expect(handleLinearError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('API methods', () => {
    beforeEach(() => {
      (retry as jest.Mock).mockImplementation(async (fn) => fn());
    });

    it('should call getIssue with the correct parameters', async () => {
      const mockIssue = { id: 'test-id', title: 'Test Issue' };
      const mockLinearClient = require('@linear/sdk').LinearClient.mock.results[0].value;
      mockLinearClient.issue.mockResolvedValue(mockIssue);

      const result = await linearClientWrapper.getIssue('test-id');

      expect(mockLinearClient.issue).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockIssue);
    });

    it('should call createIssue with the correct parameters', async () => {
      const mockInput = { title: 'Test Issue', description: 'Test Description' };
      const mockResponse = { success: true, issue: { id: 'test-id' } };
      const mockLinearClient = require('@linear/sdk').LinearClient.mock.results[0].value;
      mockLinearClient.issueCreate.mockResolvedValue(mockResponse);

      const result = await linearClientWrapper.createIssue(mockInput);

      expect(mockLinearClient.issueCreate).toHaveBeenCalledWith(mockInput);
      expect(result).toEqual(mockResponse);
    });

    it('should call updateIssue with the correct parameters', async () => {
      const mockInput = { title: 'Updated Issue' };
      const mockResponse = { success: true, issue: { id: 'test-id' } };
      const mockLinearClient = require('@linear/sdk').LinearClient.mock.results[0].value;
      mockLinearClient.issueUpdate.mockResolvedValue(mockResponse);

      const result = await linearClientWrapper.updateIssue('test-id', mockInput);

      expect(mockLinearClient.issueUpdate).toHaveBeenCalledWith('test-id', mockInput);
      expect(result).toEqual(mockResponse);
    });

    it('should call getTeamIssues with the correct parameters', async () => {
      const mockIssues = { nodes: [{ id: 'test-id' }] };
      const mockLinearClient = require('@linear/sdk').LinearClient.mock.results[0].value;
      mockLinearClient.issues.mockResolvedValue(mockIssues);

      const result = await linearClientWrapper.getTeamIssues('team-id');

      expect(mockLinearClient.issues).toHaveBeenCalledWith({
        filter: {
          team: { id: { eq: 'team-id' } }
        }
      });
      expect(result).toEqual(mockIssues);
    });

    it('should call getTeams with the correct parameters', async () => {
      const mockTeams = { nodes: [{ id: 'team-id' }] };
      const mockLinearClient = require('@linear/sdk').LinearClient.mock.results[0].value;
      mockLinearClient.teams.mockResolvedValue(mockTeams);

      const result = await linearClientWrapper.getTeams();

      expect(mockLinearClient.teams).toHaveBeenCalled();
      expect(result).toEqual(mockTeams);
    });
  });
});
