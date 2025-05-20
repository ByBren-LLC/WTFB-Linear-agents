/**
 * Planning Issue Mapper
 *
 * This module provides utilities for mapping planning data to Linear issues.
 */
import { PlanningDocument, Epic, Feature, Story, Enabler } from '../planning/models';
import { LinearIssueCreator } from './issue-creator';
import { LinearIssueFinder } from './issue-finder';
import { SAFeHierarchyManager } from '../safe/hierarchy-manager';
import * as logger from '../utils/logger';

/**
 * Result of mapping planning data to Linear issues
 */
export interface MappingResult {
  epics: Record<string, string>;
  features: Record<string, string>;
  stories: Record<string, string>;
  enablers: Record<string, string>;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  errors: Array<{ id: string; type: string; error: string }>;
}

/**
 * Utility for mapping planning data to Linear issues
 */
export class PlanningIssueMapper {
  private issueCreator: LinearIssueCreator;
  private issueFinder: LinearIssueFinder;
  private hierarchyManager: SAFeHierarchyManager;
  private teamId: string;

  /**
   * Creates a new PlanningIssueMapper
   *
   * @param accessToken - Linear API access token
   * @param teamId - Linear team ID
   * @param organizationId - Linear organization ID
   */
  constructor(accessToken: string, teamId: string, organizationId: string) {
    this.issueCreator = new LinearIssueCreator(accessToken, teamId);
    this.issueFinder = new LinearIssueFinder(accessToken, teamId);
    this.hierarchyManager = new SAFeHierarchyManager(accessToken, teamId);
    this.teamId = teamId;
  }

  /**
   * Maps planning data to Linear issues
   *
   * @param planningDocument - Planning document containing the SAFe hierarchy
   * @returns Result of the mapping process
   */
  async mapToLinear(planningDocument: PlanningDocument): Promise<MappingResult> {
    try {
      logger.info('Mapping planning data to Linear issues', {
        planningDocumentId: planningDocument.id,
        title: planningDocument.title,
        epicCount: planningDocument.epics.length,
        featureCount: planningDocument.features?.length || 0,
        storyCount: planningDocument.stories?.length || 0,
        enablerCount: planningDocument.enablers?.length || 0
      });

      const result: MappingResult = {
        epics: {},
        features: {},
        stories: {},
        enablers: {},
        createdCount: 0,
        updatedCount: 0,
        errorCount: 0,
        errors: []
      };

      // Map epics
      for (const epic of planningDocument.epics) {
        try {
          const epicIssue = await this.mapEpic(epic);
          if (epicIssue) {
            result.epics[epic.id] = epicIssue.id;
            result.updatedCount++;
          }
        } catch (error) {
          logger.error('Error mapping epic', { error, epicId: epic.id });
          result.errorCount++;
          result.errors.push({
            id: epic.id,
            type: 'epic',
            error: (error as Error).message
          });
        }
      }

      // Map features
      const features = planningDocument.features || [];
      for (const feature of features) {
        try {
          const featureIssue = await this.mapFeature(feature, result.epics);
          if (featureIssue) {
            result.features[feature.id] = featureIssue.id;
            result.updatedCount++;
          }
        } catch (error) {
          logger.error('Error mapping feature', { error, featureId: feature.id });
          result.errorCount++;
          result.errors.push({
            id: feature.id,
            type: 'feature',
            error: (error as Error).message
          });
        }
      }

      // Map stories
      const stories = planningDocument.stories || [];
      for (const story of stories) {
        try {
          const storyIssue = await this.mapStory(story, result.features);
          if (storyIssue) {
            result.stories[story.id] = storyIssue.id;
            result.updatedCount++;
          }
        } catch (error) {
          logger.error('Error mapping story', { error, storyId: story.id });
          result.errorCount++;
          result.errors.push({
            id: story.id,
            type: 'story',
            error: (error as Error).message
          });
        }
      }

      // Map enablers
      const enablers = planningDocument.enablers || [];
      for (const enabler of enablers) {
        try {
          const enablerIssue = await this.mapEnabler(enabler, result.features);
          if (enablerIssue) {
            result.enablers[enabler.id] = enablerIssue.id;
            result.updatedCount++;
          }
        } catch (error) {
          logger.error('Error mapping enabler', { error, enablerId: enabler.id });
          result.errorCount++;
          result.errors.push({
            id: enabler.id,
            type: 'enabler',
            error: (error as Error).message
          });
        }
      }

      // Update hierarchy relationships
      await this.hierarchyManager.updateHierarchy(planningDocument, result);

      logger.info('Finished mapping planning data to Linear issues', {
        planningDocumentId: planningDocument.id,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        errorCount: result.errorCount
      });

      return result;
    } catch (error) {
      logger.error('Error mapping planning data to Linear issues', {
        error,
        planningDocumentId: planningDocument.id
      });
      throw error;
    }
  }

  /**
   * Maps an epic to a Linear issue
   *
   * @param epic - Epic from the planning document
   * @returns The mapped Linear issue
   */
  private async mapEpic(epic: Epic): Promise<any> {
    try {
      // Check if the epic already exists by external ID
      const existingIssue = await this.issueFinder.findIssueByExternalId(epic.id);

      if (existingIssue) {
        // Update the existing epic
        logger.info('Updating existing epic', { epicId: epic.id, linearIssueId: existingIssue.id });
        return existingIssue;
      } else {
        // Create a new epic
        logger.info('Creating new epic', { epicId: epic.id });
        const epicIssue = await this.issueCreator.createEpic(
          epic.title,
          epic.description,
          {
            externalId: epic.id,
            labelIds: epic.labels?.map(label => label) || []
          }
        );

        return epicIssue;
      }
    } catch (error) {
      logger.error('Error mapping epic', { error, epicId: epic.id });
      throw error;
    }
  }

  /**
   * Maps a feature to a Linear issue
   *
   * @param feature - Feature from the planning document
   * @param epicIds - Mapping of planning epic IDs to Linear issue IDs
   * @returns The mapped Linear issue
   */
  private async mapFeature(feature: Feature, epicIds: Record<string, string>): Promise<any> {
    try {
      // Check if the feature already exists by external ID
      const existingIssue = await this.issueFinder.findIssueByExternalId(feature.id);

      if (existingIssue) {
        // Update the existing feature
        logger.info('Updating existing feature', { featureId: feature.id, linearIssueId: existingIssue.id });
        return existingIssue;
      } else {
        // Create a new feature
        logger.info('Creating new feature', { featureId: feature.id });
        
        // Get the parent epic ID if available
        const parentEpicId = feature.epicId ? epicIds[feature.epicId] : null;

        const featureIssue = await this.issueCreator.createFeature(
          feature.title,
          feature.description,
          parentEpicId,
          feature.isBusinessFeature !== false, // Default to business feature if not specified
          {
            externalId: feature.id,
            labelIds: feature.labels?.map(label => label) || []
          }
        );

        return featureIssue;
      }
    } catch (error) {
      logger.error('Error mapping feature', { error, featureId: feature.id });
      throw error;
    }
  }

  /**
   * Maps a story to a Linear issue
   *
   * @param story - Story from the planning document
   * @param featureIds - Mapping of planning feature IDs to Linear issue IDs
   * @returns The mapped Linear issue
   */
  private async mapStory(story: Story, featureIds: Record<string, string>): Promise<any> {
    try {
      // Check if the story already exists by external ID
      const existingIssue = await this.issueFinder.findIssueByExternalId(story.id);

      if (existingIssue) {
        // Update the existing story
        logger.info('Updating existing story', { storyId: story.id, linearIssueId: existingIssue.id });
        return existingIssue;
      } else {
        // Create a new story
        logger.info('Creating new story', { storyId: story.id });
        
        // Get the parent feature ID if available
        const parentFeatureId = story.featureId ? featureIds[story.featureId] : null;

        // Format acceptance criteria
        const acceptanceCriteria = story.acceptanceCriteria && story.acceptanceCriteria.length > 0
          ? `## Acceptance Criteria\n\n${story.acceptanceCriteria.map(ac => `- ${ac}`).join('\n')}`
          : '';

        // Combine description and acceptance criteria
        const fullDescription = story.description + (acceptanceCriteria ? `\n\n${acceptanceCriteria}` : '');

        const storyIssue = await this.issueCreator.createStory(
          story.title,
          fullDescription,
          parentFeatureId,
          {
            externalId: story.id,
            labelIds: story.labels?.map(label => label) || []
          }
        );

        return storyIssue;
      }
    } catch (error) {
      logger.error('Error mapping story', { error, storyId: story.id });
      throw error;
    }
  }

  /**
   * Maps an enabler to a Linear issue
   *
   * @param enabler - Enabler from the planning document
   * @param featureIds - Mapping of planning feature IDs to Linear issue IDs
   * @returns The mapped Linear issue
   */
  private async mapEnabler(enabler: Enabler, featureIds: Record<string, string>): Promise<any> {
    try {
      // Check if the enabler already exists by external ID
      const existingIssue = await this.issueFinder.findIssueByExternalId(enabler.id);

      if (existingIssue) {
        // Update the existing enabler
        logger.info('Updating existing enabler', { enablerId: enabler.id, linearIssueId: existingIssue.id });
        return existingIssue;
      } else {
        // Create a new enabler
        logger.info('Creating new enabler', { enablerId: enabler.id });
        
        // Get the parent feature ID if available
        const parentFeatureId = enabler.featureId ? featureIds[enabler.featureId] : null;

        // Map enabler type to Linear enabler type
        const enablerTypeMap: Record<string, 'Architecture' | 'Infrastructure' | 'Technical Debt' | 'Research'> = {
          'architecture': 'Architecture',
          'infrastructure': 'Infrastructure',
          'technical_debt': 'Technical Debt',
          'research': 'Research'
        };

        const linearEnablerType = enablerTypeMap[enabler.enablerType] || 'Architecture';

        const enablerIssue = await this.issueCreator.createEnabler(
          enabler.title,
          enabler.description,
          linearEnablerType,
          parentFeatureId,
          {
            externalId: enabler.id,
            labelIds: enabler.labels?.map(label => label) || []
          }
        );

        return enablerIssue;
      }
    } catch (error) {
      logger.error('Error mapping enabler', { error, enablerId: enabler.id });
      throw error;
    }
  }
}
