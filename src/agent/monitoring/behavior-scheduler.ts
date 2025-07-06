/**
 * Behavior Scheduler (LIN-59)
 * 
 * Manages scheduled execution of autonomous behaviors using cron-like patterns.
 */

import { 
  BehaviorSchedule, 
  BehaviorTrigger, 
  BehaviorTriggerType,
  BehaviorContext 
} from '../types/autonomous-types';
import { AutonomousBehaviorEngine } from '../autonomous-engine';
import * as logger from '../../utils/logger';

/**
 * Simple cron expression parser for basic scheduling
 */
class CronParser {
  /**
   * Parse a simple cron expression and check if current time matches
   * Supports: minute hour dayOfMonth month dayOfWeek
   * Example: "0 9 * * 1" = Every Monday at 9:00 AM
   */
  static matches(cronExpression: string, date: Date = new Date()): boolean {
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) return false;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    // Check each component
    if (!this.matchesComponent(minute, date.getMinutes())) return false;
    if (!this.matchesComponent(hour, date.getHours())) return false;
    if (!this.matchesComponent(dayOfMonth, date.getDate())) return false;
    if (!this.matchesComponent(month, date.getMonth() + 1)) return false;
    if (!this.matchesComponent(dayOfWeek, date.getDay())) return false;

    return true;
  }

  private static matchesComponent(pattern: string, value: number): boolean {
    if (pattern === '*') return true;
    
    // Handle comma-separated values
    if (pattern.includes(',')) {
      return pattern.split(',').some(p => parseInt(p) === value);
    }
    
    // Handle ranges
    if (pattern.includes('-')) {
      const [start, end] = pattern.split('-').map(p => parseInt(p));
      return value >= start && value <= end;
    }
    
    // Handle step values
    if (pattern.includes('/')) {
      const [range, step] = pattern.split('/');
      const stepValue = parseInt(step);
      if (range === '*') {
        return value % stepValue === 0;
      }
    }
    
    // Direct match
    return parseInt(pattern) === value;
  }
}

/**
 * Manages scheduled execution of behaviors
 */
export class BehaviorScheduler {
  private schedules: Map<string, BehaviorSchedule> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private cronInterval?: NodeJS.Timeout;
  private running: boolean = false;

  constructor(private engine: AutonomousBehaviorEngine) {}

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('Scheduler already running');
      return;
    }

    logger.info('Starting behavior scheduler');
    this.running = true;

    // Start cron checker (runs every minute)
    this.cronInterval = setInterval(() => {
      this.checkCronSchedules();
    }, 60000); // 1 minute

    // Check immediately
    this.checkCronSchedules();

    // Start interval-based schedules
    this.startIntervalSchedules();

    logger.info('Behavior scheduler started');
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    logger.info('Stopping behavior scheduler');
    this.running = false;

    // Clear cron interval
    if (this.cronInterval) {
      clearInterval(this.cronInterval);
      this.cronInterval = undefined;
    }

    // Clear all interval schedules
    for (const [id, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();

    logger.info('Behavior scheduler stopped');
  }

  /**
   * Add a schedule
   */
  addSchedule(schedule: BehaviorSchedule): void {
    this.schedules.set(schedule.behaviorId, schedule);
    
    logger.info('Added behavior schedule', {
      behaviorId: schedule.behaviorId,
      type: schedule.cronExpression ? 'cron' : 'interval',
      expression: schedule.cronExpression || `${schedule.interval}ms`
    });

    // If interval-based and scheduler is running, start it immediately
    if (schedule.interval && this.running) {
      this.startIntervalSchedule(schedule);
    }
  }

  /**
   * Remove a schedule
   */
  removeSchedule(behaviorId: string): void {
    this.schedules.delete(behaviorId);
    
    // Clear interval if exists
    const interval = this.intervals.get(behaviorId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(behaviorId);
    }

    logger.info('Removed behavior schedule', { behaviorId });
  }

  /**
   * Get scheduled count
   */
  getScheduledCount(): number {
    return this.schedules.size;
  }

  /**
   * Check cron schedules
   */
  private checkCronSchedules(): void {
    const now = new Date();
    
    for (const [behaviorId, schedule] of this.schedules) {
      if (!schedule.active || !schedule.cronExpression) continue;

      try {
        if (CronParser.matches(schedule.cronExpression, now)) {
          logger.debug('Cron schedule matched', {
            behaviorId,
            cronExpression: schedule.cronExpression,
            time: now.toISOString()
          });

          this.triggerBehavior(behaviorId, schedule);
        }
      } catch (error) {
        logger.error('Error checking cron schedule', {
          behaviorId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Start interval-based schedules
   */
  private startIntervalSchedules(): void {
    for (const [behaviorId, schedule] of this.schedules) {
      if (schedule.active && schedule.interval) {
        this.startIntervalSchedule(schedule);
      }
    }
  }

  /**
   * Start a single interval schedule
   */
  private startIntervalSchedule(schedule: BehaviorSchedule): void {
    // Clear existing interval if any
    const existing = this.intervals.get(schedule.behaviorId);
    if (existing) {
      clearInterval(existing);
    }

    // Create new interval
    const interval = setInterval(() => {
      this.triggerBehavior(schedule.behaviorId, schedule);
    }, schedule.interval!);

    this.intervals.set(schedule.behaviorId, interval);

    logger.debug('Started interval schedule', {
      behaviorId: schedule.behaviorId,
      interval: schedule.interval
    });
  }

  /**
   * Trigger a scheduled behavior
   */
  private async triggerBehavior(behaviorId: string, schedule: BehaviorSchedule): Promise<void> {
    try {
      const trigger: BehaviorTrigger = {
        id: `schedule_${behaviorId}_${Date.now()}`,
        type: BehaviorTriggerType.SCHEDULE,
        payload: {
          behaviorId,
          schedule
        },
        context: {
          ...schedule.context,
          timestamp: new Date()
        } as BehaviorContext,
        timestamp: new Date()
      };

      logger.info('Triggering scheduled behavior', {
        behaviorId,
        triggerId: trigger.id
      });

      await this.engine.processTrigger(trigger);

    } catch (error) {
      logger.error('Failed to trigger scheduled behavior', {
        behaviorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all active schedules
   */
  getActiveSchedules(): BehaviorSchedule[] {
    return Array.from(this.schedules.values()).filter(s => s.active);
  }

  /**
   * Update schedule active status
   */
  setScheduleActive(behaviorId: string, active: boolean): void {
    const schedule = this.schedules.get(behaviorId);
    if (schedule) {
      schedule.active = active;
      
      if (!active) {
        // Stop interval if deactivated
        const interval = this.intervals.get(behaviorId);
        if (interval) {
          clearInterval(interval);
          this.intervals.delete(behaviorId);
        }
      } else if (schedule.interval && this.running) {
        // Start interval if activated
        this.startIntervalSchedule(schedule);
      }

      logger.info('Schedule active status changed', { behaviorId, active });
    }
  }
}