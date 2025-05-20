/**
 * Linear API Rate Limiter
 * 
 * This module provides a rate limiter for Linear API requests.
 * It helps to avoid hitting rate limits by throttling requests.
 */

import * as logger from '../utils/logger';

/**
 * Rate limiter for Linear API requests
 * 
 * This class helps to avoid hitting rate limits by throttling requests.
 * It keeps track of request counts for different endpoints and delays
 * requests if necessary to stay within rate limits.
 */
export class RateLimiter {
  /**
   * Map of endpoint to request count
   */
  private requestCounts: Map<string, number> = new Map();
  
  /**
   * Map of endpoint to last reset time
   */
  private lastResetTime: Map<string, number> = new Map();
  
  /**
   * Default rate limit per minute
   */
  private readonly defaultLimit = 50;
  
  /**
   * Reset interval in milliseconds (1 minute)
   */
  private readonly resetInterval = 60 * 1000;

  /**
   * Creates a new RateLimiter
   * 
   * @param limits Map of endpoint to rate limit
   */
  constructor(private readonly limits: Record<string, number> = {}) {}

  /**
   * Throttles a request to an endpoint
   * 
   * This method delays the request if necessary to stay within rate limits.
   * 
   * @param endpoint The endpoint to throttle
   * @returns A promise that resolves when the request can be made
   */
  async throttle(endpoint: string): Promise<void> {
    const limit = this.limits[endpoint] || this.defaultLimit;
    const now = Date.now();
    
    // Initialize or reset counters if needed
    if (\!this.requestCounts.has(endpoint) || now - (this.lastResetTime.get(endpoint) || 0) >= this.resetInterval) {
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
