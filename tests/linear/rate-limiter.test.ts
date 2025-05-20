import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RateLimiter } from '../../src/linear/rate-limiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  
  beforeEach(() => {
    // Create a rate limiter with a small window for testing
    rateLimiter = new RateLimiter(3, 1000);
    
    // Mock Date.now to control time
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
  });
  
  it('should allow requests within the limit', async () => {
    // Should allow 3 requests immediately
    await rateLimiter.waitForRequest();
    await rateLimiter.waitForRequest();
    await rateLimiter.waitForRequest();
    
    expect(rateLimiter.getRequestCount()).toBe(3);
    expect(rateLimiter.getRemainingRequests()).toBe(0);
  });
  
  it('should wait for requests over the limit', async () => {
    // Record 3 requests
    rateLimiter.recordRequest();
    rateLimiter.recordRequest();
    rateLimiter.recordRequest();
    
    // Mock setTimeout to resolve immediately
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      // Advance time by 1050ms (window + buffer)
      jest.spyOn(Date, 'now').mockImplementation(() => 2050);
      callback();
      return {} as any;
    });
    
    // Should wait for the 4th request
    await rateLimiter.waitForRequest();
    
    // The oldest request should have expired from the window
    expect(rateLimiter.getRequestCount()).toBe(3);
    expect(rateLimiter.getRemainingRequests()).toBe(0);
  });
  
  it('should remove old requests from the window', () => {
    // Record 3 requests at different times
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
    rateLimiter.recordRequest();
    
    jest.spyOn(Date, 'now').mockImplementation(() => 1500);
    rateLimiter.recordRequest();
    
    jest.spyOn(Date, 'now').mockImplementation(() => 2000);
    rateLimiter.recordRequest();
    
    // Advance time to 2100ms
    jest.spyOn(Date, 'now').mockImplementation(() => 2100);
    
    // The first request should have expired from the window
    expect(rateLimiter.getRequestCount()).toBe(2);
    expect(rateLimiter.getRemainingRequests()).toBe(1);
  });
});
