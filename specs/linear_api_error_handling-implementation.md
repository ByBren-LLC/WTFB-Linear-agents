# Linear API Error Handling - Implementation Document

## Overview
This technical enabler will implement robust error handling for the Linear API integration. This is a critical component that will ensure the Linear Planning Agent can gracefully handle API errors, rate limits, and other issues when interacting with the Linear API.

## User Story
As a Linear Planning Agent, I need to be able to handle Linear API errors gracefully so that I can provide a reliable and robust experience when creating and managing Linear issues.

## Acceptance Criteria
1. The agent can detect and handle common Linear API errors
2. The agent can handle rate limiting and implement appropriate backoff strategies
3. The agent can retry failed requests with appropriate backoff
4. The agent can provide meaningful error messages to users
5. The agent can recover from transient errors
6. The agent can handle authentication errors and token expiration
7. The agent logs errors appropriately for debugging
8. The implementation is well-tested with unit tests
9. The implementation is well-documented with JSDoc comments

## Technical Context
The Linear Planning Agent interacts with the Linear API to create and manage issues. The Linear API can return various errors, including rate limits, authentication errors, and other API errors. The agent needs to handle these errors gracefully to provide a reliable experience.

### Existing Code
- `src/auth/tokens.ts`: Token management for Linear OAuth
- `src/safe/safe_linear_implementation.ts`: SAFe implementation in Linear

### Dependencies
- None

## Implementation Plan

### 1. Implement Error Types
- Create a new file `src/linear/errors.ts` for Linear API error types
- Define error classes for different types of Linear API errors

```typescript
// src/linear/errors.ts
export class LinearApiError extends Error {
  constructor(message: string, public statusCode: number, public response: any) {
    super(message);
    this.name = 'LinearApiError';
  }
}

export class LinearRateLimitError extends LinearApiError {
  constructor(message: string, public statusCode: number, public response: any, public retryAfter?: number) {
    super(message, statusCode, response);
    this.name = 'LinearRateLimitError';
  }
}

export class LinearAuthenticationError extends LinearApiError {
  constructor(message: string, public statusCode: number, public response: any) {
    super(message, statusCode, response);
    this.name = 'LinearAuthenticationError';
  }
}

export class LinearNotFoundError extends LinearApiError {
  constructor(message: string, public statusCode: number, public response: any) {
    super(message, statusCode, response);
    this.name = 'LinearNotFoundError';
  }
}

export class LinearValidationError extends LinearApiError {
  constructor(message: string, public statusCode: number, public response: any, public validationErrors?: any[]) {
    super(message, statusCode, response);
    this.name = 'LinearValidationError';
  }
}

export class LinearNetworkError extends Error {
  constructor(message: string, public originalError: Error) {
    super(message);
    this.name = 'LinearNetworkError';
  }
}
```

### 2. Implement Error Handler
- Create a new file `src/linear/error-handler.ts` for Linear API error handling
- Implement functions to detect and handle different types of errors

```typescript
// src/linear/error-handler.ts
import * as logger from '../utils/logger';
import {
  LinearApiError,
  LinearRateLimitError,
  LinearAuthenticationError,
  LinearNotFoundError,
  LinearValidationError,
  LinearNetworkError
} from './errors';

export const handleLinearError = (error: any): Error => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const { status, data } = error.response;
    
    if (status === 429) {
      // Rate limit error
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
      logger.warn('Linear API rate limit exceeded', { retryAfter });
      return new LinearRateLimitError(
        'Linear API rate limit exceeded',
        status,
        data,
        retryAfter
      );
    } else if (status === 401 || status === 403) {
      // Authentication error
      logger.error('Linear API authentication error', { status, data });
      return new LinearAuthenticationError(
        'Linear API authentication error',
        status,
        data
      );
    } else if (status === 404) {
      // Not found error
      logger.warn('Linear API resource not found', { status, data });
      return new LinearNotFoundError(
        'Linear API resource not found',
        status,
        data
      );
    } else if (status === 400 || status === 422) {
      // Validation error
      logger.warn('Linear API validation error', { status, data });
      return new LinearValidationError(
        'Linear API validation error',
        status,
        data,
        data.errors
      );
    } else {
      // Other API error
      logger.error('Linear API error', { status, data });
      return new LinearApiError(
        `Linear API error: ${status}`,
        status,
        data
      );
    }
  } else if (error.request) {
    // The request was made but no response was received
    logger.error('Linear API network error', { error });
    return new LinearNetworkError(
      'Linear API network error',
      error
    );
  } else {
    // Something happened in setting up the request that triggered an Error
    logger.error('Linear API request setup error', { error });
    return new Error(`Linear API request setup error: ${error.message}`);
  }
};
```

### 3. Implement Rate Limiter
- Create a new file `src/linear/rate-limiter.ts` for Linear API rate limiting
- Implement a rate limiter class that respects Linear API rate limits

```typescript
// src/linear/rate-limiter.ts
import * as logger from '../utils/logger';

export class RateLimiter {
  private requestCounts: Map<string, number> = new Map();
  private lastResetTime: Map<string, number> = new Map();
  private readonly defaultLimit = 50; // Default rate limit per minute
  private readonly resetInterval = 60 * 1000; // 1 minute in milliseconds

  constructor(private readonly limits: Record<string, number> = {}) {}

  async throttle(endpoint: string): Promise<void> {
    const limit = this.limits[endpoint] || this.defaultLimit;
    const now = Date.now();
    
    // Initialize or reset counters if needed
    if (!this.requestCounts.has(endpoint) || now - (this.lastResetTime.get(endpoint) || 0) >= this.resetInterval) {
      this.requestCounts.set(endpoint, 0);
      this.lastResetTime.set(endpoint, now);
    }
    
    // Get current count
    const count = this.requestCounts.get(endpoint) || 0;
    
    if (count >= limit) {
      // We've hit the rate limit, calculate time to wait
      const resetTime = (this.lastResetTime.get(endpoint) || 0) + this.resetInterval;
      const waitTime = Math.max(0, resetTime - now);
      
      logger.warn('Rate limit reached, throttling request', { endpoint, waitTime });
      
      // Wait until reset
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reset counter after waiting
      this.requestCounts.set(endpoint, 0);
      this.lastResetTime.set(endpoint, Date.now());
    }
    
    // Increment counter
    this.requestCounts.set(endpoint, count + 1);
  }
}
```

### 4. Implement Retry Logic
- Create a new file `src/linear/retry.ts` for Linear API retry logic
- Implement functions to retry failed requests with appropriate backoff

```typescript
// src/linear/retry.ts
import * as logger from '../utils/logger';
import { LinearRateLimitError, LinearNetworkError } from './errors';

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 60000, // 1 minute
  backoffFactor: 2,
  retryableErrors: [
    'LinearRateLimitError',
    'LinearNetworkError'
  ]
};

export const retry = async <T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> => {
  const retryOptions: RetryOptions = {
    ...defaultRetryOptions,
    ...options
  };
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if this error is retryable
      if (!retryOptions.retryableErrors.includes(lastError.name)) {
        throw lastError;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === retryOptions.maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      let delay = retryOptions.initialDelay * Math.pow(retryOptions.backoffFactor, attempt);
      
      // If this is a rate limit error with a retry-after header, use that
      if (lastError instanceof LinearRateLimitError && lastError.retryAfter) {
        delay = lastError.retryAfter * 1000;
      }
      
      // Cap the delay at the maximum
      delay = Math.min(delay, retryOptions.maxDelay);
      
      logger.warn('Retrying Linear API request after error', {
        attempt: attempt + 1,
        maxRetries: retryOptions.maxRetries,
        delay,
        error: lastError
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never happen, but TypeScript needs it
  throw lastError;
};
```

### 5. Implement Linear Client Wrapper
- Create a new file `src/linear/client.ts` for a Linear client wrapper
- Implement a wrapper around the Linear SDK that includes error handling and retry logic

```typescript
// src/linear/client.ts
import { LinearClient, LinearDocument, LinearFetch } from '@linear/sdk';
import * as logger from '../utils/logger';
import { handleLinearError } from './error-handler';
import { RateLimiter } from './rate-limiter';
import { retry, RetryOptions } from './retry';
import { refreshToken } from '../auth/tokens';

export class LinearClientWrapper {
  private linearClient: LinearClient;
  private rateLimiter: RateLimiter;
  private organizationId: string;
  
  constructor(accessToken: string, organizationId: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.rateLimiter = new RateLimiter();
    this.organizationId = organizationId;
  }
  
  async executeQuery<T>(
    queryFn: () => Promise<T>,
    endpoint: string,
    retryOptions?: Partial<RetryOptions>
  ): Promise<T> {
    try {
      // Throttle requests to respect rate limits
      await this.rateLimiter.throttle(endpoint);
      
      // Execute the query with retry logic
      return await retry(async () => {
        try {
          return await queryFn();
        } catch (error) {
          // Handle the error
          const handledError = handleLinearError(error);
          
          // If it's an authentication error, try to refresh the token
          if (handledError.name === 'LinearAuthenticationError') {
            const newToken = await refreshToken(this.organizationId);
            
            if (newToken) {
              // Update the client with the new token
              this.linearClient = new LinearClient({ accessToken: newToken });
              
              // Retry the query with the new token
              return await queryFn();
            }
          }
          
          // Re-throw the handled error
          throw handledError;
        }
      }, retryOptions);
    } catch (error) {
      logger.error('Error executing Linear API query', { error, endpoint });
      throw error;
    }
  }
  
  // Wrapper methods for common Linear API operations
  // These methods use the executeQuery method to handle errors and retries
  
  async getIssue(issueId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issue(issueId),
      'getIssue'
    );
  }
  
  async createIssue(input: any): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issueCreate(input),
      'createIssue'
    );
  }
  
  async updateIssue(issueId: string, input: any): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issueUpdate(issueId, input),
      'updateIssue'
    );
  }
  
  // Add more wrapper methods as needed
}
```

### 6. Write Tests
- Write unit tests for all components
- Write integration tests with mock Linear API
- Test error handling and retry logic

```typescript
// tests/linear/error-handler.test.ts
describe('Error Handler', () => {
  // Test cases
});

// tests/linear/rate-limiter.test.ts
describe('Rate Limiter', () => {
  // Test cases
});

// tests/linear/retry.test.ts
describe('Retry Logic', () => {
  // Test cases
});
```

### 7. Document the API
- Add JSDoc comments to all functions and classes
- Create a README.md file for the Linear API error handling
- Document usage examples and limitations

## Testing Approach
- Unit tests for all components
- Integration tests with mock Linear API
- Test error handling and retry logic
- Test with various error scenarios
- Test with rate limiting scenarios

## Definition of Done
- All acceptance criteria are met
- All tests are passing
- Code is well-documented with JSDoc comments
- A README.md file is created for the Linear API error handling
- The implementation is reviewed and approved by the team

## Estimated Effort
- 3 story points (approximately 3 days of work)

## Resources
- [Linear API Documentation](https://developers.linear.app/docs/)
- [Linear SDK Documentation](https://github.com/linear/linear/tree/master/packages/sdk)
- [Axios Error Handling](https://axios-http.com/docs/handling_errors)
