/**
 * Database module exports
 * 
 * This file exports all database-related functionality for easier imports
 */

// Export connection utilities
export { query, getClient } from './connection';

// Export database models and CRUD operations
export * from './models';

// Export migration utilities
export { runMigrations, getMigrationStatus } from './migrations';

/**
 * Initializes the database
 * This is the main entry point for database initialization
 */
export const initializeDatabase = async (): Promise<void> => {
  // Import here to avoid circular dependencies
  const { initializeDatabase: initDb } = await import('./models');
  await initDb();
};
