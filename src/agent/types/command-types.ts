/**
 * Command Parser Type Definitions
 * 
 * Core types and interfaces for the natural language command parsing system.
 * These types provide the foundation for intent recognition and command processing.
 */

/**
 * Recognized command intents
 */
export enum CommandIntent {
  // Planning Commands
  ART_PLAN = 'art_plan',
  ART_OPTIMIZE = 'art_optimize',
  
  // Analysis Commands
  VALUE_ANALYZE = 'value_analyze',
  DEPENDENCY_MAP = 'dependency_map',
  
  // Management Commands
  STORY_DECOMPOSE = 'story_decompose',
  STORY_SCORE = 'story_score',
  
  // Information Commands
  STATUS_CHECK = 'status_check',
  HELP = 'help',
  
  // Special
  UNKNOWN = 'unknown'
}

/**
 * Issue context from Linear
 */
export interface IssueContext {
  issueId: string;
  issueIdentifier: string;
  issueTitle: string;
  teamId: string;
  teamName?: string;
  projectId?: string;
  projectName?: string;
  labels: string[];
  state?: string;
  assigneeId?: string;
  assigneeName?: string;
  priority?: number;
  estimate?: number;
  currentPI?: string;
  currentIteration?: string;
}

/**
 * Command metadata for debugging and analytics
 */
export interface CommandMetadata {
  processingTime: number;
  matchedPattern?: string;
  patternConfidence?: number;
  suggestions?: string[];
  warnings?: string[];
  debug?: Record<string, any>;
}

/**
 * Parsed command result
 */
export interface ParsedCommand {
  /** Recognized intent */
  intent: CommandIntent;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Original raw text */
  rawText: string;
  
  /** Normalized text used for matching */
  normalizedText: string;
  
  /** Pattern that matched (if any) */
  matchedPattern?: string;
  
  /** Issue context */
  context: IssueContext;
  
  /** When the command was parsed */
  timestamp: Date;
  
  /** Additional metadata */
  metadata: CommandMetadata;
  
  /** Extracted parameters (added by parameter extractor) */
  parameters?: any; // Will be CommandParameters type
}

/**
 * Pattern definition for intent matching
 */
export interface PatternDefinition {
  /** Regular expressions to match */
  patterns: RegExp[];
  
  /** Intent this pattern maps to */
  intent: CommandIntent;
  
  /** Priority for conflict resolution (higher = higher priority) */
  priority: number;
  
  /** Example commands that match this pattern */
  examples: string[];
  
  /** Minimum confidence required */
  minConfidence: number;
  
  /** Keywords that boost confidence */
  keywords?: string[];
  
  /** Description for help text */
  description?: string;
}

/**
 * Confidence calculation factors
 */
export interface ConfidenceFactors {
  /** Pattern match score (0-1) */
  patternMatchScore: number;
  
  /** Keyword density score (0-1) */
  keywordDensity: number;
  
  /** Command structure score (0-1) */
  commandStructure: number;
  
  /** Context relevance score (0-1) */
  contextRelevance: number;
}

/**
 * Pattern matching result
 */
export interface PatternMatchResult {
  /** Whether a match was found */
  matched: boolean;
  
  /** Matched intent */
  intent?: CommandIntent;
  
  /** Pattern that matched */
  pattern?: string;
  
  /** Match confidence */
  confidence: number;
  
  /** Detailed confidence factors */
  factors?: ConfidenceFactors;
}

/**
 * Command suggestion for unknown commands
 */
export interface CommandSuggestion {
  /** Suggested command text */
  command: string;
  
  /** Intent it would trigger */
  intent: CommandIntent;
  
  /** Similarity score (0-1) */
  similarity: number;
  
  /** Description of what it does */
  description: string;
}

/**
 * Parser configuration options
 */
export interface ParserConfig {
  /** Minimum confidence threshold for intent recognition */
  minConfidence: number;
  
  /** Maximum processing time in milliseconds */
  maxProcessingTime: number;
  
  /** Enable debug mode */
  debug: boolean;
  
  /** Custom pattern providers */
  customPatterns?: PatternDefinition[];
  
  /** Confidence weights */
  confidenceWeights?: {
    patternMatch: number;
    keywordDensity: number;
    commandStructure: number;
    contextRelevance: number;
  };
}

/**
 * Default parser configuration
 */
export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  minConfidence: 0.8,
  maxProcessingTime: 100,
  debug: false,
  confidenceWeights: {
    patternMatch: 0.4,
    keywordDensity: 0.3,
    commandStructure: 0.2,
    contextRelevance: 0.1
  }
};