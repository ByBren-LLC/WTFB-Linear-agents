/**
 * Rate limiter for Linear API
 * 
 * This module provides a rate limiter to respect Linear API limits.
 * Linear API has a rate limit of 200 requests per minute.
 */

import * as logger from '../utils/logger';

/**
 * Rate limiter for Linear API
 */
export class RateLimiter {
  private requestTimes: number[] = [];
  private maxRequests: number;
  private timeWindow: number;

  /**
   * Creates a new rate limiter
   * 
   * @param maxRequests Maximum number of requests allowed in the time window
   * @param timeWindow Time window in milliseconds
   */
  constructor(maxRequests: number = 180, timeWindow: number = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  /**
   * Waits until a request can be made
   * 
   * @returns A promise that resolves when a request can be made
   */
  async waitForRequest(): Promise<void> {
    // Remove old requests from the window
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(time => now - time < this.timeWindow);

    // If we haven't hit the limit, allow the request immediately
    if (this.requestTimes.length < this.maxRequests) {
      this.requestTimes.push(now);
      return;
    }

    // Calculate how long to wait
    const oldestRequest = this.requestTimes[0];
    const waitTime = this.timeWindow - (now - oldestRequest);

    logger.info('Rate limit reached, waiting before making request', { waitTime });

    // Wait for the oldest request to expire from the window
    await new Promise(resolve => setTimeout(resolve, waitTime + 50)); // Add a small buffer

    // Recursively call this method to check again after waiting
    return this.waitForRequest();
  }

  /**
   * Records a request
   */
  recordRequest(): void {
    this.requestTimes.push(Date.now());
  }

  /**
   * Gets the number of requests in the current window
   * 
   * @returns The number of requests in the current window
   */
  getRequestCount(): number {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(time => now - time < this.timeWindow);
    return this.requestTimes.length;
  }

  /**
   * Gets the remaining requests in the current window
   * 
   * @returns The remaining requests in the current window
   */
  getRemainingRequests(): number {
    return this.maxRequests - this.getRequestCount();
  }
}
