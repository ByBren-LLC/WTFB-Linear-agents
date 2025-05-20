/**
 * Conflict Resolver
 *
 * This module provides functionality to resolve conflicts between Linear issues and Confluence documents.
 */
import { ConfluenceClient } from '../confluence/client';
import { LinearClientWrapper } from '../linear/client';
import { SyncStore } from './sync-store';
import { Conflict, Change, ChangeSource } from './change-detector';
import * as logger from '../utils/logger';

/**
 * Conflict resolution strategy
 */
export enum ConflictResolutionStrategy {
  /** Use Linear as the source of truth */
  LINEAR = 'linear',
  /** Use Confluence as the source of truth */
  CONFLUENCE = 'confluence',
  /** Manually resolve the conflict */
  MANUAL = 'manual'
}

/**
 * Conflict resolver
 */
export class ConflictResolver {
  private confluenceClient: ConfluenceClient;
  private linearClient: LinearClientWrapper;
  private syncStore: SyncStore;
  private autoResolveConflicts: boolean;

  /**
   * Creates a new conflict resolver
   *
   * @param confluenceClient Confluence client
   * @param linearClient Linear client
   * @param syncStore Synchronization store
   * @param autoResolveConflicts Whether to automatically resolve conflicts
   */
  constructor(
    confluenceClient: ConfluenceClient,
    linearClient: LinearClientWrapper,
    syncStore: SyncStore,
    autoResolveConflicts: boolean
  ) {
    this.confluenceClient = confluenceClient;
    this.linearClient = linearClient;
    this.syncStore = syncStore;
    this.autoResolveConflicts = autoResolveConflicts;
  }

  /**
   * Resolves conflicts
   *
   * @param conflicts Conflicts to resolve
   * @returns Resolved conflicts
   */
  async resolveConflicts(conflicts: Conflict[]): Promise<Conflict[]> {
    try {
      logger.info('Resolving conflicts', { conflictCount: conflicts.length });

      const resolvedConflicts: Conflict[] = [];

      for (const conflict of conflicts) {
        try {
          // If auto-resolve is enabled, use the default strategy
          if (this.autoResolveConflicts) {
            const resolvedConflict = await this.resolveConflict(
              conflict,
              ConflictResolutionStrategy.LINEAR // Default to Linear as source of truth
            );
            resolvedConflicts.push(resolvedConflict);
          } else {
            // Otherwise, store the conflict for manual resolution
            await this.syncStore.storeConflict(conflict);
          }
        } catch (error) {
          logger.error('Error resolving conflict', { error, conflictId: conflict.id });
        }
      }

      logger.info('Conflicts resolved', { resolvedCount: resolvedConflicts.length });
      return resolvedConflicts;
    } catch (error) {
      logger.error('Error resolving conflicts', { error });
      throw error;
    }
  }

  /**
   * Resolves a conflict
   *
   * @param conflict Conflict to resolve
   * @param strategy Resolution strategy
   * @returns Resolved conflict
   */
  async resolveConflict(
    conflict: Conflict,
    strategy: ConflictResolutionStrategy
  ): Promise<Conflict> {
    try {
      logger.info('Resolving conflict', { conflictId: conflict.id, strategy });

      if (!conflict.linearChange || !conflict.confluenceChange) {
        throw new Error('Invalid conflict: missing changes');
      }

      let resolvedChange: Change;

      switch (strategy) {
        case ConflictResolutionStrategy.LINEAR:
          // Use Linear as the source of truth
          resolvedChange = {
            ...conflict.linearChange,
            id: `resolved-${conflict.id}`,
            source: ChangeSource.LINEAR
          };
          break;

        case ConflictResolutionStrategy.CONFLUENCE:
          // Use Confluence as the source of truth
          resolvedChange = {
            ...conflict.confluenceChange,
            id: `resolved-${conflict.id}`,
            source: ChangeSource.CONFLUENCE
          };
          break;

        case ConflictResolutionStrategy.MANUAL:
          // Manual resolution not implemented yet
          throw new Error('Manual conflict resolution not implemented');

        default:
          throw new Error(`Invalid resolution strategy: ${strategy}`);
      }

      // Update the conflict
      const resolvedConflict: Conflict = {
        ...conflict,
        resolvedChange,
        isResolved: true,
        resolutionStrategy: strategy
      };

      // Store the resolved conflict
      await this.syncStore.storeResolvedConflict(resolvedConflict);

      logger.info('Conflict resolved', { conflictId: conflict.id, strategy });
      return resolvedConflict;
    } catch (error) {
      logger.error('Error resolving conflict', { error, conflictId: conflict.id });
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
      return await this.syncStore.getUnresolvedConflicts();
    } catch (error) {
      logger.error('Error getting unresolved conflicts', { error });
      throw error;
    }
  }

  /**
   * Gets resolved conflicts
   *
   * @returns Resolved conflicts
   */
  async getResolvedConflicts(): Promise<Conflict[]> {
    try {
      return await this.syncStore.getResolvedConflicts();
    } catch (error) {
      logger.error('Error getting resolved conflicts', { error });
      throw error;
    }
  }
}
