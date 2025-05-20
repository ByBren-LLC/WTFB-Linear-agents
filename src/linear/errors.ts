/**
 * Linear API Error Types
 * 
 * This module defines error classes for different types of Linear API errors.
 * These error classes are used to handle errors in a consistent way across the application.
 */

/**
 * Base error class for Linear API errors
 */
export class LinearApiError extends Error {
  /**
   * Creates a new LinearApiError
   * 
   * @param message Error message
   * @param statusCode HTTP status code
   * @param response Response data from the API
   */
  constructor(message: string, public statusCode: number, public response: any) {
    super(message);
    this.name = 'LinearApiError';
  }
}

/**
 * Error class for Linear API rate limit errors
 */
export class LinearRateLimitError extends LinearApiError {
  /**
   * Creates a new LinearRateLimitError
   * 
   * @param message Error message
   * @param statusCode HTTP status code
   * @param response Response data from the API
   * @param retryAfter Number of seconds to wait before retrying
   */
  constructor(message: string, public statusCode: number, public response: any, public retryAfter?: number) {
    super(message, statusCode, response);
    this.name = 'LinearRateLimitError';
  }
}

/**
 * Error class for Linear API authentication errors
 */
export class LinearAuthenticationError extends LinearApiError {
  /**
   * Creates a new LinearAuthenticationError
   * 
   * @param message Error message
   * @param statusCode HTTP status code
   * @param response Response data from the API
   */
  constructor(message: string, public statusCode: number, public response: any) {
    super(message, statusCode, response);
    this.name = 'LinearAuthenticationError';
  }
}

/**
 * Error class for Linear API not found errors
 */
export class LinearNotFoundError extends LinearApiError {
  /**
   * Creates a new LinearNotFoundError
   * 
   * @param message Error message
   * @param statusCode HTTP status code
   * @param response Response data from the API
   */
  constructor(message: string, public statusCode: number, public response: any) {
    super(message, statusCode, response);
    this.name = 'LinearNotFoundError';
  }
}

/**
 * Error class for Linear API validation errors
 */
export class LinearValidationError extends LinearApiError {
  /**
   * Creates a new LinearValidationError
   * 
   * @param message Error message
   * @param statusCode HTTP status code
   * @param response Response data from the API
   * @param validationErrors Array of validation errors
   */
  constructor(message: string, public statusCode: number, public response: any, public validationErrors?: any[]) {
    super(message, statusCode, response);
    this.name = 'LinearValidationError';
  }
}

/**
 * Error class for Linear API network errors
 */
export class LinearNetworkError extends Error {
  /**
   * Creates a new LinearNetworkError
   * 
   * @param message Error message
   * @param originalError Original error that caused the network error
   */
  constructor(message: string, public originalError: Error) {
    super(message);
    this.name = 'LinearNetworkError';
  }
}
