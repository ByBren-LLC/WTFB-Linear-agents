/**
 * Hierarchy Validator
 *
 * This module provides utilities for validating the SAFe hierarchy.
 */
import { PlanningDocument } from '../planning/models';
import * as logger from '../utils/logger';

/**
 * Result of hierarchy validation
 */
export interface ValidationResult {
  /** Whether the hierarchy is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

/**
 * Utility for validating the SAFe hierarchy
 */
export class HierarchyValidator {
  /**
   * Validates the entire SAFe hierarchy
   *
   * @param planningDocument - Planning document containing the SAFe hierarchy
   * @returns Validation result
   */
  validateHierarchy(planningDocument: PlanningDocument): ValidationResult {
    try {
      logger.info('Validating SAFe hierarchy', {
        planningDocumentId: planningDocument.id
      });

      // Validate Epic-Feature relationships
      const epicFeatureResult = this.validateEpicFeatureRelationships(planningDocument);

      // Validate Feature-Story relationships
      const featureStoryResult = this.validateFeatureStoryRelationships(planningDocument);

      // Validate Feature-Enabler relationships
      const featureEnablerResult = this.validateFeatureEnablerRelationships(planningDocument);

      // Combine the results
      const result: ValidationResult = {
        valid: epicFeatureResult.valid && featureStoryResult.valid && featureEnablerResult.valid,
        errors: [
          ...epicFeatureResult.errors,
          ...featureStoryResult.errors,
          ...featureEnablerResult.errors
        ],
        warnings: [
          ...epicFeatureResult.warnings,
          ...featureStoryResult.warnings,
          ...featureEnablerResult.warnings
        ]
      };

      logger.info('SAFe hierarchy validation result', {
        valid: result.valid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });

      return result;
    } catch (error) {
      logger.error('Error validating SAFe hierarchy', {
        error,
        planningDocumentId: planningDocument.id
      });

      return {
        valid: false,
        errors: [`Error validating SAFe hierarchy: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validates Epic-Feature relationships
   *
   * @param planningDocument - Planning document containing the SAFe hierarchy
   * @returns Validation result
   */
  validateEpicFeatureRelationships(planningDocument: PlanningDocument): ValidationResult {
    try {
      logger.info('Validating Epic-Feature relationships', {
        epicCount: planningDocument.epics.length,
        featureCount: (planningDocument.features || []).length
      });

      const errors: string[] = [];
      const warnings: string[] = [];

      // Create a map of Epic IDs
      const epicIds = new Set(planningDocument.epics.map(epic => epic.id));

      // Check that all Features have a valid Epic parent
      for (const feature of (planningDocument.features || [])) {
        if (feature.epicId && !epicIds.has(feature.epicId)) {
          errors.push(`Feature ${feature.id} references non-existent Epic ${feature.epicId}`);
        }
      }

      // Check that all Epics with features reference valid Features
      for (const epic of planningDocument.epics) {
        if (epic.features && epic.features.length > 0) {
          const featureIds = new Set(planningDocument.features || [].map(feature => feature.id));

          for (const featureId of epic.features) {
            if (!featureIds.has(featureId)) {
              errors.push(`Epic ${epic.id} references non-existent Feature ${featureId}`);
            }
          }
        }
      }

      // Check for Features without an Epic parent
      const featuresWithoutEpic = planningDocument.features || [].filter(feature => !feature.epicId);

      if (featuresWithoutEpic.length > 0) {
        warnings.push(`${featuresWithoutEpic.length} Features do not have an Epic parent`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      logger.error('Error validating Epic-Feature relationships', { error });

      return {
        valid: false,
        errors: [`Error validating Epic-Feature relationships: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validates Feature-Story relationships
   *
   * @param planningDocument - Planning document containing the SAFe hierarchy
   * @returns Validation result
   */
  validateFeatureStoryRelationships(planningDocument: PlanningDocument): ValidationResult {
    try {
      logger.info('Validating Feature-Story relationships', {
        featureCount: planningDocument.features || [].length,
        storyCount: planningDocument.stories || [].length
      });

      const errors: string[] = [];
      const warnings: string[] = [];

      // Create a map of Feature IDs
      const featureIds = new Set(planningDocument.features || [].map(feature => feature.id));

      // Check that all Stories have a valid Feature parent
      for (const story of planningDocument.stories || []) {
        if (story.featureId && !featureIds.has(story.featureId)) {
          errors.push(`Story ${story.id} references non-existent Feature ${story.featureId}`);
        }
      }

      // Check that all Features with stories reference valid Stories
      for (const feature of planningDocument.features || []) {
        if (feature.stories && feature.stories.length > 0) {
          const storyIds = new Set(planningDocument.stories || [].map(story => story.id));

          for (const storyId of feature.stories) {
            if (!storyIds.has(storyId)) {
              errors.push(`Feature ${feature.id} references non-existent Story ${storyId}`);
            }
          }
        }
      }

      // Check for Stories without a Feature parent
      const storiesWithoutFeature = planningDocument.stories || [].filter(story => !story.featureId);

      if (storiesWithoutFeature.length > 0) {
        warnings.push(`${storiesWithoutFeature.length} Stories do not have a Feature parent`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      logger.error('Error validating Feature-Story relationships', { error });

      return {
        valid: false,
        errors: [`Error validating Feature-Story relationships: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validates Feature-Enabler relationships
   *
   * @param planningDocument - Planning document containing the SAFe hierarchy
   * @returns Validation result
   */
  validateFeatureEnablerRelationships(planningDocument: PlanningDocument): ValidationResult {
    try {
      logger.info('Validating Feature-Enabler relationships', {
        featureCount: planningDocument.features || [].length,
        enablerCount: planningDocument.enablers || [].length
      });

      const errors: string[] = [];
      const warnings: string[] = [];

      // Create a map of Feature IDs
      const featureIds = new Set(planningDocument.features || [].map(feature => feature.id));

      // Check that all Enablers have a valid Feature parent
      for (const enabler of planningDocument.enablers || []) {
        if (enabler.featureId && !featureIds.has(enabler.featureId)) {
          errors.push(`Enabler ${enabler.id} references non-existent Feature ${enabler.featureId}`);
        }
      }

      // Check that all Features with enablers reference valid Enablers
      for (const feature of planningDocument.features || []) {
        if (feature.enablers && feature.enablers.length > 0) {
          const enablerIds = new Set(planningDocument.enablers || [].map(enabler => enabler.id));

          for (const enablerId of feature.enablers) {
            if (!enablerIds.has(enablerId)) {
              errors.push(`Feature ${feature.id} references non-existent Enabler ${enablerId}`);
            }
          }
        }
      }

      // Check for Enablers without a Feature parent
      const enablersWithoutFeature = planningDocument.enablers || [].filter(enabler => !enabler.featureId);

      if (enablersWithoutFeature.length > 0) {
        warnings.push(`${enablersWithoutFeature.length} Enablers do not have a Feature parent`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      logger.error('Error validating Feature-Enabler relationships', { error });

      return {
        valid: false,
        errors: [`Error validating Feature-Enabler relationships: ${error.message}`],
        warnings: []
      };
    }
  }
}
