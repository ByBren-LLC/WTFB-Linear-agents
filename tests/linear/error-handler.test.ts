import { handleLinearError } from '../../src/linear/error-handler';
import {
  LinearApiError,
  LinearRateLimitError,
  LinearAuthenticationError,
  LinearNotFoundError,
  LinearValidationError,
  LinearNetworkError
} from '../../src/linear/errors';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Error Handler', () => {
  it('should handle rate limit errors', () => {
    const error = {
      response: {
        status: 429,
        data: { message: 'Too many requests' },
        headers: { 'retry-after': '30' }
      }
    };

    const handledError = handleLinearError(error);

    expect(handledError).toBeInstanceOf(LinearRateLimitError);
    expect(handledError.name).toBe('LinearRateLimitError');
    expect((handledError as LinearRateLimitError).retryAfter).toBe(30);
  });

  it('should handle authentication errors', () => {
    const error = {
      response: {
        status: 401,
        data: { message: 'Unauthorized' }
      }
    };

    const handledError = handleLinearError(error);

    expect(handledError).toBeInstanceOf(LinearAuthenticationError);
    expect(handledError.name).toBe('LinearAuthenticationError');
  });

  it('should handle not found errors', () => {
    const error = {
      response: {
        status: 404,
        data: { message: 'Not found' }
      }
    };

    const handledError = handleLinearError(error);

    expect(handledError).toBeInstanceOf(LinearNotFoundError);
    expect(handledError.name).toBe('LinearNotFoundError');
  });

  it('should handle validation errors', () => {
    const error = {
      response: {
        status: 400,
        data: { 
          message: 'Validation error',
          errors: [{ field: 'name', message: 'Name is required' }]
        }
      }
    };

    const handledError = handleLinearError(error);

    expect(handledError).toBeInstanceOf(LinearValidationError);
    expect(handledError.name).toBe('LinearValidationError');
    expect((handledError as LinearValidationError).validationErrors).toEqual([{ field: 'name', message: 'Name is required' }]);
  });

  it('should handle other API errors', () => {
    const error = {
      response: {
        status: 500,
        data: { message: 'Internal server error' }
      }
    };

    const handledError = handleLinearError(error);

    expect(handledError).toBeInstanceOf(LinearApiError);
    expect(handledError.name).toBe('LinearApiError');
  });

  it('should handle network errors', () => {
    const originalError = new Error('Network error');
    const error = {
      request: {},
      message: 'Network error'
    };

    const handledError = handleLinearError(error);

    expect(handledError).toBeInstanceOf(LinearNetworkError);
    expect(handledError.name).toBe('LinearNetworkError');
  });

  it('should handle request setup errors', () => {
    const error = {
      message: 'Request setup error'
    };

    const handledError = handleLinearError(error);

    expect(handledError).toBeInstanceOf(Error);
    expect(handledError.message).toBe('Linear API request setup error: Request setup error');
  });
});
