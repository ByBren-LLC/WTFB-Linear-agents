/**
 * Error handler for Confluence API
 *
 * This module provides error handling utilities for the Confluence API.
 */

import axios, { AxiosError } from 'axios';
import * as logger from '../utils/logger';

/**
 * Custom error class for Confluence API errors
 */
export class ConfluenceError extends Error {
  statusCode?: number;
  errorCode?: string;
  response?: any;

  constructor(message: string, statusCode?: number, errorCode?: string, response?: any) {
    super(message);
    this.name = 'ConfluenceError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.response = response;
  }
}

/**
 * Handles Confluence API errors
 *
 * @param error The error to handle
 * @returns A ConfluenceError with additional context
 */
export const handleConfluenceError = (error: any): Error => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status;
    const responseData = axiosError.response?.data as any;

    // Extract error details from the response
    const errorMessage = responseData?.message || axiosError.message;
    const errorCode = responseData?.code || 'UNKNOWN_ERROR';

    // Log the error with context
    logger.error('Confluence API error', {
      statusCode,
      errorCode,
      errorMessage,
      url: axiosError.config?.url,
      method: axiosError.config?.method
    });

    // Handle specific error cases
    if (statusCode === 401) {
      return new ConfluenceError('Unauthorized: Invalid or expired token', statusCode, 'UNAUTHORIZED', responseData);
    } else if (statusCode === 403) {
      return new ConfluenceError('Forbidden: Insufficient permissions', statusCode, 'FORBIDDEN', responseData);
    } else if (statusCode === 404) {
      return new ConfluenceError('Not found: The requested resource does not exist', statusCode, 'NOT_FOUND', responseData);
    } else if (statusCode === 429) {
      return new ConfluenceError('Rate limit exceeded', statusCode, 'RATE_LIMIT_EXCEEDED', responseData);
    } else if (statusCode && statusCode >= 500) {
      return new ConfluenceError('Confluence server error', statusCode, 'SERVER_ERROR', responseData);
    } else {
      return new ConfluenceError(errorMessage, statusCode, errorCode, responseData);
    }
  } else if (error instanceof Error) {
    logger.error('Non-Axios error', { error });
    return error;
  } else {
    logger.error('Unknown error', { error });
    return new Error('Unknown error occurred');
  }
};

/**
 * Determines if an error is retryable
 *
 * @param error The error to check
 * @returns True if the error is retryable, false otherwise
 */
export const isRetryableError = (error: any): boolean => {
  if (error instanceof ConfluenceError) {
    // Retry on rate limiting or server errors
    return error.statusCode === 429 || (error.statusCode !== undefined && error.statusCode >= 500);
  } else if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    // Retry on network errors, rate limiting, or server errors
    return !statusCode || statusCode === 429 || statusCode >= 500;
  }

  return false;
};

/**
 * Implements exponential backoff for retrying requests
 *
 * @param fn The function to retry
 * @param maxRetries The maximum number of retries
 * @param initialDelay The initial delay in milliseconds
 * @returns The result of the function
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let retries = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries || !isRetryableError(error)) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = initialDelay * Math.pow(2, retries);

      logger.warn(`Retrying after error (attempt ${retries + 1}/${maxRetries})`, { error, delay });

      // Wait for the backoff period
      await new Promise(resolve => setTimeout(resolve, delay));

      retries++;
    }
  }
};
