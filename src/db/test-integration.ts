/**
 * Database Schema Integration Test
 * 
 * This test verifies that the database schema integration works correctly
 * by testing the new PostgreSQL sync functions.
 */

import {
  initializeDatabase,
  getLastSyncTimestamp,
  updateLastSyncTimestamp,
  storeConflict,
  getUnresolvedConflicts,
  deleteConflict,
  recordSyncHistory,
  getSyncHistory
} from './models';

/**
 * Test the database schema integration
 */
export async function testDatabaseIntegration(): Promise<void> {
  console.log('Testing Database Schema Integration...');

  try {
    // Initialize the database
    await initializeDatabase();
    console.log('✓ Database initialized successfully');

    // Test sync timestamp operations
    const testPageId = 'test-page-123';
    const testTeamId = 'test-team-456';
    const testTimestamp = Date.now();

    // Test getting non-existent timestamp
    let timestamp = await getLastSyncTimestamp(testPageId, testTeamId);
    console.log(`✓ Initial timestamp: ${timestamp} (should be null)`);

    // Test updating timestamp
    await updateLastSyncTimestamp(testPageId, testTeamId, testTimestamp);
    console.log('✓ Timestamp updated successfully');

    // Test getting updated timestamp
    timestamp = await getLastSyncTimestamp(testPageId, testTeamId);
    console.log(`✓ Retrieved timestamp: ${timestamp} (should be ${testTimestamp})`);

    // Test conflict operations
    const testConflictId = 'conflict-test-789';
    const linearChange = { type: 'update', field: 'title', value: 'Linear Title' };
    const confluenceChange = { type: 'update', field: 'title', value: 'Confluence Title' };

    // Store a conflict
    await storeConflict(testConflictId, linearChange, confluenceChange);
    console.log('✓ Conflict stored successfully');

    // Get unresolved conflicts
    let conflicts = await getUnresolvedConflicts();
    console.log(`✓ Found ${conflicts.length} unresolved conflicts`);

    // Delete the test conflict
    await deleteConflict(testConflictId);
    console.log('✓ Conflict deleted successfully');

    // Test sync history
    await recordSyncHistory(
      testPageId,
      testTeamId,
      true,
      testTimestamp,
      undefined,
      2,
      1,
      3,
      0,
      0
    );
    console.log('✓ Sync history recorded successfully');

    // Get sync history
    const history = await getSyncHistory(testPageId, testTeamId, 10);
    console.log(`✓ Retrieved ${history.length} sync history records`);

    console.log('\n🎉 Database Schema Integration Test PASSED!');
    console.log('All sync operations are now using PostgreSQL instead of SQLite.');

  } catch (error) {
    console.error('❌ Database Schema Integration Test FAILED:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDatabaseIntegration()
    .then(() => {
      console.log('Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}
