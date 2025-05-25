/**
 * Conflict Resolver
 *
 * This module provides utilities for resolving conflicts in the SAFe hierarchy.
 */
import { Issue } from '@linear/sdk';
import { Epic, Feature, Story, Enabler } from '../planning/models';
import * as logger from '../utils/logger';

/**
 * Result of conflict resolution
 */
export interface ConflictResolution {
  /** Action to take */
  action: 'update' | 'ignore' | 'delete';
  /** Reason for the action */
  reason: string;
  /** Additional data for the action */
  data?: any;
}

/**
 * Utility for resolving conflicts in the SAFe hierarchy
 */
export class ConflictResolver {
  /**
   * Resolves a conflict between an existing Epic and a new Epic
   *
   * @param existingEpic - Existing Epic in Linear
   * @param newEpic - New Epic from planning document
   * @returns Resolution for the conflict
   */
  resolveEpicConflict(existingEpic: Issue, newEpic: Epic): ConflictResolution {
    try {
      logger.info('Resolving Epic conflict', {
        existingEpicId: existingEpic.id,
        newEpicId: newEpic.id
      });

      // Check if the title has changed
      const existingTitle = existingEpic.title.replace(/^\[EPIC\]\s*/, '');
      const titleChanged = existingTitle !== newEpic.title;

      // Check if the description has changed
      const descriptionChanged = existingEpic.description !== newEpic.description;

      // If nothing has changed, ignore the conflict
      if (!titleChanged && !descriptionChanged) {
        return {
          action: 'ignore',
          reason: 'No changes detected'
        };
      }

      // If something has changed, update the Epic
      return {
        action: 'update',
        reason: 'Changes detected',
        data: {
          title: titleChanged ? `[EPIC] ${newEpic.title}` : undefined,
          description: descriptionChanged ? newEpic.description : undefined
        }
      };
    } catch (error) {
      logger.error('Error resolving Epic conflict', {
        error,
        existingEpicId: existingEpic.id,
        newEpicId: newEpic.id
      });

      // In case of error, ignore the conflict
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        action: 'ignore',
        reason: `Error: ${errorMessage}`
      };
    }
  }

  /**
   * Resolves a conflict between an existing Feature and a new Feature
   *
   * @param existingFeature - Existing Feature in Linear
   * @param newFeature - New Feature from planning document
   * @returns Resolution for the conflict
   */
  resolveFeatureConflict(existingFeature: Issue, newFeature: Feature): ConflictResolution {
    try {
      logger.info('Resolving Feature conflict', {
        existingFeatureId: existingFeature.id,
        newFeatureId: newFeature.id
      });

      // Check if the title has changed
      const existingTitle = existingFeature.title.replace(/^\[FEATURE\]\s*/, '');
      const titleChanged = existingTitle !== newFeature.title;

      // Check if the description has changed
      const descriptionChanged = existingFeature.description !== newFeature.description;

      // If nothing has changed, ignore the conflict
      if (!titleChanged && !descriptionChanged) {
        return {
          action: 'ignore',
          reason: 'No changes detected'
        };
      }

      // If something has changed, update the Feature
      return {
        action: 'update',
        reason: 'Changes detected',
        data: {
          title: titleChanged ? `[FEATURE] ${newFeature.title}` : undefined,
          description: descriptionChanged ? newFeature.description : undefined
        }
      };
    } catch (error) {
      logger.error('Error resolving Feature conflict', {
        error,
        existingFeatureId: existingFeature.id,
        newFeatureId: newFeature.id
      });

      // In case of error, ignore the conflict
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        action: 'ignore',
        reason: `Error: ${errorMessage}`
      };
    }
  }

  /**
   * Resolves a conflict between an existing Story and a new Story
   *
   * @param existingStory - Existing Story in Linear
   * @param newStory - New Story from planning document
   * @returns Resolution for the conflict
   */
  resolveStoryConflict(existingStory: Issue, newStory: Story): ConflictResolution {
    try {
      logger.info('Resolving Story conflict', {
        existingStoryId: existingStory.id,
        newStoryId: newStory.id
      });

      // Check if the title has changed
      const titleChanged = existingStory.title !== newStory.title;

      // Check if the description has changed
      const descriptionChanged = existingStory.description !== newStory.description;

      // If nothing has changed, ignore the conflict
      if (!titleChanged && !descriptionChanged) {
        return {
          action: 'ignore',
          reason: 'No changes detected'
        };
      }

      // If something has changed, update the Story
      return {
        action: 'update',
        reason: 'Changes detected',
        data: {
          title: titleChanged ? newStory.title : undefined,
          description: descriptionChanged ? newStory.description : undefined
        }
      };
    } catch (error) {
      logger.error('Error resolving Story conflict', {
        error,
        existingStoryId: existingStory.id,
        newStoryId: newStory.id
      });

      // In case of error, ignore the conflict
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        action: 'ignore',
        reason: `Error: ${errorMessage}`
      };
    }
  }

  /**
   * Resolves a conflict between an existing Enabler and a new Enabler
   *
   * @param existingEnabler - Existing Enabler in Linear
   * @param newEnabler - New Enabler from planning document
   * @returns Resolution for the conflict
   */
  resolveEnablerConflict(existingEnabler: Issue, newEnabler: Enabler): ConflictResolution {
    try {
      logger.info('Resolving Enabler conflict', {
        existingEnablerId: existingEnabler.id,
        newEnablerId: newEnabler.id
      });

      // Check if the title has changed
      const existingTitle = existingEnabler.title.replace(/^\[ENABLER\]\s*/, '');
      const titleChanged = existingTitle !== newEnabler.title;

      // Check if the description has changed
      const descriptionChanged = existingEnabler.description !== newEnabler.description;

      // If nothing has changed, ignore the conflict
      if (!titleChanged && !descriptionChanged) {
        return {
          action: 'ignore',
          reason: 'No changes detected'
        };
      }

      // If something has changed, update the Enabler
      return {
        action: 'update',
        reason: 'Changes detected',
        data: {
          title: titleChanged ? `[ENABLER] ${newEnabler.title}` : undefined,
          description: descriptionChanged ? newEnabler.description : undefined
        }
      };
    } catch (error) {
      logger.error('Error resolving Enabler conflict', {
        error,
        existingEnablerId: existingEnabler.id,
        newEnablerId: newEnabler.id
      });

      // In case of error, ignore the conflict
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        action: 'ignore',
        reason: `Error: ${errorMessage}`
      };
    }
  }

  /**
   * Resolves a conflict between parent-child relationships
   *
   * @param existingParentId - Existing parent ID in Linear
   * @param newParentId - New parent ID from planning document
   * @returns Resolution for the conflict
   */
  resolveParentChildConflict(
    existingParentId: string | null,
    newParentId: string | null
  ): ConflictResolution {
    try {
      logger.info('Resolving parent-child conflict', {
        existingParentId,
        newParentId
      });

      // If the parent hasn't changed, ignore the conflict
      if (existingParentId === newParentId) {
        return {
          action: 'ignore',
          reason: 'No changes detected'
        };
      }

      // If the parent has changed, update the relationship
      return {
        action: 'update',
        reason: 'Parent has changed',
        data: {
          parentId: newParentId
        }
      };
    } catch (error) {
      logger.error('Error resolving parent-child conflict', {
        error,
        existingParentId,
        newParentId
      });

      // In case of error, ignore the conflict
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        action: 'ignore',
        reason: `Error: ${errorMessage}`
      };
    }
  }
}
