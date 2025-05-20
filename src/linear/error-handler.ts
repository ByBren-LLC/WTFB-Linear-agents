/**
 * Linear API Error Handler
 * 
 * This module provides functions for handling Linear API errors.
 * It detects different types of errors and converts them to appropriate error classes.
 */

import * as logger from '../utils/logger';
import {
  LinearApiError,
  LinearRateLimitError,
  LinearAuthenticationError,
  LinearNotFoundError,
  LinearValidationError,
  LinearNetworkError
} from './errors';

/**
 * Handles Linear API errors and converts them to appropriate error classes
 * 
 * @param error The error to handle
 * @returns A typed error object
 */
export const handleLinearError = (error: any): Error => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const { status, data } = error.response;
    
    if (status === 429) {
      // Rate limit error
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
      logger.warn('Linear API rate limit exceeded', { retryAfter });
      return new LinearRateLimitError(
        'Linear API rate limit exceeded',
        status,
        data,
        retryAfter
      );
    } else if (status === 401 || status === 403) {
      // Authentication error
      logger.error('Linear API authentication error', { status, data });
      return new LinearAuthenticationError(
        'Linear API authentication error',
        status,
        data
      );
    } else if (status === 404) {
      // Not found error
      logger.warn('Linear API resource not found', { status, data });
      return new LinearNotFoundError(
        'Linear API resource not found',
        status,
        data
      );
    } else if (status === 400 || status === 422) {
      // Validation error
      logger.warn('Linear API validation error', { status, data });
      return new LinearValidationError(
        'Linear API validation error',
        status,
        data,
        data.errors
      );
    } else {
      // Other API error
      logger.error('Linear API error', { status, data });
      return new LinearApiError(
        `Linear API error: ${status}`,
        status,
        data
      );
    }
  } else if (error.request) {
    // The request was made but no response was received
    logger.error('Linear API network error', { error: error.message });
    return new LinearNetworkError(
      'Linear API network error',
      error
    );
  } else {
    // Something happened in setting up the request that triggered an Error
    logger.error('Linear API request setup error', { error: error.message });
    return new Error(`Linear API request setup error: ${error.message}`);
  }
};
