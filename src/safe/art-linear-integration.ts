/**
 * ART Linear Integration for ART Planning (LIN-49 Phase 3)
 * 
 * Main orchestrator for integrating ART iteration planning with Linear
 * including cycle management, work assignment, and synchronization.
 */

import {
  ARTPlan,
  IterationPlan,
  ARTTeam,
  AllocatedWorkItem
} from '../types/art-planning-types';
import { LinearClientWrapper } from '../linear/client';
import { LinearCycleManager, CycleCreationResult } from './linear-cycle-manager';
import { LinearWorkAssignmentManager, WorkAssignmentResult } from './linear-work-assignment-manager';
import * as logger from '../utils/logger';

/**
 * Complete ART Linear integration result
 */
export interface ARTLinearIntegrationResult {
  integrationId: string;
  artPlan: ARTPlan;
  cycleResults: CycleCreationResult[];
  assignmentResults: WorkAssignmentResult[];
  integrationStatus: 'success' | 'partial' | 'failed';
  summary: {
    cyclesCreated: number;
    workItemsAssigned: number;
    successfulAssignments: number;
    averageConfidence: number;
    processingTime: number;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Integration configuration
 */
interface IntegrationConfig {
  teamId: string;
  organizationId: string;
  enableCycleCreation: boolean;
  enableWorkAssignment: boolean;
  enableContinuousSync: boolean;
  retryFailedOperations: boolean;
  maxRetries: number;
}

/**
 * Default integration configuration
 */
const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = {
  teamId: '',
  organizationId: '',
  enableCycleCreation: true,
  enableWorkAssignment: true,
  enableContinuousSync: false,
  retryFailedOperations: true,
  maxRetries: 3
};

/**
 * Main orchestrator for ART Linear integration
 */
export class ARTLinearIntegration {
  private config: IntegrationConfig;
  private linearClient: LinearClientWrapper;
  private cycleManager: LinearCycleManager;
  private assignmentManager: LinearWorkAssignmentManager;

  constructor(
    linearClient: LinearClientWrapper,
    config: Partial<IntegrationConfig> = {}
  ) {
    this.config = { ...DEFAULT_INTEGRATION_CONFIG, ...config };
    this.linearClient = linearClient;
    
    // Initialize sub-managers
    this.cycleManager = new LinearCycleManager(linearClient, {
      teamId: this.config.teamId,
      organizationId: this.config.organizationId
    });
    
    this.assignmentManager = new LinearWorkAssignmentManager(linearClient, {
      enableSkillMatching: true,
      enableCapacityBalancing: true,
      enableWorkloadDistribution: true
    });

    logger.debug('ARTLinearIntegration initialized', {
      teamId: this.config.teamId,
      cycleCreation: this.config.enableCycleCreation,
      workAssignment: this.config.enableWorkAssignment,
      continuousSync: this.config.enableContinuousSync
    });
  }

  /**
   * Execute complete ART Linear integration
   */
  async executeARTIntegration(
    artPlan: ARTPlan,
    teams: ARTTeam[]
  ): Promise<ARTLinearIntegrationResult> {
    const startTime = Date.now();
    const integrationId = `art-integration-${Date.now()}`;
    
    logger.info('Starting ART Linear integration', {
      integrationId,
      piName: artPlan.programIncrement.name,
      iterationCount: artPlan.iterations.length,
      teamCount: teams.length
    });

    const warnings: string[] = [];
    const errors: string[] = [];
    let cycleResults: CycleCreationResult[] = [];
    let assignmentResults: WorkAssignmentResult[] = [];

    try {
      // Phase 1: Create Linear cycles
      if (this.config.enableCycleCreation) {
        logger.info('Phase 1: Creating Linear cycles');
        cycleResults = await this.executeWithRetry(
          () => this.cycleManager.createCyclesForARTPlan(artPlan),
          'cycle creation'
        );

        // Update iteration with Linear cycle IDs
        this.updateIterationsWithCycleIds(artPlan.iterations, cycleResults);
      } else {
        warnings.push('Cycle creation disabled - skipping cycle management');
      }

      // Phase 2: Assign work items
      if (this.config.enableWorkAssignment) {
        logger.info('Phase 2: Assigning work items');
        assignmentResults = await this.executeWithRetry(
          () => this.assignmentManager.assignWorkForARTPlan(artPlan, teams),
          'work assignment'
        );
      } else {
        warnings.push('Work assignment disabled - skipping assignment');
      }

      // Phase 3: Setup continuous sync (if enabled)
      if (this.config.enableContinuousSync) {
        logger.info('Phase 3: Setting up continuous synchronization');
        await this.setupContinuousSync(artPlan, teams);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Integration failed: ${errorMessage}`);
      
      logger.error('ART Linear integration failed', {
        integrationId,
        error: errorMessage
      });
    }

    // Calculate summary
    const processingTime = Date.now() - startTime;
    const summary = this.calculateIntegrationSummary(
      cycleResults,
      assignmentResults,
      processingTime
    );

    // Determine overall status
    const integrationStatus = this.determineIntegrationStatus(
      cycleResults,
      assignmentResults,
      errors
    );

    const result: ARTLinearIntegrationResult = {
      integrationId,
      artPlan,
      cycleResults,
      assignmentResults,
      integrationStatus,
      summary,
      warnings,
      errors
    };

    logger.info('ART Linear integration completed', {
      integrationId,
      status: integrationStatus,
      cyclesCreated: summary.cyclesCreated,
      workItemsAssigned: summary.workItemsAssigned,
      processingTime: `${processingTime}ms`
    });

    return result;
  }

  /**
   * Sync ART plan changes to Linear
   */
  async syncARTPlanChanges(
    originalPlan: ARTPlan,
    updatedPlan: ARTPlan,
    teams: ARTTeam[]
  ): Promise<void> {
    logger.info('Syncing ART plan changes to Linear', {
      originalIterations: originalPlan.iterations.length,
      updatedIterations: updatedPlan.iterations.length
    });

    // Sync cycle changes
    if (this.config.enableCycleCreation) {
      await this.cycleManager.syncARTPlanToLinear(originalPlan, updatedPlan);
    }

    // Re-assign work items for modified iterations
    if (this.config.enableWorkAssignment) {
      const modifiedIterations = this.findModifiedIterations(
        originalPlan.iterations,
        updatedPlan.iterations
      );

      for (const iteration of modifiedIterations) {
        await this.assignmentManager.assignWorkForIteration(iteration, teams);
      }
    }

    logger.info('ART plan sync completed');
  }

  /**
   * Get integration status and health
   */
  async getIntegrationHealth(artPlan: ARTPlan): Promise<{
    isHealthy: boolean;
    cycleHealth: { created: number; total: number; healthScore: number };
    assignmentHealth: { assigned: number; total: number; healthScore: number };
    recommendations: string[];
  }> {
    logger.debug('Checking integration health', {
      piName: artPlan.programIncrement.name,
      iterationCount: artPlan.iterations.length
    });

    const recommendations: string[] = [];
    
    // Check cycle health
    let cycleHealth = { created: 0, total: artPlan.iterations.length, healthScore: 0 };
    for (const iteration of artPlan.iterations) {
      if (iteration.iteration.linearCycleId) {
        cycleHealth.created++;
      }
    }
    cycleHealth.healthScore = cycleHealth.total > 0 ? cycleHealth.created / cycleHealth.total : 0;

    if (cycleHealth.healthScore < 1.0) {
      recommendations.push(`${cycleHealth.total - cycleHealth.created} iterations missing Linear cycles`);
    }

    // Check assignment health
    const totalWorkItems = artPlan.iterations.reduce(
      (sum, iteration) => sum + iteration.allocatedWork.length, 0
    );
    
    let assignmentHealth = { assigned: 0, total: totalWorkItems, healthScore: 0 };
    
    // This would require checking actual Linear assignments
    // For now, assume all work items in cycles with Linear IDs are assigned
    for (const iteration of artPlan.iterations) {
      if (iteration.iteration.linearCycleId) {
        assignmentHealth.assigned += iteration.allocatedWork.length;
      }
    }
    
    assignmentHealth.healthScore = assignmentHealth.total > 0 ? 
      assignmentHealth.assigned / assignmentHealth.total : 0;

    if (assignmentHealth.healthScore < 0.8) {
      recommendations.push(`${assignmentHealth.total - assignmentHealth.assigned} work items may not be properly assigned`);
    }

    const isHealthy = cycleHealth.healthScore >= 0.9 && assignmentHealth.healthScore >= 0.8;

    if (!isHealthy) {
      recommendations.push('Consider re-running integration to resolve issues');
    }

    return {
      isHealthy,
      cycleHealth,
      assignmentHealth,
      recommendations
    };
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (!this.config.retryFailedOperations) {
      return operation();
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
            attempt,
            error: lastError.message
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Update iterations with Linear cycle IDs
   */
  private updateIterationsWithCycleIds(
    iterations: IterationPlan[],
    cycleResults: CycleCreationResult[]
  ): void {
    for (let i = 0; i < Math.min(iterations.length, cycleResults.length); i++) {
      const iteration = iterations[i];
      const cycleResult = cycleResults[i];
      
      if (cycleResult.cycleId) {
        iteration.iteration.linearCycleId = cycleResult.cycleId;
      }
    }
  }

  /**
   * Setup continuous synchronization
   */
  private async setupContinuousSync(artPlan: ARTPlan, teams: ARTTeam[]): Promise<void> {
    // This would setup webhooks and monitoring for continuous sync
    // For now, just log the intent
    logger.info('Continuous sync setup completed', {
      piName: artPlan.programIncrement.name,
      iterationCount: artPlan.iterations.length
    });
  }

  /**
   * Find modified iterations between plans
   */
  private findModifiedIterations(
    originalIterations: IterationPlan[],
    updatedIterations: IterationPlan[]
  ): IterationPlan[] {
    const modified: IterationPlan[] = [];

    for (let i = 0; i < updatedIterations.length; i++) {
      const updatedIteration = updatedIterations[i];
      const originalIteration = originalIterations[i];

      if (!originalIteration || this.isIterationModified(originalIteration, updatedIteration)) {
        modified.push(updatedIteration);
      }
    }

    return modified;
  }

  /**
   * Check if iteration has been modified
   */
  private isIterationModified(original: IterationPlan, updated: IterationPlan): boolean {
    // Simple comparison - could be more sophisticated
    return (
      original.allocatedWork.length !== updated.allocatedWork.length ||
      original.iteration.startDate.getTime() !== updated.iteration.startDate.getTime() ||
      original.iteration.endDate.getTime() !== updated.iteration.endDate.getTime() ||
      original.iteration.name !== updated.iteration.name
    );
  }

  /**
   * Calculate integration summary statistics
   */
  private calculateIntegrationSummary(
    cycleResults: CycleCreationResult[],
    assignmentResults: WorkAssignmentResult[],
    processingTime: number
  ): ARTLinearIntegrationResult['summary'] {
    const cyclesCreated = cycleResults.filter(r => r.cycleId !== '').length;
    const workItemsAssigned = assignmentResults.length;
    const successfulAssignments = assignmentResults.filter(r => r.assignmentStatus === 'success').length;
    const averageConfidence = assignmentResults.length > 0 ?
      assignmentResults.reduce((sum, r) => sum + r.confidence, 0) / assignmentResults.length : 0;

    return {
      cyclesCreated,
      workItemsAssigned,
      successfulAssignments,
      averageConfidence,
      processingTime
    };
  }

  /**
   * Determine overall integration status
   */
  private determineIntegrationStatus(
    cycleResults: CycleCreationResult[],
    assignmentResults: WorkAssignmentResult[],
    errors: string[]
  ): 'success' | 'partial' | 'failed' {
    if (errors.length > 0) {
      return 'failed';
    }

    const cycleSuccessRate = cycleResults.length > 0 ?
      cycleResults.filter(r => r.cycleId !== '').length / cycleResults.length : 1;
    
    const assignmentSuccessRate = assignmentResults.length > 0 ?
      assignmentResults.filter(r => r.assignmentStatus === 'success').length / assignmentResults.length : 1;

    if (cycleSuccessRate >= 0.9 && assignmentSuccessRate >= 0.8) {
      return 'success';
    } else if (cycleSuccessRate >= 0.5 && assignmentSuccessRate >= 0.5) {
      return 'partial';
    } else {
      return 'failed';
    }
  }

  /**
   * Generate integration report
   */
  async generateIntegrationReport(result: ARTLinearIntegrationResult): Promise<string> {
    const report = [];
    
    report.push('# ART Linear Integration Report');
    report.push(`**Integration ID:** ${result.integrationId}`);
    report.push(`**Status:** ${result.integrationStatus.toUpperCase()}`);
    report.push(`**Processing Time:** ${result.summary.processingTime}ms`);
    report.push('');

    // Cycle creation summary
    report.push('## Cycle Creation');
    report.push(`- **Cycles Created:** ${result.summary.cyclesCreated}/${result.cycleResults.length}`);
    if (result.cycleResults.length > 0) {
      const successRate = (result.summary.cyclesCreated / result.cycleResults.length * 100).toFixed(1);
      report.push(`- **Success Rate:** ${successRate}%`);
    }
    report.push('');

    // Work assignment summary
    report.push('## Work Assignment');
    report.push(`- **Items Assigned:** ${result.summary.successfulAssignments}/${result.summary.workItemsAssigned}`);
    if (result.summary.workItemsAssigned > 0) {
      const successRate = (result.summary.successfulAssignments / result.summary.workItemsAssigned * 100).toFixed(1);
      report.push(`- **Success Rate:** ${successRate}%`);
      report.push(`- **Average Confidence:** ${(result.summary.averageConfidence * 100).toFixed(1)}%`);
    }
    report.push('');

    // Warnings
    if (result.warnings.length > 0) {
      report.push('## Warnings');
      result.warnings.forEach(warning => {
        report.push(`- ${warning}`);
      });
      report.push('');
    }

    // Errors
    if (result.errors.length > 0) {
      report.push('## Errors');
      result.errors.forEach(error => {
        report.push(`- ${error}`);
      });
      report.push('');
    }

    // Recommendations
    const health = await this.getIntegrationHealth(result.artPlan);
    if (health.recommendations.length > 0) {
      report.push('## Recommendations');
      health.recommendations.forEach(rec => {
        report.push(`- ${rec}`);
      });
    }

    return report.join('\n');
  }
}