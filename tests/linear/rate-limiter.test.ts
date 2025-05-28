import { RateLimiter } from '../../src/linear/rate-limiter';
import { setupTimerMocks, cleanupTimerMocks } from '../setup';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Rate Limiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    setupTimerMocks();
    rateLimiter = new RateLimiter();
  });

  afterEach(() => {
    cleanupTimerMocks();
  });

  it('should allow requests within the rate limit', async () => {
    // Make 10 requests (well below the default limit of 50)
    for (let i = 0; i < 10; i++) {
      await rateLimiter.throttle('testEndpoint');
    }

    // No throttling should have occurred
    expect(global.mockSetTimeout).not.toHaveBeenCalled();
  });

  it('should throttle requests that exceed the rate limit', async () => {
    // Create a rate limiter with a low limit
    rateLimiter = new RateLimiter({ 'testEndpoint': 5 });

    // Make 5 requests (at the limit)
    for (let i = 0; i < 5; i++) {
      await rateLimiter.throttle('testEndpoint');
    }

    // No throttling yet
    expect(global.mockSetTimeout).not.toHaveBeenCalled();

    // Make one more request (exceeding the limit)
    const throttlePromise = rateLimiter.throttle('testEndpoint');

    // Wait for the async operation to start
    await new Promise(resolve => setImmediate(resolve));

    // Throttling should occur
    expect(global.mockSetTimeout).toHaveBeenCalled();

    // Fast-forward time to complete the throttling
    await jest.advanceTimersByTimeAsync(60000); // Use the full reset interval

    // The promise should resolve
    await throttlePromise;
  }, 10000);

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
    expect(global.mockSetTimeout).not.toHaveBeenCalled();

    // Make one more request to endpoint1 (exceeding the limit)
    const throttlePromise1 = rateLimiter.throttle('endpoint1');

    // Wait for the async operation to start
    await new Promise(resolve => setImmediate(resolve));

    // Throttling should occur
    expect(global.mockSetTimeout).toHaveBeenCalled();

    // Reset the mock
    global.mockSetTimeout.mockClear();

    // Make one more request to endpoint2 (exceeding the limit)
    const throttlePromise2 = rateLimiter.throttle('endpoint2');

    // Wait for the async operation to start
    await new Promise(resolve => setImmediate(resolve));

    // Throttling should occur again
    expect(global.mockSetTimeout).toHaveBeenCalled();

    // Fast-forward time to complete the throttling
    await jest.advanceTimersByTimeAsync(60000); // Use the full reset interval

    // The promises should resolve
    await throttlePromise1;
    await throttlePromise2;
  }, 10000);

  it('should reset counters after the reset interval', async () => {
    // Create a rate limiter with a low limit
    rateLimiter = new RateLimiter({ 'testEndpoint': 2 });

    // Make 2 requests (at the limit)
    for (let i = 0; i < 2; i++) {
      await rateLimiter.throttle('testEndpoint');
    }

    // No throttling yet
    expect(global.mockSetTimeout).not.toHaveBeenCalled();

    // Advance time past the reset interval (60 seconds)
    jest.advanceTimersByTime(61 * 1000);

    // Make 2 more requests (should be allowed after reset)
    for (let i = 0; i < 2; i++) {
      await rateLimiter.throttle('testEndpoint');
    }

    // Still no throttling
    expect(global.mockSetTimeout).not.toHaveBeenCalled();

    // Make one more request (exceeding the limit again)
    const throttlePromise = rateLimiter.throttle('testEndpoint');

    // Wait for the async operation to start
    await new Promise(resolve => setImmediate(resolve));

    // Throttling should occur
    expect(global.mockSetTimeout).toHaveBeenCalled();

    // Fast-forward time to complete the throttling
    await jest.advanceTimersByTimeAsync(60000); // Use the full reset interval

    // The promise should resolve
    await throttlePromise;
  }, 10000);
});
