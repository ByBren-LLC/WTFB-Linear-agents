/**
 * Operational Notification Coordinator
 * 
 * This module coordinates operational intelligence notifications by integrating
 * with the Enhanced SlackNotifier from Agent #6 and providing a unified interface
 * for the planning agent system components.
 */
import { EnhancedSlackNotifier } from '../integrations/enhanced-slack-notifier';
import { OperationalHealthMonitor } from '../monitoring/operational-health-monitor';
import {
  PlanningStatistics,
  SyncResult,
  WorkflowEvent,
  AgentUpdate,
  NotificationConfig
} from '../types/notification-types';
import * as logger from '../utils/logger';

/**
 * Coordinator configuration
 */
export interface CoordinatorConfig {
  /** Environment (affects notification behavior) */
  environment: 'development' | 'staging' | 'production';
  /** Health monitoring configuration */
  healthMonitoring: {
    enabled: boolean;
    checkInterval?: number;
  };
  /** Enhanced SlackNotifier configuration */
  slackConfig?: Partial<NotificationConfig>;
}

/**
 * Operational notification coordinator that integrates with Enhanced SlackNotifier
 */
export class OperationalNotificationCoordinator {
  private static instance: OperationalNotificationCoordinator;
  private slackNotifier!: EnhancedSlackNotifier;
  private healthMonitor!: OperationalHealthMonitor;
  private config: CoordinatorConfig;
  private isInitialized = false;

  private constructor(config: CoordinatorConfig) {
    this.config = config;
    this.initializeComponents();
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(config?: CoordinatorConfig): OperationalNotificationCoordinator {
    if (!OperationalNotificationCoordinator.instance) {
      if (!config) {
        throw new Error('OperationalNotificationCoordinator must be initialized with config on first use');
      }
      OperationalNotificationCoordinator.instance = new OperationalNotificationCoordinator(config);
    }
    return OperationalNotificationCoordinator.instance;
  }

  /**
   * Initializes the coordinator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing operational notification coordinator', {
        environment: this.config.environment,
        healthMonitoringEnabled: this.config.healthMonitoring.enabled
      });

      // Start health monitoring if enabled
      if (this.config.healthMonitoring.enabled) {
        this.healthMonitor.start();
      }

      this.isInitialized = true;
      logger.info('Operational notification coordinator initialized successfully');
    } catch (error) {
      logger.error('Error initializing operational notification coordinator', { error });
      throw error;
    }
  }

  /**
   * Shuts down the coordinator
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down operational notification coordinator');

      // Stop health monitoring
      this.healthMonitor.stop();

      this.isInitialized = false;
      logger.info('Operational notification coordinator shut down successfully');
    } catch (error) {
      logger.error('Error shutting down operational notification coordinator', { error });
    }
  }

  /**
   * Sends planning completion notification
   */
  async notifyPlanningCompletion(
    planningTitle: string,
    epicCount: number,
    featureCount: number,
    storyCount: number,
    enablerCount: number,
    durationMinutes: number,
    sourceDocument: string,
    sourceUrl?: string
  ): Promise<boolean> {
    const stats: PlanningStatistics = {
      planningTitle,
      epicCount,
      featureCount,
      storyCount,
      enablerCount,
      durationMinutes,
      sourceDocument,
      sourceUrl,
      timestamp: new Date()
    };

    return this.slackNotifier.sendPlanningStatistics(stats);
  }

  /**
   * Sends sync status notification
   */
  async notifySyncStatus(syncResult: {
    syncType: 'linear-confluence' | 'confluence-linear' | 'bidirectional';
    linearUpdates: number;
    confluenceUpdates: number;
    conflictsDetected: number;
    conflictsResolved: number;
    conflictsPending: number;
    nextSyncMinutes: number;
    errors?: string[];
  }): Promise<boolean> {
    const result: SyncResult = {
      ...syncResult,
      timestamp: new Date()
    };

    return this.slackNotifier.sendSyncStatusUpdate(result);
  }

  /**
   * Sends workflow notification
   */
  async notifyWorkflowUpdate(
    eventType: 'pr-created' | 'pr-merged' | 'pr-failed' | 'deployment' | 'build' | 'test',
    title: string,
    description: string,
    status: 'success' | 'failure' | 'pending' | 'in-progress',
    url?: string,
    assignee?: string
  ): Promise<boolean> {
    const workflow: WorkflowEvent = {
      eventType,
      title,
      description,
      status,
      url,
      assignee,
      timestamp: new Date()
    };

    return this.slackNotifier.sendWorkflowNotification(workflow);
  }

  /**
   * Sends agent update notification
   */
  async notifyAgentUpdate(
    agentId: string,
    agentType: 'remote' | 'local' | 'cli',
    status: 'assigned' | 'in-progress' | 'completed' | 'failed' | 'blocked',
    taskTitle: string,
    message: string,
    taskUrl?: string,
    assignee?: string
  ): Promise<boolean> {
    const agent: AgentUpdate = {
      agentId,
      agentType,
      status,
      taskTitle,
      message,
      taskUrl,
      assignee,
      timestamp: new Date()
    };

    return this.slackNotifier.sendRemoteAgentUpdate(agent);
  }

  /**
   * Registers OAuth token for health monitoring
   */
  registerOAuthToken(service: string, expiresAt: number, refreshToken?: string): void {
    this.healthMonitor.registerOAuthToken(service, expiresAt, refreshToken);
  }

  /**
   * Updates API usage for monitoring
   */
  updateAPIUsage(service: string, usage: number, limit: number, resetTime: number): void {
    this.healthMonitor.updateAPIUsage(service, usage, limit, resetTime);
  }

  /**
   * Gets current system health status
   */
  getHealthStatus() {
    return this.healthMonitor.getHealthStatus();
  }

  /**
   * Gets coordinator statistics
   */
  getCoordinatorStats(): {
    environment: string;
    healthMonitoringEnabled: boolean;
    isInitialized: boolean;
    healthStatus: any;
    slackConfig: NotificationConfig;
  } {
    return {
      environment: this.config.environment,
      healthMonitoringEnabled: this.config.healthMonitoring.enabled,
      isInitialized: this.isInitialized,
      healthStatus: this.isInitialized ? this.healthMonitor.getHealthStatus() : null,
      slackConfig: this.slackNotifier.getConfig()
    };
  }

  /**
   * Updates Enhanced SlackNotifier configuration
   */
  updateSlackConfig(newConfig: Partial<NotificationConfig>): void {
    this.slackNotifier.updateConfig(newConfig);
    logger.info('Updated Enhanced SlackNotifier configuration', { config: newConfig });
  }

  /**
   * Initializes components with configuration
   */
  private initializeComponents(): void {
    // Initialize Enhanced SlackNotifier with environment-specific config
    const slackConfig = this.createEnvironmentSpecificSlackConfig();
    this.slackNotifier = new EnhancedSlackNotifier(slackConfig);

    // Initialize operational health monitor
    this.healthMonitor = new OperationalHealthMonitor({
      checkInterval: this.config.healthMonitoring.checkInterval,
      notificationsEnabled: true
    });
  }

  /**
   * Creates environment-specific configuration for Enhanced SlackNotifier
   */
  private createEnvironmentSpecificSlackConfig(): Partial<NotificationConfig> {
    const baseConfig: Partial<NotificationConfig> = {
      enabled: {
        planningNotifications: true,
        syncNotifications: true,
        healthNotifications: true,
        budgetNotifications: true,
        workflowNotifications: true,
        agentNotifications: true
      },
      throttling: {
        intervalMs: 60000, // 1 minute
        maxNotificationsPerInterval: 5,
        criticalBypassThrottle: true
      },
      ...this.config.slackConfig
    };

    // Environment-specific adjustments
    switch (this.config.environment) {
      case 'development':
        baseConfig.throttling!.maxNotificationsPerInterval = 10; // More notifications in dev
        break;

      case 'staging':
        // Use default settings
        break;

      case 'production':
        baseConfig.throttling!.intervalMs = 30000; // More frequent in production (30 seconds)
        break;
    }

    return baseConfig;
  }

  /**
   * Creates default configuration based on environment
   */
  static createDefaultConfig(environment: 'development' | 'staging' | 'production'): CoordinatorConfig {
    return {
      environment,
      healthMonitoring: {
        enabled: true,
        checkInterval: environment === 'production' ? 2 * 60 * 1000 : 5 * 60 * 1000 // 2 min prod, 5 min others
      },
      slackConfig: {
        // Use Enhanced SlackNotifier defaults
      }
    };
  }

  /**
   * Validates coordinator configuration
   */
  static validateConfig(config: CoordinatorConfig): boolean {
    try {
      // Check required fields
      if (!config.environment) {
        throw new Error('Environment is required');
      }

      if (!['development', 'staging', 'production'].includes(config.environment)) {
        throw new Error('Invalid environment');
      }

      // Validate health monitoring settings
      if (config.healthMonitoring.enabled && config.healthMonitoring.checkInterval) {
        if (config.healthMonitoring.checkInterval < 30000) { // Minimum 30 seconds
          throw new Error('Health check interval too short (minimum 30 seconds)');
        }
      }

      return true;
    } catch (error) {
      logger.error('Invalid coordinator configuration', { error, config });
      return false;
    }
  }
}
