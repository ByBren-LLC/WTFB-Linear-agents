/**
 * Linear API Rate Limiter
 *
 * This module provides a comprehensive rate limiter for Linear API requests.
 * It combines endpoint-specific throttling with sliding window rate limiting
 * to respect Linear API limits (200 requests per minute).
 */

import * as logger from '../utils/logger';

/**
 * Rate limiter for Linear API requests
 *
 * This class provides both endpoint-specific throttling and global rate limiting
 * using a sliding window approach to stay within Linear API limits.
 */
export class RateLimiter {
  // Sliding window rate limiting
  private requestTimes: number[] = [];
  private maxRequests: number;
  private timeWindow: number;

  // Endpoint-specific throttling
  private requestCounts: Map<string, number> = new Map();
  private lastResetTime: Map<string, number> = new Map();
  private readonly defaultLimit = 50;
  private readonly resetInterval = 60 * 1000;

  /**
   * Creates a new RateLimiter
   *
   * @param maxRequests Maximum number of requests allowed in the time window (default: 180)
   * @param timeWindow Time window in milliseconds (default: 60000 = 1 minute)
   * @param limits Map of endpoint to rate limit for endpoint-specific throttling
   */
  constructor(
    maxRequests: number = 180,
    timeWindow: number = 60000,
    private readonly limits: Record<string, number> = {}
  ) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  /**
   * Waits until a request can be made (sliding window approach)
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

    logger.info('Global rate limit reached, waiting before making request', { waitTime });

    // Wait for the oldest request to expire from the window
    await new Promise(resolve => setTimeout(resolve, waitTime + 50)); // Add a small buffer

    // Recursively call this method to check again after waiting
    return this.waitForRequest();
  }

  /**
   * Throttles a request to a specific endpoint
   *
   * This method delays the request if necessary to stay within endpoint-specific rate limits.
   *
   * @param endpoint The endpoint to throttle
   * @returns A promise that resolves when the request can be made
   */
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

      logger.warn('Endpoint rate limit reached, throttling request', { endpoint, waitTime });

      // Wait until reset
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Reset counter after waiting
      this.requestCounts.set(endpoint, 0);
      this.lastResetTime.set(endpoint, Date.now());
    }

    // Increment counter
    this.requestCounts.set(endpoint, count + 1);
  }

  /**
   * Records a request (for sliding window tracking)
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
