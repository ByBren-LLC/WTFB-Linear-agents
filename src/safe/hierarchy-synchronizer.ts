/**
 * Hierarchy Synchronizer
 * 
 * This module provides utilities for synchronizing the SAFe hierarchy between Confluence and Linear.
 */
import { PlanningDocument, Epic, Feature, Story, Enabler } from '../planning/models';
import { SAFeHierarchyManager } from './hierarchy-manager';
import { HierarchyValidator } from './hierarchy-validator';
import { LinearIssueFinder } from '../linear/issue-finder';
import { LinearIssueCreator } from '../linear/issue-creator';
import { LinearIssueUpdater } from '../linear/issue-updater';
import { ConflictResolver } from './conflict-resolver';
import * as logger from '../utils/logger';

/**
 * Utility for synchronizing the SAFe hierarchy between Confluence and Linear
 */
export class HierarchySynchronizer {
  private hierarchyManager: SAFeHierarchyManager;
  private hierarchyValidator: HierarchyValidator;
  private issueFinder: LinearIssueFinder;
  private issueCreator: LinearIssueCreator;
  private issueUpdater: LinearIssueUpdater;
  private conflictResolver: ConflictResolver;
  private teamId: string;

  /**
   * Creates a new HierarchySynchronizer
   * 
   * @param accessToken - Linear API access token
   * @param teamId - Linear team ID
   */
  constructor(accessToken: string, teamId: string) {
    this.hierarchyManager = new SAFeHierarchyManager(accessToken, teamId);
    this.hierarchyValidator = new HierarchyValidator();
    this.issueFinder = new LinearIssueFinder(accessToken, teamId);
    this.issueCreator = new LinearIssueCreator(accessToken, teamId);
    this.issueUpdater = new LinearIssueUpdater(accessToken);
    this.conflictResolver = new ConflictResolver();
    this.teamId = teamId;
  }

  /**
   * Synchronizes the SAFe hierarchy between Confluence and Linear
   * 
   * @param planningDocument - Planning document containing the SAFe hierarchy
   * @param existingIssues - Mapping of planning item IDs to Linear issue IDs
   * @returns Updated mapping of planning item IDs to Linear issue IDs
   */
  async synchronizeHierarchy(
    planningDocument: PlanningDocument,
    existingIssues: {
      epics: Record<string, string>;
      features: Record<string, string>;
      stories: Record<string, string>;
      enablers: Record<string, string>;
    }
  ): Promise<{
    epics: Record<string, string>;
    features: Record<string, string>;
    stories: Record<string, string>;
    enablers: Record<string, string>;
  }> {
    try {
      logger.info('Synchronizing SAFe hierarchy', { 
        planningDocumentId: planningDocument.id 
      });

      // Validate the hierarchy
      const validationResult = this.hierarchyValidator.validateHierarchy(planningDocument);
      
      if (!validationResult.valid) {
        logger.warn('SAFe hierarchy validation failed', { 
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });
      }

      // Find added, removed, and modified items
      const addedItems = await this.findAddedItems(planningDocument, existingIssues);
      const removedItems = await this.findRemovedItems(planningDocument, existingIssues);
      const modifiedItems = await this.findModifiedItems(planningDocument, existingIssues);

      // Create new items
      const newIssueIds = await this.createNewItems(addedItems);

      // Update modified items
      await this.updateModifiedItems(modifiedItems);

      // Handle removed items (optional, depending on requirements)
      // await this.handleRemovedItems(removedItems, existingIssues);

      // Merge existing and new issue IDs
      const updatedIssueIds = {
        epics: { ...existingIssues.epics, ...newIssueIds.epics },
        features: { ...existingIssues.features, ...newIssueIds.features },
        stories: { ...existingIssues.stories, ...newIssueIds.stories },
        enablers: { ...existingIssues.enablers, ...newIssueIds.enablers }
      };

      // Update the hierarchy
      await this.hierarchyManager.updateHierarchy(planningDocument, updatedIssueIds);

      logger.info('SAFe hierarchy synchronized successfully', { 
        planningDocumentId: planningDocument.id 
      });

      return updatedIssueIds;
    } catch (error) {
      logger.error('Error synchronizing SAFe hierarchy', { 
        error, 
        planningDocumentId: planningDocument.id 
      });
      throw error;
    }
  }

  /**
   * Finds items that have been added to the planning document
   * 
   * @param planningDocument - Planning document containing the SAFe hierarchy
   * @param existingIssues - Mapping of planning item IDs to Linear issue IDs
   * @returns Added items
   */
  async findAddedItems(
    planningDocument: PlanningDocument,
    existingIssues: {
      epics: Record<string, string>;
      features: Record<string, string>;
      stories: Record<string, string>;
      enablers: Record<string, string>;
    }
  ): Promise<{
    epics: Epic[];
    features: Feature[];
    stories: Story[];
    enablers: Enabler[];
  }> {
    try {
      logger.info('Finding added items', { 
        planningDocumentId: planningDocument.id 
      });

      // Find Epics that don't have a Linear issue ID
      const addedEpics = planningDocument.epics.filter(
        epic => !existingIssues.epics[epic.id]
      );

      // Find Features that don't have a Linear issue ID
      const addedFeatures = planningDocument.features.filter(
        feature => !existingIssues.features[feature.id]
      );

      // Find Stories that don't have a Linear issue ID
      const addedStories = planningDocument.stories.filter(
        story => !existingIssues.stories[story.id]
      );

      // Find Enablers that don't have a Linear issue ID
      const addedEnablers = planningDocument.enablers.filter(
        enabler => !existingIssues.enablers[enabler.id]
      );

      logger.info('Found added items', { 
        epicCount: addedEpics.length,
        featureCount: addedFeatures.length,
        storyCount: addedStories.length,
        enablerCount: addedEnablers.length
      });

      return {
        epics: addedEpics,
        features: addedFeatures,
        stories: addedStories,
        enablers: addedEnablers
      };
    } catch (error) {
      logger.error('Error finding added items', { 
        error, 
        planningDocumentId: planningDocument.id 
      });
      throw error;
    }
  }

  /**
   * Finds items that have been removed from the planning document
   * 
   * @param planningDocument - Planning document containing the SAFe hierarchy
   * @param existingIssues - Mapping of planning item IDs to Linear issue IDs
   * @returns Removed item IDs
   */
  async findRemovedItems(
    planningDocument: PlanningDocument,
    existingIssues: {
      epics: Record<string, string>;
      features: Record<string, string>;
      stories: Record<string, string>;
      enablers: Record<string, string>;
    }
  ): Promise<{
    epics: string[];
    features: string[];
    stories: string[];
    enablers: string[];
  }> {
    try {
      logger.info('Finding removed items', { 
        planningDocumentId: planningDocument.id 
      });

      // Find Epic IDs that are in existingIssues but not in the planning document
      const epicIds = new Set(planningDocument.epics.map(epic => epic.id));
      const removedEpics = Object.keys(existingIssues.epics).filter(
        id => !epicIds.has(id)
      );

      // Find Feature IDs that are in existingIssues but not in the planning document
      const featureIds = new Set(planningDocument.features.map(feature => feature.id));
      const removedFeatures = Object.keys(existingIssues.features).filter(
        id => !featureIds.has(id)
      );

      // Find Story IDs that are in existingIssues but not in the planning document
      const storyIds = new Set(planningDocument.stories.map(story => story.id));
      const removedStories = Object.keys(existingIssues.stories).filter(
        id => !storyIds.has(id)
      );

      // Find Enabler IDs that are in existingIssues but not in the planning document
      const enablerIds = new Set(planningDocument.enablers.map(enabler => enabler.id));
      const removedEnablers = Object.keys(existingIssues.enablers).filter(
        id => !enablerIds.has(id)
      );

      logger.info('Found removed items', { 
        epicCount: removedEpics.length,
        featureCount: removedFeatures.length,
        storyCount: removedStories.length,
        enablerCount: removedEnablers.length
      });

      return {
        epics: removedEpics,
        features: removedFeatures,
        stories: removedStories,
        enablers: removedEnablers
      };
    } catch (error) {
      logger.error('Error finding removed items', { 
        error, 
        planningDocumentId: planningDocument.id 
      });
      throw error;
    }
  }

  /**
   * Finds items that have been modified in the planning document
   * 
   * @param planningDocument - Planning document containing the SAFe hierarchy
   * @param existingIssues - Mapping of planning item IDs to Linear issue IDs
   * @returns Modified items
   */
  async findModifiedItems(
    planningDocument: PlanningDocument,
    existingIssues: {
      epics: Record<string, string>;
      features: Record<string, string>;
      stories: Record<string, string>;
      enablers: Record<string, string>;
    }
  ): Promise<{
    epics: { id: string; epic: Epic }[];
    features: { id: string; feature: Feature }[];
    stories: { id: string; story: Story }[];
    enablers: { id: string; enabler: Enabler }[];
  }> {
    try {
      logger.info('Finding modified items', { 
        planningDocumentId: planningDocument.id 
      });

      // Find Epics that have a Linear issue ID
      const modifiedEpics = planningDocument.epics
        .filter(epic => existingIssues.epics[epic.id])
        .map(epic => ({
          id: existingIssues.epics[epic.id],
          epic
        }));

      // Find Features that have a Linear issue ID
      const modifiedFeatures = planningDocument.features
        .filter(feature => existingIssues.features[feature.id])
        .map(feature => ({
          id: existingIssues.features[feature.id],
          feature
        }));

      // Find Stories that have a Linear issue ID
      const modifiedStories = planningDocument.stories
        .filter(story => existingIssues.stories[story.id])
        .map(story => ({
          id: existingIssues.stories[story.id],
          story
        }));

      // Find Enablers that have a Linear issue ID
      const modifiedEnablers = planningDocument.enablers
        .filter(enabler => existingIssues.enablers[enabler.id])
        .map(enabler => ({
          id: existingIssues.enablers[enabler.id],
          enabler
        }));

      logger.info('Found modified items', { 
        epicCount: modifiedEpics.length,
        featureCount: modifiedFeatures.length,
        storyCount: modifiedStories.length,
        enablerCount: modifiedEnablers.length
      });

      return {
        epics: modifiedEpics,
        features: modifiedFeatures,
        stories: modifiedStories,
        enablers: modifiedEnablers
      };
    } catch (error) {
      logger.error('Error finding modified items', { 
        error, 
        planningDocumentId: planningDocument.id 
      });
      throw error;
    }
  }

  /**
   * Creates new items in Linear
   * 
   * @param addedItems - Items to create
   * @returns Mapping of planning item IDs to Linear issue IDs
   */
  private async createNewItems(
    addedItems: {
      epics: Epic[];
      features: Feature[];
      stories: Story[];
      enablers: Enabler[];
    }
  ): Promise<{
    epics: Record<string, string>;
    features: Record<string, string>;
    stories: Record<string, string>;
    enablers: Record<string, string>;
  }> {
    try {
      logger.info('Creating new items', { 
        epicCount: addedItems.epics.length,
        featureCount: addedItems.features.length,
        storyCount: addedItems.stories.length,
        enablerCount: addedItems.enablers.length
      });

      const epicIds: Record<string, string> = {};
      const featureIds: Record<string, string> = {};
      const storyIds: Record<string, string> = {};
      const enablerIds: Record<string, string> = {};

      // Create Epics
      for (const epic of addedItems.epics) {
        const issue = await this.issueCreator.createEpic(
          epic.title,
          epic.description,
          {
            labelIds: epic.labels ? await this.getLabelIds(epic.labels) : undefined,
            externalId: epic.id
          }
        );

        if (issue) {
          epicIds[epic.id] = issue.id;
        }
      }

      // Create Features
      for (const feature of addedItems.features) {
        // Find the parent Epic ID in Linear
        let parentId: string | null = null;
        if (feature.epicId && epicIds[feature.epicId]) {
          parentId = epicIds[feature.epicId];
        }

        const issue = await this.issueCreator.createFeature(
          feature.title,
          feature.description,
          parentId,
          feature.isBusinessFeature !== false, // Default to true if not specified
          {
            labelIds: feature.labels ? await this.getLabelIds(feature.labels) : undefined,
            externalId: feature.id
          }
        );

        if (issue) {
          featureIds[feature.id] = issue.id;
        }
      }

      // Create Stories
      for (const story of addedItems.stories) {
        // Find the parent Feature ID in Linear
        let parentId: string | null = null;
        if (story.featureId && featureIds[story.featureId]) {
          parentId = featureIds[story.featureId];
        }

        const issue = await this.issueCreator.createStory(
          story.title,
          story.description,
          parentId,
          {
            labelIds: story.labels ? await this.getLabelIds(story.labels) : undefined,
            externalId: story.id
          }
        );

        if (issue) {
          storyIds[story.id] = issue.id;
        }
      }

      // Create Enablers
      for (const enabler of addedItems.enablers) {
        // Find the parent Feature ID in Linear
        let parentId: string | null = null;
        if (enabler.featureId && featureIds[enabler.featureId]) {
          parentId = featureIds[enabler.featureId];
        }

        const issue = await this.issueCreator.createEnabler(
          enabler.title,
          enabler.description,
          enabler.enablerType,
          parentId,
          {
            labelIds: enabler.labels ? await this.getLabelIds(enabler.labels) : undefined,
            externalId: enabler.id
          }
        );

        if (issue) {
          enablerIds[enabler.id] = issue.id;
        }
      }

      logger.info('Created new items', { 
        epicCount: Object.keys(epicIds).length,
        featureCount: Object.keys(featureIds).length,
        storyCount: Object.keys(storyIds).length,
        enablerCount: Object.keys(enablerIds).length
      });

      return {
        epics: epicIds,
        features: featureIds,
        stories: storyIds,
        enablers: enablerIds
      };
    } catch (error) {
      logger.error('Error creating new items', { error });
      throw error;
    }
  }

  /**
   * Updates modified items in Linear
   * 
   * @param modifiedItems - Items to update
   */
  private async updateModifiedItems(
    modifiedItems: {
      epics: { id: string; epic: Epic }[];
      features: { id: string; feature: Feature }[];
      stories: { id: string; story: Story }[];
      enablers: { id: string; enabler: Enabler }[];
    }
  ): Promise<void> {
    try {
      logger.info('Updating modified items', { 
        epicCount: modifiedItems.epics.length,
        featureCount: modifiedItems.features.length,
        storyCount: modifiedItems.stories.length,
        enablerCount: modifiedItems.enablers.length
      });

      // Update Epics
      for (const { id, epic } of modifiedItems.epics) {
        // Get the existing Epic
        const existingEpic = await this.issueFinder.findIssueById(id);
        
        if (!existingEpic) {
          logger.warn('Epic not found', { id, epicId: epic.id });
          continue;
        }

        // Resolve conflicts
        const resolution = this.conflictResolver.resolveEpicConflict(existingEpic, epic);
        
        if (resolution.action === 'update' && resolution.data) {
          await this.issueUpdater.updateIssue(id, resolution.data);
          
          // Update labels if needed
          if (epic.labels) {
            const labelIds = await this.getLabelIds(epic.labels);
            await this.issueUpdater.updateLabels(id, labelIds);
          }
        }
      }

      // Update Features
      for (const { id, feature } of modifiedItems.features) {
        // Get the existing Feature
        const existingFeature = await this.issueFinder.findIssueById(id);
        
        if (!existingFeature) {
          logger.warn('Feature not found', { id, featureId: feature.id });
          continue;
        }

        // Resolve conflicts
        const resolution = this.conflictResolver.resolveFeatureConflict(existingFeature, feature);
        
        if (resolution.action === 'update' && resolution.data) {
          await this.issueUpdater.updateIssue(id, resolution.data);
          
          // Update labels if needed
          if (feature.labels) {
            const labelIds = await this.getLabelIds(feature.labels);
            await this.issueUpdater.updateLabels(id, labelIds);
          }
        }
      }

      // Update Stories
      for (const { id, story } of modifiedItems.stories) {
        // Get the existing Story
        const existingStory = await this.issueFinder.findIssueById(id);
        
        if (!existingStory) {
          logger.warn('Story not found', { id, storyId: story.id });
          continue;
        }

        // Resolve conflicts
        const resolution = this.conflictResolver.resolveStoryConflict(existingStory, story);
        
        if (resolution.action === 'update' && resolution.data) {
          await this.issueUpdater.updateIssue(id, resolution.data);
          
          // Update labels if needed
          if (story.labels) {
            const labelIds = await this.getLabelIds(story.labels);
            await this.issueUpdater.updateLabels(id, labelIds);
          }
        }
      }

      // Update Enablers
      for (const { id, enabler } of modifiedItems.enablers) {
        // Get the existing Enabler
        const existingEnabler = await this.issueFinder.findIssueById(id);
        
        if (!existingEnabler) {
          logger.warn('Enabler not found', { id, enablerId: enabler.id });
          continue;
        }

        // Resolve conflicts
        const resolution = this.conflictResolver.resolveEnablerConflict(existingEnabler, enabler);
        
        if (resolution.action === 'update' && resolution.data) {
          await this.issueUpdater.updateIssue(id, resolution.data);
          
          // Update labels if needed
          if (enabler.labels) {
            const labelIds = await this.getLabelIds(enabler.labels);
            await this.issueUpdater.updateLabels(id, labelIds);
          }
        }
      }

      logger.info('Modified items updated successfully');
    } catch (error) {
      logger.error('Error updating modified items', { error });
      throw error;
    }
  }

  /**
   * Handles removed items in Linear
   * 
   * @param removedItems - Item IDs that have been removed
   * @param existingIssues - Mapping of planning item IDs to Linear issue IDs
   */
  private async handleRemovedItems(
    removedItems: {
      epics: string[];
      features: string[];
      stories: string[];
      enablers: string[];
    },
    existingIssues: {
      epics: Record<string, string>;
      features: Record<string, string>;
      stories: Record<string, string>;
      enablers: Record<string, string>;
    }
  ): Promise<void> {
    try {
      logger.info('Handling removed items', { 
        epicCount: removedItems.epics.length,
        featureCount: removedItems.features.length,
        storyCount: removedItems.stories.length,
        enablerCount: removedItems.enablers.length
      });

      // Get the "Removed" label ID
      const removedLabelId = await this.getLabelId('Removed');
      
      if (!removedLabelId) {
        logger.warn('Removed label not found');
        return;
      }

      // Add the "Removed" label to removed Epics
      for (const epicId of removedItems.epics) {
        const linearEpicId = existingIssues.epics[epicId];
        
        if (linearEpicId) {
          await this.issueUpdater.addLabels(linearEpicId, [removedLabelId]);
        }
      }

      // Add the "Removed" label to removed Features
      for (const featureId of removedItems.features) {
        const linearFeatureId = existingIssues.features[featureId];
        
        if (linearFeatureId) {
          await this.issueUpdater.addLabels(linearFeatureId, [removedLabelId]);
        }
      }

      // Add the "Removed" label to removed Stories
      for (const storyId of removedItems.stories) {
        const linearStoryId = existingIssues.stories[storyId];
        
        if (linearStoryId) {
          await this.issueUpdater.addLabels(linearStoryId, [removedLabelId]);
        }
      }

      // Add the "Removed" label to removed Enablers
      for (const enablerId of removedItems.enablers) {
        const linearEnablerId = existingIssues.enablers[enablerId];
        
        if (linearEnablerId) {
          await this.issueUpdater.addLabels(linearEnablerId, [removedLabelId]);
        }
      }

      logger.info('Removed items handled successfully');
    } catch (error) {
      logger.error('Error handling removed items', { error });
      throw error;
    }
  }

  /**
   * Gets the IDs of labels by name
   * 
   * @param labelNames - Label names
   * @returns Label IDs
   */
  private async getLabelIds(labelNames: string[]): Promise<string[]> {
    try {
      const labelIds: string[] = [];
      
      for (const labelName of labelNames) {
        const labelId = await this.getLabelId(labelName);
        
        if (labelId) {
          labelIds.push(labelId);
        }
      }
      
      return labelIds;
    } catch (error) {
      logger.error('Error getting label IDs', { error, labelNames });
      throw error;
    }
  }

  /**
   * Gets the ID of a label by name
   * 
   * @param labelName - Label name
   * @returns Label ID if found, null otherwise
   */
  private async getLabelId(labelName: string): Promise<string | null> {
    try {
      const labels = await this.linearClient.issueLabels();
      
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
        'Research': '#F2C94C',
        'Removed': '#EB5757'
      };
      
      const color = colorMap[labelName] || '#4EA7FC';
      
      const response = await this.linearClient.issueLabelCreate({
        name: labelName,
        color
      });
      
      if (!response.success || !response.issueLabel) {
        throw new Error(`Failed to create ${labelName} label`);
      }
      
      return response.issueLabel.id;
    } catch (error) {
      logger.error(`Error getting ${labelName} label ID`, { error });
      return null;
    }
  }

  /**
   * Gets the Linear client
   */
  private get linearClient() {
    return this.issueCreator['linearClient'];
  }
}
