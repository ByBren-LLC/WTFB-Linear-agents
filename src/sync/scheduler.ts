/**
 * Synchronization scheduler for Linear Planning Agent
 *
 * This module provides functionality to schedule synchronization between Linear and Confluence.
 */

import * as logger from '../utils/logger';
import { SynchronizationManager } from './manager';
import { SyncFrequency } from './models';
import { getSyncConfigsByFrequency, updateSyncConfig } from '../db/models';

/**
 * Synchronization scheduler class
 */
export class SyncScheduler {
  private hourlyInterval: NodeJS.Timeout | null = null;
  private dailyInterval: NodeJS.Timeout | null = null;
  private weeklyInterval: NodeJS.Timeout | null = null;
  private running: boolean = false;

  /**
   * Starts the synchronization scheduler
   */
  start(): void {
    if (this.running) {
      logger.warn('Sync scheduler already running');
      return;
    }

    // Schedule hourly sync
    this.hourlyInterval = setInterval(async () => {
      await this.runScheduledSync(SyncFrequency.HOURLY);
    }, 60 * 60 * 1000); // 1 hour
    
    // Schedule daily sync
    this.dailyInterval = setInterval(async () => {
      await this.runScheduledSync(SyncFrequency.DAILY);
    }, 24 * 60 * 60 * 1000); // 1 day
    
    // Schedule weekly sync
    this.weeklyInterval = setInterval(async () => {
      await this.runScheduledSync(SyncFrequency.WEEKLY);
    }, 7 * 24 * 60 * 60 * 1000); // 1 week
    
    this.running = true;
    logger.info('Sync scheduler started');
  }

  /**
   * Stops the synchronization scheduler
   */
  stop(): void {
    if (!this.running) {
      logger.warn('Sync scheduler not running');
      return;
    }

    if (this.hourlyInterval) {
      clearInterval(this.hourlyInterval);
      this.hourlyInterval = null;
    }
    
    if (this.dailyInterval) {
      clearInterval(this.dailyInterval);
      this.dailyInterval = null;
    }
    
    if (this.weeklyInterval) {
      clearInterval(this.weeklyInterval);
      this.weeklyInterval = null;
    }
    
    this.running = false;
    logger.info('Sync scheduler stopped');
  }

  /**
   * Runs a scheduled synchronization
   *
   * @param frequency The frequency to run
   */
  private async runScheduledSync(frequency: SyncFrequency): Promise<void> {
    try {
      // Get configs for this frequency
      const configs = await getSyncConfigsByFrequency(frequency);
      
      logger.info(`Running scheduled sync for ${frequency} frequency`, { count: configs.length });
      
      // Run sync for each config
      for (const config of configs) {
        if (!config.enabled) {
          continue;
        }
        
        try {
          const syncManager = new SynchronizationManager(config.organization_id, config.team_id);
          await syncManager.synchronize({
            id: config.id,
            organizationId: config.organization_id,
            teamId: config.team_id,
            confluencePageUrl: config.confluence_page_url,
            direction: config.direction as any,
            frequency: config.frequency as any,
            lastSyncTime: config.last_sync_time,
            enabled: config.enabled
          });
          
          // Update last sync time
          await updateSyncConfig(config.id, {
            lastSyncTime: new Date()
          });
        } catch (error) {
          logger.error('Error during scheduled sync', { error, config });
        }
      }
      
      logger.info(`Completed scheduled sync for ${frequency} frequency`);
    } catch (error) {
      logger.error('Error running scheduled sync', { error, frequency });
    }
  }
}

// Create a singleton instance
export const syncScheduler = new SyncScheduler();
