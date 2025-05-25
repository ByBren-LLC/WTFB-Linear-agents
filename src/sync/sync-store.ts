/**
 * Synchronization Store
 *
 * This module provides functionality to store synchronization state.
 */
import { Conflict } from './change-detector';
import * as logger from '../utils/logger';
import {
  initializeDatabase,
  getLastSyncTimestamp as dbGetLastSyncTimestamp,
  updateLastSyncTimestamp as dbUpdateLastSyncTimestamp,
  storeConflict as dbStoreConflict,
  getUnresolvedConflicts as dbGetUnresolvedConflicts,
  getResolvedConflicts as dbGetResolvedConflicts,
  getAllConflicts as dbGetAllConflicts,
  deleteConflict as dbDeleteConflict,
  clearConflicts as dbClearConflicts
} from '../db/models';

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
      return await dbGetLastSyncTimestamp(confluencePageIdOrUrl, linearTeamId);
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
      await dbUpdateLastSyncTimestamp(confluencePageIdOrUrl, linearTeamId, timestamp);
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
      await dbStoreConflict(
        conflict.id,
        conflict.linearChange,
        conflict.confluenceChange,
        conflict.isResolved,
        conflict.resolutionStrategy
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

      await dbStoreConflict(
        conflict.id,
        conflict.linearChange,
        conflict.confluenceChange,
        true,
        conflict.resolutionStrategy,
        conflict.resolvedChange
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
      const conflicts = await dbGetUnresolvedConflicts();
      return conflicts.map(row => ({
        id: row.id,
        linearChange: row.linearChange,
        confluenceChange: row.confluenceChange,
        isResolved: row.isResolved,
        resolutionStrategy: row.resolutionStrategy
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
      const conflicts = await dbGetResolvedConflicts();
      return conflicts.map(row => ({
        id: row.id,
        linearChange: row.linearChange,
        confluenceChange: row.confluenceChange,
        resolvedChange: row.resolvedChange,
        isResolved: row.isResolved,
        resolutionStrategy: row.resolutionStrategy
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
      const conflicts = await dbGetAllConflicts();
      return conflicts.map(row => ({
        id: row.id,
        linearChange: row.linearChange,
        confluenceChange: row.confluenceChange,
        resolvedChange: row.resolvedChange,
        isResolved: row.isResolved,
        resolutionStrategy: row.resolutionStrategy
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
      await dbDeleteConflict(conflictId);
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
      await dbClearConflicts();
    } catch (error) {
      logger.error('Error clearing conflicts', { error });
      throw error;
    }
  }
}
