/**
 * Issue updater for Linear issues
 * 
 * This module provides functions to update existing issues in Linear.
 * It handles merging of changes and conflict resolution.
 */

import { LinearClient, Issue, IssueUpdateInput } from '@linear/sdk';
import { Epic, Feature, Story, Enabler } from '../planning/models';
import * as logger from '../utils/logger';
import { RateLimiter } from './rate-limiter';
import { handleLinearError, retryWithBackoff } from './error-handler';
import { mapPriorityToLinear, mapStoryPointsToEstimate } from './issue-mapper';

/**
 * Linear issue updater
 */
export class LinearIssueUpdater {
  private linearClient: LinearClient;
  private rateLimiter: RateLimiter;

  /**
   * Creates a new Linear issue updater
   * 
   * @param accessToken Linear API access token
   */
  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Updates an epic in Linear
   * 
   * @param epicId The Linear epic ID
   * @param epic The epic data
   */
  async updateEpic(epicId: string, epic: Epic): Promise<void> {
    try {
      // Get the current issue
      const existingIssue = await this.linearClient.issue(epicId);
      
      if (!existingIssue) {
        throw new Error(`Epic ${epicId} not found`);
      }
      
      // Prepare update data
      const updateData: IssueUpdateInput = {
        title: `[EPIC] ${epic.title}`,
        description: epic.description,
        priority: epic.attributes?.priority ? mapPriorityToLinear(epic.attributes.priority) : undefined
      };
      
      // Resolve any conflicts
      const resolvedData = await this.resolveConflicts(existingIssue, updateData);
      
      // Update the issue
      await this.updateIssue(epicId, resolvedData);
      
      logger.info('Updated epic', { epicId, title: epic.title });
    } catch (error) {
      logger.error('Error updating epic', { error, epicId, epicTitle: epic.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Updates a feature in Linear
   * 
   * @param featureId The Linear feature ID
   * @param feature The feature data
   */
  async updateFeature(featureId: string, feature: Feature): Promise<void> {
    try {
      // Get the current issue
      const existingIssue = await this.linearClient.issue(featureId);
      
      if (!existingIssue) {
        throw new Error(`Feature ${featureId} not found`);
      }
      
      // Prepare update data
      const updateData: IssueUpdateInput = {
        title: `[FEATURE] ${feature.title}`,
        description: feature.description,
        priority: feature.attributes?.priority ? mapPriorityToLinear(feature.attributes.priority) : undefined,
        estimate: mapStoryPointsToEstimate(feature.storyPoints),
        ...(feature.epicId ? { parentId: feature.epicId } : {})
      };
      
      // Resolve any conflicts
      const resolvedData = await this.resolveConflicts(existingIssue, updateData);
      
      // Update the issue
      await this.updateIssue(featureId, resolvedData);
      
      logger.info('Updated feature', { featureId, title: feature.title });
    } catch (error) {
      logger.error('Error updating feature', { error, featureId, featureTitle: feature.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Updates a story in Linear
   * 
   * @param storyId The Linear story ID
   * @param story The story data
   */
  async updateStory(storyId: string, story: Story): Promise<void> {
    try {
      // Get the current issue
      const existingIssue = await this.linearClient.issue(storyId);
      
      if (!existingIssue) {
        throw new Error(`Story ${storyId} not found`);
      }
      
      // Format acceptance criteria if present
      let description = story.description;
      if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
        description += '\n\n## Acceptance Criteria\n';
        story.acceptanceCriteria.forEach(criteria => {
          description += `- [ ] ${criteria}\n`;
        });
      }
      
      // Prepare update data
      const updateData: IssueUpdateInput = {
        title: story.title,
        description,
        priority: story.attributes?.priority ? mapPriorityToLinear(story.attributes.priority) : undefined,
        estimate: mapStoryPointsToEstimate(story.storyPoints),
        ...(story.featureId ? { parentId: story.featureId } : {})
      };
      
      // Resolve any conflicts
      const resolvedData = await this.resolveConflicts(existingIssue, updateData);
      
      // Update the issue
      await this.updateIssue(storyId, resolvedData);
      
      logger.info('Updated story', { storyId, title: story.title });
    } catch (error) {
      logger.error('Error updating story', { error, storyId, storyTitle: story.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Updates an enabler in Linear
   * 
   * @param enablerId The Linear enabler ID
   * @param enabler The enabler data
   */
  async updateEnabler(enablerId: string, enabler: Enabler): Promise<void> {
    try {
      // Get the current issue
      const existingIssue = await this.linearClient.issue(enablerId);
      
      if (!existingIssue) {
        throw new Error(`Enabler ${enablerId} not found`);
      }
      
      // Prepare update data
      const updateData: IssueUpdateInput = {
        title: `[ENABLER] ${enabler.title}`,
        description: enabler.description,
        priority: enabler.attributes?.priority ? mapPriorityToLinear(enabler.attributes.priority) : undefined,
        estimate: mapStoryPointsToEstimate(enabler.storyPoints),
        ...(enabler.featureId ? { parentId: enabler.featureId } : {})
      };
      
      // Resolve any conflicts
      const resolvedData = await this.resolveConflicts(existingIssue, updateData);
      
      // Update the issue
      await this.updateIssue(enablerId, resolvedData);
      
      logger.info('Updated enabler', { enablerId, title: enabler.title });
    } catch (error) {
      logger.error('Error updating enabler', { error, enablerId, enablerTitle: enabler.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Resolves conflicts between existing issue and new data
   * 
   * @param existingIssue The existing issue
   * @param newData The new data
   * @returns The resolved data
   */
  async resolveConflicts(existingIssue: Issue, newData: IssueUpdateInput): Promise<IssueUpdateInput> {
    // This is a simple implementation that prioritizes new data
    // A more sophisticated implementation would merge changes intelligently
    
    const resolvedData: IssueUpdateInput = { ...newData };
    
    // Don't update fields that haven't changed
    if (resolvedData.title && resolvedData.title === existingIssue.title) {
      delete resolvedData.title;
    }
    
    if (resolvedData.description && resolvedData.description === existingIssue.description) {
      delete resolvedData.description;
    }
    
    if (resolvedData.priority && resolvedData.priority === existingIssue.priority) {
      delete resolvedData.priority;
    }
    
    if (resolvedData.estimate && resolvedData.estimate === existingIssue.estimate) {
      delete resolvedData.estimate;
    }
    
    if (resolvedData.parentId && resolvedData.parentId === existingIssue.parent?.id) {
      delete resolvedData.parentId;
    }
    
    return resolvedData;
  }

  /**
   * Updates an issue in Linear
   * 
   * @param issueId The issue ID
   * @param data The update data
   */
  private async updateIssue(issueId: string, data: IssueUpdateInput): Promise<void> {
    // Skip update if there's nothing to update
    if (Object.keys(data).length === 0) {
      logger.info('No changes to update for issue', { issueId });
      return;
    }
    
    try {
      await this.rateLimiter.waitForRequest();
      
      await retryWithBackoff(async () => {
        const response = await this.linearClient.issueUpdate(issueId, data);
        this.rateLimiter.recordRequest();
        
        if (!response.success) {
          throw new Error(`Failed to update issue ${issueId}: ${response.error}`);
        }
        
        return response;
      });
    } catch (error) {
      logger.error('Error updating issue', { error, issueId, data });
      throw handleLinearError(error);
    }
  }
}
