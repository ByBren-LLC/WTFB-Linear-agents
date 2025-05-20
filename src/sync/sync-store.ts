/**
 * Synchronization Store
 *
 * This module provides functionality to store synchronization state.
 */
import { Conflict } from './change-detector';
import * as logger from '../utils/logger';
import { initializeDatabase, getDatabase } from '../db/models';

/**
 * Synchronization store
 */
export class SyncStore {
  /**
   * Creates a new synchronization store
   */
  constructor() {
    // Ensure the database is initialized
    initializeDatabase();
  }

  /**
   * Gets the last synchronization timestamp
   *
   * @param confluencePageIdOrUrl Confluence page ID or URL
   * @param linearTeamId Linear team ID
   * @returns Last synchronization timestamp or null if not found
   */
  async getLastSyncTimestamp(
    confluencePageIdOrUrl: string,
    linearTeamId: string
  ): Promise<number | null> {
    try {
      const db = getDatabase();
      const syncState = await db.get(
        'SELECT timestamp FROM sync_state WHERE confluence_page_id = ? AND linear_team_id = ?',
        [confluencePageIdOrUrl, linearTeamId]
      );

      return syncState ? syncState.timestamp : null;
    } catch (error) {
      logger.error('Error getting last sync timestamp', { error });
      return null;
    }
  }

  /**
   * Updates the last synchronization timestamp
   *
   * @param confluencePageIdOrUrl Confluence page ID or URL
   * @param linearTeamId Linear team ID
   * @param timestamp Timestamp
   */
  async updateLastSyncTimestamp(
    confluencePageIdOrUrl: string,
    linearTeamId: string,
    timestamp: number
  ): Promise<void> {
    try {
      const db = getDatabase();
      await db.run(
        `INSERT INTO sync_state (confluence_page_id, linear_team_id, timestamp)
         VALUES (?, ?, ?)
         ON CONFLICT(confluence_page_id, linear_team_id)
         DO UPDATE SET timestamp = ?`,
        [confluencePageIdOrUrl, linearTeamId, timestamp, timestamp]
      );
    } catch (error) {
      logger.error('Error updating last sync timestamp', { error });
      throw error;
    }
  }

  /**
   * Stores a conflict
   *
   * @param conflict Conflict to store
   */
  async storeConflict(conflict: Conflict): Promise<void> {
    try {
      const db = getDatabase();
      await db.run(
        `INSERT INTO conflicts (id, linear_change, confluence_change, is_resolved, resolution_strategy)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id)
         DO UPDATE SET linear_change = ?, confluence_change = ?, is_resolved = ?, resolution_strategy = ?`,
        [
          conflict.id,
          JSON.stringify(conflict.linearChange),
          JSON.stringify(conflict.confluenceChange),
          conflict.isResolved ? 1 : 0,
          conflict.resolutionStrategy || null,
          JSON.stringify(conflict.linearChange),
          JSON.stringify(conflict.confluenceChange),
          conflict.isResolved ? 1 : 0,
          conflict.resolutionStrategy || null
        ]
      );
    } catch (error) {
      logger.error('Error storing conflict', { error });
      throw error;
    }
  }

  /**
   * Stores a resolved conflict
   *
   * @param conflict Resolved conflict to store
   */
  async storeResolvedConflict(conflict: Conflict): Promise<void> {
    try {
      if (!conflict.isResolved || !conflict.resolvedChange) {
        throw new Error('Conflict is not resolved');
      }

      const db = getDatabase();
      await db.run(
        `INSERT INTO conflicts (id, linear_change, confluence_change, is_resolved, resolution_strategy, resolved_change)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id)
         DO UPDATE SET linear_change = ?, confluence_change = ?, is_resolved = ?, resolution_strategy = ?, resolved_change = ?`,
        [
          conflict.id,
          JSON.stringify(conflict.linearChange),
          JSON.stringify(conflict.confluenceChange),
          1,
          conflict.resolutionStrategy,
          JSON.stringify(conflict.resolvedChange),
          JSON.stringify(conflict.linearChange),
          JSON.stringify(conflict.confluenceChange),
          1,
          conflict.resolutionStrategy,
          JSON.stringify(conflict.resolvedChange)
        ]
      );
    } catch (error) {
      logger.error('Error storing resolved conflict', { error });
      throw error;
    }
  }

  /**
   * Gets unresolved conflicts
   *
   * @returns Unresolved conflicts
   */
  async getUnresolvedConflicts(): Promise<Conflict[]> {
    try {
      const db = getDatabase();
      const rows = await db.all(
        'SELECT * FROM conflicts WHERE is_resolved = 0'
      );

      return rows.map(row => ({
        id: row.id,
        linearChange: JSON.parse(row.linear_change),
        confluenceChange: JSON.parse(row.confluence_change),
        isResolved: false,
        resolutionStrategy: row.resolution_strategy
      }));
    } catch (error) {
      logger.error('Error getting unresolved conflicts', { error });
      return [];
    }
  }

  /**
   * Gets resolved conflicts
   *
   * @returns Resolved conflicts
   */
  async getResolvedConflicts(): Promise<Conflict[]> {
    try {
      const db = getDatabase();
      const rows = await db.all(
        'SELECT * FROM conflicts WHERE is_resolved = 1'
      );

      return rows.map(row => ({
        id: row.id,
        linearChange: JSON.parse(row.linear_change),
        confluenceChange: JSON.parse(row.confluence_change),
        resolvedChange: JSON.parse(row.resolved_change),
        isResolved: true,
        resolutionStrategy: row.resolution_strategy
      }));
    } catch (error) {
      logger.error('Error getting resolved conflicts', { error });
      return [];
    }
  }

  /**
   * Gets all conflicts
   *
   * @returns All conflicts
   */
  async getAllConflicts(): Promise<Conflict[]> {
    try {
      const db = getDatabase();
      const rows = await db.all('SELECT * FROM conflicts');

      return rows.map(row => ({
        id: row.id,
        linearChange: JSON.parse(row.linear_change),
        confluenceChange: JSON.parse(row.confluence_change),
        resolvedChange: row.resolved_change ? JSON.parse(row.resolved_change) : undefined,
        isResolved: row.is_resolved === 1,
        resolutionStrategy: row.resolution_strategy
      }));
    } catch (error) {
      logger.error('Error getting all conflicts', { error });
      return [];
    }
  }

  /**
   * Deletes a conflict
   *
   * @param conflictId Conflict ID
   */
  async deleteConflict(conflictId: string): Promise<void> {
    try {
      const db = getDatabase();
      await db.run('DELETE FROM conflicts WHERE id = ?', [conflictId]);
    } catch (error) {
      logger.error('Error deleting conflict', { error });
      throw error;
    }
  }

  /**
   * Clears all conflicts
   */
  async clearConflicts(): Promise<void> {
    try {
      const db = getDatabase();
      await db.run('DELETE FROM conflicts');
    } catch (error) {
      logger.error('Error clearing conflicts', { error });
      throw error;
    }
  }
}
