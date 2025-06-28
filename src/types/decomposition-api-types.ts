/**
 * API Types for Story Decomposition Integration
 * These types bridge the orchestration specification with the implementation
 */

import { Story } from '../planning/models';

/**
 * Represents a story that needs decomposition (>5 points)
 */
export interface LargeStory extends Story {
  estimate: number; // Must be > 5 for decomposition
}

/**
 * Represents a decomposed sub-story (≤5 points)
 */
export interface DecomposedStory extends Story {
  parentStoryId: string;
  decompositionIndex: number;
  originalStoryPoints: number;
  businessValuePortion: number; // Percentage of parent's business value
}

/**
 * Business value mapping for a story
 */
export interface BusinessValue {
  storyId: string;
  totalValue: number;
  valueComponents: {
    userImpact: number;
    businessImpact: number;
    technicalDebt: number;
    riskReduction: number;
  };
  wsjfScore?: number; // Weighted Shortest Job First score
  valueDistribution?: ValueDistribution[];
}

/**
 * How business value is distributed across sub-stories
 */
export interface ValueDistribution {
  subStoryId: string;
  valuePercentage: number;
  rationale: string;
}

/**
 * Validation result for decomposition
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: {
    totalPoints: number;
    averagePoints: number;
    storyCount: number;
    businessValuePreserved: boolean;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  storyId?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  storyId?: string;
}

/**
 * API interface that Phase 2 agents expect
 */
export interface StoryDecompositionAPI {
  /**
   * Decomposes a large story into smaller sub-stories
   * @param story Story with >5 points to decompose
   * @returns Array of decomposed stories ≤5 points each
   */
  decomposeStory(story: LargeStory): Promise<DecomposedStory[]>;

  /**
   * Validates that decomposition maintains integrity
   * @param decomposed Array of decomposed stories
   * @returns Validation result with metrics
   */
  validateDecomposition(decomposed: DecomposedStory[]): Promise<ValidationResult>;

  /**
   * Maps business value from parent to sub-stories
   * @param story Story to analyze for business value
   * @returns Business value breakdown and distribution
   */
  getBusinessValueMapping(story: Story): Promise<BusinessValue>;
}