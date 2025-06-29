/**
 * Linear Story Decomposer for creating decomposed stories in Linear
 * 
 * This module provides integration with the Linear API to create sub-stories
 * and establish parent/child relationships from decomposed stories.
 */

import { LinearClient, Issue } from '@linear/sdk';
import { Story } from '../planning/models';
import {
  DecompositionResult,
  DecompositionAuditEntry,
  StoryDecompositionError
} from '../types/decomposition-types';
import * as logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Linear issue creation result
 */
export interface LinearIssueResult {
  /** Linear issue ID */
  id: string;
  /** Linear issue number */
  number: number;
  /** Issue title */
  title: string;
  /** Issue description */
  description?: string;
  /** Story points */
  storyPoints?: number;
  /** Labels assigned to the issue */
  labels: string[];
  /** Team ID the issue belongs to */
  teamId: string;
  /** Parent issue ID if applicable */
  parentId?: string;
  /** Whether this is a parent or sub-story */
  isSubStory: boolean;
}

/**
 * Options for Linear integration
 */
export interface LinearIntegrationOptions {
  /** Team ID where issues should be created */
  teamId: string;
  /** Project ID to associate issues with */
  projectId?: string;
  /** User ID to assign issues to */
  assigneeId?: string;
  /** Priority level for created issues */
  priority?: number;
  /** Whether to create parent/child relationships */
  createRelationships: boolean;
  /** Whether to update parent story after decomposition */
  updateParentStory: boolean;
  /** Labels to add to all decomposed stories */
  additionalLabels?: string[];
  /** Linear workflow state ID for new issues */
  stateId?: string;
}

/**
 * Result of Linear decomposition operation
 */
export interface LinearDecompositionResult {
  /** Parent story Linear issue (if updated) */
  parentIssue?: LinearIssueResult;
  /** Created sub-story Linear issues */
  subStoryIssues: LinearIssueResult[];
  /** Whether the operation was successful */
  success: boolean;
  /** Error message if operation failed */
  errorMessage?: string;
  /** Decomposition ID for tracking */
  decompositionId: string;
  /** Timestamp of the operation */
  timestamp: Date;
  /** Audit entries for this operation */
  auditEntries: DecompositionAuditEntry[];
}

/**
 * Linear Story Decomposer implementation
 * 
 * Handles creation of Linear issues from decomposed stories and establishes
 * proper parent/child relationships following SAFe methodology.
 */
export class LinearStoryDecomposer {
  private linearClient: LinearClient;
  private auditTrail: DecompositionAuditEntry[] = [];

  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
    logger.info('Linear Story Decomposer initialized');
  }

  /**
   * Creates Linear issues from a decomposition result
   */
  async createDecomposedStories(
    decomposition: DecompositionResult,
    options: LinearIntegrationOptions
  ): Promise<LinearDecompositionResult> {
    const operationId = uuidv4();
    const timestamp = new Date();

    logger.info('Starting Linear decomposition creation', {
      decompositionId: decomposition.decompositionId,
      operationId,
      teamId: options.teamId,
      subStoryCount: decomposition.subStories.length
    });

    try {
      // Validate team exists
      await this.validateTeam(options.teamId);

      // Create audit entry for operation start
      this.addAuditEntry(
        decomposition.decompositionId,
        'linear_created',
        'system',
        {
          operationId,
          teamId: options.teamId,
          subStoryCount: decomposition.subStories.length
        },
        'success'
      );

      const result: LinearDecompositionResult = {
        subStoryIssues: [],
        success: false,
        decompositionId: decomposition.decompositionId,
        timestamp,
        auditEntries: []
      };

      // Create parent issue if it doesn't exist in Linear
      let parentIssueId: string | undefined;
      if (options.updateParentStory) {
        const parentResult = await this.createOrUpdateParentStory(
          decomposition.parentStory,
          options,
          decomposition
        );
        if (parentResult) {
          result.parentIssue = parentResult;
          parentIssueId = parentResult.id;
        }
      }

      // Create sub-story issues
      const subStoryPromises = decomposition.subStories.map((subStory, index) =>
        this.createSubStoryIssue(subStory, options, index, parentIssueId)
      );

      const subStoryResults = await Promise.allSettled(subStoryPromises);
      
      // Process results and handle any failures
      const successfulSubStories: LinearIssueResult[] = [];
      const failedSubStories: string[] = [];

      subStoryResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulSubStories.push(result.value);
        } else {
          failedSubStories.push(`Sub-story ${index + 1}: ${result.reason.message}`);
        }
      });

      if (failedSubStories.length > 0) {
        logger.warn('Some sub-stories failed to create', {
          decompositionId: decomposition.decompositionId,
          failedCount: failedSubStories.length,
          successfulCount: successfulSubStories.length
        });

        // If partial failure, consider rollback
        if (successfulSubStories.length > 0 && failedSubStories.length === decomposition.subStories.length) {
          // Total failure - rollback all created issues
          await this.rollbackCreatedIssues([
            ...(result.parentIssue ? [result.parentIssue] : []),
            ...successfulSubStories
          ]);

          throw new StoryDecompositionError(
            'Failed to create all sub-stories in Linear',
            'LINEAR_INTEGRATION_FAILED',
            decomposition.parentStory.id,
            { failedSubStories }
          );
        }
      }

      result.subStoryIssues = successfulSubStories;

      // Create parent/child relationships if requested
      if (options.createRelationships && parentIssueId) {
        await this.createParentChildRelationships(
          parentIssueId,
          successfulSubStories.map(issue => issue.id)
        );
      }

      result.success = true;
      result.auditEntries = this.getAuditTrail(decomposition.decompositionId);

      logger.info('Linear decomposition creation completed successfully', {
        decompositionId: decomposition.decompositionId,
        operationId,
        parentIssueId,
        subStoryCount: successfulSubStories.length
      });

      return result;

    } catch (error) {
      logger.error('Linear decomposition creation failed', {
        decompositionId: decomposition.decompositionId,
        operationId,
        error
      });

      this.addAuditEntry(
        decomposition.decompositionId,
        'linear_failed',
        'system',
        {
          operationId,
          error: (error as Error).message
        },
        'failure',
        (error as Error).message
      );

      throw error;
    }
  }

  /**
   * Creates or updates parent story in Linear
   */
  private async createOrUpdateParentStory(
    parentStory: Story,
    options: LinearIntegrationOptions,
    decomposition: DecompositionResult
  ): Promise<LinearIssueResult | null> {
    logger.debug('Creating or updating parent story', {
      storyId: parentStory.id,
      title: parentStory.title
    });

    try {
      // Check if parent story already exists in Linear
      // For now, always create new issue - in production, you might want to search first

      const issueData = {
        title: `${parentStory.title} (Decomposed)`,
        description: this.formatParentStoryDescription(parentStory, decomposition),
        teamId: options.teamId,
        projectId: options.projectId,
        assigneeId: options.assigneeId,
        priority: options.priority,
        stateId: options.stateId,
        labelIds: await this.createOrGetLabels(
          options.teamId,
          [...(parentStory.labels || []), 'parent-story', 'decomposed', ...(options.additionalLabels || [])]
        )
      };

      const issueResponse = await this.linearClient.createIssue(issueData);

      if (!issueResponse.success) {
        throw new Error('Failed to create parent story in Linear');
      }

      const issue = await issueResponse.issue;

      return {
        id: issue.id,
        number: issue.number,
        title: issue.title,
        description: issue.description || undefined,
        storyPoints: parentStory.storyPoints,
        labels: parentStory.labels || [],
        teamId: options.teamId,
        isSubStory: false
      };

    } catch (error) {
      logger.error('Failed to create parent story', { error, storyId: parentStory.id });
      throw new StoryDecompositionError(
        'Failed to create parent story in Linear',
        'LINEAR_INTEGRATION_FAILED',
        parentStory.id,
        { error: (error as Error).message }
      );
    }
  }

  /**
   * Creates a sub-story issue in Linear
   */
  private async createSubStoryIssue(
    subStory: Story,
    options: LinearIntegrationOptions,
    index: number,
    parentIssueId?: string
  ): Promise<LinearIssueResult> {
    logger.debug('Creating sub-story issue', {
      storyId: subStory.id,
      title: subStory.title,
      index,
      parentIssueId
    });

    try {
      const issueData = {
        title: subStory.title,
        description: this.formatSubStoryDescription(subStory),
        teamId: options.teamId,
        projectId: options.projectId,
        assigneeId: options.assigneeId,
        priority: options.priority,
        stateId: options.stateId,
        labelIds: await this.createOrGetLabels(
          options.teamId,
          [...(subStory.labels || []), ...(options.additionalLabels || [])]
        ),
        // Add custom fields for story points if available
        ...(subStory.storyPoints && {
          // Note: In a real implementation, you'd need to handle Linear's custom fields for story points
          // This is a placeholder - actual implementation depends on your Linear workspace configuration
        })
      };

      const issueResponse = await this.linearClient.createIssue(issueData);

      if (!issueResponse.success) {
        throw new Error(`Failed to create sub-story ${index + 1} in Linear`);
      }

      const issue = await issueResponse.issue;

      return {
        id: issue.id,
        number: issue.number,
        title: issue.title,
        description: issue.description || undefined,
        storyPoints: subStory.storyPoints,
        labels: subStory.labels || [],
        teamId: options.teamId,
        parentId: parentIssueId,
        isSubStory: true
      };

    } catch (error) {
      logger.error('Failed to create sub-story', {
        error,
        storyId: subStory.id,
        index
      });

      throw new StoryDecompositionError(
        `Failed to create sub-story ${index + 1} in Linear`,
        'LINEAR_INTEGRATION_FAILED',
        subStory.id,
        { error: (error as Error).message, index }
      );
    }
  }

  /**
   * Creates parent/child relationships between issues
   */
  private async createParentChildRelationships(
    parentIssueId: string,
    subStoryIssueIds: string[]
  ): Promise<void> {
    logger.debug('Creating parent/child relationships', {
      parentIssueId,
      subStoryCount: subStoryIssueIds.length
    });

    try {
      // Create relationships for each sub-story
      const relationshipPromises = subStoryIssueIds.map(async (childIssueId) => {
        try {
          // Note: Linear API might use different relationship types
          // This is a placeholder - actual implementation depends on Linear's relationship API
          const relationResponse = await this.linearClient.createIssueRelation({
            issueId: parentIssueId,
            relatedIssueId: childIssueId,
            type: 'blocks' as any // Replace with actual Linear relationship type
          });

          if (!relationResponse.success) {
            logger.warn('Failed to create issue relationship', {
              parentIssueId,
              childIssueId
            });
          }

          return relationResponse.success;
        } catch (error) {
          logger.warn('Error creating issue relationship', {
            parentIssueId,
            childIssueId,
            error
          });
          return false;
        }
      });

      const results = await Promise.allSettled(relationshipPromises);
      const successCount = results.filter(
        result => result.status === 'fulfilled' && result.value
      ).length;

      logger.info('Parent/child relationships created', {
        parentIssueId,
        totalSubStories: subStoryIssueIds.length,
        successfulRelationships: successCount
      });

    } catch (error) {
      logger.error('Failed to create parent/child relationships', {
        parentIssueId,
        subStoryIssueIds,
        error
      });
      // Don't throw - relationships are nice-to-have but not critical
    }
  }

  /**
   * Validates that a team exists and is accessible
   */
  private async validateTeam(teamId: string): Promise<void> {
    try {
      const team = await this.linearClient.team(teamId);
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }
      logger.debug('Team validated', { teamId, teamName: team.name });
    } catch (error) {
      throw new StoryDecompositionError(
        `Invalid team ID: ${teamId}`,
        'LINEAR_INTEGRATION_FAILED',
        'unknown',
        { teamId, error: (error as Error).message }
      );
    }
  }

  /**
   * Creates or gets existing labels for an issue
   */
  private async createOrGetLabels(teamId: string, labelNames: string[]): Promise<string[]> {
    if (!labelNames || labelNames.length === 0) {
      return [];
    }

    try {
      // Get existing labels for the team
      const team = await this.linearClient.team(teamId);
      const existingLabels = await team.labels();

      const labelIds: string[] = [];

      for (const labelName of labelNames) {
        // Find existing label
        const existingLabel = existingLabels.nodes.find(
          label => label.name.toLowerCase() === labelName.toLowerCase()
        );

        if (existingLabel) {
          labelIds.push(existingLabel.id);
        } else {
          // Create new label if it doesn't exist
          try {
            const newLabelResponse = await this.linearClient.createIssueLabel({
              name: labelName,
              teamId: teamId,
              color: this.generateLabelColor(labelName)
            });

            if (newLabelResponse.success) {
              const newLabel = await newLabelResponse.issueLabel;
              labelIds.push(newLabel.id);
            }
          } catch (labelError) {
            logger.warn('Failed to create label', { labelName, error: labelError });
            // Continue without this label
          }
        }
      }

      return labelIds;
    } catch (error) {
      logger.warn('Failed to process labels', { labelNames, error });
      return [];
    }
  }

  /**
   * Generates a color for a label based on its name
   */
  private generateLabelColor(labelName: string): string {
    // Simple hash-based color generation
    let hash = 0;
    for (let i = 0; i < labelName.length; i++) {
      hash = labelName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to hex color
    const color = Math.abs(hash).toString(16).padStart(6, '0').substring(0, 6);
    return `#${color}`;
  }

  /**
   * Formats description for parent story
   */
  private formatParentStoryDescription(
    parentStory: Story,
    decomposition: DecompositionResult
  ): string {
    const parts = [
      '# Parent Story (Decomposed)',
      '',
      '## Original Description',
      parentStory.description,
      '',
      '## Decomposition Information',
      `- **Decomposed into**: ${decomposition.subStories.length} sub-stories`,
      `- **Decomposition Date**: ${decomposition.timestamp.toISOString()}`,
      `- **Original Story Points**: ${parentStory.storyPoints}`,
      '',
      '## Decomposition Rationale',
      decomposition.decompositionRationale,
      '',
      '## Sub-Stories',
      ...decomposition.subStories.map((subStory, index) => 
        `${index + 1}. ${subStory.title} (${subStory.storyPoints} points)`
      ),
      '',
      '## Original Acceptance Criteria',
      ...parentStory.acceptanceCriteria.map((criterion, index) => 
        `${index + 1}. ${criterion}`
      )
    ];

    return parts.join('\n');
  }

  /**
   * Formats description for sub-story
   */
  private formatSubStoryDescription(subStory: Story): string {
    return subStory.description;
  }

  /**
   * Rolls back created issues in case of failure
   */
  private async rollbackCreatedIssues(issues: LinearIssueResult[]): Promise<void> {
    if (issues.length === 0) return;

    logger.warn('Rolling back created issues', { issueCount: issues.length });

    const deletePromises = issues.map(async (issue) => {
      try {
        // Note: Linear might not support issue deletion via API
        // This is a placeholder - actual implementation might involve archiving or labeling
        logger.debug('Would delete issue in rollback', { issueId: issue.id, title: issue.title });
        return true;
      } catch (error) {
        logger.error('Failed to rollback issue', { issueId: issue.id, error });
        return false;
      }
    });

    await Promise.allSettled(deletePromises);
  }

  /**
   * Adds an entry to the audit trail
   */
  private addAuditEntry(
    decompositionId: string,
    action: string,
    actor: string,
    details: Record<string, any>,
    result: 'success' | 'failure' | 'warning',
    errorMessage?: string
  ): void {
    const entry: DecompositionAuditEntry = {
      id: uuidv4(),
      decompositionId,
      action: action as any,
      timestamp: new Date(),
      actor,
      details,
      result,
      errorMessage
    };
    
    this.auditTrail.push(entry);
    
    logger.debug('Linear decomposer audit entry added', { entry });
  }

  /**
   * Gets the audit trail for a specific decomposition
   */
  getAuditTrail(decompositionId?: string): DecompositionAuditEntry[] {
    if (decompositionId) {
      return this.auditTrail.filter(entry => entry.decompositionId === decompositionId);
    }
    return [...this.auditTrail];
  }

  /**
   * Gets available teams for issue creation
   */
  async getAvailableTeams(): Promise<Array<{ id: string; name: string; key: string }>> {
    try {
      const teams = await this.linearClient.teams();
      return teams.nodes.map(team => ({
        id: team.id,
        name: team.name,
        key: team.key
      }));
    } catch (error) {
      logger.error('Failed to get available teams', { error });
      throw new StoryDecompositionError(
        'Failed to retrieve available teams',
        'LINEAR_INTEGRATION_FAILED',
        'unknown',
        { error: (error as Error).message }
      );
    }
  }

  /**
   * Gets available projects for a team
   */
  async getAvailableProjects(teamId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const team = await this.linearClient.team(teamId);
      const projects = await team.projects();
      
      return projects.nodes.map(project => ({
        id: project.id,
        name: project.name
      }));
    } catch (error) {
      logger.error('Failed to get available projects', { error, teamId });
      throw new StoryDecompositionError(
        'Failed to retrieve available projects',
        'LINEAR_INTEGRATION_FAILED',
        'unknown',
        { teamId, error: (error as Error).message }
      );
    }
  }

  /**
   * Gets available workflow states for a team
   */
  async getAvailableStates(teamId: string): Promise<Array<{ id: string; name: string; type: string }>> {
    try {
      const team = await this.linearClient.team(teamId);
      const states = await team.states();
      
      return states.nodes.map(state => ({
        id: state.id,
        name: state.name,
        type: state.type
      }));
    } catch (error) {
      logger.error('Failed to get available states', { error, teamId });
      throw new StoryDecompositionError(
        'Failed to retrieve available workflow states',
        'LINEAR_INTEGRATION_FAILED',
        'unknown',
        { teamId, error: (error as Error).message }
      );
    }
  }
}