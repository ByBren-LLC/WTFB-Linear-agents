/**
 * Issue finder for Linear issues
 * 
 * This module provides functions to find existing issues in Linear.
 * It uses titles, identifiers, or other attributes to match issues.
 */

import { LinearClient, Issue } from '@linear/sdk';
import { Epic, Feature, Story, Enabler } from '../planning/models';
import * as logger from '../utils/logger';
import { RateLimiter } from './rate-limiter';
import { handleLinearError, retryWithBackoff } from './error-handler';

/**
 * Linear issue finder
 */
export class LinearIssueFinder {
  private linearClient: LinearClient;
  private teamId: string;
  private rateLimiter: RateLimiter;

  /**
   * Creates a new Linear issue finder
   * 
   * @param accessToken Linear API access token
   * @param teamId Linear team ID
   */
  constructor(accessToken: string, teamId: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.teamId = teamId;
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Finds an epic in Linear
   * 
   * @param epic The epic to find
   * @returns The matching issue or null if not found
   */
  async findEpic(epic: Epic): Promise<Issue | null> {
    try {
      // First try to find by ID if it's a Linear ID
      if (epic.id && epic.id.startsWith('LIN-')) {
        const issue = await this.findIssueByIdentifier(epic.id);
        if (issue) {
          return issue;
        }
      }

      // Try to find by title
      const title = `[EPIC] ${epic.title}`;
      const issue = await this.findIssueByTitle(title);
      
      if (issue) {
        logger.info('Found existing epic', { epicId: issue.id, title });
      } else {
        logger.info('Epic not found', { title });
      }
      
      return issue;
    } catch (error) {
      logger.error('Error finding epic', { error, epicTitle: epic.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Finds a feature in Linear
   * 
   * @param feature The feature to find
   * @returns The matching issue or null if not found
   */
  async findFeature(feature: Feature): Promise<Issue | null> {
    try {
      // First try to find by ID if it's a Linear ID
      if (feature.id && feature.id.startsWith('LIN-')) {
        const issue = await this.findIssueByIdentifier(feature.id);
        if (issue) {
          return issue;
        }
      }

      // Try to find by title
      const title = `[FEATURE] ${feature.title}`;
      const issue = await this.findIssueByTitle(title);
      
      if (issue) {
        logger.info('Found existing feature', { featureId: issue.id, title });
      } else {
        logger.info('Feature not found', { title });
      }
      
      return issue;
    } catch (error) {
      logger.error('Error finding feature', { error, featureTitle: feature.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Finds a story in Linear
   * 
   * @param story The story to find
   * @returns The matching issue or null if not found
   */
  async findStory(story: Story): Promise<Issue | null> {
    try {
      // First try to find by ID if it's a Linear ID
      if (story.id && story.id.startsWith('LIN-')) {
        const issue = await this.findIssueByIdentifier(story.id);
        if (issue) {
          return issue;
        }
      }

      // Try to find by title
      const issue = await this.findIssueByTitle(story.title);
      
      if (issue) {
        logger.info('Found existing story', { storyId: issue.id, title: story.title });
      } else {
        logger.info('Story not found', { title: story.title });
      }
      
      return issue;
    } catch (error) {
      logger.error('Error finding story', { error, storyTitle: story.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Finds an enabler in Linear
   * 
   * @param enabler The enabler to find
   * @returns The matching issue or null if not found
   */
  async findEnabler(enabler: Enabler): Promise<Issue | null> {
    try {
      // First try to find by ID if it's a Linear ID
      if (enabler.id && enabler.id.startsWith('LIN-')) {
        const issue = await this.findIssueByIdentifier(enabler.id);
        if (issue) {
          return issue;
        }
      }

      // Try to find by title
      const title = `[ENABLER] ${enabler.title}`;
      const issue = await this.findIssueByTitle(title);
      
      if (issue) {
        logger.info('Found existing enabler', { enablerId: issue.id, title });
      } else {
        logger.info('Enabler not found', { title });
      }
      
      return issue;
    } catch (error) {
      logger.error('Error finding enabler', { error, enablerTitle: enabler.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Finds an issue by title
   * 
   * @param title The title to search for
   * @param labelIds Optional label IDs to filter by
   * @returns The matching issue or null if not found
   */
  async findIssueByTitle(title: string, labelIds?: string[]): Promise<Issue | null> {
    try {
      await this.rateLimiter.waitForRequest();
      
      return await retryWithBackoff(async () => {
        const filter: any = {
          team: { id: { eq: this.teamId } },
          title: { eq: title }
        };
        
        if (labelIds && labelIds.length > 0) {
          filter.labels = { id: { in: labelIds } };
        }
        
        const response = await this.linearClient.issues({
          filter,
          first: 1
        });
        
        this.rateLimiter.recordRequest();
        
        if (response.nodes.length === 0) {
          return null;
        }
        
        return response.nodes[0];
      });
    } catch (error) {
      logger.error('Error finding issue by title', { error, title });
      throw handleLinearError(error);
    }
  }

  /**
   * Finds an issue by identifier
   * 
   * @param identifier The issue identifier (e.g., LIN-123)
   * @returns The matching issue or null if not found
   */
  async findIssueByIdentifier(identifier: string): Promise<Issue | null> {
    try {
      await this.rateLimiter.waitForRequest();
      
      return await retryWithBackoff(async () => {
        const response = await this.linearClient.issue(identifier);
        this.rateLimiter.recordRequest();
        
        if (!response) {
          return null;
        }
        
        return response;
      });
    } catch (error) {
      // If the issue is not found, return null instead of throwing an error
      if (error.message && error.message.includes('not found')) {
        return null;
      }
      
      logger.error('Error finding issue by identifier', { error, identifier });
      throw handleLinearError(error);
    }
  }
}
