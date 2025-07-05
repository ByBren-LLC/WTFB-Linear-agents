/**
 * Parameter Translator
 * 
 * Translates CommandParameters from LIN-62 format to module-specific formats.
 * Ensures compatibility between command intelligence and SAFe modules.
 */

import { CommandParameters, TimeReference, ScopeReference } from './types/parameter-types';
import { CommandIntent } from './types/command-types';
import { ProgramIncrement } from '../safe/pi-model';
import { PlanningWorkItem } from '../types/art-planning-types';
import * as logger from '../utils/logger';

/**
 * Module-specific parameter formats
 */
export interface ARTPlannerParams {
  programIncrement: ProgramIncrement;
  workItems: PlanningWorkItem[];
  dependencies: any; // DependencyGraph
  teams: any[]; // ARTTeam[]
  config?: {
    iterations?: number;
    bufferCapacity?: number;
    enableValueOptimization?: boolean;
  };
}

export interface StoryDecompositionParams {
  storyId: string;
  story: any; // Story object
  maxPoints: number;
  decompositionStrategy?: 'technical' | 'functional' | 'mixed';
}

export interface ValueAnalysisParams {
  iterationId?: string;
  iteration?: any; // IterationPlan
  scope?: 'iteration' | 'pi' | 'team';
  depth?: 'summary' | 'detailed' | 'full';
}

export interface DependencyMapperParams {
  workItems: any[]; // PlanningWorkItem[]
  startingPoint?: string;
  direction?: 'upstream' | 'downstream' | 'both';
  maxDepth?: number;
}

/**
 * Parameter Translator
 * 
 * Handles conversion between command parameters and module-specific formats
 */
export class ParameterTranslator {
  constructor() {}

  /**
   * Translate parameters based on command intent
   */
  translateForIntent(
    params: CommandParameters,
    intent: CommandIntent,
    context?: any
  ): any {
    logger.debug('Translating parameters', { intent, params });

    switch (intent) {
      case CommandIntent.ART_PLAN:
        return this.translateForARTPlanner(params, context);
      
      case CommandIntent.STORY_DECOMPOSE:
        return this.translateForStoryDecomposition(params, context);
      
      case CommandIntent.VALUE_ANALYZE:
        return this.translateForValueAnalysis(params, context);
      
      case CommandIntent.DEPENDENCY_MAP:
        return this.translateForDependencyMapper(params, context);
      
      case CommandIntent.STATUS_CHECK:
        return this.translateForStatusCheck(params, context);
      
      case CommandIntent.ART_OPTIMIZE:
        return this.translateForOptimization(params, context);
      
      case CommandIntent.STORY_SCORE:
        return this.translateForScoring(params, context);
      
      default:
        return params; // Return as-is for unknown intents
    }
  }

  /**
   * Translate for ART Planner
   */
  private translateForARTPlanner(
    params: CommandParameters,
    context?: any
  ): Partial<ARTPlannerParams> {
    const translated: any = {
      ...params  // Preserve original parameters
    };

    // Map PI ID
    if (params.piId) {
      translated.piId = params.piId;
      // TODO: Create actual ProgramIncrement object from Linear data
    }

    // Map team ID
    if (params.teamId) {
      translated.teamId = params.teamId;
    }

    // Apply defaults at top level for compatibility
    translated.iterations = params.iterations || 6;
    translated.iterationLength = params.iterationLength || 14;
    translated.bufferCapacity = params.bufferCapacity || 0.2;
    translated.enableValueOptimization = 
      params.enableValueOptimization !== false;

    // Handle timeframe if no explicit PI
    if (!params.piId && params.timeframe) {
      translated.piId = this.resolvePIFromTimeframe(params.timeframe);
    }

    return translated;
  }

  /**
   * Translate for Story Decomposition
   */
  private translateForStoryDecomposition(
    params: CommandParameters,
    context?: any
  ): Partial<StoryDecompositionParams> {
    const translated: any = {};

    // Map story ID (required)
    if (params.storyId) {
      translated.storyId = params.storyId;
    }

    // Map target size to maxPoints
    translated.maxPoints = params.targetSize || 5;

    // Infer decomposition strategy from depth
    if (params.depth === 'detailed') {
      translated.decompositionStrategy = 'technical';
    } else if (params.depth === 'full') {
      translated.decompositionStrategy = 'functional';
    } else {
      translated.decompositionStrategy = 'mixed';
    }

    // Add story points if provided
    if (params.storyPoints) {
      translated.originalPoints = params.storyPoints;
    }

    return translated;
  }

  /**
   * Translate for Value Analysis
   */
  private translateForValueAnalysis(
    params: CommandParameters,
    context?: any
  ): Partial<ValueAnalysisParams> {
    const translated: any = {};

    // Map iteration ID
    if (params.iterationId) {
      translated.iterationId = params.iterationId;
    }

    // Map scope
    if (params.scope) {
      translated.scope = this.translateScope(params.scope);
    } else if (params.teamId) {
      translated.scope = 'team';
      translated.teamId = params.teamId;
    }

    // Map depth (default summary)
    translated.depth = params.depth || 'summary';

    // Handle timeframe
    if (params.timeframe) {
      const resolved = this.resolveTimeframe(params.timeframe);
      if (resolved.iterationId) {
        translated.iterationId = resolved.iterationId;
      }
      if (resolved.piId) {
        translated.piId = resolved.piId;
      }
    }

    // Map output format
    if (params.format) {
      translated.outputFormat = params.format;
    }

    return translated;
  }

  /**
   * Translate for Dependency Mapper
   */
  private translateForDependencyMapper(
    params: CommandParameters,
    context?: any
  ): Partial<DependencyMapperParams> {
    const translated: any = {
      ...params  // Preserve original parameters
    };

    // Map starting point (keep both for compatibility)
    if (params.fromId) {
      translated.startingPoint = params.fromId;
      translated.fromId = params.fromId;
    } else if (params.storyId) {
      translated.startingPoint = params.storyId;
      translated.storyId = params.storyId;
    }

    // Map direction (default both)
    translated.direction = params.direction || 'both';

    // Map max depth (default 3)
    translated.maxDepth = params.maxDepth || 3;

    // Map scope to filter work items
    if (params.scope) {
      translated.scopeFilter = this.translateScope(params.scope);
    }

    // Map team filter
    if (params.teamId) {
      translated.teamFilter = params.teamId;
    }

    return translated;
  }

  /**
   * Translate for Status Check
   */
  private translateForStatusCheck(
    params: CommandParameters,
    context?: any
  ): any {
    const translated: any = {};

    // Map scope
    if (params.scope) {
      translated.scope = this.translateScope(params.scope);
    } else {
      // Default to team scope from context
      translated.scope = {
        type: 'team',
        id: params.teamId || context?.teamId
      };
    }

    // Map format (default markdown)
    translated.format = params.format || 'markdown';

    // Map timeframe
    if (params.timeframe) {
      translated.timeRange = this.translateTimeRange(params.timeframe);
    }

    // Map depth
    translated.includeDetails = params.depth !== 'summary';

    return translated;
  }

  /**
   * Translate for ART Optimization
   */
  private translateForOptimization(
    params: CommandParameters,
    context?: any
  ): any {
    const translated: any = {};

    // Map team and PI
    translated.teamId = params.teamId || context?.teamId;
    translated.piId = params.piId || this.getCurrentPI();

    // Map optimization preferences
    translated.optimizationGoals = [];
    
    if (params.optimizeForValue !== false) {
      translated.optimizationGoals.push('value');
    }
    
    if (params.optimizeForDependencies !== false) {
      translated.optimizationGoals.push('dependencies');
    }
    
    if (params.optimizeForCapacity !== false) {
      translated.optimizationGoals.push('capacity');
    }

    return translated;
  }

  /**
   * Translate for Story Scoring
   */
  private translateForScoring(
    params: CommandParameters,
    context?: any
  ): any {
    const translated: any = {};

    // Map story ID (required)
    translated.storyId = params.storyId;

    // Map story points
    if (params.storyPoints) {
      translated.storyPoints = params.storyPoints;
    }

    // Map WSJF parameters if provided
    translated.wsjfParams = {
      updatePriorities: params.updatePriorities || false
    };

    return translated;
  }

  /**
   * Translate scope reference
   */
  private translateScope(scope: ScopeReference): any {
    if (!scope) return null;

    return {
      type: scope.type,
      id: scope.id,
      name: scope.name
    };
  }

  /**
   * Translate time reference to concrete values
   */
  private resolveTimeframe(timeRef: TimeReference): any {
    const result: any = {};

    switch (timeRef.type) {
      case 'current':
        if (timeRef.period === 'pi') {
          result.piId = this.getCurrentPI();
        } else if (timeRef.period === 'sprint' || timeRef.period === 'iteration') {
          result.iterationId = this.getCurrentIteration();
        }
        break;
      
      case 'next':
        if (timeRef.period === 'pi') {
          result.piId = this.getNextPI();
        } else if (timeRef.period === 'sprint' || timeRef.period === 'iteration') {
          result.iterationId = this.getNextIteration();
        }
        break;
      
      case 'previous':
        if (timeRef.period === 'pi') {
          result.piId = this.getPreviousPI();
        } else if (timeRef.period === 'sprint' || timeRef.period === 'iteration') {
          result.iterationId = this.getPreviousIteration();
        }
        break;
      
      case 'specific':
        if (timeRef.value) {
          result.specificDate = timeRef.value;
        }
        break;
    }

    return result;
  }

  /**
   * Translate time reference to date range
   */
  private translateTimeRange(timeRef: TimeReference): any {
    const now = new Date();
    const range: any = {};

    switch (timeRef.type) {
      case 'current':
        if (timeRef.period === 'week') {
          range.start = this.getWeekStart(now);
          range.end = this.getWeekEnd(now);
        } else if (timeRef.period === 'month') {
          range.start = this.getMonthStart(now);
          range.end = this.getMonthEnd(now);
        } else if (timeRef.period === 'quarter') {
          range.start = this.getQuarterStart(now);
          range.end = this.getQuarterEnd(now);
        }
        break;
      
      case 'relative':
        // Handle relative time like "last 30 days"
        if (timeRef.value) {
          const match = timeRef.value.match(/last (\d+) (days?|weeks?|months?)/);
          if (match) {
            const amount = parseInt(match[1]);
            const unit = match[2];
            range.start = this.subtractTime(now, amount, unit);
            range.end = now;
          }
        }
        break;
    }

    return range;
  }

  /**
   * Resolve PI from timeframe
   */
  private resolvePIFromTimeframe(timeRef: TimeReference): string {
    if (timeRef.type === 'current' && timeRef.period === 'pi') {
      return this.getCurrentPI();
    } else if (timeRef.type === 'next' && timeRef.period === 'pi') {
      return this.getNextPI();
    } else if (timeRef.type === 'previous' && timeRef.period === 'pi') {
      return this.getPreviousPI();
    }
    
    // Default to current PI
    return this.getCurrentPI();
  }

  // Helper methods for time calculations
  private getCurrentPI(): string {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `PI-${now.getFullYear()}-Q${quarter}`;
  }

  private getNextPI(): string {
    const now = new Date();
    let quarter = Math.floor(now.getMonth() / 3) + 1;
    let year = now.getFullYear();
    
    quarter++;
    if (quarter > 4) {
      quarter = 1;
      year++;
    }
    
    return `PI-${year}-Q${quarter}`;
  }

  private getPreviousPI(): string {
    const now = new Date();
    let quarter = Math.floor(now.getMonth() / 3) + 1;
    let year = now.getFullYear();
    
    quarter--;
    if (quarter < 1) {
      quarter = 4;
      year--;
    }
    
    return `PI-${year}-Q${quarter}`;
  }

  private getCurrentIteration(): string {
    // TODO: Get from Linear cycles
    return 'current-iteration';
  }

  private getNextIteration(): string {
    // TODO: Get from Linear cycles
    return 'next-iteration';
  }

  private getPreviousIteration(): string {
    // TODO: Get from Linear cycles
    return 'previous-iteration';
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  private getWeekEnd(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + 7;
    return new Date(d.setDate(diff));
  }

  private getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private getMonthEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  private getQuarterStart(date: Date): Date {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3, 1);
  }

  private getQuarterEnd(date: Date): Date {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3 + 3, 0);
  }

  private subtractTime(date: Date, amount: number, unit: string): Date {
    const d = new Date(date);
    
    if (unit.startsWith('day')) {
      d.setDate(d.getDate() - amount);
    } else if (unit.startsWith('week')) {
      d.setDate(d.getDate() - (amount * 7));
    } else if (unit.startsWith('month')) {
      d.setMonth(d.getMonth() - amount);
    }
    
    return d;
  }
}