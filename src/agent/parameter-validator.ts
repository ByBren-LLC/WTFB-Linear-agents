/**
 * Parameter Validator Implementation
 * 
 * Validates extracted parameters against Linear data and business rules.
 * Provides helpful error messages and suggestions for invalid parameters.
 */

import {
  CommandParameters,
  ValidationResult,
  ValidationError,
  ValidationErrorCode,
  ParameterSuggestion,
  IntentParameterRequirements
} from './types/parameter-types';
import { CommandIntent } from './types/command-types';
import { LinearClientWrapper } from '../linear/client';
import * as logger from '../utils/logger';

/**
 * Parameter requirements by intent
 */
const INTENT_REQUIREMENTS: Record<CommandIntent, IntentParameterRequirements> = {
  [CommandIntent.ART_PLAN]: {
    required: [],
    optional: ['piId', 'teamId', 'timeframe'],
    contextual: ['piId', 'teamId'],
    exclusive: [['piId', 'timeframe']]
  },
  
  [CommandIntent.ART_OPTIMIZE]: {
    required: [],
    optional: ['teamId', 'piId'],
    contextual: ['teamId', 'piId']
  },
  
  [CommandIntent.VALUE_ANALYZE]: {
    required: [],
    optional: ['scope', 'timeframe', 'depth'],
    contextual: ['scope', 'timeframe']
  },
  
  [CommandIntent.STORY_DECOMPOSE]: {
    required: ['storyId'],
    optional: ['targetSize', 'storyPoints'],
    contextual: ['storyId', 'storyPoints']
  },
  
  [CommandIntent.DEPENDENCY_MAP]: {
    required: [],
    optional: ['fromId', 'direction', 'maxDepth', 'scope'],
    contextual: ['fromId', 'scope']
  },
  
  [CommandIntent.STORY_SCORE]: {
    required: ['storyId'],
    optional: ['storyPoints'],
    contextual: ['storyId']
  },
  
  [CommandIntent.STATUS_CHECK]: {
    required: [],
    optional: ['scope', 'format', 'timeframe'],
    contextual: ['scope']
  },
  
  [CommandIntent.HELP]: {
    required: [],
    optional: [],
    contextual: []
  },
  
  [CommandIntent.UNKNOWN]: {
    required: [],
    optional: [],
    contextual: []
  }
};

/**
 * Parameter Validator
 * 
 * Validates parameters against Linear data and business rules
 */
export class ParameterValidator {
  constructor(
    private linearClient: LinearClientWrapper
  ) {}

  /**
   * Validate parameters for a given intent
   * 
   * @param params Extracted parameters
   * @param intent Command intent
   * @returns Validation result
   */
  public async validate(
    params: CommandParameters,
    intent: CommandIntent
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const suggestions: ParameterSuggestion[] = [];
    
    try {
      // 1. Check required parameters
      const requirements = INTENT_REQUIREMENTS[intent];
      await this.validateRequired(params, requirements, errors);
      
      // 2. Validate parameter values
      await this.validateParameterValues(params, intent, errors, suggestions);
      
      // 3. Check parameter compatibility
      await this.validateCompatibility(params, requirements, errors);
      
      // 4. Add warnings for implicit parameters
      this.addImplicitWarnings(params, warnings);
      
      const valid = errors.length === 0;
      
      logger.debug('Parameter validation complete', {
        intent,
        valid,
        errorCount: errors.length,
        warningCount: warnings.length
      });
      
      return {
        valid,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };
      
    } catch (error) {
      logger.error('Parameter validation error', {
        error: (error as Error).message,
        intent
      });
      
      // Return validation error on exception
      errors.push({
        parameter: 'validation',
        message: 'Unable to validate parameters at this time',
        code: ValidationErrorCode.PERMISSION_DENIED,
        context: { error: (error as Error).message }
      });
      
      return { valid: false, errors };
    }
  }

  /**
   * Validate required parameters
   */
  private async validateRequired(
    params: CommandParameters,
    requirements: IntentParameterRequirements,
    errors: ValidationError[]
  ): Promise<void> {
    for (const required of requirements.required) {
      const value = (params as any)[required];
      
      // Check if parameter exists (either explicit or inferred)
      // Need to check both undefined and null to handle missing parameters
      if (value === undefined || value === null) {
        errors.push({
          parameter: required,
          message: `Missing required parameter: ${required}`,
          code: ValidationErrorCode.MISSING_REQUIRED
        });
      }
    }
  }

  /**
   * Validate parameter values against Linear data
   */
  private async validateParameterValues(
    params: CommandParameters,
    intent: CommandIntent,
    errors: ValidationError[],
    suggestions: ParameterSuggestion[]
  ): Promise<void> {
    // Validate team ID
    if (params.teamId) {
      await this.validateTeamId(params.teamId, errors, suggestions);
    }
    
    // Validate story ID
    if (params.storyId) {
      await this.validateStoryId(params.storyId, errors, suggestions);
    }
    
    // Validate PI ID format
    if (params.piId) {
      this.validatePIFormat(params.piId, errors);
    }
    
    // Validate numeric ranges
    if (params.storyPoints !== undefined) {
      this.validateStoryPoints(params.storyPoints, errors);
    }
    
    if (params.targetSize !== undefined) {
      this.validateTargetSize(params.targetSize, errors);
    }
    
    if (params.maxDepth !== undefined) {
      this.validateMaxDepth(params.maxDepth, errors);
    }
  }

  /**
   * Validate team ID exists in Linear
   */
  private async validateTeamId(
    teamId: string,
    errors: ValidationError[],
    suggestions: ParameterSuggestion[]
  ): Promise<void> {
    try {
      const teams = await this.linearClient.getTeams();
      const team = teams.find((t: any) => 
        t.id === teamId || 
        t.key === teamId || 
        t.name.toLowerCase() === teamId.toLowerCase()
      );
      
      if (!team) {
        errors.push({
          parameter: 'teamId',
          message: `Team not found: ${teamId}`,
          code: ValidationErrorCode.NOT_FOUND
        });
        
        // Provide suggestions
        const similar = this.findSimilarTeams(teamId, teams);
        if (similar.length > 0) {
          suggestions.push({
            parameter: 'teamId',
            currentValue: teamId,
            suggestions: similar.map(t => t.name),
            confidence: 0.8
          });
        }
      }
    } catch (error) {
      logger.warn('Unable to validate team ID', { teamId, error });
    }
  }

  /**
   * Validate story ID exists in Linear
   */
  private async validateStoryId(
    storyId: string,
    errors: ValidationError[],
    suggestions: ParameterSuggestion[]
  ): Promise<void> {
    try {
      // Try to fetch the issue
      const issue = await this.linearClient.getIssue(storyId);
      
      if (!issue) {
        errors.push({
          parameter: 'storyId',
          message: `Issue not found: ${storyId}`,
          code: ValidationErrorCode.NOT_FOUND
        });
      }
    } catch (error) {
      // Handle different error types
      if ((error as any).message?.includes('permission')) {
        errors.push({
          parameter: 'storyId',
          message: `No access to issue: ${storyId}`,
          code: ValidationErrorCode.PERMISSION_DENIED
        });
      } else {
        errors.push({
          parameter: 'storyId',
          message: `Invalid issue ID: ${storyId}`,
          code: ValidationErrorCode.INVALID_FORMAT
        });
      }
    }
  }

  /**
   * Validate PI format
   */
  private validatePIFormat(
    piId: string,
    errors: ValidationError[]
  ): void {
    const piPattern = /^PI-\d{4}-Q[1-4]$/;
    
    if (!piPattern.test(piId)) {
      errors.push({
        parameter: 'piId',
        message: `Invalid PI format: ${piId}. Expected format: PI-YYYY-QN`,
        code: ValidationErrorCode.INVALID_FORMAT,
        context: { 
          expected: 'PI-YYYY-QN',
          example: 'PI-2025-Q1'
        }
      });
    }
  }

  /**
   * Validate story points range
   */
  private validateStoryPoints(
    points: number,
    errors: ValidationError[]
  ): void {
    const validPoints = [1, 2, 3, 5, 8, 13, 21];
    
    if (!validPoints.includes(points)) {
      errors.push({
        parameter: 'storyPoints',
        message: `Invalid story points: ${points}. Use Fibonacci sequence`,
        code: ValidationErrorCode.INVALID_FORMAT,
        context: { 
          validValues: validPoints 
        }
      });
    }
  }

  /**
   * Validate target size for decomposition
   */
  private validateTargetSize(
    size: number,
    errors: ValidationError[]
  ): void {
    if (size < 1 || size > 8) {
      errors.push({
        parameter: 'targetSize',
        message: `Target size must be between 1 and 8 points`,
        code: ValidationErrorCode.OUT_OF_RANGE,
        context: { 
          min: 1, 
          max: 8 
        }
      });
    }
  }

  /**
   * Validate max depth for dependency analysis
   */
  private validateMaxDepth(
    depth: number,
    errors: ValidationError[]
  ): void {
    if (depth < 1 || depth > 10) {
      errors.push({
        parameter: 'maxDepth',
        message: `Max depth must be between 1 and 10`,
        code: ValidationErrorCode.OUT_OF_RANGE,
        context: { 
          min: 1, 
          max: 10 
        }
      });
    }
  }

  /**
   * Validate parameter compatibility
   */
  private async validateCompatibility(
    params: CommandParameters,
    requirements: IntentParameterRequirements,
    errors: ValidationError[]
  ): Promise<void> {
    // Check mutually exclusive parameters
    if (requirements.exclusive) {
      for (const exclusiveSet of requirements.exclusive) {
        const provided = exclusiveSet.filter(param => 
          (params as any)[param] !== undefined
        );
        
        if (provided.length > 1) {
          errors.push({
            parameter: provided.join(','),
            message: `Cannot specify both: ${provided.join(' and ')}`,
            code: ValidationErrorCode.INCOMPATIBLE_PARAMS,
            context: { exclusive: exclusiveSet }
          });
        }
      }
    }
    
    // Check PI and iteration compatibility
    if (params.piId && params.iterationId) {
      // Would validate that iteration belongs to PI
      // For now, just log
      logger.debug('Validating PI-iteration compatibility', {
        piId: params.piId,
        iterationId: params.iterationId
      });
    }
  }

  /**
   * Add warnings for implicit parameters
   */
  private addImplicitWarnings(
    params: CommandParameters,
    warnings: string[]
  ): void {
    // Check for specific defaults first (more specific warnings)
    if (params.targetSize === 5 && params.explicit.targetSize === false) {
      warnings.push('Using default target size of 5 points for decomposition');
    }
    
    // Then warn about general inferred parameters
    const inferred = Object.keys(params.explicit)
      .filter(key => {
        // Skip parameters that have specific warnings already
        if (key === 'targetSize' && params.targetSize === 5 && params.explicit.targetSize === false) {
          return false; // Already handled with specific warning
        }
        return params.explicit[key] === false && (params as any)[key] !== undefined;
      })
      .sort(); // Sort for deterministic ordering
    
    if (inferred.length > 0) {
      warnings.push(
        `Using inferred values: ${inferred.join(', ')}. ` +
        `Specify explicitly to override.`
      );
    }
  }

  /**
   * Find teams with similar names
   */
  private findSimilarTeams(
    search: string,
    teams: any[]
  ): any[] {
    const searchLower = search.toLowerCase();
    
    return teams
      .filter(team => 
        team.name.toLowerCase().includes(searchLower) ||
        team.key.toLowerCase().includes(searchLower)
      )
      .slice(0, 3);
  }
}