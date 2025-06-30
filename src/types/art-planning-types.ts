/**
 * Type definitions for ART Iteration Planning (LIN-49)
 * 
 * Provides comprehensive types for Agile Release Train iteration planning,
 * including capacity management, value delivery validation, and ART readiness.
 */

import { Story, Feature, Epic, Enabler } from '../planning/models';
import { DependencyGraph, WorkItem } from './dependency-types';
import { ProgramIncrement } from '../safe/pi-model';

/**
 * Union type for work items that can be planned in iterations
 */
export type PlanningWorkItem = Story | Feature | Epic | Enabler;

/**
 * ART iteration (sprint) definition
 */
export interface Iteration {
  /** Unique identifier for the iteration */
  id: string;
  /** Iteration name (e.g., "Sprint 1", "Iteration 2.1") */
  name: string;
  /** Iteration start date */
  startDate: Date;
  /** Iteration end date */
  endDate: Date;
  /** Duration in days */
  duration: number;
  /** Linear cycle ID if mapped */
  linearCycleId?: string;
  /** Team(s) participating in this iteration */
  teams: string[];
  /** Iteration goals and objectives */
  goals?: string[];
  /** Iteration capacity by team */
  capacity: IterationCapacity[];
}

/**
 * Team capacity for an iteration
 */
export interface IterationCapacity {
  /** Team identifier */
  teamId: string;
  /** Team name */
  teamName: string;
  /** Total story points capacity for this iteration */
  totalCapacity: number;
  /** Available capacity (accounting for holidays, PTO, etc.) */
  availableCapacity: number;
  /** Number of team members */
  teamSize: number;
  /** Average velocity (points per iteration) */
  averageVelocity: number;
  /** Confidence factor (0-1) */
  confidenceFactor: number;
}

/**
 * Planned iteration with allocated work items
 */
export interface IterationPlan {
  /** The iteration being planned */
  iteration: Iteration;
  /** Work items allocated to this iteration */
  allocatedWork: AllocatedWorkItem[];
  /** Total story points allocated */
  totalPoints: number;
  /** Total capacity available for this iteration */
  totalCapacity: number;
  /** Capacity utilization by team */
  capacityUtilization: CapacityUtilization[];
  /** Deliverable value for this iteration */
  deliverableValue: DeliverableValue;
  /** Dependencies that must be completed before this iteration */
  prerequisites: string[];
  /** Dependencies that this iteration enables */
  enables: string[];
  /** Validation results for this iteration plan */
  validation: IterationValidationResult;
  /** Planning metadata */
  metadata: IterationPlanMetadata;
}

/**
 * Work item allocated to an iteration
 */
export interface AllocatedWorkItem {
  /** The work item being allocated */
  workItem: PlanningWorkItem;
  /** Assigned team for this work item */
  assignedTeam: string;
  /** Estimated effort for this iteration (may be partial) */
  allocatedPoints: number;
  /** Whether this completes the work item */
  isComplete: boolean;
  /** Allocation confidence (0-1) */
  confidence: number;
  /** Allocation rationale */
  rationale: string;
  /** Dependencies that must be completed first */
  blockedBy: string[];
  /** Work items that this enables */
  enables: string[];
}

/**
 * Capacity utilization for a team in an iteration
 */
export interface CapacityUtilization {
  /** Team identifier */
  teamId: string;
  /** Total capacity available */
  totalCapacity: number;
  /** Capacity allocated */
  allocatedCapacity: number;
  /** Utilization percentage (0-1) */
  utilizationRate: number;
  /** Is this team over-allocated? */
  isOverAllocated: boolean;
  /** Buffer capacity remaining */
  bufferCapacity: number;
}

/**
 * Deliverable value for an iteration
 */
export interface DeliverableValue {
  /** Can this iteration deliver working software? */
  canDeliverWorkingSoftware: boolean;
  /** Primary value delivered */
  primaryValue: string;
  /** Secondary values delivered */
  secondaryValues: string[];
  /** Value delivery confidence (0-1) */
  valueConfidence: number;
  /** User stories that deliver value */
  valueDeliveryStories: string[];
  /** Prerequisites for value delivery */
  valuePrerequisites: string[];
  /** Value delivery risks */
  valueRisks: ValueDeliveryRisk[];
}

/**
 * Risk to value delivery in an iteration
 */
export interface ValueDeliveryRisk {
  /** Risk identifier */
  id: string;
  /** Risk description */
  description: string;
  /** Risk severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Risk probability (0-1) */
  probability: number;
  /** Impact on value delivery */
  impact: string;
  /** Mitigation strategies */
  mitigations: string[];
  /** Risk owner */
  owner?: string;
}

/**
 * Iteration plan validation result
 */
export interface IterationValidationResult {
  /** Is this iteration plan valid? */
  isValid: boolean;
  /** Validation errors that must be fixed */
  errors: ValidationError[];
  /** Validation warnings that should be reviewed */
  warnings: ValidationWarning[];
  /** Validation info messages */
  info: ValidationInfo[];
  /** Overall validation score (0-1) */
  validationScore: number;
}

/**
 * Validation error for iteration planning
 */
export interface ValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Affected work items */
  affectedWorkItems: string[];
  /** Suggested fix */
  suggestedFix?: string;
  /** Error severity */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Validation warning for iteration planning
 */
export interface ValidationWarning {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** Affected work items */
  affectedWorkItems: string[];
  /** Recommendation */
  recommendation?: string;
}

/**
 * Validation info for iteration planning
 */
export interface ValidationInfo {
  /** Info code */
  code: string;
  /** Info message */
  message: string;
  /** Affected work items */
  affectedWorkItems: string[];
}

/**
 * Iteration plan metadata
 */
export interface IterationPlanMetadata {
  /** When this plan was created */
  createdAt: Date;
  /** When this plan was last updated */
  updatedAt: Date;
  /** Who created this plan */
  createdBy?: string;
  /** Planning algorithm version */
  algorithmVersion: string;
  /** Planning confidence score (0-1) */
  planningConfidence: number;
  /** Value delivery analysis results */
  valueAnalysis?: {
    valueDeliveryScore: number;
    workingSoftwareCount: number;
    userImpactScore: number;
    businessValue: number;
  };
  /** Planning notes */
  notes?: string;
}

/**
 * Complete ART plan for a Program Increment
 */
export interface ARTPlan {
  /** Program Increment being planned */
  programIncrement: ProgramIncrement;
  /** All iterations in this PI */
  iterations: IterationPlan[];
  /** Work items included in this plan */
  workItems: PlanningWorkItem[];
  /** Dependency graph for this plan */
  dependencies: DependencyGraph;
  /** Overall ART readiness validation */
  artReadiness: ARTReadinessResult;
  /** Planning summary and statistics */
  summary: ARTPlanSummary;
  /** Plan metadata */
  metadata: ARTPlanMetadata;
}

/**
 * ART readiness validation result
 */
export interface ARTReadinessResult {
  /** Is the ART ready for execution? */
  isReady: boolean;
  /** Overall readiness score (0-1) */
  readinessScore: number;
  /** Readiness assessment by category */
  assessments: ARTReadinessAssessment[];
  /** Category scores for optimization */
  categoryScores: { category: string; score: number; assessment: ARTReadinessAssessment; }[];
  /** Critical blockers that prevent execution */
  criticalBlockers: string[];
  /** Recommendations for improving readiness */
  recommendations: string[];
  /** Readiness validation timestamp */
  validatedAt: Date;
}

/**
 * ART readiness assessment by category
 */
export interface ARTReadinessAssessment {
  /** Assessment category */
  category: ARTReadinessCategory;
  /** Category score (0-1) */
  score: number;
  /** Is this category ready? */
  isReady: boolean;
  /** Issues found in this category */
  issues: string[];
  /** Recommendations for this category */
  recommendations: string[];
}

/**
 * Categories for ART readiness assessment
 */
export enum ARTReadinessCategory {
  STORY_READINESS = 'story_readiness',
  DEPENDENCY_RESOLUTION = 'dependency_resolution',
  CAPACITY_ALLOCATION = 'capacity_allocation',
  VALUE_DELIVERY = 'value_delivery',
  RISK_MITIGATION = 'risk_mitigation',
  TEAM_ALIGNMENT = 'team_alignment'
}

/**
 * ART plan summary and statistics
 */
export interface ARTPlanSummary {
  /** Total number of iterations */
  totalIterations: number;
  /** Total work items planned */
  totalWorkItems: number;
  /** Total story points planned */
  totalStoryPoints: number;
  /** Average iteration capacity utilization */
  averageCapacityUtilization: number;
  /** Number of dependencies */
  totalDependencies: number;
  /** Critical path length */
  criticalPathLength: number;
  /** Value delivery confidence */
  valueDeliveryConfidence: number;
  /** Planning risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Key planning metrics */
  metrics: ARTPlanMetrics;
}

/**
 * Key planning metrics for ART plan
 */
export interface ARTPlanMetrics {
  /** Percentage of work items properly sized (≤5 points) */
  properlySizedStories: number;
  /** Percentage of dependencies resolved */
  dependencyResolution: number;
  /** Percentage of iterations with deliverable value */
  iterationsWithValue: number;
  /** Team capacity balance (standard deviation) */
  capacityBalance: number;
  /** Planning confidence average */
  planningConfidence: number;
}

/**
 * ART plan metadata
 */
export interface ARTPlanMetadata {
  /** When this plan was created */
  createdAt: Date;
  /** When this plan was last updated */
  updatedAt: Date;
  /** Planning algorithm version */
  algorithmVersion: string;
  /** Planning configuration used */
  configuration: ARTPlanningConfig;
  /** Planning session identifier */
  sessionId: string;
  /** Planning notes and comments */
  notes?: string;
}

/**
 * Configuration for ART planning
 */
export interface ARTPlanningConfig {
  /** Default iteration length in days */
  defaultIterationLength: number;
  /** Buffer capacity percentage (0-1) */
  bufferCapacity: number;
  /** Minimum value delivery threshold */
  minValueDeliveryThreshold: number;
  /** Maximum capacity utilization (0-1) */
  maxCapacityUtilization: number;
  /** Enable dependency optimization */
  enableDependencyOptimization: boolean;
  /** Enable value delivery optimization */
  enableValueOptimization: boolean;
  /** Planning horizon in iterations */
  planningHorizon: number;
}

/**
 * Team information for ART planning
 */
export interface ARTTeam {
  /** Team identifier */
  id: string;
  /** Team name */
  name: string;
  /** Team members count */
  memberCount: number;
  /** Average velocity (points per iteration) */
  averageVelocity: number;
  /** Team specializations */
  specializations: string[];
  /** Team capacity factor (0-1) */
  capacityFactor: number;
  /** Team timezone */
  timezone?: string;
}

/**
 * Result of story allocation to iterations
 */
export interface AllocationResult {
  /** Successful allocations */
  allocated: AllocatedWorkItem[];
  /** Work items that could not be allocated */
  unallocated: UnallocatedWorkItem[];
  /** Allocation statistics */
  statistics: AllocationStatistics;
  /** Allocation warnings and issues */
  issues: AllocationIssue[];
}

/**
 * Work item that could not be allocated
 */
export interface UnallocatedWorkItem {
  /** The work item */
  workItem: PlanningWorkItem;
  /** Reason it could not be allocated */
  reason: string;
  /** Blocking factors */
  blockers: string[];
  /** Possible solutions */
  solutions: string[];
}

/**
 * Statistics about allocation process
 */
export interface AllocationStatistics {
  /** Total work items processed */
  totalWorkItems: number;
  /** Successfully allocated */
  allocatedCount: number;
  /** Failed to allocate */
  unallocatedCount: number;
  /** Allocation success rate (0-1) */
  successRate: number;
  /** Average capacity utilization */
  averageUtilization: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Issue found during allocation
 */
export interface AllocationIssue {
  /** Issue type */
  type: 'capacity_overrun' | 'dependency_violation' | 'value_risk' | 'team_imbalance';
  /** Issue severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Issue description */
  description: string;
  /** Affected iterations */
  affectedIterations: string[];
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Capacity calculation result
 */
export interface CapacityCalculationResult {
  /** Team capacity calculations */
  teamCapacities: IterationCapacity[];
  /** Total available capacity */
  totalCapacity: number;
  /** Capacity confidence score (0-1) */
  confidenceScore: number;
  /** Capacity calculation notes */
  notes: string[];
  /** Capacity risks identified */
  risks: string[];
}

/**
 * Value delivery analysis result - MOVED TO PHASE 2 TYPES BELOW
 */

/**
 * Value analysis for a single iteration
 */
export interface IterationValueAnalysis {
  /** Iteration identifier */
  iterationId: string;
  /** Can deliver working software */
  canDeliverValue: boolean;
  /** Primary value proposition */
  primaryValue: string;
  /** Value delivery confidence (0-1) */
  confidence: number;
  /** Value delivery prerequisites */
  prerequisites: string[];
  /** Value delivery risks */
  risks: ValueDeliveryRisk[];
}

/**
 * Overall value delivery assessment
 */
export interface ValueDeliveryAssessment {
  /** Overall value delivery score (0-1) */
  overallScore: number;
  /** Number of iterations delivering value */
  valueDeliveryIterations: number;
  /** Total value delivery opportunities */
  totalIterations: number;
  /** Value delivery success rate (0-1) */
  successRate: number;
  /** Critical value delivery paths */
  criticalPaths: string[];
}

/**
 * Error types for ART planning
 */
export class ARTPlanningError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly affectedItems?: string[]
  ) {
    super(message);
    this.name = 'ARTPlanningError';
  }
}

export class CapacityValidationError extends ARTPlanningError {
  constructor(
    message: string,
    public readonly teamId: string,
    public readonly iterationId: string
  ) {
    super(message, 'CAPACITY_VALIDATION_ERROR', [teamId, iterationId]);
    this.name = 'CapacityValidationError';
  }
}

export class DependencyOrderingError extends ARTPlanningError {
  constructor(
    message: string,
    public readonly dependencyViolations: string[]
  ) {
    super(message, 'DEPENDENCY_ORDERING_ERROR', dependencyViolations);
    this.name = 'DependencyOrderingError';
  }
}

export class ValueDeliveryError extends ARTPlanningError {
  constructor(
    message: string,
    public readonly iterationId: string,
    public readonly valueIssues: string[]
  ) {
    super(message, 'VALUE_DELIVERY_ERROR', [iterationId, ...valueIssues]);
    this.name = 'ValueDeliveryError';
  }
}

// Phase 2: Value Delivery Types

export interface ValueDeliveryAnalysis {
  iterationId: string;
  primaryValueStreams: ValueStream[];
  workingSoftwareComponents: WorkingSoftwareComponent[];
  valueDeliveryScore: number;
  userImpactAssessment: UserImpact;
  businessValueRealization: BusinessValueRealization;
  deliveryRisks: ValueDeliveryRisk[];
  improvementRecommendations: string[];
  confidenceScore: number;
}

export interface ValueStream {
  id: string;
  name: string;
  type: 'customer-facing' | 'revenue-generating' | 'efficiency-improving' | 'technical-debt' | 'infrastructure';
  workItems: string[];
  totalValue: number;
  deliveryConfidence: number;
}

export interface WorkingSoftwareComponent {
  id: string;
  name: string;
  type: 'feature' | 'api' | 'ui' | 'service';
  workItems: string[];
  deploymentReadiness: number;
  userValue: number;
  dependencies: string[];
}

export interface UserImpact {
  impactedUserCount: number;
  impactTypes: string[];
  userSegments: string[];
  estimatedAdoptionRate: number;
  valuePerUser: number;
}

export interface BusinessValueRealization {
  estimatedRevenue: number;
  costSavings: number;
  timeToValue: number;
  confidenceLevel: number;
  valueDrivers: string[];
  assumptions: string[];
}

export interface WorkingSoftwareValidation {
  canDeployToProduction: boolean;
  deploymentReadinessScore: number;
  criticalBlockers: DeploymentBlocker[];
  integrationStatus: IntegrationStatus;
  userValueDelivered: UserValueMetrics;
  rollbackCapability: RollbackAssessment;
  qualityGates: QualityGateStatus[];
}

export interface DeploymentBlocker {
  id: string;
  type: 'technical' | 'requirements' | 'dependency' | 'capacity';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedWorkItems: string[];
  resolution: string;
  owner?: string;
}

export interface IntegrationStatus {
  totalIntegrationPoints: number;
  completedIntegrations: number;
  pendingIntegrations: number;
  integrationReadiness: number;
  criticalIntegrations: string[];
}

export interface UserValueMetrics {
  userStoriesCompleted: number;
  estimatedUserSatisfaction: number;
  featureAdoptionPotential: number;
  valueDeliveryVelocity: number;
}

export interface RollbackAssessment {
  canRollback: boolean;
  rollbackComplexity: 'low' | 'medium' | 'high';
  estimatedRollbackTime: number;
  rollbackRisks: string[];
  rollbackPlan: string;
}

export interface QualityGateStatus {
  gateName: string;
  status: 'passed' | 'failed' | 'pending';
  criteria: string;
  currentState: string;
}

export interface OptimizedIterationPlan {
  originalPlan: IterationPlan;
  optimizedAllocation: AllocatedWorkItem[];
  valueImprovementPotential: number;
  riskReduction: number;
  confidenceImprovement: number;
  implementationEffort: 'low' | 'medium' | 'high';
}

// Phase 2: Readiness and Validation Types

export interface DeploymentReadinessResult {
  canDeploy: boolean;
  readinessScore: number;
  readyStories: string[];
  blockedStories: {
    storyId: string;
    blockers: string[];
  }[];
  criticalBlockers: DeploymentBlocker[];
  deploymentRisks: string[];
  estimatedDeploymentDuration: number;
  rollbackStrategy: string;
}

export interface IntegrationValidation {
  isComplete: boolean;
  integrationPoints: {
    id: string;
    name: string;
    type: string;
    status: string;
    dependencies: string[];
  }[];
  validatedIntegrations: string[];
  pendingIntegrations: string[];
  integrationRisks: string[];
  completenessScore: number;
  recommendations: string[];
}

export interface UserValueValidation {
  deliversUserValue: boolean;
  userValueScore: number;
  valueDeliveryConfidence: number;
  impactedUserSegments: string[];
  valueMetrics: {
    totalValuePoints: number;
    averageValuePerStory: number;
    highValueStoryCount: number;
    valueDistribution: {
      high: number;
      medium: number;
      low: number;
    };
  };
  recommendations: string[];
}

export interface DeliveryConfidenceScore {
  overallConfidence: number;
  confidenceBreakdown: {
    teamReadiness: number;
    technicalReadiness: number;
    dependencyResolution: number;
    capacityAlignment: number;
  };
  riskFactors: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
  recommendations: string[];
}

// Phase 2: Optimization Types

export interface OptimizedARTPlan {
  originalPlan: ARTPlan;
  optimizedIterations: IterationPlan[];
  improvementActions: ImprovementAction[];
  readinessScoreImprovement: number;
  valueDeliveryImprovement: number;
  riskReduction: RiskReductionAnalysis;
  implementationComplexity: 'low' | 'medium' | 'high';
}

export interface ImprovementPlan {
  currentReadinessScore: number;
  targetReadinessScore: number;
  prioritizedActions: ImprovementAction[];
  quickWins: ImprovementAction[];
  strategicImprovements: ImprovementAction[];
  estimatedImprovement: number;
  implementationTimeline: {
    phase: string;
    duration: number;
    actions: string[];
  }[];
  resourceRequirements: {
    developers: number;
    productOwners: number;
    scrumMasters: number;
    totalEffortDays: number;
  };
  riskMitigation: string[];
}

export interface ImprovementAction {
  id: string;
  category: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: number;
  effortRequired: 'low' | 'medium' | 'high';
  dependencies: string[];
  risks: string[];
}

export interface RiskReductionAnalysis {
  risksEliminated: number;
  riskReductionPercentage: number;
  remainingHighRisks: number;
  mitigationStrategies: string[];
}