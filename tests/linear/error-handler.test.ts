import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
  handleLinearError, 
  LinearError, 
  LinearErrorType,
  isRetryableError,
  retryWithBackoff
} from '../../src/linear/error-handler';

describe('Error Handler', () => {
  describe('handleLinearError', () => {
    it('should handle rate limit errors', () => {
      const error = {
        response: {
          status: 429,
          data: {
            message: 'Too many requests'
          }
        }
      };
      
      const linearError = handleLinearError(error);
      
      expect(linearError).toBeInstanceOf(LinearError);
      expect(linearError.type).toBe(LinearErrorType.RATE_LIMIT);
      expect(linearError.retryable).toBe(true);
      expect(linearError.message).toContain('Linear API rate limit exceeded');
      expect(linearError.message).toContain('Too many requests');
    });
    
    it('should handle authentication errors', () => {
      const error = {
        response: {
          status: 401,
          data: {
            message: 'Invalid token'
          }
        }
      };
      
      const linearError = handleLinearError(error);
      
      expect(linearError).toBeInstanceOf(LinearError);
      expect(linearError.type).toBe(LinearErrorType.AUTHENTICATION);
      expect(linearError.retryable).toBe(false);
      expect(linearError.message).toContain('Authentication failed');
      expect(linearError.message).toContain('Invalid token');
    });
    
    it('should handle permission errors', () => {
      const error = {
        response: {
          status: 403,
          data: {
            message: 'Permission denied'
          }
        }
      };
      
      const linearError = handleLinearError(error);
      
      expect(linearError).toBeInstanceOf(LinearError);
      expect(linearError.type).toBe(LinearErrorType.PERMISSION);
      expect(linearError.retryable).toBe(false);
      expect(linearError.message).toContain('Permission denied');
    });
    
    it('should handle not found errors', () => {
      const error = {
        response: {
          status: 404,
          data: {
            message: 'Issue not found'
          }
        }
      };
      
      const linearError = handleLinearError(error);
      
      expect(linearError).toBeInstanceOf(LinearError);
      expect(linearError.type).toBe(LinearErrorType.NOT_FOUND);
      expect(linearError.retryable).toBe(false);
      expect(linearError.message).toContain('Resource not found');
      expect(linearError.message).toContain('Issue not found');
    });
    
    it('should handle validation errors', () => {
      const error = {
        response: {
          status: 400,
          data: {
            errors: [
              { message: 'Invalid input' },
              { message: 'Field required' }
            ]
          }
        }
      };
      
      const linearError = handleLinearError(error);
      
      expect(linearError).toBeInstanceOf(LinearError);
      expect(linearError.type).toBe(LinearErrorType.VALIDATION);
      expect(linearError.retryable).toBe(false);
      expect(linearError.message).toContain('Invalid request');
      expect(linearError.message).toContain('Invalid input, Field required');
    });
    
    it('should handle server errors', () => {
      const error = {
        response: {
          status: 500,
          data: {
            message: 'Internal server error'
          }
        }
      };
      
      const linearError = handleLinearError(error);
      
      expect(linearError).toBeInstanceOf(LinearError);
      expect(linearError.type).toBe(LinearErrorType.SERVER);
      expect(linearError.retryable).toBe(true);
      expect(linearError.message).toContain('Linear API server error');
      expect(linearError.message).toContain('Internal server error');
    });
    
    it('should handle network errors', () => {
      const error = {
        request: {},
        message: 'Network error'
      };
      
      const linearError = handleLinearError(error);
      
      expect(linearError).toBeInstanceOf(LinearError);
      expect(linearError.type).toBe(LinearErrorType.NETWORK);
      expect(linearError.retryable).toBe(true);
      expect(linearError.message).toContain('No response received');
    });
    
    it('should handle unknown errors', () => {
      const error = {
        message: 'Unknown error'
      };
      
      const linearError = handleLinearError(error);
      
      expect(linearError).toBeInstanceOf(LinearError);
      expect(linearError.type).toBe(LinearErrorType.UNKNOWN);
      expect(linearError.retryable).toBe(false);
      expect(linearError.message).toContain('Error setting up Linear API request');
      expect(linearError.message).toContain('Unknown error');
    });
  });
  
  describe('isRetryableError', () => {
    it('should return true for retryable LinearError', () => {
      const error = new LinearError('Test error', LinearErrorType.RATE_LIMIT, true);
      expect(isRetryableError(error)).toBe(true);
    });
    
    it('should return false for non-retryable LinearError', () => {
      const error = new LinearError('Test error', LinearErrorType.VALIDATION, false);
      expect(isRetryableError(error)).toBe(false);
    });
    
    it('should return true for rate limit errors', () => {
      const error = {
        response: {
          status: 429
        }
      };
      expect(isRetryableError(error)).toBe(true);
    });
    
    it('should return true for server errors', () => {
      const error = {
        response: {
          status: 500
        }
      };
      expect(isRetryableError(error)).toBe(true);
    });
    
    it('should return true for network errors', () => {
      const error = {
        request: {}
      };
      expect(isRetryableError(error)).toBe(true);
    });
    
    it('should return false for other errors', () => {
      const error = {
        response: {
          status: 400
        }
      };
      expect(isRetryableError(error)).toBe(false);
    });
  });
  
  describe('retryWithBackoff', () => {
    beforeEach(() => {
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });
    });
    
    it('should retry a function that fails with retryable errors', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new LinearError('Test error', LinearErrorType.RATE_LIMIT, true))
        .mockRejectedValueOnce(new LinearError('Test error', LinearErrorType.RATE_LIMIT, true))
        .mockResolvedValueOnce('success');
      
      const result = await retryWithBackoff(fn, 3, 100);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });
    
    it('should not retry a function that fails with non-retryable errors', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new LinearError('Test error', LinearErrorType.VALIDATION, false));
      
      await expect(retryWithBackoff(fn, 3, 100)).rejects.toThrow('Test error');
      expect(fn).toHaveBeenCalledTimes(1);
    });
    
    it('should throw the last error if all retries fail', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new LinearError('Error 1', LinearErrorType.RATE_LIMIT, true))
        .mockRejectedValueOnce(new LinearError('Error 2', LinearErrorType.RATE_LIMIT, true))
        .mockRejectedValueOnce(new LinearError('Error 3', LinearErrorType.RATE_LIMIT, true))
        .mockRejectedValueOnce(new LinearError('Error 4', LinearErrorType.RATE_LIMIT, true));
      
      await expect(retryWithBackoff(fn, 3, 100)).rejects.toThrow('Error 4');
      expect(fn).toHaveBeenCalledTimes(4);
    });
  });
});
