/**
 * Type definitions for Story Decomposition Engine
 * 
 * This module defines interfaces and types for the automated story decomposition
 * functionality that breaks down large stories into implementable sub-stories.
 */

import { Story } from '../planning/models';

/**
 * Result of story decomposition process
 */
export interface DecompositionResult {
  /** Original story that was decomposed */
  parentStory: Story;
  /** Array of sub-stories created from decomposition */
  subStories: Story[];
  /** Explanation of decomposition rationale and logic */
  decompositionRationale: string;
  /** Distribution of story points across sub-stories */
  pointsDistribution: number[];
  /** Mapping of acceptance criteria to sub-stories */
  criteriaMapping: AcceptanceCriteriaMapping[];
  /** Unique identifier for this decomposition */
  decompositionId: string;
  /** Timestamp when decomposition was performed */
  timestamp: Date;
}

/**
 * Mapping of acceptance criteria from parent to sub-story
 */
export interface AcceptanceCriteriaMapping {
  /** Original acceptance criteria from parent story */
  originalCriteria: string;
  /** ID of the sub-story this criteria was assigned to */
  targetSubStoryId: string;
  /** Adapted criteria text for the sub-story context */
  adaptedCriteria: string;
  /** Index of original criteria in parent story */
  originalIndex: number;
  /** Rationale for this mapping */
  mappingRationale?: string;
}

/**
 * Configuration for story decomposition behavior
 */
export interface DecompositionConfig {
  /** Maximum story points allowed before decomposition */
  maxStoryPoints: number;
  /** Minimum number of sub-stories to create */
  minSubStories: number;
  /** Maximum number of sub-stories to create */
  maxSubStories: number;
  /** Maximum points allowed per sub-story */
  maxSubStoryPoints: number;
  /** Whether to preserve parent story as epic/feature */
  preserveParentStory: boolean;
  /** Strategy for distributing story points */
  pointsDistributionStrategy: 'even' | 'weighted' | 'fibonacci';
  /** Strategy for distributing acceptance criteria */
  criteriaDistributionStrategy: 'sequential' | 'thematic' | 'balanced';
}

/**
 * Context for sub-story generation
 */
export interface SubStoryContext {
  /** Index of this sub-story (0-based) */
  index: number;
  /** Total number of sub-stories being created */
  totalSubStories: number;
  /** Story points allocated to this sub-story */
  allocatedPoints: number;
  /** Acceptance criteria assigned to this sub-story */
  assignedCriteria: AcceptanceCriteriaMapping[];
  /** Suggested title for this sub-story */
  suggestedTitle: string;
  /** Suggested description for this sub-story */
  suggestedDescription: string;
}

/**
 * Analysis result for a story before decomposition
 */
export interface StoryAnalysis {
  /** Whether the story should be decomposed */
  shouldDecompose: boolean;
  /** Current story points */
  currentPoints: number;
  /** Complexity factors identified */
  complexityFactors: string[];
  /** Suggested number of sub-stories */
  suggestedSubStoryCount: number;
  /** Logical boundaries for decomposition */
  logicalBoundaries: string[];
  /** Risk factors for decomposition */
  riskFactors: string[];
  /** Confidence level in decomposition success (0-1) */
  confidence: number;
}

/**
 * Options for decomposition validation
 */
export interface DecompositionValidation {
  /** Whether all points are properly distributed */
  pointsValid: boolean;
  /** Whether all acceptance criteria are covered */
  criteriaValid: boolean;
  /** Whether sub-story sizes are within limits */
  sizingValid: boolean;
  /** Whether business value is preserved */
  valuePreserved: boolean;
  /** List of validation errors */
  validationErrors: string[];
  /** List of validation warnings */
  validationWarnings: string[];
}

/**
 * Audit trail entry for decomposition actions
 */
export interface DecompositionAuditEntry {
  /** Unique identifier for the audit entry */
  id: string;
  /** ID of the decomposition this relates to */
  decompositionId: string;
  /** Action performed */
  action: 'created' | 'validated' | 'rolled_back' | 'linear_created' | 'linear_failed';
  /** Timestamp of the action */
  timestamp: Date;
  /** User or system that performed the action */
  actor: string;
  /** Details about the action */
  details: Record<string, any>;
  /** Result of the action */
  result: 'success' | 'failure' | 'warning';
  /** Error message if action failed */
  errorMessage?: string;
}

/**
 * Statistics about decomposition operations
 */
export interface DecompositionStatistics {
  /** Total number of stories decomposed */
  totalDecomposed: number;
  /** Average time for decomposition */
  averageDecompositionTime: number;
  /** Success rate of decompositions */
  successRate: number;
  /** Most common decomposition size (number of sub-stories) */
  mostCommonSize: number;
  /** Average points reduction per sub-story */
  averagePointsReduction: number;
  /** Time period these statistics cover */
  timePeriod: {
    start: Date;
    end: Date;
  };
}

/**
 * Error types that can occur during decomposition
 */
export type DecompositionError = 
  | 'STORY_TOO_SMALL'
  | 'INSUFFICIENT_CRITERIA'
  | 'INVALID_POINTS'
  | 'DECOMPOSITION_FAILED'
  | 'VALIDATION_FAILED'
  | 'LINEAR_INTEGRATION_FAILED'
  | 'ROLLBACK_FAILED';

/**
 * Custom error class for decomposition failures
 */
export class StoryDecompositionError extends Error {
  constructor(
    message: string,
    public errorType: DecompositionError,
    public storyId: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'StoryDecompositionError';
  }
}

/**
 * Event emitted during decomposition process
 */
export interface DecompositionEvent {
  /** Type of event */
  type: 'started' | 'analyzed' | 'decomposed' | 'validated' | 'completed' | 'failed';
  /** ID of the story being decomposed */
  storyId: string;
  /** ID of the decomposition process */
  decompositionId: string;
  /** Timestamp of the event */
  timestamp: Date;
  /** Event payload with additional data */
  payload: Record<string, any>;
}