import {
  LinearApiError,
  LinearRateLimitError,
  LinearAuthenticationError,
  LinearNotFoundError,
  LinearValidationError,
  LinearNetworkError
} from '../../src/linear/errors';

describe('Linear API Errors', () => {
  describe('LinearApiError', () => {
    it('should create a LinearApiError with the correct properties', () => {
      const error = new LinearApiError('Test error', 500, { message: 'Server error' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('LinearApiError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.response).toEqual({ message: 'Server error' });
    });
  });

  describe('LinearRateLimitError', () => {
    it('should create a LinearRateLimitError with the correct properties', () => {
      const error = new LinearRateLimitError('Rate limit exceeded', 429, { message: 'Too many requests' }, 30);
      
      expect(error).toBeInstanceOf(LinearApiError);
      expect(error.name).toBe('LinearRateLimitError');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.response).toEqual({ message: 'Too many requests' });
      expect(error.retryAfter).toBe(30);
    });

    it('should create a LinearRateLimitError without retryAfter', () => {
      const error = new LinearRateLimitError('Rate limit exceeded', 429, { message: 'Too many requests' });
      
      expect(error).toBeInstanceOf(LinearApiError);
      expect(error.name).toBe('LinearRateLimitError');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.response).toEqual({ message: 'Too many requests' });
      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('LinearAuthenticationError', () => {
    it('should create a LinearAuthenticationError with the correct properties', () => {
      const error = new LinearAuthenticationError('Authentication failed', 401, { message: 'Unauthorized' });
      
      expect(error).toBeInstanceOf(LinearApiError);
      expect(error.name).toBe('LinearAuthenticationError');
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.response).toEqual({ message: 'Unauthorized' });
    });
  });

  describe('LinearNotFoundError', () => {
    it('should create a LinearNotFoundError with the correct properties', () => {
      const error = new LinearNotFoundError('Resource not found', 404, { message: 'Not found' });
      
      expect(error).toBeInstanceOf(LinearApiError);
      expect(error.name).toBe('LinearNotFoundError');
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.response).toEqual({ message: 'Not found' });
    });
  });

  describe('LinearValidationError', () => {
    it('should create a LinearValidationError with the correct properties', () => {
      const validationErrors = [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Email is invalid' }
      ];
      
      const error = new LinearValidationError('Validation failed', 400, { message: 'Bad request' }, validationErrors);
      
      expect(error).toBeInstanceOf(LinearApiError);
      expect(error.name).toBe('LinearValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.response).toEqual({ message: 'Bad request' });
      expect(error.validationErrors).toEqual(validationErrors);
    });

    it('should create a LinearValidationError without validationErrors', () => {
      const error = new LinearValidationError('Validation failed', 400, { message: 'Bad request' });
      
      expect(error).toBeInstanceOf(LinearApiError);
      expect(error.name).toBe('LinearValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.response).toEqual({ message: 'Bad request' });
      expect(error.validationErrors).toBeUndefined();
    });
  });

  describe('LinearNetworkError', () => {
    it('should create a LinearNetworkError with the correct properties', () => {
      const originalError = new Error('Network error');
      const error = new LinearNetworkError('Failed to connect', originalError);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('LinearNetworkError');
      expect(error.message).toBe('Failed to connect');
      expect(error.originalError).toBe(originalError);
    });
  });
});
