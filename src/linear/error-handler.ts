/**
 * Error handler for Linear API
 * 
 * This module provides error handling utilities for Linear API errors.
 */

import * as logger from '../utils/logger';

/**
 * Error types for Linear API
 */
export enum LinearErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Custom error class for Linear API errors
 */
export class LinearError extends Error {
  type: LinearErrorType;
  retryable: boolean;
  originalError: any;

  constructor(message: string, type: LinearErrorType, retryable: boolean, originalError?: any) {
    super(message);
    this.name = 'LinearError';
    this.type = type;
    this.retryable = retryable;
    this.originalError = originalError;
  }
}

/**
 * Handles Linear API errors
 * 
 * @param error The error to handle
 * @returns A LinearError with additional context
 */
export const handleLinearError = (error: any): LinearError => {
  // Extract error message
  let message = 'Unknown Linear API error';
  let type = LinearErrorType.UNKNOWN;
  let retryable = false;

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const status = error.response.status;
    const data = error.response.data;

    if (status === 429) {
      message = 'Linear API rate limit exceeded';
      type = LinearErrorType.RATE_LIMIT;
      retryable = true;
    } else if (status === 401) {
      message = 'Authentication failed with Linear API';
      type = LinearErrorType.AUTHENTICATION;
      retryable = false;
    } else if (status === 403) {
      message = 'Permission denied for Linear API operation';
      type = LinearErrorType.PERMISSION;
      retryable = false;
    } else if (status === 404) {
      message = 'Resource not found in Linear API';
      type = LinearErrorType.NOT_FOUND;
      retryable = false;
    } else if (status === 400) {
      message = 'Invalid request to Linear API';
      type = LinearErrorType.VALIDATION;
      retryable = false;
    } else if (status >= 500) {
      message = 'Linear API server error';
      type = LinearErrorType.SERVER;
      retryable = true;
    }

    // Add more details from the response if available
    if (data && data.errors && data.errors.length > 0) {
      const errorDetails = data.errors.map((e: any) => e.message || e).join(', ');
      message += `: ${errorDetails}`;
    } else if (data && data.message) {
      message += `: ${data.message}`;
    }
  } else if (error.request) {
    // The request was made but no response was received
    message = 'No response received from Linear API';
    type = LinearErrorType.NETWORK;
    retryable = true;
  } else if (error.message) {
    // Something happened in setting up the request that triggered an Error
    message = `Error setting up Linear API request: ${error.message}`;
    type = LinearErrorType.UNKNOWN;
    retryable = false;
  }

  logger.error(message, { error, type, retryable });
  return new LinearError(message, type, retryable, error);
};

/**
 * Determines if an error is retryable
 * 
 * @param error The error to check
 * @returns True if the error is retryable, false otherwise
 */
export const isRetryableError = (error: any): boolean => {
  if (error instanceof LinearError) {
    return error.retryable;
  }

  // For non-LinearError instances, check common retryable conditions
  if (error.response) {
    const status = error.response.status;
    return status === 429 || status >= 500;
  } else if (error.request) {
    // Network errors are generally retryable
    return true;
  }

  return false;
};

/**
 * Retries a function with exponential backoff
 * 
 * @param fn The function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      logger.info(`Retrying after error (attempt ${attempt + 1}/${maxRetries})`, { delay });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};
