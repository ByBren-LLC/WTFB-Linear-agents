/**
 * Conflict resolver for Linear Planning Agent
 *
 * This module provides functionality to resolve conflicts between Linear and Confluence.
 */

import * as logger from '../utils/logger';
import { SyncConflict } from './models';

/**
 * Conflict resolution strategy
 */
export enum ConflictResolutionStrategy {
  PREFER_LINEAR = 'prefer_linear',
  PREFER_CONFLUENCE = 'prefer_confluence',
  PREFER_NEWER = 'prefer_newer',
  MANUAL = 'manual'
}

/**
 * Conflict resolver class
 */
export class ConflictResolver {
  private strategy: ConflictResolutionStrategy;

  /**
   * Creates a new conflict resolver
   *
   * @param strategy The conflict resolution strategy to use
   */
  constructor(strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.PREFER_NEWER) {
    this.strategy = strategy;
  }

  /**
   * Resolves a conflict between Linear and Confluence
   *
   * @param conflict The conflict to resolve
   * @returns The resolution ('confluence', 'linear', or 'manual')
   */
  resolveConflict(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    try {
      // If the conflict already has a resolution, return it
      if (conflict.resolution) {
        return conflict.resolution;
      }

      // Apply the resolution strategy
      switch (this.strategy) {
        case ConflictResolutionStrategy.PREFER_LINEAR:
          return 'linear';
        case ConflictResolutionStrategy.PREFER_CONFLUENCE:
          return 'confluence';
        case ConflictResolutionStrategy.PREFER_NEWER:
          return this.resolveByTimestamp(conflict);
        case ConflictResolutionStrategy.MANUAL:
        default:
          return 'manual';
      }
    } catch (error) {
      logger.error('Error resolving conflict', { error, conflict });
      return 'manual';
    }
  }

  /**
   * Resolves a conflict based on the type of entity
   *
   * @param conflict The conflict to resolve
   * @returns The resolution ('confluence', 'linear', or 'manual')
   */
  private resolveByType(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    switch (conflict.type) {
      case 'epic':
        return this.resolveEpicConflict(conflict);
      case 'feature':
        return this.resolveFeatureConflict(conflict);
      case 'story':
        return this.resolveStoryConflict(conflict);
      case 'enabler':
        return this.resolveEnablerConflict(conflict);
      default:
        logger.warn('Unknown conflict type', { conflict });
        return 'manual';
    }
  }

  /**
   * Resolves a conflict based on timestamps
   *
   * @param conflict The conflict to resolve
   * @returns The resolution ('confluence', 'linear', or 'manual')
   */
  private resolveByTimestamp(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    try {
      // Get the timestamps from the conflict data
      const confluenceTimestamp = new Date(conflict.confluenceData.updatedAt || conflict.confluenceData.createdAt);
      const linearTimestamp = new Date(conflict.linearData.updatedAt || conflict.linearData.createdAt);

      // Compare the timestamps
      if (confluenceTimestamp > linearTimestamp) {
        return 'confluence';
      } else if (linearTimestamp > confluenceTimestamp) {
        return 'linear';
      } else {
        // If timestamps are equal, prefer Linear
        return 'linear';
      }
    } catch (error) {
      logger.error('Error resolving conflict by timestamp', { error, conflict });
      return 'manual';
    }
  }

  /**
   * Resolves an epic conflict
   *
   * @param conflict The conflict to resolve
   * @returns The resolution ('confluence', 'linear', or 'manual')
   */
  private resolveEpicConflict(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    // For epics, we'll use a field-by-field approach
    // Title and description conflicts are resolved based on the strategy
    // Status conflicts prefer Linear
    // Other fields may have specific rules

    // For now, we'll use the timestamp-based approach
    return this.resolveByTimestamp(conflict);
  }

  /**
   * Resolves a feature conflict
   *
   * @param conflict The conflict to resolve
   * @returns The resolution ('confluence', 'linear', or 'manual')
   */
  private resolveFeatureConflict(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    // For features, we'll use a similar approach to epics
    return this.resolveByTimestamp(conflict);
  }

  /**
   * Resolves a story conflict
   *
   * @param conflict The conflict to resolve
   * @returns The resolution ('confluence', 'linear', or 'manual')
   */
  private resolveStoryConflict(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    // For stories, we'll use a similar approach to epics
    return this.resolveByTimestamp(conflict);
  }

  /**
   * Resolves an enabler conflict
   *
   * @param conflict The conflict to resolve
   * @returns The resolution ('confluence', 'linear', or 'manual')
   */
  private resolveEnablerConflict(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    // For enablers, we'll use a similar approach to epics
    return this.resolveByTimestamp(conflict);
  }
}
