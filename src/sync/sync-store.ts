/**
 * Synchronization Store
 *
 * This module provides functionality to store synchronization state.
 */
import { Conflict } from './change-detector';
import * as logger from '../utils/logger';
import { query } from '../db/connection';

/**
 * Synchronization store
 */
export class SyncStore {
  /**
   * Creates a new synchronization store
   */
  constructor() {
    // PostgreSQL database is initialized via connection pool
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
      const result = await query(
        'SELECT timestamp FROM sync_state WHERE confluence_page_id = $1 AND linear_team_id = $2',
        [confluencePageIdOrUrl, linearTeamId]
      );

      return result.rows.length > 0 ? result.rows[0].timestamp : null;
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
      await query(
        `INSERT INTO sync_state (confluence_page_id, linear_team_id, timestamp)
         VALUES ($1, $2, $3)
         ON CONFLICT(confluence_page_id, linear_team_id)
         DO UPDATE SET timestamp = $3`,
        [confluencePageIdOrUrl, linearTeamId, timestamp]
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
      await query(
        `INSERT INTO conflicts (id, linear_change, confluence_change, is_resolved, resolution_strategy)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT(id)
         DO UPDATE SET linear_change = $2, confluence_change = $3, is_resolved = $4, resolution_strategy = $5`,
        [
          conflict.id,
          JSON.stringify(conflict.linearChange),
          JSON.stringify(conflict.confluenceChange),
          conflict.isResolved,
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


      await query(
        `INSERT INTO conflicts (id, linear_change, confluence_change, is_resolved, resolution_strategy, resolved_change)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT(id)
         DO UPDATE SET linear_change = $2, confluence_change = $3, is_resolved = $4, resolution_strategy = $5, resolved_change = $6`,
        [
          conflict.id,
          JSON.stringify(conflict.linearChange),
          JSON.stringify(conflict.confluenceChange),
          true,
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

      const result = await query(
        'SELECT * FROM conflicts WHERE is_resolved = false'
      );

      return result.rows.map(row => ({
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

      const result = await query(
        'SELECT * FROM conflicts WHERE is_resolved = true'
      );

      return result.rows.map(row => ({
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

      const result = await query('SELECT * FROM conflicts');

      return result.rows.map(row => ({
        id: row.id,
        linearChange: JSON.parse(row.linear_change),
        confluenceChange: JSON.parse(row.confluence_change),
        resolvedChange: row.resolved_change ? JSON.parse(row.resolved_change) : undefined,
        isResolved: row.is_resolved,
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

      await query('DELETE FROM conflicts WHERE id = $1', [conflictId]);
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

      await query('DELETE FROM conflicts');
    } catch (error) {
      logger.error('Error clearing conflicts', { error });
      throw error;
    }
  }
}
