import { Pool } from 'pg';
import * as logger from '../utils/logger';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Error connecting to database', { error: err });
  } else {
    logger.info('Database connection successful', { timestamp: res.rows[0].now });
  }
});

/**
 * Executes a database query
 */
export const query = async (text: string, params: any[] = []) => {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', { 
      text, 
      duration, 
      rows: res.rowCount 
    });
    
    return res;
  } catch (error) {
    logger.error('Error executing query', { error, text });
    throw error;
  }
};

/**
 * Gets a client from the pool
 */
export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;
  
  // Monkey patch the query method to log queries
  client.query = (...args: any[]) => {
    client.lastQuery = args[0];
    return query.apply(client, args);
  };
  
  // Monkey patch the release method to log release
  client.release = () => {
    client.query = query;
    client.release = release;
    return release.apply(client);
  };
  
  return client;
};
