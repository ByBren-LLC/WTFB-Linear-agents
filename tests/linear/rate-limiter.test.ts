import { RateLimiter } from '../../src/linear/rate-limiter';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock setTimeout
jest.useFakeTimers();

describe('Rate Limiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
    jest.clearAllTimers();
  });

  it('should allow requests within the rate limit', async () => {
    // Make 10 requests (well below the default limit of 50)
    for (let i = 0; i < 10; i++) {
      await rateLimiter.throttle('testEndpoint');
    }

    // No throttling should have occurred
    expect(setTimeout).not.toHaveBeenCalled();
  });

  it('should throttle requests that exceed the rate limit', async () => {
    // Create a rate limiter with a low limit
    rateLimiter = new RateLimiter({ 'testEndpoint': 5 });

    // Make 5 requests (at the limit)
    for (let i = 0; i < 5; i++) {
      await rateLimiter.throttle('testEndpoint');
    }

    // No throttling yet
    expect(setTimeout).not.toHaveBeenCalled();

    // Make one more request (exceeding the limit)
    const throttlePromise = rateLimiter.throttle('testEndpoint');
    
    // Throttling should occur
    expect(setTimeout).toHaveBeenCalled();
    
    // Fast-forward time to complete the throttling
    jest.runAllTimers();
    
    // The promise should resolve
    await throttlePromise;
  });

  it('should use custom limits for different endpoints', async () => {
    // Create a rate limiter with different limits for different endpoints
    rateLimiter = new RateLimiter({
      'endpoint1': 3,
      'endpoint2': 5
    });

    // Make 3 requests to endpoint1 (at the limit)
    for (let i = 0; i < 3; i++) {
      await rateLimiter.throttle('endpoint1');
    }

    // Make 5 requests to endpoint2 (at the limit)
    for (let i = 0; i < 5; i++) {
      await rateLimiter.throttle('endpoint2');
    }

    // No throttling yet
    expect(setTimeout).not.toHaveBeenCalled();

    // Make one more request to endpoint1 (exceeding the limit)
    const throttlePromise1 = rateLimiter.throttle('endpoint1');
    
    // Throttling should occur
    expect(setTimeout).toHaveBeenCalled();
    
    // Reset the mock
    jest.clearAllTimers();
    
    // Make one more request to endpoint2 (exceeding the limit)
    const throttlePromise2 = rateLimiter.throttle('endpoint2');
    
    // Throttling should occur again
    expect(setTimeout).toHaveBeenCalled();
    
    // Fast-forward time to complete the throttling
    jest.runAllTimers();
    
    // The promises should resolve
    await throttlePromise1;
    await throttlePromise2;
  });

  it('should reset counters after the reset interval', async () => {
    // Create a rate limiter with a low limit
    rateLimiter = new RateLimiter({ 'testEndpoint': 2 });

    // Make 2 requests (at the limit)
    for (let i = 0; i < 2; i++) {
      await rateLimiter.throttle('testEndpoint');
    }

    // No throttling yet
    expect(setTimeout).not.toHaveBeenCalled();

    // Advance time past the reset interval (60 seconds)
    jest.advanceTimersByTime(61 * 1000);

    // Make 2 more requests (should be allowed after reset)
    for (let i = 0; i < 2; i++) {
      await rateLimiter.throttle('testEndpoint');
    }

    // Still no throttling
    expect(setTimeout).not.toHaveBeenCalled();

    // Make one more request (exceeding the limit again)
    const throttlePromise = rateLimiter.throttle('testEndpoint');
    
    // Throttling should occur
    expect(setTimeout).toHaveBeenCalled();
    
    // Fast-forward time to complete the throttling
    jest.runAllTimers();
    
    // The promise should resolve
    await throttlePromise;
  });
});
