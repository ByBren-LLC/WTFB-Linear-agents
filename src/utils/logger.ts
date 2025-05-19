/**
 * Simple logger utility for consistent logging
 */

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Logs a message with the specified level and optional metadata
 */
const log = (level: LogLevel, message: string, metadata?: any) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(metadata ? { metadata } : {})
  };
  
  // In production, you might want to use a proper logging library
  // like winston or pino instead of console.log
  console.log(JSON.stringify(logEntry));
};

/**
 * Logs a debug message
 */
export const debug = (message: string, metadata?: any) => {
  log(LogLevel.DEBUG, message, metadata);
};

/**
 * Logs an info message
 */
export const info = (message: string, metadata?: any) => {
  log(LogLevel.INFO, message, metadata);
};

/**
 * Logs a warning message
 */
export const warn = (message: string, metadata?: any) => {
  log(LogLevel.WARN, message, metadata);
};

/**
 * Logs an error message
 */
export const error = (message: string, metadata?: any) => {
  log(LogLevel.ERROR, message, metadata);
};
