/**
 * Enhanced Response Engine for Enhanced Response System (LIN-60)
 * 
 * Main orchestrator for generating professional, context-aware responses
 * that integrate with the command execution and autonomous behavior systems.
 */

import { LinearClientWrapper } from '../linear/client';
import { ResponseTemplateEngine } from './response-template-engine';
import { ResponseContextAnalyzer } from './context-analyzer';
import { ProgressTracker } from './progress-tracker';
import { EnhancedResponseFormatter } from './enhanced-response-formatter';
import { PersonalityAdapter, SAAFEPULSE_PERSONALITY } from './personality/agent-personality';
import {
  ResponseContext,
  EnhancedResponse,
  ResponseOptions,
  FormattedResponse,
  ResponseType,
  ProgressUpdate
} from './types/response-types';
import { ExecutionResult } from './cli-executor';
import { BehaviorResult } from './types/autonomous-types';
import * as logger from '../utils/logger';

/**
 * Configuration for response engine
 */
export interface ResponseEngineConfig {
  enableProgressTracking: boolean;
  progressThreshold: number; // milliseconds before showing progress
  cacheResponses: boolean;
  maxCacheSize: number;
  defaultOptions: ResponseOptions;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ResponseEngineConfig = {
  enableProgressTracking: true,
  progressThreshold: 5000, // 5 seconds
  cacheResponses: true,
  maxCacheSize: 100,
  defaultOptions: {
    includeMetadata: true,
    format: 'markdown',
    priority: 'normal'
  }
};

/**
 * Main response engine
 */
export class EnhancedResponseEngine {
  private templateEngine: ResponseTemplateEngine;
  private contextAnalyzer: ResponseContextAnalyzer;
  private progressTracker: ProgressTracker;
  private formatter: EnhancedResponseFormatter;
  private responseCache: Map<string, FormattedResponse> = new Map();
  private config: ResponseEngineConfig;
  private cacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    totalRenderTime: 0,
    renderCount: 0
  };

  constructor(
    private linearClient: LinearClientWrapper,
    config: Partial<ResponseEngineConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize components
    this.templateEngine = new ResponseTemplateEngine();
    this.contextAnalyzer = new ResponseContextAnalyzer();
    this.progressTracker = new ProgressTracker(linearClient, this.templateEngine);
    this.formatter = new EnhancedResponseFormatter();
    
    this.initializeTemplates();
  }

  /**
   * Generate response for command execution
   */
  async generateCommandResponse(
    context: ResponseContext,
    result: ExecutionResult,
    options: ResponseOptions = {}
  ): Promise<FormattedResponse> {
    try {
      const startTime = Date.now();
      const mergedOptions = { ...this.config.defaultOptions, ...options };

      // Check cache if enabled
      const cacheKey = this.generateCacheKey('command', context, result);
      this.cacheStats.totalRequests++;
      
      if (this.config.cacheResponses && this.responseCache.has(cacheKey)) {
        logger.debug('Returning cached response', { cacheKey });
        this.cacheStats.hits++;
        return this.responseCache.get(cacheKey)!;
      }
      
      this.cacheStats.misses++;

      // Analyze context
      const analysis = this.contextAnalyzer.analyzeContext(context);

      // Generate enhanced response based on result type
      let enhancedResponse: EnhancedResponse;
      
      if (result.success) {
        enhancedResponse = this.generateSuccessResponse(context, result, analysis);
      } else {
        enhancedResponse = this.generateErrorResponse(context, result, analysis);
      }

      // Format to final output
      const formattedResponse = this.formatter.formatToOutput(
        enhancedResponse,
        mergedOptions.format
      );

      // Cache if enabled
      if (this.config.cacheResponses && !result.error) {
        this.cacheResponse(cacheKey, formattedResponse);
      }

      // Log metrics
      const executionTime = Date.now() - startTime;
      this.cacheStats.totalRenderTime += executionTime;
      this.cacheStats.renderCount++;
      
      logger.info('Generated command response', {
        command: context.command?.intent,
        executionTime,
        responseLength: formattedResponse.content.length,
        truncated: formattedResponse.truncated
      });

      return formattedResponse;
    } catch (error) {
      logger.error('Failed to generate command response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        command: context.command?.intent
      });

      // Return fallback response
      return this.generateFallbackResponse(error);
    }
  }

  /**
   * Generate response for autonomous behavior
   */
  async generateBehaviorResponse(
    context: ResponseContext,
    result: BehaviorResult,
    options: ResponseOptions = {}
  ): Promise<FormattedResponse> {
    try {
      const startTime = Date.now();
      const mergedOptions = { ...this.config.defaultOptions, ...options };

      // Analyze context
      const analysis = this.contextAnalyzer.analyzeContext(context);

      // Generate enhanced response
      const behaviorType = context.operation?.type || 'unknown';
      const enhancedResponse = this.formatter.formatBehaviorSuggestion(
        behaviorType,
        result,
        analysis
      );

      // Format to final output
      const formattedResponse = this.formatter.formatToOutput(
        enhancedResponse,
        mergedOptions.format
      );

      // Log metrics
      const executionTime = Date.now() - startTime;
      logger.info('Generated behavior response', {
        behavior: behaviorType,
        executionTime,
        responseLength: formattedResponse.content.length
      });

      return formattedResponse;
    } catch (error) {
      logger.error('Failed to generate behavior response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        behavior: context.operation?.type || 'unknown'
      });

      return this.generateFallbackResponse(error);
    }
  }

  /**
   * Generate response with progress tracking
   */
  async generateResponseWithProgress<T>(
    context: ResponseContext,
    operation: Promise<T>,
    operationSteps: { name: string; description: string; estimatedDuration: number; status?: string }[],
    options: ResponseOptions = {}
  ): Promise<FormattedResponse> {
    const operationId = this.generateOperationId();
    const issueId = context.issue?.id;

    if (!issueId) {
      throw new Error('Issue ID required for progress tracking');
    }

    // Check if operation is long-running
    const estimatedDuration = operationSteps.reduce((sum, step) => sum + step.estimatedDuration, 0);
    const shouldTrackProgress = this.config.enableProgressTracking && 
                               estimatedDuration > this.config.progressThreshold;

    if (shouldTrackProgress) {
      // Execute with progress tracking
      const stepsWithStatus = operationSteps.map(step => ({
        ...step,
        status: 'pending' as const
      }));
      
      const result = await this.progressTracker.trackOperation(
        operationId,
        issueId,
        operation,
        stepsWithStatus,
        (update: ProgressUpdate) => {
          logger.debug('Progress update', { operationId, progress: update.progress });
        }
      );

      // Generate final response
      return this.generateCommandResponse(
        { ...context, operation: { ...context.operation!, type: 'completed', complexity: context.operation?.complexity || 'simple' } },
        result,
        options
      );
    } else {
      // Execute without progress tracking
      const result = await operation;
      
      // Type guard to convert to ExecutionResult
      const executionResult: ExecutionResult = this.isExecutionResult(result) 
        ? result 
        : { 
            success: true, 
            data: result,
            executionTime: Date.now() - (context.operation?.startTime?.getTime() || Date.now()),
            command: context.command?.intent || 'unknown',
            parameters: context.command?.parameters || {}
          };
      
      return this.generateCommandResponse(context, executionResult, options);
    }
  }

  /**
   * Generate progress update response
   */
  async generateProgressResponse(
    progress: ProgressUpdate,
    context: ResponseContext,
    options: ResponseOptions = {}
  ): Promise<FormattedResponse> {
    const template = this.templateEngine.selectTemplate(
      ResponseType.PROGRESS,
      'operation_progress',
      this.contextAnalyzer.analyzeContext(context)
    );

    if (!template) {
      throw new Error('No progress template available');
    }

    const content = this.templateEngine.renderTemplate(template, {
      title: 'Operation in Progress',
      progress: progress.progress,
      status: progress.status,
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps.join(', '),
      remainingSteps: progress.remainingSteps.join(', '),
      estimatedTimeRemaining: progress.estimatedTimeRemaining,
      hasPreliminaryResults: !!progress.preliminaryResults,
      preliminaryResults: JSON.stringify(progress.preliminaryResults || {})
    });

    return {
      content,
      format: options.format || 'markdown',
      truncated: false
    };
  }

  /**
   * Generate success response
   */
  private generateSuccessResponse(
    context: ResponseContext,
    result: ExecutionResult,
    analysis: any
  ): EnhancedResponse {
    // Route to specific formatter based on command
    const command = context.command?.intent || 'unknown';
    
    // Special handling for ART planning
    if (command.includes('plan') && command.includes('pi')) {
      return this.formatter.formatARTPlanningResult(result.data, analysis);
    }

    // Default command result formatting
    return this.formatter.formatCommandResult(command, result, analysis);
  }

  /**
   * Generate error response
   */
  private generateErrorResponse(
    context: ResponseContext,
    result: ExecutionResult,
    analysis: any
  ): EnhancedResponse {
    return this.formatter.formatErrorResponse(
      result.error || { message: 'Unknown error occurred' },
      context,
      analysis
    );
  }

  /**
   * Generate fallback response for critical errors
   */
  private generateFallbackResponse(error: any): FormattedResponse {
    const content = `# ❌ Response Generation Failed

I encountered an error while generating the response. The operation may have completed successfully, but I couldn't format the results properly.

**Error**: ${error?.message || 'Unknown error'}

Please try again or contact support if the issue persists.

---
*Error ID: ${this.generateErrorId()} | Generated by @saafepulse*`;

    return {
      content,
      format: 'markdown',
      truncated: false
    };
  }

  /**
   * Initialize response templates
   */
  private initializeTemplates(): void {
    // ART Planning Success Template
    this.templateEngine.registerTemplate({
      id: 'success_art_planning',
      name: 'ART Planning Success',
      type: ResponseType.SUCCESS,
      template: `# 🎯 ART Planning Complete ✅

**PI**: {{programIncrement}} | **Team**: {{teamName}}  
**Iterations**: {{iterations}} planned | **Work Items**: {{workItems}} allocated  
**Completion**: {{completionTime}}

## 📊 Key Results
{{keyResults}}

## 🎯 Highlights
{{highlights}}

## 📋 Next Steps
{{nextSteps}}

{{section:links}}

---
*{{footer}}*`,
      variables: [
        { name: 'programIncrement', type: 'string', required: true },
        { name: 'teamName', type: 'string', required: true },
        { name: 'iterations', type: 'number', required: true },
        { name: 'workItems', type: 'number', required: true },
        { name: 'completionTime', type: 'date', required: true },
        { name: 'keyResults', type: 'string', required: true },
        { name: 'highlights', type: 'string', required: true },
        { name: 'nextSteps', type: 'string', required: true },
        { name: 'footer', type: 'string', required: true }
      ],
      sections: [
        {
          name: 'links',
          condition: 'hasLinks === true',
          template: '{{links}}'
        }
      ]
    });

    // Story Monitoring Suggestion Template
    this.templateEngine.registerTemplate({
      id: 'suggestion_story_monitoring',
      name: 'Story Monitoring Suggestion',
      type: ResponseType.SUGGESTION,
      template: `# 🤖 Proactive Suggestion: Story Decomposition

Hi team! I noticed this story has **{{storyPoints}} story points**, which is above our recommended maximum of {{maxPoints}} points for optimal delivery.

## 📊 Analysis
- **Current Size**: {{storyPoints}} points ({{sizeLabel}})
- **Recommended**: Break into {{recommendedParts}} smaller stories
- **Benefits**: {{benefits}}

## 💡 Decomposition Suggestions
{{suggestions}}

## 🚀 Next Steps
{{nextSteps}}

*{{footer}}*`,
      variables: [
        { name: 'storyPoints', type: 'number', required: true },
        { name: 'maxPoints', type: 'number', required: true, defaultValue: 5 },
        { name: 'sizeLabel', type: 'string', required: true },
        { name: 'recommendedParts', type: 'string', required: true },
        { name: 'benefits', type: 'string', required: true },
        { name: 'suggestions', type: 'string', required: true },
        { name: 'nextSteps', type: 'string', required: true },
        { name: 'footer', type: 'string', required: true }
      ]
    });

    logger.info('Initialized response templates');
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(type: string, context: ResponseContext, result: any): string {
    const parts = [
      type,
      context.command?.intent || 'unknown',
      context.user?.id || 'anonymous',
      JSON.stringify(context.command?.parameters || {}),
      result.success ? 'success' : 'error'
    ];
    return parts.join(':');
  }

  /**
   * Cache response
   */
  private cacheResponse(key: string, response: FormattedResponse): void {
    // Implement LRU cache behavior
    if (this.responseCache.size >= this.config.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) {
        this.responseCache.delete(firstKey);
      }
    }
    this.responseCache.set(key, response);
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate error ID
   */
  private generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  /**
   * Type guard for ExecutionResult
   */
  private isExecutionResult(result: any): result is ExecutionResult {
    return result && typeof result === 'object' && 'success' in result;
  }

  /**
   * Register a response template
   */
  registerTemplate(template: any): void {
    this.templateEngine.registerTemplate(template);
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    this.responseCache.clear();
    logger.info('Response cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    size: number; 
    maxSize: number; 
    hitRate: number;
    hits: number;
    misses: number;
    avgRenderTime: number;
  } {
    const hitRate = this.cacheStats.totalRequests > 0 
      ? this.cacheStats.hits / this.cacheStats.totalRequests 
      : 0;
      
    const avgRenderTime = this.cacheStats.renderCount > 0
      ? this.cacheStats.totalRenderTime / this.cacheStats.renderCount
      : 0;
    
    return {
      size: this.responseCache.size,
      maxSize: this.config.maxCacheSize,
      hitRate,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      avgRenderTime
    };
  }
}