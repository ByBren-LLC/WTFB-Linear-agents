/**
 * Parameter Extractor Implementation
 * 
 * Extracts actionable parameters from parsed commands using pattern matching
 * and context inference. Enriches commands with Linear issue context.
 */

import {
  CommandParameters,
  TimeReference,
  ScopeReference,
  ExtractionConfig,
  DEFAULT_EXTRACTION_CONFIG
} from './types/parameter-types';
import { CommandIntent, IssueContext } from './types/command-types';
import * as logger from '../utils/logger';

/**
 * Pattern definitions for parameter extraction
 */
const EXTRACTION_PATTERNS = {
  // PI patterns: PI-2025-Q1, PI 2025 Q1, 2025-Q1, etc.
  PI_ID: /\b(?:PI[-\s]?)?(\d{4}[-\s]?Q\d+)\b/i,
  
  // Team patterns: team Alpha, @alpha, team-alpha
  TEAM_ID: /\b(?:team\s+)([A-Za-z0-9-_]+)\b/i,
  TEAM_MENTION: /@([A-Za-z0-9-_]+)\b/i,
  
  // Iteration patterns: iteration 3, sprint 3, Sprint-3
  ITERATION: /\b(?:iteration|sprint)[-\s]?(\d+)\b/i,
  
  // Story patterns: LIN-123, story-123, #123
  STORY_ID: /\b(?:LIN-|story-|#)(\d+)\b/i,
  
  // Time references: this PI, current sprint, next quarter
  TIME_REF: /\b(this|current|next|previous|last)\s+(pi|sprint|iteration|quarter|month|week)\b/i,
  
  // Specific time: in Q1, for 2025-Q2
  SPECIFIC_TIME: /\b(?:in|for)\s+(?:Q\d+|(\d{4}[-\s]?Q\d+))\b/i,
  
  // Story points: 5 points, 8pts, 13 pt
  STORY_POINTS: /\b(\d+)\s*(?:points?|pts?|story[-\s]?points?)\b/i,
  
  // Target size: into 3 point stories, max 5 points
  TARGET_SIZE: /\b(?:into|max|maximum|target)\s*(\d+)\s*(?:points?|pts?)?\b/i,
  
  // Depth: detailed analysis, summary only, full report
  DEPTH: /\b(summary|detailed|full|brief|comprehensive)\s*(?:analysis|report|view)?\b/i,
  
  // Direction: upstream dependencies, downstream only
  DIRECTION: /\b(upstream|downstream|both|all)\s*(?:dependencies|deps)?\b/i,
  
  // Format: as table, in markdown, graph view
  FORMAT: /\b(?:as|in|format)\s*(table|list|graph|markdown|md|tree)\b/i
};

/**
 * Parameter Extractor
 * 
 * Extracts parameters from command text and enriches with context
 */
export class ParameterExtractor {
  private config: ExtractionConfig;

  constructor(config: Partial<ExtractionConfig> = {}) {
    this.config = { ...DEFAULT_EXTRACTION_CONFIG, ...config };
    
    logger.info('Parameter extractor initialized', {
      strict: this.config.strict,
      fuzzyMatch: this.config.fuzzyMatch
    });
  }

  /**
   * Extract parameters from command text
   * 
   * @param text Normalized command text
   * @param intent Command intent
   * @param context Issue context
   * @returns Extracted parameters
   */
  public extractParameters(
    text: string,
    intent: CommandIntent,
    context: IssueContext
  ): CommandParameters {
    const startTime = Date.now();
    
    try {
      // Extract explicit parameters from text
      const explicitParams = this.extractExplicitParameters(text, intent);
      
      // Infer implicit parameters from context
      const contextualParams = this.inferContextualParameters(intent, context);
      
      // Merge parameters (explicit takes precedence)
      const merged = this.mergeParameters(explicitParams, contextualParams);
      
      // Apply intent-specific defaults
      const withDefaults = this.applyIntentDefaults(merged, intent);
      
      logger.debug('Parameters extracted', {
        intent,
        explicit: Object.keys(explicitParams.explicit).filter(k => explicitParams.explicit[k]),
        inferred: Object.keys(contextualParams.explicit).filter(k => !contextualParams.explicit[k]),
        processingTime: Date.now() - startTime
      });
      
      return withDefaults;
      
    } catch (error) {
      logger.error('Parameter extraction error', {
        error: (error as Error).message,
        text,
        intent
      });
      
      // Return minimal parameters on error
      return {
        explicit: {},
        raw: { text }
      };
    }
  }

  /**
   * Extract explicit parameters from command text
   */
  private extractExplicitParameters(text: string, intent: CommandIntent): CommandParameters {
    const params: CommandParameters = {
      explicit: {},
      raw: {}
    };
    
    // Extract PI ID
    const piMatch = text.match(EXTRACTION_PATTERNS.PI_ID);
    if (piMatch) {
      params.piId = this.normalizePIId(piMatch[1]);
      params.explicit.piId = true;
      params.raw!.piId = piMatch[0];
    }
    
    // Extract Team ID
    const teamMatch = text.match(EXTRACTION_PATTERNS.TEAM_ID) || 
                      text.match(EXTRACTION_PATTERNS.TEAM_MENTION);
    if (teamMatch) {
      params.teamId = teamMatch[1];
      params.explicit.teamId = true;
      params.raw!.teamId = teamMatch[0];
    }
    
    // Extract Iteration
    const iterationMatch = text.match(EXTRACTION_PATTERNS.ITERATION);
    if (iterationMatch) {
      params.iterationId = `iteration-${iterationMatch[1]}`;
      params.explicit.iterationId = true;
      params.raw!.iterationId = iterationMatch[0];
    }
    
    // Extract Story ID
    const storyMatch = text.match(EXTRACTION_PATTERNS.STORY_ID);
    if (storyMatch) {
      params.storyId = storyMatch[1];
      params.explicit.storyId = true;
      params.raw!.storyId = storyMatch[0];
    }
    
    // Extract Time Reference
    const timeMatch = text.match(EXTRACTION_PATTERNS.TIME_REF);
    if (timeMatch) {
      params.timeframe = this.parseTimeReference(timeMatch[0], timeMatch[0]);
      params.explicit.timeframe = true;
      params.raw!.timeframe = timeMatch[0];
    } else {
      // Check for specific time
      const specificMatch = text.match(EXTRACTION_PATTERNS.SPECIFIC_TIME);
      if (specificMatch) {
        params.timeframe = {
          type: 'specific',
          value: specificMatch[1] || specificMatch[0].replace(/^(?:in|for)\s+/i, '')
        };
        params.explicit.timeframe = true;
        params.raw!.timeframe = specificMatch[0];
      }
    }
    
    // Extract Story Points
    const pointsMatch = text.match(EXTRACTION_PATTERNS.STORY_POINTS);
    if (pointsMatch) {
      params.storyPoints = parseInt(pointsMatch[1], 10);
      params.explicit.storyPoints = true;
      params.raw!.storyPoints = pointsMatch[0];
    }
    
    // Extract Target Size (for decomposition)
    const targetMatch = text.match(EXTRACTION_PATTERNS.TARGET_SIZE);
    if (targetMatch) {
      // Check if it's "into X" pattern which is story points, not target
      if (targetMatch[0].toLowerCase().includes('into') && 
          targetMatch[0].toLowerCase().includes('point')) {
        // This is story points, not target size
      } else {
        params.targetSize = parseInt(targetMatch[1], 10);
        params.explicit.targetSize = true;
        params.raw!.targetSize = targetMatch[0];
      }
    }
    
    // Extract Analysis Depth
    const depthMatch = text.match(EXTRACTION_PATTERNS.DEPTH);
    if (depthMatch) {
      params.depth = this.normalizeDepth(depthMatch[1]);
      params.explicit.depth = true;
      params.raw!.depth = depthMatch[0];
    }
    
    // Extract Direction
    const directionMatch = text.match(EXTRACTION_PATTERNS.DIRECTION);
    if (directionMatch) {
      params.direction = directionMatch[1].toLowerCase() as 'upstream' | 'downstream' | 'both';
      params.explicit.direction = true;
      params.raw!.direction = directionMatch[0];
    }
    
    // Extract Format
    const formatMatch = text.match(EXTRACTION_PATTERNS.FORMAT);
    if (formatMatch) {
      params.format = this.normalizeFormat(formatMatch[1]);
      params.explicit.format = true;
      params.raw!.format = formatMatch[0];
    }
    
    return params;
  }

  /**
   * Infer parameters from issue context
   */
  private inferContextualParameters(
    intent: CommandIntent,
    context: IssueContext
  ): CommandParameters {
    const params: CommandParameters = {
      explicit: {}
    };
    
    // Infer team from context
    if (context.teamId) {
      params.teamId = context.teamId;
      params.explicit.teamId = false;
    }
    
    // Infer current PI from labels or context
    const currentPI = this.inferCurrentPI(context);
    if (currentPI) {
      params.piId = currentPI;
      params.explicit.piId = false;
    }
    
    // For story decomposition, use current issue
    if (intent === CommandIntent.STORY_DECOMPOSE && context.issueId) {
      params.storyId = context.issueId;
      params.explicit.storyId = false;
      
      // Use issue's estimate if available
      if (context.estimate) {
        params.storyPoints = context.estimate;
        params.explicit.storyPoints = false;
      }
    }
    
    // Infer scope for analysis commands
    if (this.isAnalysisCommand(intent)) {
      params.scope = this.inferScope(context);
      params.explicit.scope = false;
    }
    
    return params;
  }

  /**
   * Merge explicit and contextual parameters
   */
  private mergeParameters(
    explicit: CommandParameters,
    contextual: CommandParameters
  ): CommandParameters {
    const merged: CommandParameters = {
      ...contextual,
      ...explicit,
      explicit: {
        ...contextual.explicit,
        ...explicit.explicit
      }
    };
    
    // Preserve raw values from explicit
    if (explicit.raw) {
      merged.raw = explicit.raw;
    }
    
    return merged;
  }

  /**
   * Apply intent-specific default parameters
   */
  private applyIntentDefaults(
    params: CommandParameters,
    intent: CommandIntent
  ): CommandParameters {
    const withDefaults = { ...params };
    
    switch (intent) {
      case CommandIntent.ART_PLAN:
        // Default to current PI if not specified
        if (!withDefaults.piId && !withDefaults.timeframe) {
          withDefaults.timeframe = {
            type: 'current',
            period: 'pi'
          };
        }
        break;
        
      case CommandIntent.STORY_DECOMPOSE:
        // Default target size for decomposition
        if (!withDefaults.targetSize) {
          withDefaults.targetSize = 5; // Default to 5-point stories
        }
        break;
        
      case CommandIntent.DEPENDENCY_MAP:
        // Default to both directions
        if (!withDefaults.direction) {
          withDefaults.direction = 'both';
        }
        if (!withDefaults.maxDepth) {
          withDefaults.maxDepth = 3;
        }
        break;
        
      case CommandIntent.VALUE_ANALYZE:
        // Default to summary depth
        if (!withDefaults.depth) {
          withDefaults.depth = 'summary';
        }
        break;
        
      case CommandIntent.STATUS_CHECK:
        // Default to table format
        if (!withDefaults.format) {
          withDefaults.format = 'table';
        }
        break;
    }
    
    return withDefaults;
  }

  /**
   * Parse time reference into structured format
   */
  private parseTimeReference(text: string, originalText: string): TimeReference {
    const parts = text.toLowerCase().split(/\s+/);
    const [modifier, period] = parts;
    
    return {
      type: this.getTimeType(modifier),
      period: period as any,
      value: originalText
    };
  }

  /**
   * Get time reference type from modifier
   */
  private getTimeType(modifier: string): TimeReference['type'] {
    switch (modifier) {
      case 'this':
      case 'current':
        return 'current';
      case 'next':
        return 'next';
      case 'previous':
      case 'last':
        return 'previous';
      default:
        return 'relative';
    }
  }

  /**
   * Normalize PI ID format
   */
  private normalizePIId(piId: string): string {
    // Ensure consistent format: PI-YYYY-QN
    const cleaned = piId.replace(/\s+/g, '-').toUpperCase();
    
    if (!cleaned.startsWith('PI-')) {
      return `PI-${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Normalize depth parameter
   */
  private normalizeDepth(depth: string): CommandParameters['depth'] {
    const normalized = depth.toLowerCase();
    
    switch (normalized) {
      case 'brief':
      case 'summary':
        return 'summary';
      case 'comprehensive':
      case 'full':
        return 'full';
      default:
        return 'detailed';
    }
  }

  /**
   * Normalize format parameter
   */
  private normalizeFormat(format: string): CommandParameters['format'] {
    const normalized = format.toLowerCase();
    
    switch (normalized) {
      case 'md':
        return 'markdown';
      case 'tree':
        return 'graph';
      default:
        return normalized as any;
    }
  }

  /**
   * Infer current PI from context
   */
  private inferCurrentPI(context: IssueContext): string | undefined {
    // Check labels for PI patterns
    for (const label of context.labels) {
      const match = label.match(/PI[-\s]?(\d{4}[-\s]?Q\d+)/i);
      if (match) {
        return this.normalizePIId(match[1]);
      }
    }
    
    // Check current PI field if available
    if (context.currentPI) {
      return this.normalizePIId(context.currentPI);
    }
    
    // Could also infer from current date
    // For now, return undefined
    return undefined;
  }

  /**
   * Infer scope from context
   */
  private inferScope(context: IssueContext): ScopeReference {
    if (context.projectId) {
      return {
        type: 'project',
        id: context.projectId,
        name: context.projectName,
        explicit: false
      };
    }
    
    return {
      type: 'team',
      id: context.teamId,
      name: context.teamName,
      explicit: false
    };
  }

  /**
   * Check if command is analysis type
   */
  private isAnalysisCommand(intent: CommandIntent): boolean {
    return [
      CommandIntent.VALUE_ANALYZE,
      CommandIntent.DEPENDENCY_MAP,
      CommandIntent.STATUS_CHECK
    ].includes(intent);
  }
}