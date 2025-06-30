/**
 * Linear Cycle Manager for ART Planning (LIN-49 Phase 3)
 * 
 * Manages Linear cycles (sprints) and work assignment integration
 * for ART iteration planning execution.
 */

import {
  IterationPlan,
  ARTPlan,
  AllocatedWorkItem,
  PlanningWorkItem
} from '../types/art-planning-types';
import { LinearClientWrapper } from '../linear/client';
import * as logger from '../utils/logger';

/**
 * Linear cycle creation result
 */
export interface CycleCreationResult {
  cycleId: string;
  cycleName: string;
  startDate: Date;
  endDate: Date;
  linearUrl: string;
  workItemsAssigned: number;
  assignmentResults: WorkItemAssignmentResult[];
}

/**
 * Work item assignment result  
 */
export interface WorkItemAssignmentResult {
  workItemId: string;
  linearIssueId: string;
  assignmentStatus: 'success' | 'failed' | 'skipped';
  reason?: string;
  linearUrl?: string;
}

/**
 * Linear cycle configuration
 */
interface CycleManagerConfig {
  teamId: string;
  organizationId: string;
  defaultEstimateType: 'points' | 'hours';
  enableAutomaticLabeling: boolean;
  createCycleGoals: boolean;
}

/**
 * Default configuration for Linear cycle management
 */
const DEFAULT_CYCLE_CONFIG: CycleManagerConfig = {
  teamId: '',
  organizationId: '',
  defaultEstimateType: 'points',
  enableAutomaticLabeling: true,
  createCycleGoals: true
};

/**
 * Manages Linear cycles and work item assignment for ART planning
 */
export class LinearCycleManager {
  private config: CycleManagerConfig;
  private linearClient: LinearClientWrapper;

  constructor(
    linearClient: LinearClientWrapper,
    config: Partial<CycleManagerConfig> = {}
  ) {
    this.linearClient = linearClient;
    this.config = { ...DEFAULT_CYCLE_CONFIG, ...config };
    
    logger.debug('LinearCycleManager initialized', {
      teamId: this.config.teamId,
      estimateType: this.config.defaultEstimateType,
      autoLabeling: this.config.enableAutomaticLabeling
    });
  }

  /**
   * Create Linear cycles for all iterations in an ART plan
   */
  async createCyclesForARTPlan(artPlan: ARTPlan): Promise<CycleCreationResult[]> {
    logger.info('Creating Linear cycles for ART plan', {
      piName: artPlan.programIncrement.name,
      iterationCount: artPlan.iterations.length,
      totalWorkItems: artPlan.workItems.length
    });

    const results: CycleCreationResult[] = [];

    for (const iteration of artPlan.iterations) {
      try {
        const cycleResult = await this.createCycleForIteration(iteration);
        results.push(cycleResult);

        logger.info('Linear cycle created successfully', {
          iterationId: iteration.iteration.id,
          cycleId: cycleResult.cycleId,
          workItemsAssigned: cycleResult.workItemsAssigned
        });
      } catch (error) {
        logger.error('Failed to create Linear cycle', {
          iterationId: iteration.iteration.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Create a failed result
        results.push({
          cycleId: '',
          cycleName: iteration.iteration.name,
          startDate: iteration.iteration.startDate,
          endDate: iteration.iteration.endDate,
          linearUrl: '',
          workItemsAssigned: 0,
          assignmentResults: []
        });
      }
    }

    logger.info('ART plan Linear cycle creation completed', {
      totalCycles: results.length,
      successfulCycles: results.filter(r => r.cycleId !== '').length
    });

    return results;
  }

  /**
   * Create a Linear cycle for a single iteration
   */
  async createCycleForIteration(iteration: IterationPlan): Promise<CycleCreationResult> {
    logger.debug('Creating Linear cycle for iteration', {
      iterationId: iteration.iteration.id,
      startDate: iteration.iteration.startDate.toISOString(),
      endDate: iteration.iteration.endDate.toISOString(),
      workItemCount: iteration.allocatedWork.length
    });

    // Create the cycle in Linear
    const cycleData = {
      name: iteration.iteration.name,
      description: this.generateCycleDescription(iteration),
      startsAt: iteration.iteration.startDate,
      endsAt: iteration.iteration.endDate,
      teamId: this.config.teamId
    };

    const cycle = await this.linearClient.createCycle(cycleData);
    
    // Assign work items to the cycle
    const assignmentResults = await this.assignWorkItemsToCycle(
      cycle.id,
      iteration.allocatedWork
    );

    // Create cycle goals if enabled
    if (this.config.createCycleGoals && iteration.iteration.goals) {
      await this.createCycleGoals(cycle.id, iteration.iteration.goals);
    }

    return {
      cycleId: cycle.id,
      cycleName: cycle.name,
      startDate: iteration.iteration.startDate,
      endDate: iteration.iteration.endDate,
      linearUrl: cycle.url,
      workItemsAssigned: assignmentResults.filter(r => r.assignmentStatus === 'success').length,
      assignmentResults
    };
  }

  /**
   * Assign work items to a Linear cycle
   */
  async assignWorkItemsToCycle(
    cycleId: string,
    allocatedWorkItems: AllocatedWorkItem[]
  ): Promise<WorkItemAssignmentResult[]> {
    logger.debug('Assigning work items to Linear cycle', {
      cycleId,
      workItemCount: allocatedWorkItems.length
    });

    const results: WorkItemAssignmentResult[] = [];

    for (const allocatedItem of allocatedWorkItems) {
      try {
        const assignmentResult = await this.assignSingleWorkItem(
          cycleId,
          allocatedItem
        );
        results.push(assignmentResult);
      } catch (error) {
        logger.error('Failed to assign work item to cycle', {
          workItemId: allocatedItem.workItem.id,
          cycleId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        results.push({
          workItemId: allocatedItem.workItem.id,
          linearIssueId: '',
          assignmentStatus: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('Work item assignment to cycle completed', {
      cycleId,
      totalItems: results.length,
      successful: results.filter(r => r.assignmentStatus === 'success').length,
      failed: results.filter(r => r.assignmentStatus === 'failed').length
    });

    return results;
  }

  /**
   * Assign a single work item to a Linear cycle
   */
  private async assignSingleWorkItem(
    cycleId: string,
    allocatedItem: AllocatedWorkItem
  ): Promise<WorkItemAssignmentResult> {
    const workItem = allocatedItem.workItem;

    // Check if Linear issue already exists for this work item
    const existingIssue = await this.findExistingLinearIssue(workItem);
    
    if (existingIssue) {
      // Update existing issue to assign to cycle
      const updatedIssue = await this.linearClient.updateIssue({
        id: existingIssue.id,
        cycleId: cycleId,
        estimate: this.calculateEstimate(allocatedItem)
      });

      return {
        workItemId: workItem.id,
        linearIssueId: updatedIssue.id,
        assignmentStatus: 'success',
        linearUrl: updatedIssue.url
      };
    } else {
      // Create new Linear issue and assign to cycle
      const issueData = this.createIssueDataFromWorkItem(workItem, allocatedItem, cycleId);
      const createdIssue = await this.linearClient.createIssue(issueData);

      // Apply labels if enabled
      if (this.config.enableAutomaticLabeling) {
        await this.applyLabelsToIssue(createdIssue.id, workItem);
      }

      return {
        workItemId: workItem.id,
        linearIssueId: createdIssue.id,
        assignmentStatus: 'success',
        linearUrl: createdIssue.url
      };
    }
  }

  /**
   * Find existing Linear issue for a work item
   */
  private async findExistingLinearIssue(workItem: PlanningWorkItem): Promise<any | null> {
    try {
      // Search for issues by title or external ID
      const searchResults = await this.linearClient.searchIssues({
        query: workItem.title,
        teamId: this.config.teamId
      });

      // Look for exact matches or issues with matching external IDs
      for (const issue of searchResults.nodes || []) {
        if (issue.title === workItem.title || 
            issue.identifier === workItem.id ||
            issue.externalId === workItem.id) {
          return issue;
        }
      }

      return null;
    } catch (error) {
      logger.warn('Failed to search for existing Linear issue', {
        workItemId: workItem.id,
        workItemTitle: workItem.title,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Create Linear issue data from work item
   */
  private createIssueDataFromWorkItem(
    workItem: PlanningWorkItem,
    allocatedItem: AllocatedWorkItem,
    cycleId: string
  ): any {
    const issueData: any = {
      title: workItem.title,
      description: this.formatWorkItemDescription(workItem),
      teamId: this.config.teamId,
      cycleId: cycleId,
      estimate: this.calculateEstimate(allocatedItem),
      externalId: workItem.id
    };

    // Set priority if available
    if ('priority' in workItem && workItem.priority) {
      issueData.priority = this.mapPriorityToLinear(workItem.priority);
    }

    // Set labels based on work item type
    const labels = this.generateLabelsForWorkItem(workItem);
    if (labels.length > 0) {
      issueData.labelIds = labels;
    }

    return issueData;
  }

  /**
   * Calculate estimate for Linear issue
   */
  private calculateEstimate(allocatedItem: AllocatedWorkItem): number {
    if (this.config.defaultEstimateType === 'points') {
      return allocatedItem.allocatedPoints;
    } else {
      // Convert story points to hours (assuming 1 point = 4 hours)
      return allocatedItem.allocatedPoints * 4;
    }
  }

  /**
   * Map priority to Linear priority values
   */
  private mapPriorityToLinear(priority: number): number {
    // Map 1-5 scale to Linear's 1-4 scale
    if (priority <= 1) return 1; // Urgent
    if (priority <= 2) return 2; // High  
    if (priority <= 3) return 3; // Medium
    return 4; // Low
  }

  /**
   * Generate labels for work item
   */
  private generateLabelsForWorkItem(workItem: PlanningWorkItem): string[] {
    const labels: string[] = [];

    // Add type-based label
    labels.push(`type:${workItem.type}`);

    // Add SAFe-specific labels
    if (workItem.type === 'story') {
      labels.push('safe:story');
    } else if (workItem.type === 'enabler') {
      labels.push('safe:enabler');
    } else if (workItem.type === 'feature') {
      labels.push('safe:feature');
    }

    // Add ART planning label
    labels.push('art:planning');

    return labels;
  }

  /**
   * Apply labels to Linear issue
   */
  private async applyLabelsToIssue(issueId: string, workItem: PlanningWorkItem): Promise<void> {
    try {
      const labels = this.generateLabelsForWorkItem(workItem);
      
      // Get or create label IDs
      const labelIds: string[] = [];
      for (const labelName of labels) {
        const labelId = await this.getOrCreateLabel(labelName);
        if (labelId) {
          labelIds.push(labelId);
        }
      }

      if (labelIds.length > 0) {
        await this.linearClient.updateIssue({
          id: issueId,
          labelIds: labelIds
        });
      }
    } catch (error) {
      logger.warn('Failed to apply labels to Linear issue', {
        issueId,
        workItemId: workItem.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get or create a label in Linear
   */
  private async getOrCreateLabel(labelName: string): Promise<string | null> {
    try {
      // First, try to find existing label
      const existingLabels = await this.linearClient.getLabels({
        teamId: this.config.teamId
      });

      const existingLabel = existingLabels.nodes?.find(
        label => label.name.toLowerCase() === labelName.toLowerCase()
      );

      if (existingLabel) {
        return existingLabel.id;
      }

      // Create new label if it doesn't exist
      const newLabel = await this.linearClient.createLabel({
        name: labelName,
        teamId: this.config.teamId,
        color: this.generateLabelColor(labelName)
      });

      return newLabel.id;
    } catch (error) {
      logger.warn('Failed to get or create label', {
        labelName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Generate color for label based on name
   */
  private generateLabelColor(labelName: string): string {
    // Simple color mapping based on label type
    if (labelName.startsWith('type:')) return '#4F46E5'; // Indigo
    if (labelName.startsWith('safe:')) return '#059669'; // Emerald
    if (labelName.startsWith('art:')) return '#DC2626';  // Red
    return '#6B7280'; // Gray (default)
  }

  /**
   * Format work item description for Linear
   */
  private formatWorkItemDescription(workItem: PlanningWorkItem): string {
    let description = workItem.description || '';

    // Add acceptance criteria if available
    if ('acceptanceCriteria' in workItem && workItem.acceptanceCriteria) {
      description += '\n\n## Acceptance Criteria\n';
      workItem.acceptanceCriteria.forEach((criteria, index) => {
        description += `${index + 1}. ${criteria}\n`;
      });
    }

    // Add parent information if available
    if (workItem.parentId) {
      description += `\n\n**Parent:** ${workItem.parentId}`;
    }

    // Add ART planning metadata
    description += '\n\n---\n*Created by ART Iteration Planning (LIN-49)*';

    return description;
  }

  /**
   * Generate cycle description
   */
  private generateCycleDescription(iteration: IterationPlan): string {
    let description = `ART Iteration: ${iteration.iteration.name}\n\n`;
    
    description += `**Duration:** ${iteration.iteration.duration} days\n`;
    description += `**Work Items:** ${iteration.allocatedWork.length}\n`;
    description += `**Total Points:** ${iteration.totalPoints}\n`;
    
    if (iteration.iteration.goals && iteration.iteration.goals.length > 0) {
      description += `\n**Goals:**\n`;
      iteration.iteration.goals.forEach((goal, index) => {
        description += `${index + 1}. ${goal}\n`;
      });
    }

    description += `\n**Value Delivery:** ${iteration.deliverableValue.primaryValue}`;
    
    return description;
  }

  /**
   * Create cycle goals in Linear
   */
  private async createCycleGoals(cycleId: string, goals: string[]): Promise<void> {
    try {
      for (const goal of goals) {
        await this.linearClient.createCycleGoal({
          cycleId: cycleId,
          name: goal
        });
      }

      logger.debug('Cycle goals created', {
        cycleId,
        goalCount: goals.length
      });
    } catch (error) {
      logger.warn('Failed to create cycle goals', {
        cycleId,
        goalCount: goals.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Sync ART plan changes to Linear cycles
   */
  async syncARTPlanToLinear(
    originalPlan: ARTPlan,
    updatedPlan: ARTPlan
  ): Promise<void> {
    logger.info('Syncing ART plan changes to Linear', {
      originalIterations: originalPlan.iterations.length,
      updatedIterations: updatedPlan.iterations.length
    });

    // Compare iterations and update cycles accordingly
    for (let i = 0; i < Math.max(originalPlan.iterations.length, updatedPlan.iterations.length); i++) {
      const originalIteration = originalPlan.iterations[i];
      const updatedIteration = updatedPlan.iterations[i];

      if (!originalIteration && updatedIteration) {
        // New iteration added - create cycle
        await this.createCycleForIteration(updatedIteration);
      } else if (originalIteration && !updatedIteration) {
        // Iteration removed - archive cycle
        await this.archiveCycleForIteration(originalIteration);
      } else if (originalIteration && updatedIteration) {
        // Iteration modified - update cycle
        await this.updateCycleForIteration(originalIteration, updatedIteration);
      }
    }

    logger.info('ART plan sync to Linear completed');
  }

  /**
   * Archive a Linear cycle for removed iteration
   */
  private async archiveCycleForIteration(iteration: IterationPlan): Promise<void> {
    try {
      if (iteration.iteration.linearCycleId) {
        await this.linearClient.archiveCycle(iteration.iteration.linearCycleId);
        
        logger.info('Linear cycle archived', {
          iterationId: iteration.iteration.id,
          cycleId: iteration.iteration.linearCycleId
        });
      }
    } catch (error) {
      logger.error('Failed to archive Linear cycle', {
        iterationId: iteration.iteration.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update a Linear cycle for modified iteration
   */
  private async updateCycleForIteration(
    originalIteration: IterationPlan,
    updatedIteration: IterationPlan
  ): Promise<void> {
    try {
      if (originalIteration.iteration.linearCycleId) {
        const cycleId = originalIteration.iteration.linearCycleId;

        // Update cycle details
        await this.linearClient.updateCycle({
          id: cycleId,
          name: updatedIteration.iteration.name,
          description: this.generateCycleDescription(updatedIteration),
          startsAt: updatedIteration.iteration.startDate,
          endsAt: updatedIteration.iteration.endDate
        });

        // Update work item assignments
        await this.syncWorkItemAssignments(
          cycleId,
          originalIteration.allocatedWork,
          updatedIteration.allocatedWork
        );

        logger.info('Linear cycle updated', {
          iterationId: updatedIteration.iteration.id,
          cycleId
        });
      }
    } catch (error) {
      logger.error('Failed to update Linear cycle', {
        iterationId: updatedIteration.iteration.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Sync work item assignments between iterations
   */
  private async syncWorkItemAssignments(
    cycleId: string,
    originalItems: AllocatedWorkItem[],
    updatedItems: AllocatedWorkItem[]
  ): Promise<void> {
    // Find items to remove from cycle
    const itemsToRemove = originalItems.filter(
      orig => !updatedItems.some(upd => upd.workItem.id === orig.workItem.id)
    );

    // Find items to add to cycle
    const itemsToAdd = updatedItems.filter(
      upd => !originalItems.some(orig => orig.workItem.id === upd.workItem.id)
    );

    // Remove items from cycle
    for (const item of itemsToRemove) {
      await this.removeWorkItemFromCycle(cycleId, item);
    }

    // Add items to cycle
    for (const item of itemsToAdd) {
      await this.assignSingleWorkItem(cycleId, item);
    }

    logger.debug('Work item assignments synced', {
      cycleId,
      itemsRemoved: itemsToRemove.length,
      itemsAdded: itemsToAdd.length
    });
  }

  /**
   * Remove work item from Linear cycle
   */
  private async removeWorkItemFromCycle(
    cycleId: string,
    allocatedItem: AllocatedWorkItem
  ): Promise<void> {
    try {
      const existingIssue = await this.findExistingLinearIssue(allocatedItem.workItem);
      
      if (existingIssue) {
        await this.linearClient.updateIssue({
          id: existingIssue.id,
          cycleId: null // Remove from cycle
        });

        logger.debug('Work item removed from cycle', {
          workItemId: allocatedItem.workItem.id,
          cycleId,
          issueId: existingIssue.id
        });
      }
    } catch (error) {
      logger.warn('Failed to remove work item from cycle', {
        workItemId: allocatedItem.workItem.id,
        cycleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}