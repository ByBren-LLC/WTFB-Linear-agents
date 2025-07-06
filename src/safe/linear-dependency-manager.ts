/**
 * Linear Dependency Manager for SAFe ART Planning (LIN-48)
 * 
 * Manages creation and maintenance of dependency relationships in Linear.
 * Handles relationship types, metadata, and synchronization with dependency graph.
 */

import {
  DependencyRelationship,
  LinearDependencyInput,
  DependencyError,
  LinearIntegrationError
} from '../types/dependency-types';
import { LinearClientWrapper } from '../linear/client';
import * as logger from '../utils/logger';

/**
 * Configuration for Linear dependency management
 */
export interface LinearDependencyConfig {
  /** Maximum batch size for relationship creation */
  maxBatchSize: number;
  /** Retry configuration for failed operations */
  retryConfig: {
    maxRetries: number;
    initialDelay: number;
    backoffMultiplier: number;
  };
  /** Whether to add detailed comments to relationships */
  includeDetailedComments: boolean;
  /** Dry run mode - don't actually create relationships */
  dryRun: boolean;
}

/**
 * Default configuration for Linear dependency management
 */
const DEFAULT_CONFIG: LinearDependencyConfig = {
  maxBatchSize: 10,
  retryConfig: {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2
  },
  includeDetailedComments: true,
  dryRun: false
};

/**
 * Result of dependency relationship operations
 */
export interface DependencyOperationResult {
  /** Number of relationships successfully created */
  created: number;
  /** Number of relationships successfully updated */
  updated: number;
  /** Number of relationships successfully removed */
  removed: number;
  /** Relationships that failed to process */
  failed: Array<{
    relationship: LinearDependencyInput;
    error: string;
  }>;
  /** Total processing time in milliseconds */
  processingTime: number;
  /** Whether the operation was a dry run */
  dryRun: boolean;
}

/**
 * Manages Linear dependency relationships for the ART planning system
 */
export class LinearDependencyManager {
  private linearClient: LinearClientWrapper;
  private config: LinearDependencyConfig;

  constructor(
    linearClient: LinearClientWrapper,
    config: Partial<LinearDependencyConfig> = {}
  ) {
    this.linearClient = linearClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('LinearDependencyManager initialized', {
      maxBatchSize: this.config.maxBatchSize,
      dryRun: this.config.dryRun
    });
  }

  /**
   * Create dependency relationships in Linear from detected dependencies
   */
  async createDependencyRelationships(
    dependencies: DependencyRelationship[]
  ): Promise<DependencyOperationResult> {
    const startTime = Date.now();
    logger.info('Creating dependency relationships in Linear', {
      dependencyCount: dependencies.length,
      dryRun: this.config.dryRun
    });

    const linearInputs = this.convertToLinearInputs(dependencies);
    const result: DependencyOperationResult = {
      created: 0,
      updated: 0,
      removed: 0,
      failed: [],
      processingTime: 0,
      dryRun: this.config.dryRun
    };

    if (this.config.dryRun) {
      logger.info('Dry run mode - relationships would be created', {
        relationships: linearInputs.length
      });
      result.created = linearInputs.length;
      result.processingTime = Date.now() - startTime;
      return result;
    }

    // Process relationships in batches
    const batches = this.createBatches(linearInputs, this.config.maxBatchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.debug(`Processing batch ${i + 1}/${batches.length}`, {
        batchSize: batch.length
      });

      await this.processBatch(batch, result);
      
      // Add delay between batches to respect rate limits
      if (i < batches.length - 1) {
        await this.delay(500);
      }
    }

    result.processingTime = Date.now() - startTime;
    
    logger.info('Dependency relationship creation completed', {
      created: result.created,
      failed: result.failed.length,
      processingTime: `${result.processingTime}ms`
    });

    return result;
  }

  /**
   * Update existing dependency relationships with new ones
   */
  async updateDependencyRelationships(
    existingDeps: DependencyRelationship[],
    newDeps: DependencyRelationship[]
  ): Promise<DependencyOperationResult> {
    const startTime = Date.now();
    logger.info('Updating dependency relationships', {
      existing: existingDeps.length,
      new: newDeps.length,
      dryRun: this.config.dryRun
    });

    // Analyze differences
    const { toCreate, toUpdate, toRemove } = this.analyzeDependencyChanges(existingDeps, newDeps);
    
    const result: DependencyOperationResult = {
      created: 0,
      updated: 0,
      removed: 0,
      failed: [],
      processingTime: 0,
      dryRun: this.config.dryRun
    };

    if (this.config.dryRun) {
      result.created = toCreate.length;
      result.updated = toUpdate.length;
      result.removed = toRemove.length;
      result.processingTime = Date.now() - startTime;
      
      logger.info('Dry run mode - dependency changes analyzed', {
        toCreate: toCreate.length,
        toUpdate: toUpdate.length,
        toRemove: toRemove.length
      });
      
      return result;
    }

    // Create new relationships
    if (toCreate.length > 0) {
      const createResult = await this.createDependencyRelationships(toCreate);
      result.created = createResult.created;
      result.failed.push(...createResult.failed);
    }

    // Update existing relationships
    for (const dep of toUpdate) {
      try {
        await this.updateSingleRelationship(dep);
        result.updated++;
      } catch (error) {
        const linearInput = this.convertToLinearInput(dep);
        result.failed.push({
          relationship: linearInput,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Remove obsolete relationships
    for (const dep of toRemove) {
      try {
        await this.removeSingleRelationship(dep);
        result.removed++;
      } catch (error) {
        const linearInput = this.convertToLinearInput(dep);
        result.failed.push({
          relationship: linearInput,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.processingTime = Date.now() - startTime;
    
    logger.info('Dependency relationship update completed', {
      created: result.created,
      updated: result.updated,
      removed: result.removed,
      failed: result.failed.length,
      processingTime: `${result.processingTime}ms`
    });

    return result;
  }

  /**
   * Remove all dependency relationships for given work items
   */
  async removeDependencyRelationships(
    workItemIds: string[]
  ): Promise<DependencyOperationResult> {
    const startTime = Date.now();
    logger.info('Removing dependency relationships', {
      workItemCount: workItemIds.length,
      dryRun: this.config.dryRun
    });

    const result: DependencyOperationResult = {
      created: 0,
      updated: 0,
      removed: 0,
      failed: [],
      processingTime: 0,
      dryRun: this.config.dryRun
    };

    if (this.config.dryRun) {
      logger.info('Dry run mode - relationships would be removed');
      result.processingTime = Date.now() - startTime;
      return result;
    }

    // Get existing relationships for these work items
    const existingRelationships = await this.getExistingRelationships(workItemIds);
    
    for (const relationship of existingRelationships) {
      try {
        await this.removeRelationshipById(relationship.id);
        result.removed++;
      } catch (error) {
        result.failed.push({
          relationship: {
            sourceIssueId: relationship.sourceId,
            targetIssueId: relationship.targetId,
            relationType: 'related'
          },
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.processingTime = Date.now() - startTime;
    
    logger.info('Dependency relationship removal completed', {
      removed: result.removed,
      failed: result.failed.length,
      processingTime: `${result.processingTime}ms`
    });

    return result;
  }

  /**
   * Convert dependency relationships to Linear input format
   */
  private convertToLinearInputs(dependencies: DependencyRelationship[]): LinearDependencyInput[] {
    return dependencies.map(dep => this.convertToLinearInput(dep));
  }

  /**
   * Convert single dependency relationship to Linear input format
   */
  private convertToLinearInput(dep: DependencyRelationship): LinearDependencyInput {
    const comment = this.config.includeDetailedComments
      ? this.generateDetailedComment(dep)
      : dep.rationale;

    return {
      sourceIssueId: dep.sourceId,
      targetIssueId: dep.targetId,
      relationType: this.mapDependencyTypeToLinear(dep),
      comment,
      metadata: {
        dependencyId: dep.id,
        strength: dep.strength,
        confidence: dep.confidence,
        detectionMethod: dep.detectionMethod,
        triggers: dep.triggers,
        detectedAt: dep.detectedAt.toISOString()
      }
    };
  }

  /**
   * Map dependency relationship to Linear relationship type
   */
  private mapDependencyTypeToLinear(dep: DependencyRelationship): 'blocks' | 'blocked_by' | 'related' | 'duplicate' {
    switch (dep.type) {
      case 'blocks':
        return 'blocks';
      case 'blocked_by':
        return 'blocked_by';
      case 'requires':
        return 'blocked_by'; // Item requires target, so target blocks item
      case 'enables':
        return 'related';
      case 'related':
        return 'related';
      case 'conflicts':
        return 'related';
      default:
        return 'related';
    }
  }

  /**
   * Generate detailed comment for relationship
   */
  private generateDetailedComment(dep: DependencyRelationship): string {
    const lines = [
      `🔗 **Dependency**: ${dep.rationale}`,
      `📊 **Confidence**: ${(dep.confidence * 100).toFixed(0)}%`,
      `🔍 **Detection**: ${dep.detectionMethod}`,
      `💪 **Strength**: ${dep.strength}`,
      ''
    ];

    if (dep.triggers.length > 0) {
      lines.push(`🎯 **Triggers**: ${dep.triggers.join(', ')}`);
      lines.push('');
    }

    lines.push(`_Automatically detected by SAFe ART Planning Agent (${dep.detectedAt.toISOString()})_`);

    return lines.join('\n');
  }

  /**
   * Create batches of Linear inputs for processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of relationship inputs
   */
  private async processBatch(
    batch: LinearDependencyInput[],
    result: DependencyOperationResult
  ): Promise<void> {
    for (const input of batch) {
      try {
        await this.createSingleRelationship(input);
        result.created++;
        
        logger.debug('Dependency relationship created', {
          source: input.sourceIssueId,
          target: input.targetIssueId,
          type: input.relationType
        });
        
      } catch (error) {
        result.failed.push({
          relationship: input,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        logger.warn('Failed to create dependency relationship', {
          source: input.sourceIssueId,
          target: input.targetIssueId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Create a single relationship in Linear with retry logic
   */
  private async createSingleRelationship(input: LinearDependencyInput): Promise<void> {
    const { maxRetries, initialDelay, backoffMultiplier } = this.config.retryConfig;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Use Linear SDK to create relationship
        await this.linearClient.createIssueRelation({
          issueId: input.sourceIssueId,
          relatedIssueId: input.targetIssueId,
          type: input.relationType
        });

        // Add comment if provided
        if (input.comment) {
          await this.linearClient.createComment(
            input.sourceIssueId,
            input.comment
          );
        }

        return; // Success

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
          logger.debug(`Retrying relationship creation after ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries,
            error: lastError.message
          });
          
          await this.delay(delay);
        }
      }
    }

    throw new LinearIntegrationError(
      `Failed to create dependency relationship after ${maxRetries} retries: ${lastError?.message}`,
      lastError
    );
  }

  /**
   * Update a single relationship
   */
  private async updateSingleRelationship(dep: DependencyRelationship): Promise<void> {
    // For now, we'll delete and recreate since Linear doesn't have direct update
    // In a more sophisticated implementation, we'd track relationship IDs
    logger.debug('Updating relationship by recreating', {
      dependencyId: dep.id
    });
    
    const input = this.convertToLinearInput(dep);
    await this.createSingleRelationship(input);
  }

  /**
   * Remove a single relationship
   */
  private async removeSingleRelationship(dep: DependencyRelationship): Promise<void> {
    // This would require tracking relationship IDs in a more sophisticated implementation
    logger.debug('Removing relationship (placeholder)', {
      dependencyId: dep.id
    });
    
    // For now, log the removal
    // In production, we'd need to maintain a mapping of dependencies to Linear relationship IDs
  }

  /**
   * Remove relationship by ID
   */
  private async removeRelationshipById(relationshipId: string): Promise<void> {
    // Placeholder for actual Linear SDK call to remove relationship
    logger.debug('Removing relationship by ID', { relationshipId });
  }

  /**
   * Get existing relationships for work items
   */
  private async getExistingRelationships(workItemIds: string[]): Promise<Array<{ id: string; sourceId: string; targetId: string }>> {
    // Placeholder - would query Linear for existing relationships
    logger.debug('Getting existing relationships', { workItemIds });
    return [];
  }

  /**
   * Analyze changes between existing and new dependencies
   */
  private analyzeDependencyChanges(
    existing: DependencyRelationship[],
    newDeps: DependencyRelationship[]
  ): {
    toCreate: DependencyRelationship[];
    toUpdate: DependencyRelationship[];
    toRemove: DependencyRelationship[];
  } {
    const existingMap = new Map(existing.map(dep => [`${dep.sourceId}-${dep.targetId}`, dep]));
    const newMap = new Map(newDeps.map(dep => [`${dep.sourceId}-${dep.targetId}`, dep]));

    const toCreate: DependencyRelationship[] = [];
    const toUpdate: DependencyRelationship[] = [];
    const toRemove: DependencyRelationship[] = [];

    // Find new dependencies to create
    for (const [key, dep] of newMap) {
      if (!existingMap.has(key)) {
        toCreate.push(dep);
      } else {
        // Check if the dependency has changed
        const existingDep = existingMap.get(key)!;
        if (this.isDependencyChanged(existingDep, dep)) {
          toUpdate.push(dep);
        }
      }
    }

    // Find dependencies to remove
    for (const [key, dep] of existingMap) {
      if (!newMap.has(key)) {
        toRemove.push(dep);
      }
    }

    return { toCreate, toUpdate, toRemove };
  }

  /**
   * Check if dependency has changed significantly
   */
  private isDependencyChanged(existing: DependencyRelationship, updated: DependencyRelationship): boolean {
    return (
      existing.type !== updated.type ||
      existing.strength !== updated.strength ||
      Math.abs(existing.confidence - updated.confidence) > 0.1 ||
      existing.rationale !== updated.rationale
    );
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}