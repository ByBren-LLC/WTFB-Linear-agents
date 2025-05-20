import * as fs from 'fs';
import * as path from 'path';
import { query, getClient } from '../connection';
import * as logger from '../../utils/logger';

/**
 * Runs all database migrations in order
 */
export const runMigrations = async (): Promise<void> => {
  try {
    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Get list of applied migrations
    const result = await query('SELECT name FROM migrations ORDER BY id');
    const appliedMigrations = result.rows.map(row => row.name);

    // Get list of migration files
    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order

    // Run migrations that haven't been applied yet
    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        logger.info(`Applying migration: ${file}`);
        
        // Get migration SQL
        const migrationPath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        // Start a transaction
        const client = await getClient();
        try {
          await client.query('BEGIN');
          
          // Run the migration
          await client.query(migrationSql);
          
          // Record the migration
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          
          await client.query('COMMIT');
          logger.info(`Migration applied successfully: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          logger.error(`Migration failed: ${file}`, { error });
          throw error;
        } finally {
          client.release();
        }
      }
    }
    
    logger.info('All migrations applied successfully');
  } catch (error) {
    logger.error('Error running migrations', { error });
    throw error;
  }
};

/**
 * Gets the current migration status
 */
export const getMigrationStatus = async (): Promise<{ 
  total: number; 
  applied: number; 
  pending: string[] 
}> => {
  try {
    // Get list of applied migrations
    const result = await query('SELECT name FROM migrations ORDER BY id');
    const appliedMigrations = result.rows.map(row => row.name);
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Get pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(file)
    );
    
    return {
      total: migrationFiles.length,
      applied: appliedMigrations.length,
      pending: pendingMigrations
    };
  } catch (error) {
    logger.error('Error getting migration status', { error });
    throw error;
  }
};
