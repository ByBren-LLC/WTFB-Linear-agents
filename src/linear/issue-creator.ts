/**
 * Issue creator for Linear issues
 * 
 * This module provides functions to create issues in Linear from planning information.
 * It handles creation of epics, features, stories, and enablers.
 */

import { LinearClient } from '@linear/sdk';
import { PlanningDocument, Epic, Feature, Story, Enabler } from '../planning/models';
import { SAFeLinearImplementation, EnablerType } from '../safe/safe_linear_implementation';
import { LinearIssueFinder } from './issue-finder';
import { LinearIssueUpdater } from './issue-updater';
import { mapEpicToIssueInput, mapFeatureToIssueInput, mapStoryToIssueInput, mapEnablerToIssueInput, mapEnablerTypeToSAFe } from './issue-mapper';
import { RateLimiter } from './rate-limiter';
import { handleLinearError, retryWithBackoff } from './error-handler';
import * as logger from '../utils/logger';

/**
 * Linear issue creator
 */
export class LinearIssueCreator {
  private linearClient: LinearClient;
  private safeImplementation: SAFeLinearImplementation;
  private issueFinder: LinearIssueFinder;
  private issueUpdater: LinearIssueUpdater;
  private teamId: string;
  private rateLimiter: RateLimiter;

  /**
   * Creates a new Linear issue creator
   * 
   * @param accessToken Linear API access token
   * @param teamId Linear team ID
   */
  constructor(accessToken: string, teamId: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.safeImplementation = new SAFeLinearImplementation(accessToken);
    this.issueFinder = new LinearIssueFinder(accessToken, teamId);
    this.issueUpdater = new LinearIssueUpdater(accessToken);
    this.teamId = teamId;
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Creates issues from a planning document
   * 
   * @param planningDocument The planning document
   * @returns Record of created issue IDs
   */
  async createIssuesFromPlanningDocument(planningDocument: PlanningDocument): Promise<{
    epics: Record<string, string>;
    features: Record<string, string>;
    stories: Record<string, string>;
    enablers: Record<string, string>;
  }> {
    const result = {
      epics: {} as Record<string, string>,
      features: {} as Record<string, string>,
      stories: {} as Record<string, string>,
      enablers: {} as Record<string, string>
    };

    try {
      logger.info('Creating issues from planning document', { 
        documentId: planningDocument.id,
        title: planningDocument.title
      });

      // Create epics
      for (const epic of planningDocument.epics) {
        const epicId = await this.createOrUpdateEpic(epic);
        if (epicId) {
          result.epics[epic.id] = epicId;

          // Create features for this epic
          if (epic.features && epic.features.length > 0) {
            for (const feature of epic.features) {
              const featureId = await this.createOrUpdateFeature(feature, epicId);
              if (featureId) {
                result.features[feature.id] = featureId;

                // Create stories for this feature
                if (feature.stories && feature.stories.length > 0) {
                  for (const story of feature.stories) {
                    const storyId = await this.createOrUpdateStory(story, featureId);
                    if (storyId) {
                      result.stories[story.id] = storyId;
                    }
                  }
                }

                // Create enablers for this feature
                if (feature.enablers && feature.enablers.length > 0) {
                  for (const enabler of feature.enablers) {
                    const enablerId = await this.createOrUpdateEnabler(enabler, featureId);
                    if (enablerId) {
                      result.enablers[enabler.id] = enablerId;
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Create standalone features
      if (planningDocument.features && planningDocument.features.length > 0) {
        for (const feature of planningDocument.features) {
          const featureId = await this.createOrUpdateFeature(feature);
          if (featureId) {
            result.features[feature.id] = featureId;

            // Create stories for this feature
            if (feature.stories && feature.stories.length > 0) {
              for (const story of feature.stories) {
                const storyId = await this.createOrUpdateStory(story, featureId);
                if (storyId) {
                  result.stories[story.id] = storyId;
                }
              }
            }

            // Create enablers for this feature
            if (feature.enablers && feature.enablers.length > 0) {
              for (const enabler of feature.enablers) {
                const enablerId = await this.createOrUpdateEnabler(enabler, featureId);
                if (enablerId) {
                  result.enablers[enabler.id] = enablerId;
                }
              }
            }
          }
        }
      }

      // Create standalone stories
      if (planningDocument.stories && planningDocument.stories.length > 0) {
        for (const story of planningDocument.stories) {
          const storyId = await this.createOrUpdateStory(story);
          if (storyId) {
            result.stories[story.id] = storyId;
          }
        }
      }

      // Create standalone enablers
      if (planningDocument.enablers && planningDocument.enablers.length > 0) {
        for (const enabler of planningDocument.enablers) {
          const enablerId = await this.createOrUpdateEnabler(enabler);
          if (enablerId) {
            result.enablers[enabler.id] = enablerId;
          }
        }
      }

      logger.info('Finished creating issues from planning document', {
        documentId: planningDocument.id,
        epicCount: Object.keys(result.epics).length,
        featureCount: Object.keys(result.features).length,
        storyCount: Object.keys(result.stories).length,
        enablerCount: Object.keys(result.enablers).length
      });

      return result;
    } catch (error) {
      logger.error('Error creating issues from planning document', {
        error,
        documentId: planningDocument.id
      });
      throw handleLinearError(error);
    }
  }

  /**
   * Creates or updates an epic
   * 
   * @param epic The epic to create or update
   * @returns The Linear epic ID
   */
  async createOrUpdateEpic(epic: Epic): Promise<string> {
    try {
      // Check if the epic already exists
      const existingEpic = await this.issueFinder.findEpic(epic);
      
      if (existingEpic) {
        // Update the existing epic
        await this.issueUpdater.updateEpic(existingEpic.id, epic);
        return existingEpic.id;
      }
      
      // Create a new epic
      return await this.createEpic(epic);
    } catch (error) {
      logger.error('Error creating or updating epic', { error, epicTitle: epic.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Creates a new epic
   * 
   * @param epic The epic to create
   * @returns The Linear epic ID
   */
  async createEpic(epic: Epic): Promise<string> {
    try {
      // Get Epic label ID
      const epicLabelId = await this.getSafeLabelId('Epic');
      
      // Map epic to issue input
      const issueInput = await mapEpicToIssueInput(epic, this.teamId, [epicLabelId]);
      
      // Create the epic
      await this.rateLimiter.waitForRequest();
      
      const response = await retryWithBackoff(async () => {
        const result = await this.linearClient.issueCreate(issueInput);
        this.rateLimiter.recordRequest();
        
        if (!result.success || !result.issue) {
          throw new Error(`Failed to create epic: ${result.error}`);
        }
        
        return result;
      });
      
      logger.info('Created epic', { epicId: response.issue.id, title: epic.title });
      
      return response.issue.id;
    } catch (error) {
      logger.error('Error creating epic', { error, epicTitle: epic.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Creates or updates a feature
   * 
   * @param feature The feature to create or update
   * @param epicId The parent epic ID (optional)
   * @returns The Linear feature ID
   */
  async createOrUpdateFeature(feature: Feature, epicId?: string): Promise<string> {
    try {
      // Check if the feature already exists
      const existingFeature = await this.issueFinder.findFeature(feature);
      
      if (existingFeature) {
        // Update the existing feature with the epic ID
        if (epicId) {
          feature.epicId = epicId;
        }
        
        await this.issueUpdater.updateFeature(existingFeature.id, feature);
        return existingFeature.id;
      }
      
      // Create a new feature
      return await this.createFeature(feature, epicId);
    } catch (error) {
      logger.error('Error creating or updating feature', { error, featureTitle: feature.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Creates a new feature
   * 
   * @param feature The feature to create
   * @param epicId The parent epic ID (optional)
   * @returns The Linear feature ID
   */
  async createFeature(feature: Feature, epicId?: string): Promise<string> {
    try {
      // Get Feature label ID
      const featureLabelId = await this.getSafeLabelId('Feature');
      
      // Get Business/Enabler label ID
      const categoryLabelId = await this.getSafeLabelId(
        feature.isBusinessFeature === false ? 'Enabler' : 'Business'
      );
      
      // Map feature to issue input
      const issueInput = await mapFeatureToIssueInput(
        feature, 
        this.teamId, 
        epicId,
        [featureLabelId, categoryLabelId]
      );
      
      // Create the feature
      await this.rateLimiter.waitForRequest();
      
      const response = await retryWithBackoff(async () => {
        const result = await this.linearClient.issueCreate(issueInput);
        this.rateLimiter.recordRequest();
        
        if (!result.success || !result.issue) {
          throw new Error(`Failed to create feature: ${result.error}`);
        }
        
        return result;
      });
      
      logger.info('Created feature', { 
        featureId: response.issue.id, 
        epicId,
        title: feature.title 
      });
      
      return response.issue.id;
    } catch (error) {
      logger.error('Error creating feature', { error, epicId, featureTitle: feature.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Creates or updates a story
   * 
   * @param story The story to create or update
   * @param featureId The parent feature ID (optional)
   * @returns The Linear story ID
   */
  async createOrUpdateStory(story: Story, featureId?: string): Promise<string> {
    try {
      // Check if the story already exists
      const existingStory = await this.issueFinder.findStory(story);
      
      if (existingStory) {
        // Update the existing story with the feature ID
        if (featureId) {
          story.featureId = featureId;
        }
        
        await this.issueUpdater.updateStory(existingStory.id, story);
        return existingStory.id;
      }
      
      // Create a new story
      return await this.createStory(story, featureId);
    } catch (error) {
      logger.error('Error creating or updating story', { error, storyTitle: story.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Creates a new story
   * 
   * @param story The story to create
   * @param featureId The parent feature ID (optional)
   * @returns The Linear story ID
   */
  async createStory(story: Story, featureId?: string): Promise<string> {
    try {
      // Map story to issue input
      const issueInput = await mapStoryToIssueInput(story, this.teamId, featureId);
      
      // Create the story
      await this.rateLimiter.waitForRequest();
      
      const response = await retryWithBackoff(async () => {
        const result = await this.linearClient.issueCreate(issueInput);
        this.rateLimiter.recordRequest();
        
        if (!result.success || !result.issue) {
          throw new Error(`Failed to create story: ${result.error}`);
        }
        
        return result;
      });
      
      logger.info('Created story', { 
        storyId: response.issue.id, 
        featureId,
        title: story.title 
      });
      
      return response.issue.id;
    } catch (error) {
      logger.error('Error creating story', { error, featureId, storyTitle: story.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Creates or updates an enabler
   * 
   * @param enabler The enabler to create or update
   * @param featureId The parent feature ID (optional)
   * @returns The Linear enabler ID
   */
  async createOrUpdateEnabler(enabler: Enabler, featureId?: string): Promise<string> {
    try {
      // Check if the enabler already exists
      const existingEnabler = await this.issueFinder.findEnabler(enabler);
      
      if (existingEnabler) {
        // Update the existing enabler with the feature ID
        if (featureId) {
          enabler.featureId = featureId;
        }
        
        await this.issueUpdater.updateEnabler(existingEnabler.id, enabler);
        return existingEnabler.id;
      }
      
      // Create a new enabler
      return await this.createEnabler(enabler, featureId);
    } catch (error) {
      logger.error('Error creating or updating enabler', { error, enablerTitle: enabler.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Creates a new enabler
   * 
   * @param enabler The enabler to create
   * @param featureId The parent feature ID (optional)
   * @returns The Linear enabler ID
   */
  async createEnabler(enabler: Enabler, featureId?: string): Promise<string> {
    try {
      // Get Enabler label ID
      const enablerLabelId = await this.getSafeLabelId('Enabler');
      
      // Get Enabler Type label ID
      const enablerType = mapEnablerTypeToSAFe(enabler.enablerType);
      const typeLabelId = await this.getSafeLabelId(enablerType);
      
      // Map enabler to issue input
      const issueInput = await mapEnablerToIssueInput(
        enabler, 
        this.teamId, 
        featureId,
        [enablerLabelId, typeLabelId]
      );
      
      // Create the enabler
      await this.rateLimiter.waitForRequest();
      
      const response = await retryWithBackoff(async () => {
        const result = await this.linearClient.issueCreate(issueInput);
        this.rateLimiter.recordRequest();
        
        if (!result.success || !result.issue) {
          throw new Error(`Failed to create enabler: ${result.error}`);
        }
        
        return result;
      });
      
      logger.info('Created enabler', { 
        enablerId: response.issue.id, 
        featureId,
        title: enabler.title 
      });
      
      return response.issue.id;
    } catch (error) {
      logger.error('Error creating enabler', { error, featureId, enablerTitle: enabler.title });
      throw handleLinearError(error);
    }
  }

  /**
   * Gets a SAFe label ID
   * 
   * @param labelName The label name
   * @returns The label ID
   */
  private async getSafeLabelId(labelName: string): Promise<string> {
    try {
      // Get all labels
      await this.rateLimiter.waitForRequest();
      
      const labels = await retryWithBackoff(async () => {
        const response = await this.linearClient.issueLabels();
        this.rateLimiter.recordRequest();
        return response;
      });
      
      // Find the label
      const label = labels.nodes.find(label => label.name === labelName);
      
      if (label) {
        return label.id;
      }
      
      // Create the label if it doesn't exist
      const colorMap: Record<string, string> = {
        'Epic': '#F2994A',
        'Feature': '#BB87FC',
        'Enabler': '#4EA7FC',
        'Business': '#4CB782',
        'Architecture': '#0366D6',
        'Infrastructure': '#6937C5',
        'Technical Debt': '#EB5757',
        'Research': '#F2C94C'
      };
      
      const color = colorMap[labelName] || '#4EA7FC';
      
      await this.rateLimiter.waitForRequest();
      
      const response = await retryWithBackoff(async () => {
        const result = await this.linearClient.issueLabelCreate({
          name: labelName,
          color,
          teamId: this.teamId
        });
        
        this.rateLimiter.recordRequest();
        
        if (!result.success || !result.issueLabel) {
          throw new Error(`Failed to create ${labelName} label`);
        }
        
        return result;
      });
      
      return response.issueLabel.id;
    } catch (error) {
      logger.error(`Error getting ${labelName} label ID`, { error });
      throw handleLinearError(error);
    }
  }
}
