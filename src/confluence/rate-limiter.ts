/**
 * Rate limiter for Confluence API
 *
 * This module provides a rate limiter for the Confluence API to avoid hitting rate limits.
 * Confluence API has a rate limit of 200 requests per minute for most endpoints.
 */

import * as logger from '../utils/logger';

/**
 * Rate limiter class for Confluence API
 */
export class RateLimiter {
  private requestsPerMinute: number;
  private interval: number; // in milliseconds
  private queue: Array<() => void> = [];
  private lastRequestTime: number = 0;

  /**
   * Creates a new rate limiter
   *
   * @param requestsPerMinute The maximum number of requests per minute (default: 180)
   */
  constructor(requestsPerMinute: number = 180) {
    this.requestsPerMinute = requestsPerMinute;
    this.interval = (60 * 1000) / requestsPerMinute; // Convert to milliseconds between requests
  }

  /**
   * Acquires a token from the rate limiter
   *
   * This method will block until a token is available.
   *
   * @returns A promise that resolves when a token is acquired
   */
  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Processes the queue of waiting requests
   */
  private processQueue(): void {
    if (this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeToWait = Math.max(0, this.lastRequestTime + this.interval - now);

    setTimeout(() => {
      if (this.queue.length > 0) {
        const resolve = this.queue.shift();
        this.lastRequestTime = Date.now();
        
        if (resolve) {
          resolve();
        }
        
        // Process the next request in the queue
        this.processQueue();
      }
    }, timeToWait);
  }

  /**
   * Updates the rate limit based on the response headers
   *
   * @param headers The response headers
   */
  updateRateLimit(headers: Record<string, string>): void {
    // Confluence API doesn't provide rate limit headers in the same way as some other APIs,
    // but we could implement this if they add that feature in the future
    
    // For now, we'll just log if we're getting close to the rate limit
    const remainingRequests = headers['x-ratelimit-remaining'];
    if (remainingRequests && parseInt(remainingRequests, 10) < 20) {
      logger.warn('Approaching Confluence API rate limit', { remainingRequests });
    }
  }
}
