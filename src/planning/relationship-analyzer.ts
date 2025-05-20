/**
 * Relationship analyzer for planning items.
 * This module contains functions for analyzing relationships between planning items.
 */

import * as logger from '../utils/logger';
import { Epic, Feature, Story, Enabler } from './models';

/**
 * Builds relationships between epics and features.
 * @param epics Array of epics
 * @param features Array of features
 * @returns Object containing epics with features and orphaned features
 */
export const buildEpicFeatureRelationships = (
  epics: Epic[],
  features: Feature[]
): { epics: Epic[], orphanedFeatures: Feature[] } => {
  logger.info('Building epic-feature relationships');
  
  // Create a copy of the features array to track orphaned features
  const remainingFeatures = [...features];
  
  // Update epics with their features
  const updatedEpics = epics.map(epic => {
    // Find features that belong to this epic
    const epicFeatures = features.filter(feature => {
      // Check if the feature explicitly references this epic
      if (feature.epicId === epic.id) {
        // Remove from remaining features
        const index = remainingFeatures.findIndex(f => f.id === feature.id);
        if (index !== -1) {
          remainingFeatures.splice(index, 1);
        }
        return true;
      }
      
      // Check if the feature title or description mentions this epic
      const featureText = `${feature.title} ${feature.description}`.toLowerCase();
      const epicTitle = epic.title.toLowerCase();
      
      if (featureText.includes(epicTitle)) {
        // Remove from remaining features
        const index = remainingFeatures.findIndex(f => f.id === feature.id);
        if (index !== -1) {
          remainingFeatures.splice(index, 1);
        }
        
        // Update feature with epic ID
        feature.epicId = epic.id;
        return true;
      }
      
      return false;
    });
    
    // Return updated epic with features
    return {
      ...epic,
      features: epicFeatures
    };
  });
  
  return {
    epics: updatedEpics,
    orphanedFeatures: remainingFeatures
  };
};

/**
 * Builds relationships between features and stories.
 * @param features Array of features
 * @param stories Array of stories
 * @returns Object containing features with stories and orphaned stories
 */
export const buildFeatureStoryRelationships = (
  features: Feature[],
  stories: Story[]
): { features: Feature[], orphanedStories: Story[] } => {
  logger.info('Building feature-story relationships');
  
  // Create a copy of the stories array to track orphaned stories
  const remainingStories = [...stories];
  
  // Update features with their stories
  const updatedFeatures = features.map(feature => {
    // Find stories that belong to this feature
    const featureStories = stories.filter(story => {
      // Check if the story explicitly references this feature
      if (story.featureId === feature.id) {
        // Remove from remaining stories
        const index = remainingStories.findIndex(s => s.id === story.id);
        if (index !== -1) {
          remainingStories.splice(index, 1);
        }
        return true;
      }
      
      // Check if the story title or description mentions this feature
      const storyText = `${story.title} ${story.description}`.toLowerCase();
      const featureTitle = feature.title.toLowerCase();
      
      if (storyText.includes(featureTitle)) {
        // Remove from remaining stories
        const index = remainingStories.findIndex(s => s.id === story.id);
        if (index !== -1) {
          remainingStories.splice(index, 1);
        }
        
        // Update story with feature ID
        story.featureId = feature.id;
        return true;
      }
      
      return false;
    });
    
    // Return updated feature with stories
    return {
      ...feature,
      stories: featureStories
    };
  });
  
  return {
    features: updatedFeatures,
    orphanedStories: remainingStories
  };
};

/**
 * Builds relationships between features and enablers.
 * @param features Array of features
 * @param enablers Array of enablers
 * @returns Object containing features with enablers and orphaned enablers
 */
export const buildFeatureEnablerRelationships = (
  features: Feature[],
  enablers: Enabler[]
): { features: Feature[], orphanedEnablers: Enabler[] } => {
  logger.info('Building feature-enabler relationships');
  
  // Create a copy of the enablers array to track orphaned enablers
  const remainingEnablers = [...enablers];
  
  // Update features with their enablers
  const updatedFeatures = features.map(feature => {
    // Find enablers that belong to this feature
    const featureEnablers = enablers.filter(enabler => {
      // Check if the enabler explicitly references this feature
      if (enabler.featureId === feature.id) {
        // Remove from remaining enablers
        const index = remainingEnablers.findIndex(e => e.id === enabler.id);
        if (index !== -1) {
          remainingEnablers.splice(index, 1);
        }
        return true;
      }
      
      // Check if the enabler title or description mentions this feature
      const enablerText = `${enabler.title} ${enabler.description}`.toLowerCase();
      const featureTitle = feature.title.toLowerCase();
      
      if (enablerText.includes(featureTitle)) {
        // Remove from remaining enablers
        const index = remainingEnablers.findIndex(e => e.id === enabler.id);
        if (index !== -1) {
          remainingEnablers.splice(index, 1);
        }
        
        // Update enabler with feature ID
        enabler.featureId = feature.id;
        return true;
      }
      
      return false;
    });
    
    // Return updated feature with enablers
    return {
      ...feature,
      enablers: featureEnablers
    };
  });
  
  return {
    features: updatedFeatures,
    orphanedEnablers: remainingEnablers
  };
};
