/**
 * Type definitions for Dependency Mapping System (LIN-48)
 * 
 * Implements comprehensive dependency analysis and management for SAFe ART planning.
 * Provides automatic detection of technical and business dependencies with graph validation.
 */

import { Story, Feature, Epic, Enabler } from '../planning/models';

/**
 * Union type for work items that can have dependencies
 */
export type WorkItem = Story | Feature | Epic | Enabler;

/**
 * Dependency relationship between work items
 */
export interface DependencyRelationship {
  /** Unique identifier for this dependency relationship */
  id: string;
  /** ID of the source work item (the one that depends) */
  sourceId: string;
  /** ID of the target work item (the one being depended upon) */
  targetId: string;
  /** Type of dependency relationship */
  type: DependencyType;
  /** Strength of the dependency */
  strength: DependencyStrength;
  /** Human-readable explanation of why this dependency exists */
  rationale: string;
  /** How this dependency was detected */
  detectionMethod: DetectionMethod;
  /** Confidence score of the dependency detection (0-1) */
  confidence: number;
  /** Keywords or patterns that triggered this dependency */
  triggers: string[];
  /** Timestamp when dependency was detected */
  detectedAt: Date;
  /** Optional metadata for additional context */
  metadata?: Record<string, any>;
}

/**
 * Types of dependency relationships
 */
export enum DependencyType {
  BLOCKS = 'blocks',                    // Source blocks target
  BLOCKED_BY = 'blocked_by',           // Source is blocked by target  
  REQUIRES = 'requires',               // Source requires target to be completed first
  ENABLES = 'enables',                 // Source enables target to be started
  RELATED = 'related',                 // Source and target are related but not blocking
  CONFLICTS = 'conflicts'              // Source and target conflict with each other
}

/**
 * Strength of dependency relationship
 */
export enum DependencyStrength {
  HARD = 'hard',                       // Cannot proceed without this dependency
  SOFT = 'soft',                       // Preferable but not strictly required
  OPTIONAL = 'optional'                // Nice to have but not necessary
}

/**
 * How the dependency was detected
 */
export enum DetectionMethod {
  KEYWORD = 'keyword',                 // Detected via keyword analysis
  SEMANTIC = 'semantic',               // Detected via semantic analysis
  PATTERN = 'pattern',                 // Detected via pattern matching
  MANUAL = 'manual',                   // Manually specified
  INHERITED = 'inherited'              // Inherited from parent relationships
}

/**
 * Complete dependency graph for a set of work items
 */
export interface DependencyGraph {
  /** All work items in the graph */
  nodes: WorkItem[];
  /** All dependency relationships */
  edges: DependencyRelationship[];
  /** Critical path through the graph (ordered list of work item IDs) */
  criticalPath: string[];
  /** Detected circular dependencies (array of cycles) */
  circularDependencies: CircularDependency[];
  /** Graph validation results */
  validation: GraphValidation;
  /** Statistics about the dependency graph */
  statistics: GraphStatistics;
  /** Timestamp when graph was generated */
  generatedAt: Date;
}

/**
 * Circular dependency detection result
 */
export interface CircularDependency {
  /** Work item IDs that form the circular dependency */
  cycle: string[];
  /** Dependency relationships that form the cycle */
  relationships: DependencyRelationship[];
  /** Severity of the circular dependency */
  severity: 'critical' | 'warning' | 'info';
  /** Suggested resolution strategies */
  resolutionSuggestions: string[];
}

/**
 * Graph validation results
 */
export interface GraphValidation {
  /** Whether the graph is valid (no critical circular dependencies) */
  isValid: boolean;
  /** Validation errors that must be fixed */
  errors: ValidationError[];
  /** Validation warnings that should be reviewed */
  warnings: ValidationWarning[];
  /** Validation info messages */
  info: ValidationInfo[];
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  affectedItems: string[];
  suggestedFix?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  affectedItems: string[];
  recommendation?: string;
}

/**
 * Validation info
 */
export interface ValidationInfo {
  code: string;
  message: string;
  affectedItems: string[];
}

/**
 * Statistics about the dependency graph
 */
export interface GraphStatistics {
  /** Total number of work items */
  nodeCount: number;
  /** Total number of dependencies */
  edgeCount: number;
  /** Number of hard dependencies */
  hardDependencies: number;
  /** Number of soft dependencies */
  softDependencies: number;
  /** Average dependencies per work item */
  averageDependencies: number;
  /** Work items with no dependencies */
  independentItems: number;
  /** Work items with many dependencies (potential bottlenecks) */
  highDependencyItems: string[];
  /** Longest path length through the graph */
  longestPath: number;
  /** Estimated completion time considering dependencies */
  estimatedDuration: number;
}

/**
 * Critical path analysis result
 */
export interface CriticalPathAnalysis {
  /** Ordered sequence of work items on the critical path */
  path: string[];
  /** Total estimated duration of the critical path */
  totalDuration: number;
  /** Work items that could impact the critical path if delayed */
  riskItems: string[];
  /** Opportunities to parallelize work off the critical path */
  parallelizationOpportunities: string[];
}

/**
 * Dependency impact analysis result
 */
export interface DependencyImpactAnalysis {
  /** Work item being analyzed */
  workItemId: string;
  /** Items directly impacted by changes to this work item */
  directImpacts: string[];
  /** Items indirectly impacted (downstream dependencies) */
  indirectImpacts: string[];
  /** Estimated timeline impact if this item is delayed */
  timelineImpact: number;
  /** Risk level of changes to this work item */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Recommended mitigation strategies */
  mitigationStrategies: string[];
}

/**
 * Dependency detection configuration
 */
export interface DependencyDetectionConfig {
  /** Technical dependency keywords to look for */
  technicalKeywords: string[];
  /** Business dependency keywords to look for */
  businessKeywords: string[];
  /** Minimum confidence threshold for including dependencies */
  confidenceThreshold: number;
  /** Whether to detect semantic dependencies */
  enableSemanticAnalysis: boolean;
  /** Maximum dependency distance to analyze */
  maxDependencyDistance: number;
  /** Whether to inherit parent-child dependencies */
  inheritParentDependencies: boolean;
}

/**
 * Linear dependency relationship creation input
 */
export interface LinearDependencyInput {
  /** Source Linear issue ID */
  sourceIssueId: string;
  /** Target Linear issue ID */
  targetIssueId: string;
  /** Type of Linear relationship */
  relationType: 'blocks' | 'blocked_by' | 'related' | 'duplicate';
  /** Comment to add explaining the relationship */
  comment?: string;
  /** Metadata to track with the relationship */
  metadata?: Record<string, any>;
}

/**
 * Dependency mapping result
 */
export interface DependencyMappingResult {
  /** Generated dependency graph */
  graph: DependencyGraph;
  /** Dependencies created in Linear */
  linearRelationships: LinearDependencyInput[];
  /** Summary of the mapping process */
  summary: {
    totalDependencies: number;
    technicalDependencies: number;
    businessDependencies: number;
    circularDependencies: number;
    validationErrors: number;
    processingTime: number;
  };
  /** Processing timestamp */
  timestamp: Date;
}

/**
 * Error types for dependency mapping
 */
export class DependencyError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly affectedItems?: string[]
  ) {
    super(message);
    this.name = 'DependencyError';
  }
}

export class CircularDependencyError extends DependencyError {
  constructor(
    message: string,
    public readonly cycles: CircularDependency[]
  ) {
    super(message, 'CIRCULAR_DEPENDENCY', cycles.map(c => c.cycle).flat());
    this.name = 'CircularDependencyError';
  }
}

export class LinearIntegrationError extends DependencyError {
  constructor(
    message: string,
    public readonly linearError?: unknown
  ) {
    super(message, 'LINEAR_INTEGRATION_ERROR');
    this.name = 'LinearIntegrationError';
  }
}