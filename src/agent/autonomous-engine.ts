/**
 * Autonomous Behavior Engine (LIN-59)
 * 
 * Main orchestration engine for proactive agent behaviors.
 * Manages behavior registration, triggering, and execution.
 */

import {
  AutonomousBehavior,
  BehaviorTrigger,
  BehaviorContext,
  BehaviorResult,
  BehaviorHealthStatus,
  BehaviorConfiguration,
  BehaviorMetrics,
  BehaviorTriggerType
} from './types/autonomous-types';
import { BehaviorScheduler } from './monitoring/behavior-scheduler';
import { HealthMonitor } from './monitoring/health-monitor';
import * as logger from '../utils/logger';

/**
 * Default configuration for autonomous behaviors
 */
const DEFAULT_CONFIG: BehaviorConfiguration = {
  storyPointThreshold: 5,
  artReadinessThreshold: 0.85,
  enabledBehaviors: {
    story_monitoring: true,
    art_health_monitoring: true,
    dependency_detection: true,
    workflow_automation: true,
    periodic_reporting: true,
    anomaly_detection: true
  },
  notifications: {
    slackEnabled: true,
    emailEnabled: false
  },
  rateLimits: {
    maxPerMinute: 10,
    maxPerHour: 100,
    maxCommentsPerIssue: 5
  }
};

/**
 * Main autonomous behavior engine
 */
export class AutonomousBehaviorEngine {
  private behaviors: Map<string, AutonomousBehavior> = new Map();
  private scheduler: BehaviorScheduler;
  private healthMonitor: HealthMonitor;
  private config: BehaviorConfiguration;
  private executionCounts: Map<string, number> = new Map();
  private lastExecutionTimes: Map<string, Date> = new Map();
  
  constructor(config: Partial<BehaviorConfiguration> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scheduler = new BehaviorScheduler(this);
    this.healthMonitor = new HealthMonitor();
    
    logger.info('AutonomousBehaviorEngine initialized', {
      enabledBehaviors: Object.keys(this.config.enabledBehaviors).filter(
        key => this.config.enabledBehaviors[key]
      )
    });
  }

  /**
   * Initialize the engine and start monitoring
   */
  async initialize(): Promise<void> {
    logger.info('Initializing autonomous behavior engine');
    
    try {
      // Validate all registered behaviors
      await this.validateBehaviors();
      
      // Start the scheduler for periodic behaviors
      await this.scheduler.start();
      
      // Start health monitoring
      await this.healthMonitor.startMonitoring();
      
      logger.info('Autonomous behavior engine initialized successfully', {
        behaviorCount: this.behaviors.size,
        scheduledBehaviors: this.scheduler.getScheduledCount()
      });
    } catch (error) {
      logger.error('Failed to initialize autonomous behavior engine', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Register a new autonomous behavior
   */
  registerBehavior(behavior: AutonomousBehavior): void {
    if (this.behaviors.has(behavior.id)) {
      logger.warn('Behavior already registered, replacing', { behaviorId: behavior.id });
    }
    
    this.behaviors.set(behavior.id, behavior);
    this.executionCounts.set(behavior.id, 0);
    
    logger.info('Registered autonomous behavior', {
      behaviorId: behavior.id,
      behaviorName: behavior.name,
      enabled: behavior.enabled
    });
  }

  /**
   * Unregister a behavior
   */
  unregisterBehavior(behaviorId: string): void {
    if (this.behaviors.delete(behaviorId)) {
      this.executionCounts.delete(behaviorId);
      this.lastExecutionTimes.delete(behaviorId);
      logger.info('Unregistered behavior', { behaviorId });
    }
  }

  /**
   * Process a trigger and execute applicable behaviors
   */
  async processTrigger(trigger: BehaviorTrigger): Promise<BehaviorResult[]> {
    const startTime = Date.now();
    const results: BehaviorResult[] = [];
    
    logger.info('Processing behavior trigger', {
      triggerId: trigger.id,
      triggerType: trigger.type,
      timestamp: trigger.timestamp
    });

    try {
      // Check rate limits
      if (!this.checkRateLimits()) {
        logger.warn('Rate limit exceeded, skipping trigger', { triggerId: trigger.id });
        return [];
      }

      // Find applicable behaviors
      const applicableBehaviors = await this.findApplicableBehaviors(trigger);
      
      logger.debug('Found applicable behaviors', {
        count: applicableBehaviors.length,
        behaviors: applicableBehaviors.map(b => b.id)
      });

      // Execute behaviors in priority order
      for (const behavior of applicableBehaviors) {
        try {
          const result = await this.executeBehavior(behavior, trigger.context);
          results.push(result);
        } catch (error) {
          logger.error('Behavior execution failed', {
            behaviorId: behavior.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          results.push({
            success: false,
            actions: [],
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime: Date.now() - startTime,
            shouldNotify: false
          });
        }
      }

      const totalTime = Date.now() - startTime;
      logger.info('Trigger processing complete', {
        triggerId: trigger.id,
        behaviorsExecuted: results.length,
        successCount: results.filter(r => r.success).length,
        totalTime
      });

      return results;

    } catch (error) {
      logger.error('Trigger processing failed', {
        triggerId: trigger.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Execute a specific behavior
   */
  private async executeBehavior(
    behavior: AutonomousBehavior,
    context: BehaviorContext
  ): Promise<BehaviorResult> {
    const startTime = Date.now();
    
    logger.info('Executing behavior', {
      behaviorId: behavior.id,
      behaviorName: behavior.name
    });

    try {
      // Check if behavior should trigger
      if (!await behavior.shouldTrigger(context)) {
        logger.debug('Behavior should not trigger', { behaviorId: behavior.id });
        return {
          success: true,
          actions: [],
          executionTime: Date.now() - startTime,
          shouldNotify: false
        };
      }

      // Execute the behavior
      const result = await behavior.execute(context);
      
      // Update metrics
      this.updateMetrics(behavior.id, true, Date.now() - startTime);
      
      // Log actions taken
      if (result.actions.length > 0) {
        logger.info('Behavior actions completed', {
          behaviorId: behavior.id,
          actionCount: result.actions.length,
          actions: result.actions.map(a => ({
            type: a.type,
            target: a.target,
            result: a.result
          }))
        });
      }

      return result;

    } catch (error) {
      this.updateMetrics(behavior.id, false, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Find behaviors applicable to a trigger
   */
  private async findApplicableBehaviors(trigger: BehaviorTrigger): Promise<AutonomousBehavior[]> {
    const applicable: AutonomousBehavior[] = [];

    for (const [id, behavior] of this.behaviors) {
      // Check if behavior is enabled
      if (!behavior.enabled) {
        continue;
      }

      // Check if behavior is specifically disabled in config
      const behaviorTypeId = id.replace('_', '-'); // Convert underscore to dash for config lookup
      if (this.config.enabledBehaviors[behaviorTypeId] === false) {
        continue;
      }

      // Check if behavior applies to this trigger type
      if (this.behaviorAppliesToTrigger(behavior, trigger)) {
        applicable.push(behavior);
      }
    }

    // Sort by priority (higher priority first)
    return applicable.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if a behavior applies to a trigger
   */
  private behaviorAppliesToTrigger(behavior: AutonomousBehavior, trigger: BehaviorTrigger): boolean {
    // Webhook triggers apply to most behaviors
    if (trigger.type === BehaviorTriggerType.WEBHOOK) {
      return true;
    }

    // Schedule triggers only apply to periodic behaviors
    if (trigger.type === BehaviorTriggerType.SCHEDULE) {
      return behavior.id.includes('periodic') || behavior.id.includes('monitoring');
    }

    // Command completion triggers apply to follow-up behaviors
    if (trigger.type === BehaviorTriggerType.COMMAND_COMPLETION) {
      return behavior.id.includes('monitoring') || behavior.id.includes('detection');
    }

    return true;
  }

  /**
   * Validate all registered behaviors
   */
  private async validateBehaviors(): Promise<void> {
    const validationResults: Array<{ id: string; valid: boolean; error?: string }> = [];

    for (const [id, behavior] of this.behaviors) {
      try {
        const valid = behavior.validate ? await behavior.validate() : true;
        validationResults.push({ id, valid });
      } catch (error) {
        validationResults.push({
          id,
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const invalidBehaviors = validationResults.filter(r => !r.valid);
    if (invalidBehaviors.length > 0) {
      logger.warn('Some behaviors failed validation', { invalidBehaviors });
    }
  }

  /**
   * Check rate limits
   */
  private checkRateLimits(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Count executions in last minute
    let minuteCount = 0;
    let hourCount = 0;

    for (const [behaviorId, lastExecution] of this.lastExecutionTimes) {
      if (lastExecution.getTime() > oneMinuteAgo) {
        minuteCount++;
      }
      if (lastExecution.getTime() > oneHourAgo) {
        hourCount++;
      }
    }

    return minuteCount < this.config.rateLimits.maxPerMinute &&
           hourCount < this.config.rateLimits.maxPerHour;
  }

  /**
   * Update execution metrics
   */
  private updateMetrics(behaviorId: string, success: boolean, executionTime: number): void {
    // Update execution count
    const count = this.executionCounts.get(behaviorId) || 0;
    this.executionCounts.set(behaviorId, count + 1);
    
    // Update last execution time
    this.lastExecutionTimes.set(behaviorId, new Date());
    
    // Update health monitor
    this.healthMonitor.recordExecution(behaviorId, success, executionTime);
  }

  /**
   * Get health status for all behaviors
   */
  async getHealthStatus(): Promise<BehaviorHealthStatus[]> {
    const statuses: BehaviorHealthStatus[] = [];

    for (const [id, behavior] of this.behaviors) {
      const status = await this.healthMonitor.getBehaviorHealth(id);
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Get execution metrics
   */
  getMetrics(startDate?: Date, endDate?: Date): BehaviorMetrics {
    return this.healthMonitor.getMetrics(startDate, endDate);
  }

  /**
   * Enable or disable a behavior
   */
  setBehaviorEnabled(behaviorId: string, enabled: boolean): void {
    const behavior = this.behaviors.get(behaviorId);
    if (behavior) {
      behavior.enabled = enabled;
      logger.info('Behavior enabled status changed', { behaviorId, enabled });
    }
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: Partial<BehaviorConfiguration>): void {
    this.config = { ...this.config, ...config };
    logger.info('Configuration updated', { config });
  }

  /**
   * Shutdown the engine
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down autonomous behavior engine');
    
    try {
      await this.scheduler.stop();
      await this.healthMonitor.stopMonitoring();
      
      logger.info('Autonomous behavior engine shut down successfully');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}