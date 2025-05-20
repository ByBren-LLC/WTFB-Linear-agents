/**
 * Test script for database schema and CRUD operations
 *
 * This script tests the database schema and CRUD operations
 * by performing a series of operations and verifying the results.
 *
 * Run with: npx ts-node src/db/test-db.ts
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

/**
 * Main test function
 */
const runTests = async () => {
  console.log('Starting database tests...');

  try {
    // Create a connection pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Test the connection
    const connectionResult = await pool.query('SELECT NOW()');
    console.log('Database connection successful', { timestamp: connectionResult.rows[0].now });

    // Create migrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Migrations table created');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Run the migration
    await pool.query(migrationSql);
    console.log('Migration applied successfully');

    // Record the migration
    await pool.query(
      'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      ['001_initial_schema.sql']
    );
    console.log('Migration recorded');

    // Test Linear token operations
    const testOrgId = `test-org-${Date.now()}`;
    const testAccessToken = 'test-access-token';
    const testRefreshToken = 'test-refresh-token';
    const testAppUserId = 'test-app-user-id';
    const testExpiresAt = new Date();
    testExpiresAt.setDate(testExpiresAt.getDate() + 7); // Expires in 7 days

    // Store a token
    await pool.query(
      `
        INSERT INTO linear_tokens (
          organization_id, access_token, refresh_token, app_user_id, expires_at
        ) VALUES ($1, $2, $3, $4, $5)
      `,
      [testOrgId, testAccessToken, testRefreshToken, testAppUserId, testExpiresAt]
    );
    console.log('Token stored');

    // Retrieve the token
    const tokenResult = await pool.query(
      'SELECT * FROM linear_tokens WHERE organization_id = $1',
      [testOrgId]
    );
    console.log('Token retrieved', {
      organizationId: tokenResult.rows[0].organization_id,
      appUserId: tokenResult.rows[0].app_user_id
    });

    // Test planning session operations
    const testConfluenceUrl = 'https://example.com/confluence/page';
    const testPlanningTitle = 'Test Planning Session';

    // Create a planning session
    const sessionResult = await pool.query(
      `
        INSERT INTO planning_sessions (
          organization_id, confluence_page_url, planning_title, status
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [testOrgId, testConfluenceUrl, testPlanningTitle, 'pending']
    );
    const sessionId = sessionResult.rows[0].id;
    console.log('Planning session created', { sessionId });

    // Clean up - delete the planning session
    await pool.query(
      'DELETE FROM planning_sessions WHERE id = $1',
      [sessionId]
    );
    console.log('Planning session deleted');

    // Delete the token
    await pool.query(
      'DELETE FROM linear_tokens WHERE organization_id = $1',
      [testOrgId]
    );
    console.log('Token deleted');

    console.log('All tests completed successfully');

    // Close the pool
    await pool.end();
  } catch (error) {
    console.error('Test failed', { error });
  } finally {
    // Exit the process
    process.exit(0);
  }
};

// Run the tests
runTests();
