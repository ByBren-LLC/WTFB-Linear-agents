/**
 * Type definitions for Story Scoring and Prioritization (LIN-50)
 * 
 * Implements WSJF (Weighted Shortest Job First) methodology and business value analysis
 * for optimal story prioritization in SAFe ART planning.
 */

import { Story } from '../planning/models';

/**
 * Scored story with WSJF and business value metrics
 */
export interface ScoredStory extends Story {
  businessValue: number;
  timeCriticality: number;
  riskReduction: number;
  jobSize: number;
  wsjfScore: number;
  priorityScore: number;
  recommendedPriority: LinearPriority;
  scoringTimestamp: Date;
  scoringVersion: string;
  // Override to make priority required for scored stories
  priority: number;
}

/**
 * Business value component scoring
 */
export interface BusinessValueScore {
  userImpact: number;           // 0-100: Impact on end users
  businessImpact: number;       // 0-100: Impact on business metrics
  technicalDebt: number;        // 0-100: Technical debt reduction value
  strategicValue: number;       // 0-100: Alignment with strategic goals
  totalScore: number;           // Weighted total business value
}

/**
 * Time criticality scoring components
 */
export interface TimeCriticalityScore {
  marketWindow: number;         // 0-100: Market timing sensitivity
  customerCommitment: number;   // 0-100: Customer commitment impact
  regulatoryDeadline: number;   // 0-100: Regulatory or compliance urgency
  totalScore: number;           // Weighted total time criticality
}

/**
 * Risk reduction scoring components
 */
export interface RiskReductionScore {
  securityRisk: number;         // 0-100: Security risk mitigation
  operationalRisk: number;      // 0-100: Operational risk reduction
  technicalRisk: number;        // 0-100: Technical risk mitigation
  businessRisk: number;         // 0-100: Business risk reduction
  totalScore: number;           // Weighted total risk reduction
}

/**
 * Job size estimation components
 */
export interface JobSizeScore {
  storyPoints: number;          // Base story points
  complexity: number;           // 1-5: Implementation complexity
  uncertainty: number;          // 1-5: Requirements uncertainty
  dependencies: number;         // Number of dependencies
  totalScore: number;           // Weighted job size
}

/**
 * WSJF calculation components
 */
export interface WSJFComponents {
  businessValue: BusinessValueScore;
  timeCriticality: TimeCriticalityScore;
  riskReduction: RiskReductionScore;
  jobSize: JobSizeScore;
  wsjfScore: number;
  calculationTimestamp: Date;
}

/**
 * Priority update for Linear
 */
export interface PriorityUpdate {
  storyId: string;
  currentPriority: number;
  recommendedPriority: number;
  wsjfScore: number;
  rationale: string;
  updateTimestamp: Date;
}

/**
 * Linear priority levels (1-4, where 1 is highest)
 */
export enum LinearPriority {
  URGENT = 1,    // Highest priority
  HIGH = 2,      // High priority
  MEDIUM = 3,    // Medium priority
  LOW = 4        // Lowest priority
}

/**
 * Priority mapping configuration
 */
export interface PriorityMapping {
  urgentThreshold: number;      // WSJF score threshold for Urgent
  highThreshold: number;        // WSJF score threshold for High
  mediumThreshold: number;      // WSJF score threshold for Medium
  // Below medium threshold = Low
}

/**
 * Scoring configuration
 */
export interface ScoringConfig {
  weights: {
    businessValue: number;      // Weight for business value in WSJF
    timeCriticality: number;    // Weight for time criticality in WSJF
    riskReduction: number;      // Weight for risk reduction in WSJF
  };
  priorityMapping: PriorityMapping;
  scoringVersion: string;
}

/**
 * Value delivery optimization recommendation
 */
export interface ValueOptimizationRecommendation {
  recommendationType: 'PRIORITIZE' | 'DELAY' | 'SPLIT' | 'COMBINE';
  affectedStories: string[];
  rationale: string;
  expectedImpact: string;
  confidence: number;           // 0-1: Confidence in recommendation
}

/**
 * Batch scoring result
 */
export interface ScoringResult {
  scoredStories: ScoredStory[];
  priorityUpdates: PriorityUpdate[];
  recommendations: ValueOptimizationRecommendation[];
  summary: {
    totalStories: number;
    averageWsjfScore: number;
    highPriorityCount: number;
    recommendationsCount: number;
  };
  processingTime: number;       // Milliseconds
  timestamp: Date;
}

/**
 * Scoring error types
 */
export class ScoringError extends Error {
  constructor(
    message: string,
    public readonly storyId?: string,
    public readonly scoringPhase?: string
  ) {
    super(message);
    this.name = 'ScoringError';
  }
}

/**
 * Priority update error types
 */
export class PriorityUpdateError extends Error {
  constructor(
    message: string,
    public readonly storyId?: string,
    public readonly linearError?: unknown
  ) {
    super(message);
    this.name = 'PriorityUpdateError';
  }
}