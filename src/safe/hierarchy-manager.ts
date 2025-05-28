/**
 * SAFe Hierarchy Manager
 *
 * This module provides utilities for managing the SAFe hierarchy in Linear.
 */
import { LinearClient, Issue } from '@linear/sdk';
import { PlanningDocument, Epic, Feature, Story, Enabler } from '../planning/models';
import { SAFeLinearImplementation } from './safe_linear_implementation';
import { LinearIssueFinder } from '../linear/issue-finder';
import { LinearIssueUpdater } from '../linear/issue-updater';
import * as logger from '../utils/logger';

/**
 * Utility for managing the SAFe hierarchy in Linear
 */
export class SAFeHierarchyManager {
  private linearClient: LinearClient;
  private safeImplementation: SAFeLinearImplementation;
  private issueFinder: LinearIssueFinder;
  private issueUpdater: LinearIssueUpdater;
  private teamId: string;

  /**
   * Creates a new SAFeHierarchyManager
   *
   * @param accessToken - Linear API access token
   * @param teamId - Linear team ID
   */
  constructor(accessToken: string, teamId: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.safeImplementation = new SAFeLinearImplementation(accessToken);
    this.issueFinder = new LinearIssueFinder(accessToken, teamId);
    this.issueUpdater = new LinearIssueUpdater(accessToken);
    this.teamId = teamId;
  }

  /**
   * Updates the SAFe hierarchy in Linear based on the planning document
   *
   * @param planningDocument - Planning document containing the SAFe hierarchy
   * @param existingIssues - Mapping of planning item IDs to Linear issue IDs
   */
  async updateHierarchy(
    planningDocument: PlanningDocument,
    existingIssues: {
      epics: Record<string, string>;
      features: Record<string, string>;
      stories: Record<string, string>;
      enablers: Record<string, string>;
    }
  ): Promise<void> {
    try {
      logger.info('Updating SAFe hierarchy', {
        planningDocumentId: planningDocument.id,
        epicCount: planningDocument.epics.length,
        featureCount: planningDocument.features?.length || 0,
        storyCount: planningDocument.stories?.length || 0,
        enablerCount: planningDocument.enablers?.length || 0
      });

      // Update Epic-Feature relationships
      await this.updateEpicFeatureRelationships(
        planningDocument.epics,
        planningDocument.features || [],
        existingIssues.epics,
        existingIssues.features
      );

      // Update Feature-Story relationships
      await this.updateFeatureStoryRelationships(
        planningDocument.features || [],
        planningDocument.stories || [],
        existingIssues.features,
        existingIssues.stories
      );

      // Update Feature-Enabler relationships
      await this.updateFeatureEnablerRelationships(
        planningDocument.features || [],
        planningDocument.enablers || [],
        existingIssues.features,
        existingIssues.enablers
      );

      logger.info('SAFe hierarchy updated successfully', {
        planningDocumentId: planningDocument.id
      });
    } catch (error) {
      logger.error('Error updating SAFe hierarchy', {
        error,
        planningDocumentId: planningDocument.id
      });
      throw error;
    }
  }

  /**
   * Updates the relationships between Epics and Features
   *
   * @param epics - Epics from the planning document
   * @param features - Features from the planning document
   * @param epicIds - Mapping of Epic IDs to Linear issue IDs
   * @param featureIds - Mapping of Feature IDs to Linear issue IDs
   */
  async updateEpicFeatureRelationships(
    epics: Epic[],
    features: Feature[],
    epicIds: Record<string, string>,
    featureIds: Record<string, string>
  ): Promise<void> {
    try {
      logger.info('Updating Epic-Feature relationships', {
        epicCount: epics.length,
        featureCount: features.length
      });

      // Create a map of Feature IDs to their parent Epic IDs
      const featureToEpicMap: Record<string, string> = {};

      // Populate the map from the planning document
      for (const feature of features) {
        if (feature.epicId) {
          featureToEpicMap[feature.id] = feature.epicId;
        }
      }

      // Also populate the map from the Epic's features array
      for (const epic of epics) {
        if (epic.features && epic.features.length > 0) {
          for (const feature of epic.features) {
            featureToEpicMap[feature.id] = epic.id;
          }
        }
      }

      // Update the parent-child relationships in Linear
      for (const [featureId, epicId] of Object.entries(featureToEpicMap)) {
        const linearFeatureId = featureIds[featureId];
        const linearEpicId = epicIds[epicId];

        if (!linearFeatureId || !linearEpicId) {
          logger.warn('Missing Linear ID for Epic-Feature relationship', {
            featureId,
            epicId,
            linearFeatureId,
            linearEpicId
          });
          continue;
        }

        // Get the current parent of the feature
        const feature = await this.linearClient.issue(linearFeatureId);
        const parent = await feature.parent;
        const currentParentId = parent?.id || null;

        // If the parent has changed, update it
        if (currentParentId !== linearEpicId) {
          logger.info('Updating Feature parent', {
            featureId: linearFeatureId,
            oldParentId: currentParentId,
            newParentId: linearEpicId
          });

          await this.issueUpdater.updateParent(linearFeatureId, linearEpicId);
        }
      }

      logger.info('Epic-Feature relationships updated successfully');
    } catch (error) {
      logger.error('Error updating Epic-Feature relationships', { error });
      throw error;
    }
  }

  /**
   * Updates the relationships between Features and Stories
   *
   * @param features - Features from the planning document
   * @param stories - Stories from the planning document
   * @param featureIds - Mapping of Feature IDs to Linear issue IDs
   * @param storyIds - Mapping of Story IDs to Linear issue IDs
   */
  async updateFeatureStoryRelationships(
    features: Feature[],
    stories: Story[],
    featureIds: Record<string, string>,
    storyIds: Record<string, string>
  ): Promise<void> {
    try {
      logger.info('Updating Feature-Story relationships', {
        featureCount: features.length,
        storyCount: stories.length
      });

      // Create a map of Story IDs to their parent Feature IDs
      const storyToFeatureMap: Record<string, string> = {};

      // Populate the map from the planning document
      for (const story of stories) {
        if (story.featureId) {
          storyToFeatureMap[story.id] = story.featureId;
        }
      }

      // Also populate the map from the Feature's stories array
      for (const feature of features) {
        if (feature.stories && feature.stories.length > 0) {
          for (const story of feature.stories) {
            storyToFeatureMap[story.id] = feature.id;
          }
        }
      }

      // Update the parent-child relationships in Linear
      for (const [storyId, featureId] of Object.entries(storyToFeatureMap)) {
        const linearStoryId = storyIds[storyId];
        const linearFeatureId = featureIds[featureId];

        if (!linearStoryId || !linearFeatureId) {
          logger.warn('Missing Linear ID for Feature-Story relationship', {
            storyId,
            featureId,
            linearStoryId,
            linearFeatureId
          });
          continue;
        }

        // Get the current parent of the story
        const story = await this.linearClient.issue(linearStoryId);
        const parent = await story.parent;
        const currentParentId = parent?.id || null;

        // If the parent has changed, update it
        if (currentParentId !== linearFeatureId) {
          logger.info('Updating Story parent', {
            storyId: linearStoryId,
            oldParentId: currentParentId,
            newParentId: linearFeatureId
          });

          await this.issueUpdater.updateParent(linearStoryId, linearFeatureId);
        }
      }

      logger.info('Feature-Story relationships updated successfully');
    } catch (error) {
      logger.error('Error updating Feature-Story relationships', { error });
      throw error;
    }
  }

  /**
   * Updates the relationships between Features and Enablers
   *
   * @param features - Features from the planning document
   * @param enablers - Enablers from the planning document
   * @param featureIds - Mapping of Feature IDs to Linear issue IDs
   * @param enablerIds - Mapping of Enabler IDs to Linear issue IDs
   */
  async updateFeatureEnablerRelationships(
    features: Feature[],
    enablers: Enabler[],
    featureIds: Record<string, string>,
    enablerIds: Record<string, string>
  ): Promise<void> {
    try {
      logger.info('Updating Feature-Enabler relationships', {
        featureCount: features.length,
        enablerCount: enablers.length
      });

      // Create a map of Enabler IDs to their parent Feature IDs
      const enablerToFeatureMap: Record<string, string> = {};

      // Populate the map from the planning document
      for (const enabler of enablers) {
        if (enabler.featureId) {
          enablerToFeatureMap[enabler.id] = enabler.featureId;
        }
      }

      // Also populate the map from the Feature's enablers array
      for (const feature of features) {
        if (feature.enablers && feature.enablers.length > 0) {
          for (const enabler of feature.enablers) {
            enablerToFeatureMap[enabler.id] = feature.id;
          }
        }
      }

      // Update the parent-child relationships in Linear
      for (const [enablerId, featureId] of Object.entries(enablerToFeatureMap)) {
        const linearEnablerId = enablerIds[enablerId];
        const linearFeatureId = featureIds[featureId];

        if (!linearEnablerId || !linearFeatureId) {
          logger.warn('Missing Linear ID for Feature-Enabler relationship', {
            enablerId,
            featureId,
            linearEnablerId,
            linearFeatureId
          });
          continue;
        }

        // Get the current parent of the enabler
        const enablerResponse = await this.linearClient.issue(linearEnablerId);
        const enabler = await enablerResponse;
        const parent = enabler.parent ? await enabler.parent : null;
        const currentParentId = parent?.id || null;

        // If the parent has changed, update it
        if (currentParentId !== linearFeatureId) {
          logger.info('Updating Enabler parent', {
            enablerId: linearEnablerId,
            oldParentId: currentParentId,
            newParentId: linearFeatureId
          });

          await this.issueUpdater.updateParent(linearEnablerId, linearFeatureId);
        }
      }

      logger.info('Feature-Enabler relationships updated successfully');
    } catch (error) {
      logger.error('Error updating Feature-Enabler relationships', { error });
      throw error;
    }
  }
}
