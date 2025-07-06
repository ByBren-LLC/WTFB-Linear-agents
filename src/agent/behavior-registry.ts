/**
 * Behavior Registry (LIN-59)
 * 
 * Central registry for initializing and managing all autonomous behaviors.
 * Provides a single entry point for behavior configuration and lifecycle management.
 */

import { AutonomousBehaviorEngine } from './autonomous-engine';
import { LinearClientWrapper } from '../linear/client';
import { StoryMonitoringBehavior } from './behaviors/story-monitoring.behavior';
import { ARTHealthMonitoringBehavior } from './behaviors/art-health-monitoring.behavior';
import { DependencyDetectionBehavior } from './behaviors/dependency-detection.behavior';
import { WorkflowAutomationBehavior } from './behaviors/workflow-automation.behavior';
import { PeriodicReportingBehavior } from './behaviors/periodic-reporting.behavior';
import { AnomalyDetectionBehavior } from './behaviors/anomaly-detection.behavior';
import { BehaviorConfiguration } from './types/autonomous-types';
import * as logger from '../utils/logger';

/**
 * Registry configuration options
 */
export interface BehaviorRegistryConfig {
  /** Linear client instance */
  linearClient: LinearClientWrapper;
  
  /** Engine configuration */
  engineConfig?: Partial<BehaviorConfiguration>;
  
  /** Individual behavior configurations */
  behaviorConfigs?: {
    storyMonitoring?: any;
    artHealthMonitoring?: any;
    dependencyDetection?: any;
    workflowAutomation?: any;
    periodicReporting?: any;
    anomalyDetection?: any;
  };
  
  /** Which behaviors to enable */
  enabledBehaviors?: {
    storyMonitoring?: boolean;
    artHealthMonitoring?: boolean;
    dependencyDetection?: boolean;
    workflowAutomation?: boolean;
    periodicReporting?: boolean;
    anomalyDetection?: boolean;
  };
}

/**
 * Behavior registry implementation
 */
export class BehaviorRegistry {
  private engine: AutonomousBehaviorEngine;
  private linearClient: LinearClientWrapper;
  private config: BehaviorRegistryConfig;
  private initialized = false;

  constructor(config: BehaviorRegistryConfig) {
    this.config = config;
    this.linearClient = config.linearClient;
    this.engine = new AutonomousBehaviorEngine(config.engineConfig);
    
    logger.info('BehaviorRegistry created', {
      enabledBehaviors: config.enabledBehaviors
    });
  }

  /**
   * Initialize all behaviors and start the engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('BehaviorRegistry already initialized');
      return;
    }

    try {
      logger.info('Initializing behavior registry');

      // Register behaviors based on configuration
      await this.registerBehaviors();
      
      // Initialize the engine
      await this.engine.initialize();
      
      this.initialized = true;
      
      logger.info('Behavior registry initialized successfully', {
        behaviorCount: this.getRegisteredBehaviorCount()
      });
    } catch (error) {
      logger.error('Failed to initialize behavior registry', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Register all configured behaviors
   */
  private async registerBehaviors(): Promise<void> {
    const { enabledBehaviors = {}, behaviorConfigs = {} } = this.config;
    
    // Story Monitoring Behavior
    if (enabledBehaviors.storyMonitoring !== false) {
      const behavior = new StoryMonitoringBehavior(
        this.linearClient,
        behaviorConfigs.storyMonitoring
      );
      this.engine.registerBehavior(behavior);
      logger.info('Registered StoryMonitoringBehavior');
    }

    // ART Health Monitoring Behavior
    if (enabledBehaviors.artHealthMonitoring !== false) {
      const behavior = new ARTHealthMonitoringBehavior(
        this.linearClient,
        behaviorConfigs.artHealthMonitoring
      );
      this.engine.registerBehavior(behavior);
      logger.info('Registered ARTHealthMonitoringBehavior');
    }

    // Dependency Detection Behavior
    if (enabledBehaviors.dependencyDetection !== false) {
      const behavior = new DependencyDetectionBehavior(
        this.linearClient,
        behaviorConfigs.dependencyDetection
      );
      this.engine.registerBehavior(behavior);
      logger.info('Registered DependencyDetectionBehavior');
    }

    // Workflow Automation Behavior
    if (enabledBehaviors.workflowAutomation !== false) {
      const behavior = new WorkflowAutomationBehavior(
        this.linearClient,
        behaviorConfigs.workflowAutomation
      );
      this.engine.registerBehavior(behavior);
      logger.info('Registered WorkflowAutomationBehavior');
    }

    // Periodic Reporting Behavior
    if (enabledBehaviors.periodicReporting !== false) {
      const behavior = new PeriodicReportingBehavior(
        this.linearClient,
        behaviorConfigs.periodicReporting
      );
      this.engine.registerBehavior(behavior);
      logger.info('Registered PeriodicReportingBehavior');
    }

    // Anomaly Detection Behavior
    if (enabledBehaviors.anomalyDetection !== false) {
      const behavior = new AnomalyDetectionBehavior(
        this.linearClient,
        behaviorConfigs.anomalyDetection
      );
      this.engine.registerBehavior(behavior);
      logger.info('Registered AnomalyDetectionBehavior');
    }
  }

  /**
   * Get the autonomous behavior engine
   */
  getEngine(): AutonomousBehaviorEngine {
    if (!this.initialized) {
      throw new Error('BehaviorRegistry not initialized');
    }
    return this.engine;
  }

  /**
   * Get count of registered behaviors
   */
  getRegisteredBehaviorCount(): number {
    return this.engine['behaviors'].size;
  }

  /**
   * Enable or disable a specific behavior
   */
  setBehaviorEnabled(behaviorId: string, enabled: boolean): void {
    this.engine.setBehaviorEnabled(behaviorId, enabled);
  }

  /**
   * Update engine configuration
   */
  updateEngineConfig(config: Partial<BehaviorConfiguration>): void {
    this.engine.updateConfiguration(config);
  }

  /**
   * Update behavior-specific configuration
   */
  updateBehaviorConfig(behaviorId: string, config: any): void {
    const behavior = this.engine['behaviors'].get(behaviorId);
    if (behavior && 'updateConfig' in behavior) {
      (behavior as any).updateConfig(config);
      logger.info('Updated behavior configuration', { behaviorId });
    } else {
      logger.warn('Behavior not found or does not support config updates', { behaviorId });
    }
  }

  /**
   * Get health status of all behaviors
   */
  async getHealthStatus(): Promise<any> {
    return await this.engine.getHealthStatus();
  }

  /**
   * Get execution metrics
   */
  getMetrics(startDate?: Date, endDate?: Date): any {
    return this.engine.getMetrics(startDate, endDate);
  }

  /**
   * Shutdown the behavior registry
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down behavior registry');
    
    try {
      await this.engine.shutdown();
      this.initialized = false;
      logger.info('Behavior registry shut down successfully');
    } catch (error) {
      logger.error('Error during behavior registry shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create a default behavior registry with standard configuration
   */
  static createDefault(linearClient: LinearClientWrapper): BehaviorRegistry {
    return new BehaviorRegistry({
      linearClient,
      engineConfig: {
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
      },
      enabledBehaviors: {
        storyMonitoring: true,
        artHealthMonitoring: true,
        dependencyDetection: true,
        workflowAutomation: true,
        periodicReporting: true,
        anomalyDetection: true
      }
    });
  }
}

/**
 * Global registry instance (singleton)
 */
let globalRegistry: BehaviorRegistry | null = null;

/**
 * Initialize the global behavior registry
 */
export async function initializeGlobalRegistry(config: BehaviorRegistryConfig): Promise<BehaviorRegistry> {
  if (globalRegistry) {
    logger.warn('Global behavior registry already initialized');
    return globalRegistry;
  }

  globalRegistry = new BehaviorRegistry(config);
  await globalRegistry.initialize();
  
  return globalRegistry;
}

/**
 * Get the global behavior registry
 */
export function getGlobalRegistry(): BehaviorRegistry | null {
  return globalRegistry;
}

/**
 * Shutdown the global behavior registry
 */
export async function shutdownGlobalRegistry(): Promise<void> {
  if (globalRegistry) {
    await globalRegistry.shutdown();
    globalRegistry = null;
  }
}