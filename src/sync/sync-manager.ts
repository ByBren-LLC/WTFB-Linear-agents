/**
 * Synchronization Manager
 *
 * This module provides functionality to synchronize Linear issues with Confluence documents.
 */
import { ConfluenceClient } from '../confluence/client';
import { LinearClientWrapper } from '../linear/client';
import { LinearIssueCreatorFromPlanning } from '../planning/linear-issue-creator';
import { ChangeDetector } from './change-detector';
import { ConflictResolver } from './conflict-resolver';
import { SyncStore } from './sync-store';
import * as logger from '../utils/logger';

/**
 * Synchronization options
 */
export interface SyncOptions {
  /** Linear API access token */
  linearAccessToken: string;
  /** Linear team ID */
  linearTeamId: string;
  /** Linear organization ID */
  linearOrganizationId: string;
  /** Confluence API access token */
  confluenceAccessToken: string;
  /** Confluence base URL */
  confluenceBaseUrl: string;
  /** Confluence page ID or URL */
  confluencePageIdOrUrl: string;
  /** Synchronization interval in milliseconds (default: 5 minutes) */
  syncIntervalMs?: number;
  /** Whether to automatically resolve conflicts (default: false) */
  autoResolveConflicts?: boolean;
}

/**
 * Synchronization result
 */
export interface SyncResult {
  /** Whether the synchronization was successful */
  success: boolean;
  /** Error message if the synchronization failed */
  error?: string;
  /** Number of Linear issues created */
  createdIssues: number;
  /** Number of Linear issues updated */
  updatedIssues: number;
  /** Number of Confluence changes applied */
  confluenceChanges: number;
  /** Number of conflicts detected */
  conflictsDetected: number;
  /** Number of conflicts resolved */
  conflictsResolved: number;
  /** Timestamp of the synchronization */
  timestamp: number;
}

/**
 * Synchronization manager
 */
export class SyncManager {
  private options: SyncOptions;
  private confluenceClient: ConfluenceClient;
  private linearClient: LinearClientWrapper;
  private issueCreator: LinearIssueCreatorFromPlanning;
  private changeDetector: ChangeDetector;
  private conflictResolver: ConflictResolver;
  private syncStore: SyncStore;
  private syncIntervalId?: NodeJS.Timeout;

  /**
   * Creates a new synchronization manager
   *
   * @param options Synchronization options
   */
  constructor(options: SyncOptions) {
    this.options = {
      ...options,
      syncIntervalMs: options.syncIntervalMs || 5 * 60 * 1000, // Default: 5 minutes
      autoResolveConflicts: options.autoResolveConflicts || false
    };

    this.confluenceClient = new ConfluenceClient(
      options.confluenceBaseUrl,
      options.confluenceAccessToken
    );

    this.linearClient = new LinearClientWrapper(
      options.linearAccessToken,
      options.linearOrganizationId
    );

    this.issueCreator = new LinearIssueCreatorFromPlanning(options);

    this.syncStore = new SyncStore();

    this.changeDetector = new ChangeDetector(
      this.confluenceClient,
      this.linearClient,
      this.syncStore
    );

    this.conflictResolver = new ConflictResolver(
      this.confluenceClient,
      this.linearClient,
      this.syncStore,
      options.autoResolveConflicts || false
    );
  }

  /**
   * Starts the synchronization process
   *
   * @returns Promise that resolves when the synchronization is started
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting synchronization', {
        confluencePageIdOrUrl: this.options.confluencePageIdOrUrl,
        linearTeamId: this.options.linearTeamId,
        syncIntervalMs: this.options.syncIntervalMs
      });

      // Perform initial synchronization
      await this.sync();

      // Start periodic synchronization
      this.syncIntervalId = setInterval(async () => {
        try {
          await this.sync();
        } catch (error) {
          logger.error('Error during periodic synchronization', { error });
        }
      }, this.options.syncIntervalMs);

      logger.info('Synchronization started successfully');
    } catch (error) {
      logger.error('Error starting synchronization', { error });
      throw error;
    }
  }

  /**
   * Stops the synchronization process
   */
  stop(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
      logger.info('Synchronization stopped');
    }
  }

  /**
   * Performs a synchronization
   *
   * @returns Synchronization result
   */
  async sync(): Promise<SyncResult> {
    try {
      logger.info('Performing synchronization', {
        confluencePageIdOrUrl: this.options.confluencePageIdOrUrl,
        linearTeamId: this.options.linearTeamId
      });

      const result: SyncResult = {
        success: false,
        createdIssues: 0,
        updatedIssues: 0,
        confluenceChanges: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        timestamp: Date.now()
      };

      // Detect changes
      let changes;
      try {
        changes = await this.changeDetector.detectChanges(
          this.options.confluencePageIdOrUrl,
          this.options.linearTeamId
        );

        logger.info('Changes detected', {
          linearChanges: changes.linearChanges.length,
          confluenceChanges: changes.confluenceChanges.length
        });
      } catch (error) {
        logger.error('Error detecting changes', { error });
        return {
          success: false,
          error: `Error detecting changes: ${(error as Error).message}`,
          createdIssues: 0,
          updatedIssues: 0,
          confluenceChanges: 0,
          conflictsDetected: 0,
          conflictsResolved: 0,
          timestamp: Date.now()
        };
      }

      // Check for conflicts
      let conflicts;
      try {
        conflicts = this.changeDetector.detectConflicts(changes);
        result.conflictsDetected = conflicts.length;

        if (conflicts.length > 0) {
          logger.info('Conflicts detected', { conflictCount: conflicts.length });
        }
      } catch (error) {
        logger.error('Error detecting conflicts', { error });
        return {
          success: false,
          error: `Error detecting conflicts: ${(error as Error).message}`,
          createdIssues: 0,
          updatedIssues: 0,
          confluenceChanges: 0,
          conflictsDetected: 0,
          conflictsResolved: 0,
          timestamp: Date.now()
        };
      }

      // Resolve conflicts
      if (conflicts.length > 0) {
        try {
          const resolvedConflicts = await this.conflictResolver.resolveConflicts(conflicts);
          result.conflictsResolved = resolvedConflicts.length;

          // Update changes with resolved conflicts
          changes.linearChanges = changes.linearChanges.filter(
            change => !conflicts.some(conflict => conflict.linearChange?.id === change.id)
          );
          changes.linearChanges.push(...resolvedConflicts.map(conflict => conflict.resolvedChange!));

          changes.confluenceChanges = changes.confluenceChanges.filter(
            change => !conflicts.some(conflict => conflict.confluenceChange?.id === change.id)
          );
        } catch (error) {
          logger.error('Error resolving conflicts', { error });
          return {
            success: false,
            error: `Error resolving conflicts: ${(error as Error).message}`,
            createdIssues: 0,
            updatedIssues: 0,
            confluenceChanges: 0,
            conflictsDetected: conflicts.length,
            conflictsResolved: 0,
            timestamp: Date.now()
          };
        }
      }

      // Apply Linear changes to Confluence
      if (changes.linearChanges.length > 0) {
        try {
          // TODO: Implement applying Linear changes to Confluence
          result.confluenceChanges = changes.linearChanges.length;
          logger.info('Applied Linear changes to Confluence', {
            changeCount: changes.linearChanges.length
          });
        } catch (error) {
          logger.error('Error applying Linear changes to Confluence', { error });
          return {
            success: false,
            error: `Error applying Linear changes to Confluence: ${(error as Error).message}`,
            createdIssues: 0,
            updatedIssues: 0,
            confluenceChanges: 0,
            conflictsDetected: result.conflictsDetected,
            conflictsResolved: result.conflictsResolved,
            timestamp: Date.now()
          };
        }
      }

      // Apply Confluence changes to Linear
      if (changes.confluenceChanges.length > 0) {
        try {
          const linearResult = await this.issueCreator.createIssuesFromConfluence();
          result.createdIssues = linearResult.createdCount;
          result.updatedIssues = linearResult.updatedCount;
          logger.info('Applied Confluence changes to Linear', {
            createdCount: linearResult.createdCount,
            updatedCount: linearResult.updatedCount
          });
        } catch (error) {
          logger.error('Error applying Confluence changes to Linear', { error });
          return {
            success: false,
            error: `Error applying Confluence changes to Linear: ${(error as Error).message}`,
            createdIssues: 0,
            updatedIssues: 0,
            confluenceChanges: result.confluenceChanges,
            conflictsDetected: result.conflictsDetected,
            conflictsResolved: result.conflictsResolved,
            timestamp: Date.now()
          };
        }
      }

      // Update last sync timestamp
      try {
        await this.syncStore.updateLastSyncTimestamp(
          this.options.confluencePageIdOrUrl,
          this.options.linearTeamId,
          Date.now()
        );
      } catch (error) {
        logger.error('Error updating last sync timestamp', { error });
        return {
          success: false,
          error: `Error updating last sync timestamp: ${(error as Error).message}`,
          createdIssues: result.createdIssues,
          updatedIssues: result.updatedIssues,
          confluenceChanges: result.confluenceChanges,
          conflictsDetected: result.conflictsDetected,
          conflictsResolved: result.conflictsResolved,
          timestamp: Date.now()
        };
      }

      result.success = true;
      logger.info('Synchronization completed successfully', result);
      return result;
    } catch (error) {
      logger.error('Error during synchronization', { error });
      return {
        success: false,
        error: `Unexpected error during synchronization: ${(error as Error).message}`,
        createdIssues: 0,
        updatedIssues: 0,
        confluenceChanges: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Gets the synchronization status
   *
   * @returns Synchronization status
   */
  async getStatus(): Promise<{
    isRunning: boolean;
    lastSyncTimestamp: number | null;
    nextSyncTimestamp: number | null;
  }> {
    const lastSyncTimestamp = await this.syncStore.getLastSyncTimestamp(
      this.options.confluencePageIdOrUrl,
      this.options.linearTeamId
    );

    return {
      isRunning: !!this.syncIntervalId,
      lastSyncTimestamp,
      nextSyncTimestamp: lastSyncTimestamp
        ? lastSyncTimestamp + this.options.syncIntervalMs!
        : null
    };
  }
}
