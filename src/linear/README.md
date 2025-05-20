# Linear API Error Handling

This module provides robust error handling for the Linear API integration. It includes:

- Error types for different Linear API errors
- Error handler for detecting and handling errors
- Rate limiter for respecting API limits
- Retry logic for failed requests
- Linear client wrapper with error handling

## Usage

### Creating a Linear Client Wrapper

```typescript
import { LinearClientWrapper } from './linear/client';

// Create a new Linear client wrapper
const linearClient = new LinearClientWrapper(accessToken, organizationId);

// Use the client to interact with the Linear API
const issue = await linearClient.getIssue('issue-id');
```

### Error Handling

The Linear client wrapper automatically handles errors and retries failed requests. It will:

- Detect and handle common Linear API errors
- Handle rate limiting and implement appropriate backoff strategies
- Retry failed requests with appropriate backoff
- Refresh tokens automatically if they expire
- Provide meaningful error messages

### Custom Error Types

The following error types are available:

- `LinearApiError`: Base error class for Linear API errors
- `LinearRateLimitError`: Error class for Linear API rate limit errors
- `LinearAuthenticationError`: Error class for Linear API authentication errors
- `LinearNotFoundError`: Error class for Linear API not found errors
- `LinearValidationError`: Error class for Linear API validation errors
- `LinearNetworkError`: Error class for Linear API network errors

You can catch these errors to handle specific error cases:

```typescript
try {
  const issue = await linearClient.getIssue('issue-id');
} catch (error) {
  if (error instanceof LinearNotFoundError) {
    console.log('Issue not found');
  } else if (error instanceof LinearAuthenticationError) {
    console.log('Authentication error');
  } else {
    console.log('Other error:', error.message);
  }
}
```

### Rate Limiting

The Linear client wrapper automatically respects rate limits by throttling requests. You can customize the rate limits for different endpoints:

```typescript
import { RateLimiter } from './linear/rate-limiter';

// Create a new rate limiter with custom limits
const rateLimiter = new RateLimiter({
  'getIssue': 100, // 100 requests per minute
  'createIssue': 30 // 30 requests per minute
});
```

### Retry Logic

The Linear client wrapper automatically retries failed requests with exponential backoff. You can customize the retry options:

```typescript
import { retry, defaultRetryOptions } from './linear/retry';

// Customize retry options
const customRetryOptions = {
  ...defaultRetryOptions,
  maxRetries: 5,
  initialDelay: 2000
};

// Use custom retry options
const result = await linearClient.executeQuery(
  () => linearClient.getIssue('issue-id'),
  'getIssue',
  customRetryOptions
);
```

## Error Types

### LinearApiError

Base error class for Linear API errors.

```typescript
new LinearApiError(message: string, statusCode: number, response: any)
```

### LinearRateLimitError

Error class for Linear API rate limit errors.

```typescript
new LinearRateLimitError(message: string, statusCode: number, response: any, retryAfter?: number)
```

### LinearAuthenticationError

Error class for Linear API authentication errors.

```typescript
new LinearAuthenticationError(message: string, statusCode: number, response: any)
```

### LinearNotFoundError

Error class for Linear API not found errors.

```typescript
new LinearNotFoundError(message: string, statusCode: number, response: any)
```

### LinearValidationError

Error class for Linear API validation errors.

```typescript
new LinearValidationError(message: string, statusCode: number, response: any, validationErrors?: any[])
```

### LinearNetworkError

Error class for Linear API network errors.

```typescript
new LinearNetworkError(message: string, originalError: Error)
```
