/**
 * Enhanced Behavior Executor with Response System Integration (LIN-60)
 * 
 * Extends the autonomous behavior system to use the enhanced response
 * system for all behavior notifications and communications.
 */

import { AutonomousBehaviorEngine } from './autonomous-engine';
import { EnhancedResponseEngine } from './response-engine';
import { ResponseContext, ResponseType, FormattedResponse } from './types/response-types';
import { 
  BehaviorTrigger, 
  BehaviorResult, 
  BehaviorAction,
  BehaviorContext 
} from './types/autonomous-types';
import { LinearClientWrapper } from '../linear/client';
import * as logger from '../utils/logger';

/**
 * Enhanced behavior result with formatted response
 */
export interface EnhancedBehaviorResult extends BehaviorResult {
  /** Formatted response for display */
  formattedResponse?: FormattedResponse;
  
  /** Response context used */
  responseContext?: ResponseContext;
}

/**
 * Enhanced autonomous behavior executor
 */
export class EnhancedBehaviorExecutor {
  private responseEngine: EnhancedResponseEngine;
  private behaviorEngine: AutonomousBehaviorEngine;

  constructor(
    private linearClient: LinearClientWrapper,
    config?: any
  ) {
    this.responseEngine = new EnhancedResponseEngine(linearClient);
    this.behaviorEngine = new AutonomousBehaviorEngine(config);
  }

  /**
   * Initialize the enhanced behavior executor
   */
  async initialize(): Promise<void> {
    logger.info('Initializing enhanced behavior executor');
    
    // Initialize the behavior engine
    await this.behaviorEngine.initialize();
    
    // Register response templates for autonomous behaviors
    await this.registerBehaviorTemplates();
    
    logger.info('Enhanced behavior executor initialized');
  }

  /**
   * Process a trigger with enhanced responses
   */
  async processTriggerWithResponse(trigger: BehaviorTrigger): Promise<EnhancedBehaviorResult[]> {
    const startTime = Date.now();
    
    logger.info('Processing trigger with enhanced responses', {
      triggerId: trigger.id,
      triggerType: trigger.type
    });

    try {
      // Execute behaviors using the autonomous engine
      const results = await this.behaviorEngine.processTrigger(trigger);
      
      // Enhance each result with formatted responses
      const enhancedResults: EnhancedBehaviorResult[] = [];
      
      for (const result of results) {
        const enhancedResult = await this.enhanceResult(result, trigger.context);
        enhancedResults.push(enhancedResult);
        
        // Post formatted responses as comments if applicable
        if (enhancedResult.formattedResponse && enhancedResult.shouldNotify) {
          await this.postFormattedResponse(enhancedResult, trigger.context);
        }
      }

      logger.info('Trigger processing complete with enhanced responses', {
        triggerId: trigger.id,
        resultsCount: enhancedResults.length,
        executionTime: Date.now() - startTime
      });

      return enhancedResults;

    } catch (error) {
      logger.error('Enhanced trigger processing failed', {
        triggerId: trigger.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Enhance a behavior result with formatted response
   */
  private async enhanceResult(
    result: BehaviorResult,
    behaviorContext: BehaviorContext
  ): Promise<EnhancedBehaviorResult> {
    // Build response context from behavior context
    const responseContext = this.buildResponseContext(behaviorContext);
    
    // Generate formatted response based on behavior result
    const formattedResponse = await this.generateBehaviorResponse(
      result,
      responseContext
    );

    return {
      ...result,
      formattedResponse,
      responseContext
    };
  }

  /**
   * Build response context from behavior context
   */
  private buildResponseContext(behaviorContext: BehaviorContext): ResponseContext {
    return {
      user: behaviorContext.user ? {
        id: behaviorContext.user.id,
        name: behaviorContext.user.name,
        role: 'developer' // Default role
      } : undefined,
      issue: behaviorContext.issue ? {
        id: behaviorContext.issue.id,
        identifier: behaviorContext.issue.identifier,
        type: this.determineIssueType(behaviorContext.issue),
        state: behaviorContext.issue.state?.name || 'Unknown',
        priority: behaviorContext.issue.priority || 2,
        team: behaviorContext.team ? {
          id: behaviorContext.team.id,
          name: behaviorContext.team.name
        } : undefined
      } : undefined,
      operation: {
        type: 'AUTONOMOUS_BEHAVIOR',
        complexity: 'simple',
        startTime: behaviorContext.timestamp || new Date()
      }
    };
  }

  /**
   * Generate formatted response for behavior result
   */
  private async generateBehaviorResponse(
    result: BehaviorResult,
    context: ResponseContext
  ): Promise<FormattedResponse | undefined> {
    if (!result.actions || result.actions.length === 0) {
      return undefined;
    }

    // Determine response type based on primary action
    const primaryAction = result.actions[0];
    const responseType = this.getResponseTypeForAction(primaryAction);

    // Create execution result for response engine
    const executionResult = {
      success: result.success,
      data: {
        actions: result.actions,
        behaviorData: result.data
      },
      error: result.error,
      executionTime: result.executionTime,
      command: 'autonomous_behavior',
      parameters: {}
    };

    // Generate response with proper type in metadata
    const response = await this.responseEngine.generateCommandResponse(
      context,
      executionResult
    );
    
    // Ensure response type is set in metadata
    if (response.metadata) {
      response.metadata.responseType = responseType;
    }
    
    return response;
  }

  /**
   * Get response type for behavior action
   */
  private getResponseTypeForAction(action: BehaviorAction): ResponseType {
    switch (action.type) {
      case 'suggestion':
        return ResponseType.SUGGESTION;
      case 'analysis':
      case 'report':
        return ResponseType.REPORT;
      case 'notification':
        return ResponseType.INFO;
      default:
        return ResponseType.SUCCESS;
    }
  }

  /**
   * Post formatted response as Linear comment
   */
  private async postFormattedResponse(
    result: EnhancedBehaviorResult,
    context: BehaviorContext
  ): Promise<void> {
    if (!result.formattedResponse || !context.issue?.id) {
      return;
    }

    try {
      // Post the formatted content as a comment
      await this.linearClient.createComment(
        context.issue.id,
        result.formattedResponse.markdown || result.formattedResponse.content
      );

      logger.info('Posted formatted behavior response', {
        issueId: context.issue.id,
        responseType: result.formattedResponse.type
      });

    } catch (error) {
      logger.error('Failed to post formatted response', {
        issueId: context.issue.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Register behavior-specific response templates
   */
  private async registerBehaviorTemplates(): Promise<void> {
    // Import and register autonomous behavior templates
    const { registerAutonomousBehaviorTemplates } = await import('./templates/autonomous-behavior-templates');
    registerAutonomousBehaviorTemplates(this.responseEngine);
    
    logger.info('Registered behavior-specific response templates');
  }

  /**
   * Determine issue type from Linear issue
   */
  private determineIssueType(issue: any): 'Epic' | 'Feature' | 'Story' | 'Task' | 'Bug' {
    const labels = issue.labels?.nodes || [];
    
    if (labels.some((l: any) => l.name.toLowerCase() === 'epic')) return 'Epic';
    if (labels.some((l: any) => l.name.toLowerCase() === 'feature')) return 'Feature';
    if (labels.some((l: any) => l.name.toLowerCase() === 'bug')) return 'Bug';
    if (labels.some((l: any) => l.name.toLowerCase() === 'task')) return 'Task';
    
    return 'Story';
  }

  /**
   * Get response engine for external use
   */
  getResponseEngine(): EnhancedResponseEngine {
    return this.responseEngine;
  }

  /**
   * Get behavior engine for external use
   */
  getBehaviorEngine(): AutonomousBehaviorEngine {
    return this.behaviorEngine;
  }

  /**
   * Enable or disable a behavior
   */
  setBehaviorEnabled(behaviorId: string, enabled: boolean): void {
    this.behaviorEngine.setBehaviorEnabled(behaviorId, enabled);
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: any): void {
    this.behaviorEngine.updateConfiguration(config);
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<any> {
    return await this.behaviorEngine.getHealthStatus();
  }

  /**
   * Get metrics
   */
  getMetrics(startDate?: Date, endDate?: Date): any {
    return this.behaviorEngine.getMetrics(startDate, endDate);
  }

  /**
   * Shutdown the executor
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down enhanced behavior executor');
    await this.behaviorEngine.shutdown();
  }
}