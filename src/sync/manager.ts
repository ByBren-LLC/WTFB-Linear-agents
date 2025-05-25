/**
 * Synchronization manager for Linear Planning Agent
 *
 * This module provides functionality to synchronize Linear issues with Confluence documents.
 */

import * as logger from '../utils/logger';
import { ConfluenceClient } from '../confluence/client';
import { ConfluenceParser } from '../confluence/parser';
import { PlanningExtractor } from '../planning/extractor';
import { LinearIssueCreator } from '../linear/issue-creator';
import { LinearIssueUpdater } from '../linear/issue-updater';
import { LinearIssueFinder } from '../linear/issue-finder';
import { SAFeHierarchyManager } from '../safe/hierarchy-manager';
import { SyncConfig, SyncResult, SyncDirection, SyncConflict, SyncChange } from './models';
import { ConflictResolver, ConflictResolutionStrategy } from './conflict-resolver';
import { ChangeDetector } from './change-detector';
import { getAccessToken } from '../auth/tokens';
import { getConfluenceAccessToken } from '../auth/confluence-tokens';
import { createSyncHistory, updateSyncHistory, createSyncConflict, resolveSyncConflict } from '../db/models';

/**
 * Synchronization manager class
 */
export class SynchronizationManager {
  private confluenceClient: ConfluenceClient | null = null;
  private linearIssueCreator: LinearIssueCreator | null = null;
  private linearIssueUpdater: LinearIssueUpdater | null = null;
  private linearIssueFinder: LinearIssueFinder | null = null;
  private safeHierarchyManager: SAFeHierarchyManager | null = null;
  private changeDetector: ChangeDetector | null = null;
  private conflictResolver: ConflictResolver | null = null;
  private organizationId: string;
  private teamId: string;

  /**
   * Creates a new synchronization manager
   *
   * @param organizationId The Linear organization ID
   * @param teamId The Linear team ID
   * @param conflictStrategy The conflict resolution strategy to use
   */
  constructor(
    organizationId: string,
    teamId: string,
    conflictStrategy: ConflictResolutionStrategy = ConflictResolutionStrategy.PREFER_NEWER
  ) {
    this.organizationId = organizationId;
    this.teamId = teamId;
    this.conflictResolver = new ConflictResolver(conflictStrategy);
  }

  /**
   * Initializes the synchronization manager
   *
   * @returns A promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    try {
      // Get tokens
      const linearToken = await getAccessToken(this.organizationId);
      const confluenceToken = await getConfluenceAccessToken(this.organizationId);
      
      if (!linearToken || !confluenceToken) {
        throw new Error('Missing tokens');
      }
      
      // Initialize clients
      this.confluenceClient = new ConfluenceClient(confluenceToken);
      this.linearIssueCreator = new LinearIssueCreator(linearToken, this.teamId);
      this.linearIssueUpdater = new LinearIssueUpdater(linearToken);
      this.linearIssueFinder = new LinearIssueFinder(linearToken, this.teamId);
      this.safeHierarchyManager = new SAFeHierarchyManager(linearToken, this.teamId);
      this.changeDetector = new ChangeDetector(this.confluenceClient, this.linearIssueFinder);
      
      logger.info('Synchronization manager initialized', { organizationId: this.organizationId });
    } catch (error) {
      logger.error('Error initializing synchronization manager', { error, organizationId: this.organizationId });
      throw error;
    }
  }

  /**
   * Synchronizes Linear issues with Confluence documents
   *
   * @param config The synchronization configuration
   * @returns The synchronization result
   */
  async synchronize(config: SyncConfig): Promise<SyncResult> {
    try {
      if (!this.confluenceClient || !this.linearIssueCreator || !this.linearIssueUpdater || !this.linearIssueFinder || !this.safeHierarchyManager || !this.changeDetector) {
        await this.initialize();
      }
      
      if (!this.confluenceClient || !this.linearIssueCreator || !this.linearIssueUpdater || !this.linearIssueFinder || !this.safeHierarchyManager || !this.changeDetector) {
        throw new Error('Failed to initialize synchronization manager');
      }
      
      // Create a sync history record
      const syncHistory = await createSyncHistory(config.id!, config.direction);
      
      const result: SyncResult = {
        success: true,
        direction: config.direction,
        changes: {
          created: [],
          updated: [],
          deleted: []
        },
        conflicts: []
      };
      
      try {
        // Detect changes
        const changes = await this.changeDetector.detectChanges(config);
        
        // Handle changes based on direction
        if (config.direction === SyncDirection.CONFLUENCE_TO_LINEAR || config.direction === SyncDirection.BIDIRECTIONAL) {
          await this.syncConfluenceToLinear(changes.confluenceChanges, result);
        }
        
        if (config.direction === SyncDirection.LINEAR_TO_CONFLUENCE || config.direction === SyncDirection.BIDIRECTIONAL) {
          await this.syncLinearToConfluence(changes.linearChanges, result);
        }
        
        // Resolve conflicts
        if (config.direction === SyncDirection.BIDIRECTIONAL) {
          await this.resolveConflicts(changes.conflicts, result);
        }
        
        // Update sync history record
        await updateSyncHistory(syncHistory.id, {
          status: 'completed',
          changesCreated: result.changes.created.length,
          changesUpdated: result.changes.updated.length,
          changesDeleted: result.changes.deleted.length,
          conflicts: result.conflicts.length,
          completedAt: new Date()
        });
        
        logger.info('Synchronization completed', { result });
        
        return result;
      } catch (error) {
        // Update sync history record with error
        await updateSyncHistory(syncHistory.id, {
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        });
        
        throw error;
      }
    } catch (error) {
      logger.error('Error during synchronization', { error, config });
      
      return {
        success: false,
        direction: config.direction,
        changes: {
          created: [],
          updated: [],
          deleted: []
        },
        conflicts: [],
        error: error.message
      };
    }
  }

  /**
   * Synchronizes changes from Confluence to Linear
   *
   * @param changes The changes from Confluence
   * @param result The synchronization result to update
   */
  private async syncConfluenceToLinear(changes: SyncChange[], result: SyncResult): Promise<void> {
    try {
      if (!this.linearIssueCreator || !this.linearIssueUpdater || !this.safeHierarchyManager) {
        throw new Error('Linear clients not initialized');
      }
      
      for (const change of changes) {
        try {
          switch (change.action) {
            case 'created':
              // Create a new issue in Linear
              const createdIssue = await this.createLinearIssueFromChange(change);
              if (createdIssue) {
                result.changes.created.push({
                  ...change,
                  targetId: createdIssue.id
                });
              }
              break;
            case 'updated':
              // Update an existing issue in Linear
              const updatedIssue = await this.updateLinearIssueFromChange(change);
              if (updatedIssue) {
                result.changes.updated.push(change);
              }
              break;
            case 'deleted':
              // Delete an issue in Linear
              const deleted = await this.deleteLinearIssueFromChange(change);
              if (deleted) {
                result.changes.deleted.push(change);
              }
              break;
          }
        } catch (error) {
          logger.error('Error processing Confluence to Linear change', { error, change });
          // Continue with the next change
        }
      }
    } catch (error) {
      logger.error('Error synchronizing Confluence to Linear', { error });
      throw error;
    }
  }

  /**
   * Synchronizes changes from Linear to Confluence
   *
   * @param changes The changes from Linear
   * @param result The synchronization result to update
   */
  private async syncLinearToConfluence(changes: SyncChange[], result: SyncResult): Promise<void> {
    try {
      if (!this.confluenceClient) {
        throw new Error('Confluence client not initialized');
      }
      
      for (const change of changes) {
        try {
          switch (change.action) {
            case 'created':
              // Create a new section in Confluence
              const createdSection = await this.createConfluenceSectionFromChange(change);
              if (createdSection) {
                result.changes.created.push({
                  ...change,
                  targetId: createdSection.id
                });
              }
              break;
            case 'updated':
              // Update an existing section in Confluence
              const updatedSection = await this.updateConfluenceSectionFromChange(change);
              if (updatedSection) {
                result.changes.updated.push(change);
              }
              break;
            case 'deleted':
              // Delete a section in Confluence
              const deleted = await this.deleteConfluenceSectionFromChange(change);
              if (deleted) {
                result.changes.deleted.push(change);
              }
              break;
          }
        } catch (error) {
          logger.error('Error processing Linear to Confluence change', { error, change });
          // Continue with the next change
        }
      }
    } catch (error) {
      logger.error('Error synchronizing Linear to Confluence', { error });
      throw error;
    }
  }

  /**
   * Resolves conflicts between Linear and Confluence
   *
   * @param conflicts The conflicts to resolve
   * @param result The synchronization result to update
   */
  private async resolveConflicts(conflicts: SyncConflict[], result: SyncResult): Promise<void> {
    try {
      if (!this.conflictResolver || !this.linearIssueUpdater || !this.confluenceClient) {
        throw new Error('Conflict resolver or clients not initialized');
      }
      
      for (const conflict of conflicts) {
        try {
          // Store the conflict in the database
          const dbConflict = await createSyncConflict(
            result.id!,
            conflict.type,
            conflict.confluenceData,
            conflict.linearData
          );
          
          // Resolve the conflict
          const resolution = this.conflictResolver.resolveConflict(conflict);
          
          // Apply the resolution
          if (resolution === 'confluence') {
            // Update Linear with Confluence data
            await this.updateLinearIssueFromConflict(conflict);
            await resolveSyncConflict(dbConflict.id, 'confluence');
          } else if (resolution === 'linear') {
            // Update Confluence with Linear data
            await this.updateConfluenceSectionFromConflict(conflict);
            await resolveSyncConflict(dbConflict.id, 'linear');
          } else {
            // Manual resolution required
            // This would typically involve notifying a user or storing the conflict for later resolution
            await resolveSyncConflict(dbConflict.id, 'manual');
          }
          
          // Add the conflict to the result
          result.conflicts.push({
            ...conflict,
            resolution
          });
        } catch (error) {
          logger.error('Error resolving conflict', { error, conflict });
          // Continue with the next conflict
        }
      }
    } catch (error) {
      logger.error('Error resolving conflicts', { error });
      throw error;
    }
  }

  /**
   * Creates a Linear issue from a Confluence change
   *
   * @param change The change from Confluence
   * @returns The created Linear issue or null if creation failed
   */
  private async createLinearIssueFromChange(change: SyncChange): Promise<any | null> {
    try {
      if (!this.linearIssueCreator || !this.safeHierarchyManager) {
        throw new Error('Linear clients not initialized');
      }
      
      // Extract the data from the change
      const { data } = change;
      
      // Create the issue based on the type
      switch (change.type) {
        case 'epic':
          return await this.linearIssueCreator.createEpic(data.title, data.description);
        case 'feature':
          return await this.linearIssueCreator.createFeature(data.title, data.description, data.epicId);
        case 'story':
          return await this.linearIssueCreator.createStory(data.title, data.description, data.featureId);
        case 'enabler':
          return await this.linearIssueCreator.createEnabler(data.title, data.description, data.enablerType);
        default:
          logger.warn('Unknown change type', { change });
          return null;
      }
    } catch (error) {
      logger.error('Error creating Linear issue from change', { error, change });
      return null;
    }
  }

  /**
   * Updates a Linear issue from a Confluence change
   *
   * @param change The change from Confluence
   * @returns The updated Linear issue or null if update failed
   */
  private async updateLinearIssueFromChange(change: SyncChange): Promise<any | null> {
    try {
      if (!this.linearIssueUpdater) {
        throw new Error('Linear issue updater not initialized');
      }
      
      // Extract the data from the change
      const { data, targetId } = change;
      
      if (!targetId) {
        throw new Error('Target ID is required for update');
      }
      
      // Update the issue
      return await this.linearIssueUpdater.updateIssue(targetId, {
        title: data.title,
        description: data.description
      });
    } catch (error) {
      logger.error('Error updating Linear issue from change', { error, change });
      return null;
    }
  }

  /**
   * Deletes a Linear issue from a Confluence change
   *
   * @param change The change from Confluence
   * @returns True if the issue was deleted, false otherwise
   */
  private async deleteLinearIssueFromChange(change: SyncChange): Promise<boolean> {
    try {
      if (!this.linearIssueUpdater) {
        throw new Error('Linear issue updater not initialized');
      }
      
      // Extract the target ID from the change
      const { targetId } = change;
      
      if (!targetId) {
        throw new Error('Target ID is required for delete');
      }
      
      // Delete the issue (or mark as canceled)
      return await this.linearIssueUpdater.cancelIssue(targetId);
    } catch (error) {
      logger.error('Error deleting Linear issue from change', { error, change });
      return false;
    }
  }

  /**
   * Creates a Confluence section from a Linear change
   *
   * @param change The change from Linear
   * @returns The created Confluence section or null if creation failed
   */
  private async createConfluenceSectionFromChange(change: SyncChange): Promise<any | null> {
    try {
      if (!this.confluenceClient) {
        throw new Error('Confluence client not initialized');
      }
      
      // Extract the data from the change
      const { data } = change;
      
      // Create the section based on the type
      switch (change.type) {
        case 'epic':
          return await this.confluenceClient.createEpicSection(data.title, data.description);
        case 'feature':
          return await this.confluenceClient.createFeatureSection(data.title, data.description, data.epicId);
        case 'story':
          return await this.confluenceClient.createStorySection(data.title, data.description, data.featureId);
        case 'enabler':
          return await this.confluenceClient.createEnablerSection(data.title, data.description, data.enablerType);
        default:
          logger.warn('Unknown change type', { change });
          return null;
      }
    } catch (error) {
      logger.error('Error creating Confluence section from change', { error, change });
      return null;
    }
  }

  /**
   * Updates a Confluence section from a Linear change
   *
   * @param change The change from Linear
   * @returns The updated Confluence section or null if update failed
   */
  private async updateConfluenceSectionFromChange(change: SyncChange): Promise<any | null> {
    try {
      if (!this.confluenceClient) {
        throw new Error('Confluence client not initialized');
      }
      
      // Extract the data from the change
      const { data, targetId } = change;
      
      if (!targetId) {
        throw new Error('Target ID is required for update');
      }
      
      // Update the section
      return await this.confluenceClient.updateSection(targetId, data.title, data.description);
    } catch (error) {
      logger.error('Error updating Confluence section from change', { error, change });
      return null;
    }
  }

  /**
   * Deletes a Confluence section from a Linear change
   *
   * @param change The change from Linear
   * @returns True if the section was deleted, false otherwise
   */
  private async deleteConfluenceSectionFromChange(change: SyncChange): Promise<boolean> {
    try {
      if (!this.confluenceClient) {
        throw new Error('Confluence client not initialized');
      }
      
      // Extract the target ID from the change
      const { targetId } = change;
      
      if (!targetId) {
        throw new Error('Target ID is required for delete');
      }
      
      // Delete the section
      return await this.confluenceClient.deleteSection(targetId);
    } catch (error) {
      logger.error('Error deleting Confluence section from change', { error, change });
      return false;
    }
  }

  /**
   * Updates a Linear issue from a conflict
   *
   * @param conflict The conflict
   * @returns The updated Linear issue or null if update failed
   */
  private async updateLinearIssueFromConflict(conflict: SyncConflict): Promise<any | null> {
    try {
      if (!this.linearIssueUpdater) {
        throw new Error('Linear issue updater not initialized');
      }
      
      // Extract the data from the conflict
      const { confluenceData, linearData } = conflict;
      
      // Update the issue
      return await this.linearIssueUpdater.updateIssue(linearData.id, {
        title: confluenceData.title,
        description: confluenceData.description
      });
    } catch (error) {
      logger.error('Error updating Linear issue from conflict', { error, conflict });
      return null;
    }
  }

  /**
   * Updates a Confluence section from a conflict
   *
   * @param conflict The conflict
   * @returns The updated Confluence section or null if update failed
   */
  private async updateConfluenceSectionFromConflict(conflict: SyncConflict): Promise<any | null> {
    try {
      if (!this.confluenceClient) {
        throw new Error('Confluence client not initialized');
      }
      
      // Extract the data from the conflict
      const { confluenceData, linearData } = conflict;
      
      // Update the section
      return await this.confluenceClient.updateSection(
        confluenceData.id,
        linearData.title,
        linearData.description
      );
    } catch (error) {
      logger.error('Error updating Confluence section from conflict', { error, conflict });
      return null;
    }
  }
}
