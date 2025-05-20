/**
 * Linear API Retry Logic
 * 
 * This module provides retry logic for Linear API requests.
 * It helps to handle transient errors by retrying failed requests with exponential backoff.
 */

import * as logger from '../utils/logger';
import { LinearRateLimitError, LinearNetworkError } from './errors';

/**
 * Options for retry logic
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;
  
  /**
   * Initial delay in milliseconds
   */
  initialDelay: number;
  
  /**
   * Maximum delay in milliseconds
   */
  maxDelay: number;
  
  /**
   * Backoff factor for exponential backoff
   */
  backoffFactor: number;
  
  /**
   * Array of error names that are retryable
   */
  retryableErrors: string[];
}

/**
 * Default retry options
 */
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

/**
 * Retries a function with exponential backoff
 * 
 * @param fn The function to retry
 * @param options Retry options
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
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
      if (\!retryOptions.retryableErrors.includes(lastError.name)) {
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
        error: lastError.message
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never happen, but TypeScript needs it
  throw lastError;
};
