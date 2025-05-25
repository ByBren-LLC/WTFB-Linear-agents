/**
 * Change detector for Linear Planning Agent
 *
 * This module provides functionality to detect changes between Linear and Confluence.
 */

import * as logger from '../utils/logger';
import { ConfluenceClient } from '../confluence/client';
import { ConfluenceParser } from '../confluence/parser';
import { PlanningExtractor } from '../planning/extractor';
import { LinearIssueFinder } from '../linear/issue-finder';
import { SyncConfig, SyncChange, SyncConflict, SyncChanges } from './models';

/**
 * Change detector class
 */
export class ChangeDetector {
  private confluenceClient: ConfluenceClient;
  private linearIssueFinder: LinearIssueFinder;

  /**
   * Creates a new change detector
   *
   * @param confluenceClient The Confluence client
   * @param linearIssueFinder The Linear issue finder
   */
  constructor(confluenceClient: ConfluenceClient, linearIssueFinder: LinearIssueFinder) {
    this.confluenceClient = confluenceClient;
    this.linearIssueFinder = linearIssueFinder;
  }

  /**
   * Detects changes between Linear and Confluence
   *
   * @param config The synchronization configuration
   * @returns The detected changes
   */
  async detectChanges(config: SyncConfig): Promise<SyncChanges> {
    try {
      logger.info('Detecting changes', { config });

      // Get Confluence document
      const pageId = this.extractPageIdFromUrl(config.confluencePageUrl);
      const page = await this.confluenceClient.getPage(pageId);
      
      // Parse Confluence document
      const parser = new ConfluenceParser(page.body.storage.value);
      const document = parser.getFullContent();
      const sections = parser.getDocumentStructure();
      
      // Extract planning information
      const extractor = new PlanningExtractor(document, sections);
      const planningDocument = extractor.getPlanningDocument();
      
      // Get Linear issues
      const epics = await this.linearIssueFinder.findEpics();
      const features = await this.linearIssueFinder.findFeatures();
      const stories = await this.linearIssueFinder.findStories();
      const enablers = await this.linearIssueFinder.findEnablers();
      
      // Initialize result arrays
      const confluenceChanges: SyncChange[] = [];
      const linearChanges: SyncChange[] = [];
      const conflicts: SyncConflict[] = [];
      
      // Detect changes in epics
      await this.detectEpicChanges(planningDocument.epics, epics, confluenceChanges, linearChanges, conflicts);
      
      // Detect changes in features
      await this.detectFeatureChanges(planningDocument.features, features, confluenceChanges, linearChanges, conflicts);
      
      // Detect changes in stories
      await this.detectStoryChanges(planningDocument.stories, stories, confluenceChanges, linearChanges, conflicts);
      
      // Detect changes in enablers
      await this.detectEnablerChanges(planningDocument.enablers, enablers, confluenceChanges, linearChanges, conflicts);
      
      logger.info('Changes detected', {
        confluenceChanges: confluenceChanges.length,
        linearChanges: linearChanges.length,
        conflicts: conflicts.length
      });
      
      return {
        confluenceChanges,
        linearChanges,
        conflicts
      };
    } catch (error) {
      logger.error('Error detecting changes', { error, config });
      throw error;
    }
  }

  /**
   * Extracts the page ID from a Confluence URL
   *
   * @param url The Confluence page URL
   * @returns The page ID
   */
  private extractPageIdFromUrl(url: string): string {
    try {
      // Extract the page ID from the URL
      // Example URL: https://example.atlassian.net/wiki/spaces/SPACE/pages/123456789/Page+Title
      const match = url.match(/pages\/(\d+)/);
      if (match && match[1]) {
        return match[1];
      }
      
      // If no match, try another format
      // Example URL: https://example.atlassian.net/wiki/spaces/SPACE/page/123456789
      const altMatch = url.match(/page\/(\d+)/);
      if (altMatch && altMatch[1]) {
        return altMatch[1];
      }
      
      throw new Error(`Could not extract page ID from URL: ${url}`);
    } catch (error) {
      logger.error('Error extracting page ID from URL', { error, url });
      throw error;
    }
  }

  /**
   * Detects changes in epics
   *
   * @param confluenceEpics The epics from Confluence
   * @param linearEpics The epics from Linear
   * @param confluenceChanges The array to store Confluence changes
   * @param linearChanges The array to store Linear changes
   * @param conflicts The array to store conflicts
   */
  private async detectEpicChanges(
    confluenceEpics: any[],
    linearEpics: any[],
    confluenceChanges: SyncChange[],
    linearChanges: SyncChange[],
    conflicts: SyncConflict[]
  ): Promise<void> {
    try {
      // Create maps for easier lookup
      const confluenceEpicMap = new Map(confluenceEpics.map(epic => [epic.id, epic]));
      const linearEpicMap = new Map(linearEpics.map(epic => [epic.id, epic]));
      
      // Check for epics in Confluence that don't exist in Linear
      for (const confluenceEpic of confluenceEpics) {
        if (!linearEpicMap.has(confluenceEpic.id)) {
          // Epic exists in Confluence but not in Linear
          confluenceChanges.push({
            id: this.generateChangeId(),
            type: 'epic',
            action: 'created',
            source: 'confluence',
            sourceId: confluenceEpic.id,
            data: confluenceEpic
          });
        }
      }
      
      // Check for epics in Linear that don't exist in Confluence
      for (const linearEpic of linearEpics) {
        if (!confluenceEpicMap.has(linearEpic.id)) {
          // Epic exists in Linear but not in Confluence
          linearChanges.push({
            id: this.generateChangeId(),
            type: 'epic',
            action: 'created',
            source: 'linear',
            sourceId: linearEpic.id,
            data: linearEpic
          });
        }
      }
      
      // Check for epics that exist in both but have differences
      for (const [epicId, confluenceEpic] of confluenceEpicMap.entries()) {
        const linearEpic = linearEpicMap.get(epicId);
        if (linearEpic) {
          // Epic exists in both, check for differences
          const comparison = this.compareEpics(confluenceEpic, linearEpic);
          
          switch (comparison) {
            case 'equal':
              // No changes
              break;
            case 'confluence_changed':
              // Confluence has newer changes
              confluenceChanges.push({
                id: this.generateChangeId(),
                type: 'epic',
                action: 'updated',
                source: 'confluence',
                sourceId: epicId,
                targetId: epicId,
                data: confluenceEpic
              });
              break;
            case 'linear_changed':
              // Linear has newer changes
              linearChanges.push({
                id: this.generateChangeId(),
                type: 'epic',
                action: 'updated',
                source: 'linear',
                sourceId: epicId,
                targetId: epicId,
                data: linearEpic
              });
              break;
            case 'both_changed':
              // Both have changes, create a conflict
              conflicts.push({
                id: this.generateChangeId(),
                type: 'epic',
                confluenceData: confluenceEpic,
                linearData: linearEpic
              });
              break;
          }
        }
      }
    } catch (error) {
      logger.error('Error detecting epic changes', { error });
      throw error;
    }
  }

  /**
   * Detects changes in features
   *
   * @param confluenceFeatures The features from Confluence
   * @param linearFeatures The features from Linear
   * @param confluenceChanges The array to store Confluence changes
   * @param linearChanges The array to store Linear changes
   * @param conflicts The array to store conflicts
   */
  private async detectFeatureChanges(
    confluenceFeatures: any[],
    linearFeatures: any[],
    confluenceChanges: SyncChange[],
    linearChanges: SyncChange[],
    conflicts: SyncConflict[]
  ): Promise<void> {
    try {
      // Create maps for easier lookup
      const confluenceFeatureMap = new Map(confluenceFeatures.map(feature => [feature.id, feature]));
      const linearFeatureMap = new Map(linearFeatures.map(feature => [feature.id, feature]));
      
      // Check for features in Confluence that don't exist in Linear
      for (const confluenceFeature of confluenceFeatures) {
        if (!linearFeatureMap.has(confluenceFeature.id)) {
          // Feature exists in Confluence but not in Linear
          confluenceChanges.push({
            id: this.generateChangeId(),
            type: 'feature',
            action: 'created',
            source: 'confluence',
            sourceId: confluenceFeature.id,
            data: confluenceFeature
          });
        }
      }
      
      // Check for features in Linear that don't exist in Confluence
      for (const linearFeature of linearFeatures) {
        if (!confluenceFeatureMap.has(linearFeature.id)) {
          // Feature exists in Linear but not in Confluence
          linearChanges.push({
            id: this.generateChangeId(),
            type: 'feature',
            action: 'created',
            source: 'linear',
            sourceId: linearFeature.id,
            data: linearFeature
          });
        }
      }
      
      // Check for features that exist in both but have differences
      for (const [featureId, confluenceFeature] of confluenceFeatureMap.entries()) {
        const linearFeature = linearFeatureMap.get(featureId);
        if (linearFeature) {
          // Feature exists in both, check for differences
          const comparison = this.compareFeatures(confluenceFeature, linearFeature);
          
          switch (comparison) {
            case 'equal':
              // No changes
              break;
            case 'confluence_changed':
              // Confluence has newer changes
              confluenceChanges.push({
                id: this.generateChangeId(),
                type: 'feature',
                action: 'updated',
                source: 'confluence',
                sourceId: featureId,
                targetId: featureId,
                data: confluenceFeature
              });
              break;
            case 'linear_changed':
              // Linear has newer changes
              linearChanges.push({
                id: this.generateChangeId(),
                type: 'feature',
                action: 'updated',
                source: 'linear',
                sourceId: featureId,
                targetId: featureId,
                data: linearFeature
              });
              break;
            case 'both_changed':
              // Both have changes, create a conflict
              conflicts.push({
                id: this.generateChangeId(),
                type: 'feature',
                confluenceData: confluenceFeature,
                linearData: linearFeature
              });
              break;
          }
        }
      }
    } catch (error) {
      logger.error('Error detecting feature changes', { error });
      throw error;
    }
  }

  /**
   * Detects changes in stories
   *
   * @param confluenceStories The stories from Confluence
   * @param linearStories The stories from Linear
   * @param confluenceChanges The array to store Confluence changes
   * @param linearChanges The array to store Linear changes
   * @param conflicts The array to store conflicts
   */
  private async detectStoryChanges(
    confluenceStories: any[],
    linearStories: any[],
    confluenceChanges: SyncChange[],
    linearChanges: SyncChange[],
    conflicts: SyncConflict[]
  ): Promise<void> {
    try {
      // Create maps for easier lookup
      const confluenceStoryMap = new Map(confluenceStories.map(story => [story.id, story]));
      const linearStoryMap = new Map(linearStories.map(story => [story.id, story]));
      
      // Check for stories in Confluence that don't exist in Linear
      for (const confluenceStory of confluenceStories) {
        if (!linearStoryMap.has(confluenceStory.id)) {
          // Story exists in Confluence but not in Linear
          confluenceChanges.push({
            id: this.generateChangeId(),
            type: 'story',
            action: 'created',
            source: 'confluence',
            sourceId: confluenceStory.id,
            data: confluenceStory
          });
        }
      }
      
      // Check for stories in Linear that don't exist in Confluence
      for (const linearStory of linearStories) {
        if (!confluenceStoryMap.has(linearStory.id)) {
          // Story exists in Linear but not in Confluence
          linearChanges.push({
            id: this.generateChangeId(),
            type: 'story',
            action: 'created',
            source: 'linear',
            sourceId: linearStory.id,
            data: linearStory
          });
        }
      }
      
      // Check for stories that exist in both but have differences
      for (const [storyId, confluenceStory] of confluenceStoryMap.entries()) {
        const linearStory = linearStoryMap.get(storyId);
        if (linearStory) {
          // Story exists in both, check for differences
          const comparison = this.compareStories(confluenceStory, linearStory);
          
          switch (comparison) {
            case 'equal':
              // No changes
              break;
            case 'confluence_changed':
              // Confluence has newer changes
              confluenceChanges.push({
                id: this.generateChangeId(),
                type: 'story',
                action: 'updated',
                source: 'confluence',
                sourceId: storyId,
                targetId: storyId,
                data: confluenceStory
              });
              break;
            case 'linear_changed':
              // Linear has newer changes
              linearChanges.push({
                id: this.generateChangeId(),
                type: 'story',
                action: 'updated',
                source: 'linear',
                sourceId: storyId,
                targetId: storyId,
                data: linearStory
              });
              break;
            case 'both_changed':
              // Both have changes, create a conflict
              conflicts.push({
                id: this.generateChangeId(),
                type: 'story',
                confluenceData: confluenceStory,
                linearData: linearStory
              });
              break;
          }
        }
      }
    } catch (error) {
      logger.error('Error detecting story changes', { error });
      throw error;
    }
  }

  /**
   * Detects changes in enablers
   *
   * @param confluenceEnablers The enablers from Confluence
   * @param linearEnablers The enablers from Linear
   * @param confluenceChanges The array to store Confluence changes
   * @param linearChanges The array to store Linear changes
   * @param conflicts The array to store conflicts
   */
  private async detectEnablerChanges(
    confluenceEnablers: any[],
    linearEnablers: any[],
    confluenceChanges: SyncChange[],
    linearChanges: SyncChange[],
    conflicts: SyncConflict[]
  ): Promise<void> {
    try {
      // Create maps for easier lookup
      const confluenceEnablerMap = new Map(confluenceEnablers.map(enabler => [enabler.id, enabler]));
      const linearEnablerMap = new Map(linearEnablers.map(enabler => [enabler.id, enabler]));
      
      // Check for enablers in Confluence that don't exist in Linear
      for (const confluenceEnabler of confluenceEnablers) {
        if (!linearEnablerMap.has(confluenceEnabler.id)) {
          // Enabler exists in Confluence but not in Linear
          confluenceChanges.push({
            id: this.generateChangeId(),
            type: 'enabler',
            action: 'created',
            source: 'confluence',
            sourceId: confluenceEnabler.id,
            data: confluenceEnabler
          });
        }
      }
      
      // Check for enablers in Linear that don't exist in Confluence
      for (const linearEnabler of linearEnablers) {
        if (!confluenceEnablerMap.has(linearEnabler.id)) {
          // Enabler exists in Linear but not in Confluence
          linearChanges.push({
            id: this.generateChangeId(),
            type: 'enabler',
            action: 'created',
            source: 'linear',
            sourceId: linearEnabler.id,
            data: linearEnabler
          });
        }
      }
      
      // Check for enablers that exist in both but have differences
      for (const [enablerId, confluenceEnabler] of confluenceEnablerMap.entries()) {
        const linearEnabler = linearEnablerMap.get(enablerId);
        if (linearEnabler) {
          // Enabler exists in both, check for differences
          const comparison = this.compareEnablers(confluenceEnabler, linearEnabler);
          
          switch (comparison) {
            case 'equal':
              // No changes
              break;
            case 'confluence_changed':
              // Confluence has newer changes
              confluenceChanges.push({
                id: this.generateChangeId(),
                type: 'enabler',
                action: 'updated',
                source: 'confluence',
                sourceId: enablerId,
                targetId: enablerId,
                data: confluenceEnabler
              });
              break;
            case 'linear_changed':
              // Linear has newer changes
              linearChanges.push({
                id: this.generateChangeId(),
                type: 'enabler',
                action: 'updated',
                source: 'linear',
                sourceId: enablerId,
                targetId: enablerId,
                data: linearEnabler
              });
              break;
            case 'both_changed':
              // Both have changes, create a conflict
              conflicts.push({
                id: this.generateChangeId(),
                type: 'enabler',
                confluenceData: confluenceEnabler,
                linearData: linearEnabler
              });
              break;
          }
        }
      }
    } catch (error) {
      logger.error('Error detecting enabler changes', { error });
      throw error;
    }
  }

  /**
   * Compares two epics to determine if they are equal or which one has changed
   *
   * @param confluenceEpic The epic from Confluence
   * @param linearEpic The epic from Linear
   * @returns The comparison result
   */
  private compareEpics(
    confluenceEpic: any,
    linearEpic: any
  ): 'equal' | 'confluence_changed' | 'linear_changed' | 'both_changed' {
    try {
      // Compare the epics based on their content
      // This is a simplified comparison, in a real implementation you would compare all relevant fields
      
      // Get the timestamps
      const confluenceTimestamp = new Date(confluenceEpic.updatedAt || confluenceEpic.createdAt);
      const linearTimestamp = new Date(linearEpic.updatedAt || linearEpic.createdAt);
      
      // Compare the content
      const contentEqual = (
        confluenceEpic.title === linearEpic.title &&
        confluenceEpic.description === linearEpic.description
      );
      
      if (contentEqual) {
        return 'equal';
      }
      
      // If content is different, determine which one has changed more recently
      if (confluenceTimestamp > linearTimestamp) {
        return 'confluence_changed';
      } else if (linearTimestamp > confluenceTimestamp) {
        return 'linear_changed';
      } else {
        // If timestamps are equal, consider both changed
        return 'both_changed';
      }
    } catch (error) {
      logger.error('Error comparing epics', { error, confluenceEpic, linearEpic });
      // Default to both changed to be safe
      return 'both_changed';
    }
  }

  /**
   * Compares two features to determine if they are equal or which one has changed
   *
   * @param confluenceFeature The feature from Confluence
   * @param linearFeature The feature from Linear
   * @returns The comparison result
   */
  private compareFeatures(
    confluenceFeature: any,
    linearFeature: any
  ): 'equal' | 'confluence_changed' | 'linear_changed' | 'both_changed' {
    try {
      // Similar to compareEpics, but for features
      
      // Get the timestamps
      const confluenceTimestamp = new Date(confluenceFeature.updatedAt || confluenceFeature.createdAt);
      const linearTimestamp = new Date(linearFeature.updatedAt || linearFeature.createdAt);
      
      // Compare the content
      const contentEqual = (
        confluenceFeature.title === linearFeature.title &&
        confluenceFeature.description === linearFeature.description
      );
      
      if (contentEqual) {
        return 'equal';
      }
      
      // If content is different, determine which one has changed more recently
      if (confluenceTimestamp > linearTimestamp) {
        return 'confluence_changed';
      } else if (linearTimestamp > confluenceTimestamp) {
        return 'linear_changed';
      } else {
        // If timestamps are equal, consider both changed
        return 'both_changed';
      }
    } catch (error) {
      logger.error('Error comparing features', { error, confluenceFeature, linearFeature });
      // Default to both changed to be safe
      return 'both_changed';
    }
  }

  /**
   * Compares two stories to determine if they are equal or which one has changed
   *
   * @param confluenceStory The story from Confluence
   * @param linearStory The story from Linear
   * @returns The comparison result
   */
  private compareStories(
    confluenceStory: any,
    linearStory: any
  ): 'equal' | 'confluence_changed' | 'linear_changed' | 'both_changed' {
    try {
      // Similar to compareEpics, but for stories
      
      // Get the timestamps
      const confluenceTimestamp = new Date(confluenceStory.updatedAt || confluenceStory.createdAt);
      const linearTimestamp = new Date(linearStory.updatedAt || linearStory.createdAt);
      
      // Compare the content
      const contentEqual = (
        confluenceStory.title === linearStory.title &&
        confluenceStory.description === linearStory.description
      );
      
      if (contentEqual) {
        return 'equal';
      }
      
      // If content is different, determine which one has changed more recently
      if (confluenceTimestamp > linearTimestamp) {
        return 'confluence_changed';
      } else if (linearTimestamp > confluenceTimestamp) {
        return 'linear_changed';
      } else {
        // If timestamps are equal, consider both changed
        return 'both_changed';
      }
    } catch (error) {
      logger.error('Error comparing stories', { error, confluenceStory, linearStory });
      // Default to both changed to be safe
      return 'both_changed';
    }
  }

  /**
   * Compares two enablers to determine if they are equal or which one has changed
   *
   * @param confluenceEnabler The enabler from Confluence
   * @param linearEnabler The enabler from Linear
   * @returns The comparison result
   */
  private compareEnablers(
    confluenceEnabler: any,
    linearEnabler: any
  ): 'equal' | 'confluence_changed' | 'linear_changed' | 'both_changed' {
    try {
      // Similar to compareEpics, but for enablers
      
      // Get the timestamps
      const confluenceTimestamp = new Date(confluenceEnabler.updatedAt || confluenceEnabler.createdAt);
      const linearTimestamp = new Date(linearEnabler.updatedAt || linearEnabler.createdAt);
      
      // Compare the content
      const contentEqual = (
        confluenceEnabler.title === linearEnabler.title &&
        confluenceEnabler.description === linearEnabler.description &&
        confluenceEnabler.enablerType === linearEnabler.enablerType
      );
      
      if (contentEqual) {
        return 'equal';
      }
      
      // If content is different, determine which one has changed more recently
      if (confluenceTimestamp > linearTimestamp) {
        return 'confluence_changed';
      } else if (linearTimestamp > confluenceTimestamp) {
        return 'linear_changed';
      } else {
        // If timestamps are equal, consider both changed
        return 'both_changed';
      }
    } catch (error) {
      logger.error('Error comparing enablers', { error, confluenceEnabler, linearEnabler });
      // Default to both changed to be safe
      return 'both_changed';
    }
  }

  /**
   * Generates a unique ID for a change or conflict
   *
   * @returns A unique ID
   */
  private generateChangeId(): string {
    return `change-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
