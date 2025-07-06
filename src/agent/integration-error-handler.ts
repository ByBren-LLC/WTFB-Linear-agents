/**
 * Integration Error Handler (LIN-64)
 * 
 * Robust error handling and retry logic for Linear API integration,
 * including rate limiting, backoff strategies, and graceful degradation.
 */

import { ProgressTrackerConfig } from './progress-config';
import * as logger from '../utils/logger';

/**
 * Integration error types
 */
export enum IntegrationErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Integration error with context
 */
export class IntegrationError extends Error {
  constructor(
    message: string,
    public readonly type: IntegrationErrorType,
    public readonly context: string,
    public readonly originalError?: Error,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

/**
 * Retry result
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: IntegrationError;
  attempts: number;
  totalDelay: number;
}

/**
 * Rate limit info
 */
interface RateLimitInfo {
  remaining: number;
  reset: Date;
  limit: number;
}

/**
 * Integration error handler with retry logic
 */
export class IntegrationErrorHandler {
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();
  private concurrentRequests: Map<string, Promise<any>> = new Map();
  
  constructor(private config: ProgressTrackerConfig) {}
  
  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    options?: {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      onRetry?: (attempt: number, delay: number) => void;
    }
  ): Promise<RetryResult<T>> {
    const maxAttempts = options?.maxAttempts || this.config.integration.linearApiRetryAttempts;
    const initialDelay = options?.initialDelay || 1000;
    const maxDelay = options?.maxDelay || this.config.integration.maxBackoffDelay;
    
    let lastError: Error | undefined;
    let totalDelay = 0;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check rate limits before execution
        await this.checkRateLimits(context);
        
        // Execute operation
        const result = await operation();
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalDelay
        };
        
      } catch (error) {
        lastError = error as Error;
        const integrationError = this.classifyError(error, context);
        
        // Don't retry non-retryable errors
        if (!this.isRetryableError(integrationError)) {
          return {
            success: false,
            error: integrationError,
            attempts: attempt,
            totalDelay
          };
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateDelay(
          integrationError,
          attempt,
          initialDelay,
          maxDelay
        );
        
        // Check if we should continue retrying
        if (attempt < maxAttempts) {
          logger.warn('Retrying after error', {
            context,
            attempt,
            delay,
            errorType: integrationError.type,
            message: integrationError.message
          });
          
          // Call retry callback if provided
          options?.onRetry?.(attempt, delay);
          
          // Wait before next attempt
          await this.delay(delay);
          totalDelay += delay;
        }
      }
    }
    
    // All retries exhausted
    const finalError = new IntegrationError(
      `Operation failed after ${maxAttempts} attempts: ${lastError?.message}`,
      IntegrationErrorType.UNKNOWN,
      context,
      lastError
    );
    
    return {
      success: false,
      error: finalError,
      attempts: maxAttempts,
      totalDelay
    };
  }
  
  /**
   * Execute with concurrent update handling
   */
  async executeWithConcurrencyControl<T>(
    key: string,
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    const strategy = this.config.integration.concurrentUpdateStrategy;
    
    // Check for existing operation
    const existing = this.concurrentRequests.get(key);
    
    if (existing) {
      switch (strategy) {
        case 'merge':
          // Wait for existing operation and merge results
          logger.debug('Waiting for concurrent operation to complete', { key, context });
          await existing;
          // Re-execute to get fresh data
          break;
          
        case 'latest':
          // Cancel existing and use latest
          logger.debug('Canceling previous operation for latest', { key, context });
          this.concurrentRequests.delete(key);
          break;
          
        case 'conflict':
          // Throw error on concurrent access
          throw new IntegrationError(
            'Concurrent operation detected',
            IntegrationErrorType.INVALID_REQUEST,
            context
          );
      }
    }
    
    // Execute and track operation
    const promise = operation();
    this.concurrentRequests.set(key, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.concurrentRequests.delete(key);
    }
  }
  
  /**
   * Classify error type
   */
  private classifyError(error: any, context: string): IntegrationError {
    // Rate limit error
    if (this.isRateLimitError(error)) {
      const retryAfter = this.extractRetryAfter(error);
      return new IntegrationError(
        'Rate limit exceeded',
        IntegrationErrorType.RATE_LIMIT,
        context,
        error,
        retryAfter
      );
    }
    
    // Network errors
    if (this.isNetworkError(error)) {
      return new IntegrationError(
        'Network error occurred',
        IntegrationErrorType.NETWORK,
        context,
        error
      );
    }
    
    // Timeout errors
    if (this.isTimeoutError(error)) {
      return new IntegrationError(
        'Request timed out',
        IntegrationErrorType.TIMEOUT,
        context,
        error
      );
    }
    
    // Authorization errors
    if (error.status === 401 || error.status === 403) {
      return new IntegrationError(
        'Authorization failed',
        IntegrationErrorType.UNAUTHORIZED,
        context,
        error
      );
    }
    
    // Invalid request errors
    if (error.status === 400 || error.status === 422) {
      return new IntegrationError(
        'Invalid request',
        IntegrationErrorType.INVALID_REQUEST,
        context,
        error
      );
    }
    
    // Server errors
    if (error.status >= 500) {
      return new IntegrationError(
        'Server error',
        IntegrationErrorType.SERVER_ERROR,
        context,
        error
      );
    }
    
    // Unknown errors
    return new IntegrationError(
      error.message || 'Unknown error',
      IntegrationErrorType.UNKNOWN,
      context,
      error
    );
  }
  
  /**
   * Check if error is retryable
   */
  private isRetryableError(error: IntegrationError): boolean {
    const nonRetryableTypes = [
      IntegrationErrorType.INVALID_REQUEST,
      IntegrationErrorType.UNAUTHORIZED
    ];
    
    return !nonRetryableTypes.includes(error.type);
  }
  
  /**
   * Check if error is rate limit error
   */
  private isRateLimitError(error: any): boolean {
    return error.status === 429 || 
           error.code === 'RATE_LIMIT_EXCEEDED' ||
           error.message?.toLowerCase().includes('rate limit');
  }
  
  /**
   * Check if error is network error
   */
  private isNetworkError(error: any): boolean {
    const networkErrorCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
    return networkErrorCodes.includes(error.code) ||
           error.message?.toLowerCase().includes('network');
  }
  
  /**
   * Check if error is timeout error
   */
  private isTimeoutError(error: any): boolean {
    return error.code === 'ETIMEDOUT' ||
           error.code === 'ESOCKETTIMEDOUT' ||
           error.message?.toLowerCase().includes('timeout');
  }
  
  /**
   * Extract retry-after value from error
   */
  private extractRetryAfter(error: any): number {
    // Check headers
    if (error.response?.headers?.['retry-after']) {
      const retryAfter = error.response.headers['retry-after'];
      return parseInt(retryAfter, 10) * 1000; // Convert to milliseconds
    }
    
    // Check error object
    if (error.retryAfter) {
      return error.retryAfter * 1000;
    }
    
    // Default to 60 seconds
    return 60000;
  }
  
  /**
   * Calculate delay for retry
   */
  private calculateDelay(
    error: IntegrationError,
    attempt: number,
    initialDelay: number,
    maxDelay: number
  ): number {
    // Use retry-after for rate limits
    if (error.type === IntegrationErrorType.RATE_LIMIT && error.retryAfter) {
      return Math.min(error.retryAfter, maxDelay);
    }
    
    // Exponential backoff for other errors
    const backoffMultiplier = this.config.integration.rateLimitBackoffMultiplier;
    const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;
    const delayWithJitter = exponentialDelay + jitter;
    
    return Math.min(delayWithJitter, maxDelay);
  }
  
  /**
   * Check rate limits
   */
  private async checkRateLimits(context: string): Promise<void> {
    const info = this.rateLimitInfo.get(context);
    
    if (info && info.remaining <= 0 && info.reset > new Date()) {
      const waitTime = info.reset.getTime() - Date.now();
      logger.warn('Rate limit reached, waiting', {
        context,
        waitTime,
        reset: info.reset
      });
      
      await this.delay(waitTime);
    }
  }
  
  /**
   * Update rate limit info
   */
  updateRateLimitInfo(context: string, headers: Record<string, string>): void {
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '100', 10);
    const reset = parseInt(headers['x-ratelimit-reset'] || '0', 10) * 1000;
    const limit = parseInt(headers['x-ratelimit-limit'] || '100', 10);
    
    this.rateLimitInfo.set(context, {
      remaining,
      reset: new Date(reset),
      limit
    });
    
    if (remaining < limit * 0.1) {
      logger.warn('Rate limit approaching', {
        context,
        remaining,
        limit,
        percentage: (remaining / limit) * 100
      });
    }
  }
  
  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current rate limit status
   */
  getRateLimitStatus(context: string): RateLimitInfo | undefined {
    return this.rateLimitInfo.get(context);
  }
  
  /**
   * Clear rate limit info
   */
  clearRateLimitInfo(context?: string): void {
    if (context) {
      this.rateLimitInfo.delete(context);
    } else {
      this.rateLimitInfo.clear();
    }
  }
}