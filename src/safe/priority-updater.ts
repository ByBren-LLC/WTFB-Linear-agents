/**
 * Priority Updater for Linear Integration (LIN-50)
 * 
 * Handles automated priority updates in Linear based on WSJF scores.
 * Implements batch updates with error handling and rollback capabilities.
 */

import {
  ScoredStory,
  PriorityUpdate,
  LinearPriority,
  PriorityUpdateError
} from '../types/scoring-types';
import { LinearClientWrapper } from '../linear/client';
import * as logger from '../utils/logger';

/**
 * Batch update configuration
 */
interface BatchUpdateConfig {
  batchSize: number;           // Number of updates per batch
  delayBetweenBatches: number; // Milliseconds to wait between batches
  maxRetries: number;          // Maximum retry attempts per update
  rollbackOnError: boolean;    // Whether to rollback on partial failure
}

/**
 * Update result for tracking
 */
interface UpdateResult {
  storyId: string;
  success: boolean;
  oldPriority?: number;
  newPriority?: number;
  error?: string;
}

/**
 * Priority updater with Linear API integration
 */
export class PriorityUpdater {
  private linearClient: LinearClientWrapper;
  private config: BatchUpdateConfig;

  constructor(
    linearClient: LinearClientWrapper,
    config: Partial<BatchUpdateConfig> = {}
  ) {
    this.linearClient = linearClient;
    this.config = {
      batchSize: 10,
      delayBetweenBatches: 1000, // 1 second
      maxRetries: 3,
      rollbackOnError: true,
      ...config
    };

    logger.info('PriorityUpdater initialized', {
      batchSize: this.config.batchSize,
      delayBetweenBatches: this.config.delayBetweenBatches
    });
  }

  /**
   * Update Linear priorities for scored stories
   */
  async updateLinearPriorities(scoredStories: ScoredStory[]): Promise<UpdateResult[]> {
    logger.info('Starting Linear priority updates', { storyCount: scoredStories.length });

    const priorityUpdates = scoredStories
      .filter(story => {
        const currentPriority = story.priority || LinearPriority.MEDIUM;
        return currentPriority !== story.recommendedPriority;
      })
      .map(story => this.createPriorityUpdate(story));

    if (priorityUpdates.length === 0) {
      logger.info('No priority updates needed');
      return [];
    }

    logger.info('Priority updates needed', { updateCount: priorityUpdates.length });

    try {
      return await this.batchUpdatePriorities(priorityUpdates);
    } catch (error) {
      logger.error('Priority update failed', { error });
      throw new PriorityUpdateError(`Failed to update priorities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform batch priority updates with error handling
   */
  async batchUpdatePriorities(updates: PriorityUpdate[]): Promise<UpdateResult[]> {
    logger.info('Starting batch priority updates', { 
      totalUpdates: updates.length,
      batchSize: this.config.batchSize
    });

    const results: UpdateResult[] = [];
    const originalPriorities = new Map<string, number>();

    try {
      // Process updates in batches
      for (let i = 0; i < updates.length; i += this.config.batchSize) {
        const batch = updates.slice(i, i + this.config.batchSize);
        logger.debug('Processing batch', { 
          batchNumber: Math.floor(i / this.config.batchSize) + 1,
          batchSize: batch.length
        });

        const batchResults = await this.processBatch(batch, originalPriorities);
        results.push(...batchResults);

        // Delay between batches to respect rate limits
        if (i + this.config.batchSize < updates.length) {
          await this.delay(this.config.delayBetweenBatches);
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      logger.info('Batch priority updates completed', {
        totalUpdates: results.length,
        successful: successCount,
        failed: failureCount
      });

      // Rollback on partial failure if configured
      if (failureCount > 0 && this.config.rollbackOnError) {
        logger.warn('Rolling back priority updates due to failures');
        await this.rollbackUpdates(originalPriorities);
      }

      return results;

    } catch (error) {
      logger.error('Batch update failed', { error });
      
      // Attempt rollback on catastrophic failure
      if (this.config.rollbackOnError && originalPriorities.size > 0) {
        logger.info('Attempting rollback due to batch failure');
        await this.rollbackUpdates(originalPriorities);
      }

      throw error;
    }
  }

  /**
   * Process a single batch of updates
   */
  private async processBatch(
    batch: PriorityUpdate[],
    originalPriorities: Map<string, number>
  ): Promise<UpdateResult[]> {
    const results: UpdateResult[] = [];

    for (const update of batch) {
      try {
        // Store original priority for potential rollback
        originalPriorities.set(update.storyId, update.currentPriority);

        const result = await this.updateSinglePriority(update);
        results.push(result);

        if (result.success) {
          logger.debug('Priority updated successfully', {
            storyId: update.storyId,
            oldPriority: result.oldPriority,
            newPriority: result.newPriority
          });
        } else {
          logger.warn('Priority update failed', {
            storyId: update.storyId,
            error: result.error
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Priority update error', {
          storyId: update.storyId,
          error: errorMessage
        });

        results.push({
          storyId: update.storyId,
          success: false,
          error: errorMessage
        });
      }
    }

    return results;
  }

  /**
   * Update priority for a single story with retries
   */
  private async updateSinglePriority(update: PriorityUpdate): Promise<UpdateResult> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.debug('Updating story priority', {
          storyId: update.storyId,
          attempt,
          newPriority: LinearPriority[update.recommendedPriority]
        });

        // Get current story to verify it exists
        const story = await this.linearClient.getIssue(update.storyId);
        if (!story) {
          throw new Error(`Story ${update.storyId} not found`);
        }

        const oldPriority = story.priority || LinearPriority.MEDIUM;

        // Update the priority in Linear
        await this.linearClient.updateIssue(update.storyId, {
          priority: update.recommendedPriority
        });

        return {
          storyId: update.storyId,
          success: true,
          oldPriority,
          newPriority: update.recommendedPriority
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.debug('Priority update attempt failed', {
          storyId: update.storyId,
          attempt,
          error: lastError.message
        });

        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxRetries) {
          await this.delay(1000 * Math.pow(2, attempt - 1));
        }
      }
    }

    return {
      storyId: update.storyId,
      success: false,
      error: lastError?.message || 'Max retries exceeded'
    };
  }

  /**
   * Rollback priority updates
   */
  private async rollbackUpdates(originalPriorities: Map<string, number>): Promise<void> {
    logger.info('Starting priority rollback', { 
      storiesCount: originalPriorities.size 
    });

    let rollbackCount = 0;
    let rollbackErrors = 0;

    for (const entry of Array.from(originalPriorities.entries())) {
      const [storyId, originalPriority] = entry;
      try {
        await this.linearClient.updateIssue(storyId, {
          priority: originalPriority
        });
        rollbackCount++;
        logger.debug('Priority rolled back', { storyId, originalPriority });

      } catch (error) {
        rollbackErrors++;
        logger.error('Rollback failed for story', {
          storyId,
          originalPriority,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Small delay between rollback operations
      await this.delay(200);
    }

    logger.info('Priority rollback completed', {
      totalStories: originalPriorities.size,
      successful: rollbackCount,
      failed: rollbackErrors
    });
  }

  /**
   * Map WSJF score to Linear priority value
   */
  mapScoreToLinearPriority(score: number): LinearPriority {
    if (score >= 8.0) {
      return LinearPriority.URGENT;
    } else if (score >= 5.0) {
      return LinearPriority.HIGH;
    } else if (score >= 2.0) {
      return LinearPriority.MEDIUM;
    } else {
      return LinearPriority.LOW;
    }
  }

  /**
   * Create priority update object from scored story
   */
  private createPriorityUpdate(story: ScoredStory): PriorityUpdate {
    return {
      storyId: story.id,
      currentPriority: story.priority || LinearPriority.MEDIUM,
      recommendedPriority: story.recommendedPriority,
      wsjfScore: story.wsjfScore,
      rationale: `WSJF Score: ${story.wsjfScore.toFixed(2)} - Business Value: ${story.businessValue.toFixed(1)}, Time Criticality: ${story.timeCriticality.toFixed(1)}, Risk Reduction: ${story.riskReduction.toFixed(1)}, Job Size: ${story.jobSize.toFixed(1)}`,
      updateTimestamp: new Date()
    };
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get update statistics
   */
  getUpdateStatistics(results: UpdateResult[]): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    priorityDistribution: Record<string, number>;
  } {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Count priority distribution
    const priorityDistribution: Record<string, number> = {};
    for (const result of successful) {
      if (result.newPriority !== undefined) {
        const priorityName = LinearPriority[result.newPriority];
        priorityDistribution[priorityName] = (priorityDistribution[priorityName] || 0) + 1;
      }
    }

    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: results.length > 0 ? successful.length / results.length : 0,
      priorityDistribution
    };
  }
}