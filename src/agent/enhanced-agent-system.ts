/**
 * Enhanced Agent System (LIN-60)
 * 
 * Main integration module that combines command intelligence (LIN-61/62),
 * autonomous behaviors (LIN-59), and enhanced responses (LIN-60) into
 * a cohesive agent system.
 */

import { LinearClientWrapper } from '../linear/client';
import { EnhancedCLIExecutor } from './enhanced-cli-executor';
import { EnhancedBehaviorExecutor } from './enhanced-behavior-executor';
import { AgentCommandParser } from './command-parser';
import { ParsedCommand } from './types/command-types';
import { BehaviorTrigger, BehaviorTriggerType } from './types/autonomous-types';
import * as logger from '../utils/logger';

// Import behaviors
import { EnhancedStoryMonitoringBehavior } from './behaviors/enhanced-story-monitoring.behavior';
import { StoryMonitoringBehavior } from './behaviors/story-monitoring.behavior';
import { ARTHealthMonitoringBehavior } from './behaviors/art-health-monitoring.behavior';
import { DependencyDetectionBehavior } from './behaviors/dependency-detection.behavior';
import { WorkflowAutomationBehavior } from './behaviors/workflow-automation.behavior';
import { PeriodicReportingBehavior } from './behaviors/periodic-reporting.behavior';
import { AnomalyDetectionBehavior } from './behaviors/anomaly-detection.behavior';

/**
 * Configuration for the enhanced agent system
 */
export interface EnhancedAgentConfig {
  /** Linear API configuration */
  linear: {
    apiKey: string;
    organizationId: string;
  };
  
  /** Behavior configuration */
  behaviors?: {
    enabled: boolean;
    config?: any;
  };
  
  /** Response configuration */
  responses?: {
    enableRichFormatting: boolean;
    enableProgressTracking: boolean;
    enablePersonality: boolean;
  };
  
  /** Database connection (optional) */
  database?: any;
}

/**
 * Main enhanced agent system
 */
export class EnhancedAgentSystem {
  private linearClient: LinearClientWrapper;
  private cliExecutor: EnhancedCLIExecutor;
  private behaviorExecutor: EnhancedBehaviorExecutor;
  private commandParser: AgentCommandParser;
  private initialized = false;

  constructor(private config: EnhancedAgentConfig) {
    // Initialize Linear client
    this.linearClient = new LinearClientWrapper(config.linear.apiKey, config.linear.organizationId);
    
    // Initialize components
    this.cliExecutor = new EnhancedCLIExecutor(
      this.linearClient,
      config.database
    );
    
    this.behaviorExecutor = new EnhancedBehaviorExecutor(
      this.linearClient,
      config.behaviors?.config
    );
    
    this.commandParser = new AgentCommandParser();
  }

  /**
   * Initialize the agent system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Agent system already initialized');
      return;
    }

    logger.info('Initializing enhanced agent system');

    try {
      // Register behaviors if enabled
      if (this.config.behaviors?.enabled) {
        await this.registerBehaviors();
        await this.behaviorExecutor.initialize();
      }

      // Command parser initializes itself in constructor, no need to call initialize

      this.initialized = true;
      logger.info('Enhanced agent system initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize agent system', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Process a natural language command
   */
  async processCommand(input: string, context?: any): Promise<any> {
    const startTime = Date.now();
    
    logger.info('Processing command', {
      input: input.substring(0, 100),
      hasContext: !!context
    });

    try {
      // Parse the command
      const parsedCommand = this.commandParser.parseCommand(input, context || {});
      
      // Execute with enhanced response
      const result = await this.cliExecutor.executeWithEnhancedResponse(parsedCommand);
      
      // Trigger any follow-up behaviors
      if (this.config.behaviors?.enabled) {
        await this.triggerPostCommandBehaviors(parsedCommand, result);
      }

      logger.info('Command processing complete', {
        command: parsedCommand.intent,
        success: result.success,
        executionTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logger.error('Command processing failed', {
        input,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Process a webhook event
   */
  async processWebhook(event: any): Promise<any> {
    if (!this.config.behaviors?.enabled) {
      logger.debug('Behaviors disabled, skipping webhook processing');
      return { processed: false, reason: 'Behaviors disabled' };
    }

    logger.info('Processing webhook event', {
      action: event.action,
      type: event.type
    });

    try {
      // Create behavior trigger from webhook
      const trigger: BehaviorTrigger = {
        id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: BehaviorTriggerType.WEBHOOK,
        payload: event,
        context: this.extractBehaviorContext(event),
        timestamp: new Date()
      };

      // Process with enhanced responses
      const results = await this.behaviorExecutor.processTriggerWithResponse(trigger);

      logger.info('Webhook processing complete', {
        triggerId: trigger.id,
        behaviorsExecuted: results.length,
        successCount: results.filter(r => r.success).length
      });

      return {
        processed: true,
        results
      };

    } catch (error) {
      logger.error('Webhook processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Register all behaviors
   */
  private async registerBehaviors(): Promise<void> {
    logger.info('Registering autonomous behaviors');

    const behaviorEngine = this.behaviorExecutor.getBehaviorEngine();

    // Register enhanced story monitoring (higher priority)
    behaviorEngine.registerBehavior(
      new EnhancedStoryMonitoringBehavior(this.linearClient)
    );

    // Register standard behaviors
    behaviorEngine.registerBehavior(
      new StoryMonitoringBehavior(this.linearClient)
    );

    behaviorEngine.registerBehavior(
      new ARTHealthMonitoringBehavior(this.linearClient)
    );

    behaviorEngine.registerBehavior(
      new DependencyDetectionBehavior(this.linearClient)
    );

    behaviorEngine.registerBehavior(
      new WorkflowAutomationBehavior(this.linearClient)
    );

    behaviorEngine.registerBehavior(
      new PeriodicReportingBehavior(this.linearClient)
    );

    behaviorEngine.registerBehavior(
      new AnomalyDetectionBehavior(this.linearClient)
    );

    logger.info('Registered all autonomous behaviors');
  }

  /**
   * Trigger post-command behaviors
   */
  private async triggerPostCommandBehaviors(
    command: ParsedCommand,
    result: any
  ): Promise<void> {
    if (!result.success) {
      return;
    }

    // Create trigger for command completion
    const trigger: BehaviorTrigger = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: BehaviorTriggerType.COMMAND_COMPLETION,
      payload: {
        command,
        result
      },
      context: {
        issue: command.context.issueId ? {
          id: command.context.issueId,
          identifier: command.context.issueIdentifier
        } : undefined,
        team: command.context.teamId ? {
          id: command.context.teamId,
          name: command.context.teamName || 'Team',
          key: command.context.teamId // Use teamId as key
        } : undefined,
        user: command.context.assigneeId ? {
          id: command.context.assigneeId,
          name: command.context.assigneeName || 'User'
        } : undefined,
        timestamp: new Date()
      },
      timestamp: new Date()
    };

    try {
      await this.behaviorExecutor.processTriggerWithResponse(trigger);
    } catch (error) {
      logger.error('Post-command behavior processing failed', {
        commandIntent: command.intent,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Extract behavior context from webhook event
   */
  private extractBehaviorContext(event: any): any {
    return {
      issue: event.data,
      previousState: event.previousData,
      team: event.data?.team ? {
        id: event.data.team.id,
        name: event.data.team.name,
        key: event.data.team.key || event.data.team.id // Use id as fallback for key
      } : undefined,
      triggerType: 'webhook',
      timestamp: new Date(event.createdAt || Date.now())
    };
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<any> {
    const health: any = {
      system: 'healthy',
      components: {}
    };

    // Check Linear API
    try {
      await this.linearClient.getUser();
      health.components.linearApi = 'healthy';
    } catch (error) {
      health.components.linearApi = 'unhealthy';
      health.system = 'degraded';
    }

    // Check behaviors if enabled
    if (this.config.behaviors?.enabled) {
      const behaviorHealth = await this.behaviorExecutor.getHealthStatus();
      health.components.behaviors = behaviorHealth;
    }

    // Add response engine status
    health.components.responseEngine = 'healthy';

    return health;
  }

  /**
   * Get system metrics
   */
  getMetrics(startDate?: Date, endDate?: Date): any {
    const metrics: any = {
      period: {
        start: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: endDate || new Date()
      }
    };

    // Get behavior metrics if enabled
    if (this.config.behaviors?.enabled) {
      metrics.behaviors = this.behaviorExecutor.getMetrics(startDate, endDate);
    }

    // Add response engine metrics
    const responseEngine = this.cliExecutor.getResponseEngine();
    metrics.responses = {
      cacheHitRate: responseEngine.getCacheStats().hitRate,
      averageRenderTime: responseEngine.getCacheStats().avgRenderTime
    };

    return metrics;
  }

  /**
   * Update system configuration
   */
  updateConfiguration(config: Partial<EnhancedAgentConfig>): void {
    if (config.behaviors?.config) {
      this.behaviorExecutor.updateConfiguration(config.behaviors.config);
    }
    
    logger.info('System configuration updated');
  }

  /**
   * Shutdown the system
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down enhanced agent system');
    
    if (this.config.behaviors?.enabled) {
      await this.behaviorExecutor.shutdown();
    }
    
    logger.info('Enhanced agent system shut down successfully');
  }
}