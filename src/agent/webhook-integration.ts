/**
 * Webhook Integration for Autonomous Behaviors (LIN-59)
 * 
 * Integrates the autonomous behavior engine with the Linear webhook system
 * to trigger behaviors based on webhook events.
 */

import { Request, Response } from 'express';
import { BehaviorRegistry, getGlobalRegistry } from './behavior-registry';
import { BehaviorTrigger, BehaviorTriggerType, BehaviorContext } from './types/autonomous-types';
import * as logger from '../utils/logger';

/**
 * Webhook event types that can trigger behaviors
 */
const BEHAVIOR_TRIGGERING_EVENTS = [
  'Issue.create',
  'Issue.update', 
  'Issue.remove',
  'Comment.create',
  'IssueLabel.create',
  'IssueLabel.remove',
  'Project.update',
  'Cycle.update'
];

/**
 * Process a Linear webhook and trigger appropriate behaviors
 */
export async function processBehaviorWebhook(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    const { type, action, data, url, createdAt } = req.body;
    
    logger.info('Processing behavior webhook', {
      type,
      action,
      url,
      createdAt
    });

    // Check if this event should trigger behaviors
    if (!shouldTriggerBehaviors(type, action)) {
      logger.debug('Event does not trigger behaviors', { type, action });
      res.status(200).json({ processed: false, reason: 'Event type not configured for behaviors' });
      return;
    }

    // Get the global behavior registry
    const registry = getGlobalRegistry();
    if (!registry) {
      logger.error('Behavior registry not initialized');
      res.status(500).json({ error: 'Behavior system not initialized' });
      return;
    }

    // Create behavior context from webhook data
    const context = createBehaviorContext(type, action, data);
    
    // Create behavior trigger
    const trigger: BehaviorTrigger = {
      id: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: BehaviorTriggerType.WEBHOOK,
      payload: { type, action, data, url },
      context,
      timestamp: new Date(createdAt || Date.now())
    };

    // Process the trigger through the behavior engine
    const engine = registry.getEngine();
    const results = await engine.processTrigger(trigger);
    
    const processingTime = Date.now() - startTime;
    
    logger.info('Behavior webhook processed', {
      triggerId: trigger.id,
      behaviorsExecuted: results.length,
      successCount: results.filter(r => r.success).length,
      processingTime
    });

    // Send response
    res.status(200).json({
      processed: true,
      triggerId: trigger.id,
      behaviorsExecuted: results.length,
      results: results.map(r => ({
        success: r.success,
        actionsCount: r.actions.length,
        shouldNotify: r.shouldNotify,
        error: r.error
      })),
      processingTime
    });

  } catch (error) {
    logger.error('Failed to process behavior webhook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body
    });
    
    res.status(500).json({ 
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Check if an event type should trigger behaviors
 */
function shouldTriggerBehaviors(type: string, action: string): boolean {
  const eventType = `${type}.${action}`;
  return BEHAVIOR_TRIGGERING_EVENTS.includes(eventType);
}

/**
 * Create behavior context from webhook data
 */
function createBehaviorContext(type: string, action: string, data: any): BehaviorContext {
  const context: BehaviorContext = {
    timestamp: new Date(),
    triggerType: BehaviorTriggerType.WEBHOOK
  };

  // Extract relevant data based on event type
  switch (type) {
    case 'Issue':
      context.issue = data;
      context.team = data.team;
      
      // For updates, try to detect previous state
      if (action === 'update' && data.previousIdentifier) {
        context.previousState = {
          state: data.previousState,
          labels: data.previousLabels,
          assignee: data.previousAssignee,
          priority: data.previousPriority
        };
      }
      break;
      
    case 'Comment':
      context.issue = data.issue;
      context.team = data.issue?.team;
      context.user = data.user;
      break;
      
    case 'IssueLabel':
      context.issue = data.issue;
      context.team = data.issue?.team;
      break;
      
    case 'Project':
      context.team = data.team;
      context.metadata = { project: data };
      break;
      
    case 'Cycle':
      context.team = data.team;
      context.currentIteration = data.id;
      context.metadata = { cycle: data };
      break;
  }

  // Add webhook metadata
  context.metadata = {
    ...context.metadata,
    webhookType: type,
    webhookAction: action
  };

  return context;
}

/**
 * Schedule-based trigger for periodic behaviors
 */
export async function triggerScheduledBehaviors(): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info('Triggering scheduled behaviors');

    const registry = getGlobalRegistry();
    if (!registry) {
      logger.error('Behavior registry not initialized for scheduled trigger');
      return;
    }

    // Create a schedule trigger
    const trigger: BehaviorTrigger = {
      id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: BehaviorTriggerType.SCHEDULE,
      payload: { scheduledTime: new Date() },
      context: {
        timestamp: new Date(),
        triggerType: 'schedule'
      },
      timestamp: new Date()
    };

    // Process the trigger
    const engine = registry.getEngine();
    const results = await engine.processTrigger(trigger);
    
    const processingTime = Date.now() - startTime;
    
    logger.info('Scheduled behaviors completed', {
      triggerId: trigger.id,
      behaviorsExecuted: results.length,
      successCount: results.filter(r => r.success).length,
      processingTime
    });

  } catch (error) {
    logger.error('Failed to trigger scheduled behaviors', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Manual trigger for testing or administrative purposes
 */
export async function triggerManualBehavior(
  behaviorId: string,
  context: Partial<BehaviorContext>
): Promise<any> {
  try {
    logger.info('Manual behavior trigger requested', { behaviorId });

    const registry = getGlobalRegistry();
    if (!registry) {
      throw new Error('Behavior registry not initialized');
    }

    // Create manual trigger
    const trigger: BehaviorTrigger = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: BehaviorTriggerType.MANUAL,
      payload: { behaviorId, manualTrigger: true },
      context: {
        timestamp: new Date(),
        triggerType: BehaviorTriggerType.MANUAL,
        ...context
      },
      timestamp: new Date()
    };

    // Process the trigger
    const engine = registry.getEngine();
    const results = await engine.processTrigger(trigger);
    
    // Find results for the specific behavior
    const behaviorResult = results.find(r => 
      r.actions.some(a => a.description.includes(behaviorId))
    );

    return {
      success: true,
      triggerId: trigger.id,
      behaviorResult,
      allResults: results
    };

  } catch (error) {
    logger.error('Failed to trigger manual behavior', {
      behaviorId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Command completion trigger for follow-up behaviors
 */
export async function triggerCommandCompletionBehaviors(
  commandResult: any,
  originalContext: BehaviorContext
): Promise<void> {
  try {
    logger.info('Triggering command completion behaviors', {
      command: commandResult.command,
      success: commandResult.success
    });

    const registry = getGlobalRegistry();
    if (!registry) {
      logger.error('Behavior registry not initialized for command completion');
      return;
    }

    // Create command completion trigger
    const trigger: BehaviorTrigger = {
      id: `command-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: BehaviorTriggerType.COMMAND_COMPLETION,
      payload: commandResult,
      context: {
        ...originalContext,
        metadata: {
          ...originalContext.metadata,
          commandResult,
          completedAt: new Date()
        }
      },
      timestamp: new Date()
    };

    // Process the trigger
    const engine = registry.getEngine();
    const results = await engine.processTrigger(trigger);
    
    logger.info('Command completion behaviors executed', {
      triggerId: trigger.id,
      behaviorsExecuted: results.length
    });

  } catch (error) {
    logger.error('Failed to trigger command completion behaviors', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Initialize scheduled behavior triggers
 */
export function initializeScheduledTriggers(): void {
  // Run scheduled behaviors every 5 minutes
  const scheduledInterval = setInterval(() => {
    triggerScheduledBehaviors().catch(error => {
      logger.error('Scheduled behavior trigger failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });
  }, 5 * 60 * 1000); // 5 minutes

  // Store interval ID for cleanup
  (global as any).__behaviorScheduleInterval = scheduledInterval;
  
  logger.info('Scheduled behavior triggers initialized');
}

/**
 * Cleanup scheduled triggers
 */
export function cleanupScheduledTriggers(): void {
  const intervalId = (global as any).__behaviorScheduleInterval;
  if (intervalId) {
    clearInterval(intervalId);
    delete (global as any).__behaviorScheduleInterval;
    logger.info('Scheduled behavior triggers cleaned up');
  }
}

/**
 * Express middleware for behavior webhooks
 */
export function behaviorWebhookMiddleware() {
  return async (req: Request, res: Response, next: Function) => {
    // Check if this is a behavior-enabled webhook
    const { type, action } = req.body;
    
    if (shouldTriggerBehaviors(type, action)) {
      // Process through behavior system
      await processBehaviorWebhook(req, res);
    } else {
      // Pass to next handler
      next();
    }
  };
}