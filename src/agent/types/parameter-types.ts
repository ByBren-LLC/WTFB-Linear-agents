/**
 * Parameter Type Definitions
 * 
 * Core types and interfaces for command parameter extraction and validation.
 * These types bridge parsed commands with executable CLI operations.
 */

/**
 * Time reference types for temporal parameters
 */
export interface TimeReference {
  /** Type of time reference */
  type: 'current' | 'next' | 'previous' | 'specific' | 'relative';
  
  /** Raw value from command */
  value?: string;
  
  /** Resolved date/time */
  resolved?: Date;
  
  /** Period type (PI, sprint, quarter, etc.) */
  period?: 'pi' | 'sprint' | 'iteration' | 'quarter' | 'month' | 'week';
}

/**
 * Scope reference for analysis commands
 */
export interface ScopeReference {
  /** Type of scope */
  type: 'team' | 'project' | 'epic' | 'workspace' | 'issue';
  
  /** Identifier */
  id: string;
  
  /** Human-readable name */
  name?: string;
  
  /** Whether this was explicitly specified */
  explicit: boolean;
}

/**
 * Extracted command parameters
 */
export interface CommandParameters {
  // Planning Parameters
  /** Program Increment identifier */
  piId?: string;
  
  /** Team identifier */
  teamId?: string;
  
  /** Iteration/Sprint identifier */
  iterationId?: string;
  
  // Story Parameters
  /** Issue/Story identifier */
  storyId?: string;
  
  /** Story point estimate */
  storyPoints?: number;
  
  /** Target story size for decomposition */
  targetSize?: number;
  
  // Analysis Parameters
  /** Time period for analysis */
  timeframe?: TimeReference;
  
  /** Scope of analysis */
  scope?: ScopeReference;
  
  /** Analysis depth */
  depth?: 'summary' | 'detailed' | 'full';
  
  // Dependency Parameters
  /** Starting point for dependency analysis */
  fromId?: string;
  
  /** Dependency direction */
  direction?: 'upstream' | 'downstream' | 'both';
  
  /** Maximum depth for dependency traversal */
  maxDepth?: number;
  
  // Output Parameters
  /** Output format preference */
  format?: 'table' | 'list' | 'graph' | 'markdown';
  
  /** Include specific fields in output */
  includeFields?: string[];
  
  // Metadata
  /** Track which parameters were explicitly provided */
  explicit: {
    [key: string]: boolean;
  };
  
  /** Raw parameter strings before resolution */
  raw?: {
    [key: string]: string;
  };
}

/**
 * Parameter validation result
 */
export interface ValidationResult {
  /** Whether all parameters are valid */
  valid: boolean;
  
  /** Validation errors */
  errors: ValidationError[];
  
  /** Validation warnings (non-blocking) */
  warnings?: string[];
  
  /** Suggested corrections */
  suggestions?: ParameterSuggestion[];
}

/**
 * Parameter validation error
 */
export interface ValidationError {
  /** Parameter that failed validation */
  parameter: string;
  
  /** Error message */
  message: string;
  
  /** Error code for programmatic handling */
  code: ValidationErrorCode;
  
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Parameter suggestion for corrections
 */
export interface ParameterSuggestion {
  /** Parameter to correct */
  parameter: string;
  
  /** Current invalid value */
  currentValue: string;
  
  /** Suggested valid values */
  suggestions: string[];
  
  /** Suggestion confidence */
  confidence: number;
}

/**
 * Validation error codes
 */
export enum ValidationErrorCode {
  MISSING_REQUIRED = 'missing_required',
  INVALID_FORMAT = 'invalid_format',
  NOT_FOUND = 'not_found',
  PERMISSION_DENIED = 'permission_denied',
  INCOMPATIBLE_PARAMS = 'incompatible_params',
  OUT_OF_RANGE = 'out_of_range',
  AMBIGUOUS_VALUE = 'ambiguous_value'
}

/**
 * Parameter extraction configuration
 */
export interface ExtractionConfig {
  /** Use strict validation */
  strict: boolean;
  
  /** Allow fuzzy matching for values */
  fuzzyMatch: boolean;
  
  /** Maximum suggestions to provide */
  maxSuggestions: number;
  
  /** Timeout for Linear API calls */
  validationTimeout: number;
  
  /** Cache validation results */
  enableCache: boolean;
}

/**
 * Default extraction configuration
 */
export const DEFAULT_EXTRACTION_CONFIG: ExtractionConfig = {
  strict: false,
  fuzzyMatch: true,
  maxSuggestions: 3,
  validationTimeout: 5000,
  enableCache: true
};

/**
 * Parameter requirements by intent
 */
export interface IntentParameterRequirements {
  /** Required parameters */
  required: string[];
  
  /** Optional parameters */
  optional: string[];
  
  /** Parameters that can be inferred from context */
  contextual: string[];
  
  /** Mutually exclusive parameter sets */
  exclusive?: string[][];
}

/**
 * Cache entry for validated parameters
 */
export interface ParameterCacheEntry {
  /** Cache key */
  key: string;
  
  /** Validated parameters */
  parameters: CommandParameters;
  
  /** Validation result */
  validation: ValidationResult;
  
  /** Cache timestamp */
  timestamp: Date;
  
  /** Time to live in seconds */
  ttl: number;
}