/**
 * Database models exports
 * 
 * This file exports all database model functions and interfaces
 */

// Re-export everything from the main models file
export * from '../models';

// Mock database interface for testing
export interface DatabaseInterface {
  get(query: string, params?: any[]): Promise<any>;
  all(query: string, params?: any[]): Promise<any[]>;
  run(query: string, params?: any[]): Promise<any>;
}

/**
 * Gets a database interface for testing purposes
 * This function is primarily used by tests to mock database operations
 */
export const getDatabase = async (): Promise<DatabaseInterface> => {
  const { query } = await import('../connection');
  
  return {
    async get(sql: string, params: any[] = []): Promise<any> {
      const result = await query(sql, params);
      return result.rows.length > 0 ? result.rows[0] : null;
    },
    
    async all(sql: string, params: any[] = []): Promise<any[]> {
      const result = await query(sql, params);
      return result.rows;
    },
    
    async run(sql: string, params: any[] = []): Promise<any> {
      const result = await query(sql, params);
      return result;
    }
  };
};
