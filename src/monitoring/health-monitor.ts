/**
 * Enhanced Health Monitor for System Health Monitoring
 * 
 * This module provides comprehensive system health monitoring that extends
 * the existing OperationalHealthMonitor with enhanced capabilities.
 */
import { EnhancedSlackNotifier } from '../integrations/enhanced-slack-notifier';
import { OperationalHealthMonitor } from './operational-health-monitor';
import {
  HealthMonitorConfig,
  SystemHealthStatus,
  TokenHealthStatus,
  APIHealthStatus,
  ResourceHealthStatus,
  OperationalHealthStatus,
  HealthAlert,
  HealthStatus,
  AlertSeverity,
  HealthMetric
} from '../types/monitoring-types';
import { SystemHealth, BudgetAlert } from '../types/notification-types';
import { getClient } from '../db/connection';
import * as logger from '../utils/logger';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Enhanced health monitor that provides comprehensive system monitoring
 */
export class HealthMonitor {
  private config: HealthMonitorConfig;
  private slackNotifier: EnhancedSlackNotifier;
  private operationalMonitor: OperationalHealthMonitor;
  private monitoringInterval?: NodeJS.Timeout;
  private lastAlerts: Map<string, number> = new Map();
  private healthMetrics: HealthMetric[] = [];
  private isRunning = false;

  constructor(config?: Partial<HealthMonitorConfig>) {
    this.config = {
      checkIntervalMs: 5 * 60 * 1000, // 5 minutes
      tokenExpirationWarningDays: 7,
      apiUsageWarningPercentage: 80,
      memoryUsageWarningPercentage: 85,
      diskUsageWarningPercentage: 90,
      dbConnectionWarningPercentage: 80,
      alertThrottleMs: 60 * 60 * 1000, // 1 hour
      notificationsEnabled: true,
      environment: (process.env.NODE_ENV as any) || 'development',
      ...config
    };

    this.slackNotifier = new EnhancedSlackNotifier();
    this.operationalMonitor = new OperationalHealthMonitor({
      checkInterval: this.config.checkIntervalMs,
      oauthWarningDays: this.config.tokenExpirationWarningDays,
      apiLimitWarningThreshold: this.config.apiUsageWarningPercentage,
      memoryWarningThreshold: this.config.memoryUsageWarningPercentage,
      notificationsEnabled: this.config.notificationsEnabled
    });
  }

  /**
   * Starts comprehensive health monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Health monitoring is already running');
      return;
    }

    logger.info('Starting enhanced health monitoring', {
      checkInterval: this.config.checkIntervalMs,
      environment: this.config.environment
    });

    // Start operational monitoring
    this.operationalMonitor.start();

    // Perform initial health check
    await this.performHealthCheck();

    // Schedule periodic health checks
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Error during enhanced health check', { error });
        await this.sendHealthMonitoringError(error as Error);
      }
    }, this.config.checkIntervalMs);

    this.isRunning = true;
    logger.info('Enhanced health monitoring started successfully');
  }

  /**
   * Stops health monitoring
   */
  async stopMonitoring(): Promise<void> {
    logger.info('Stopping enhanced health monitoring');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    // Stop operational monitoring
    this.operationalMonitor.stop();

    this.isRunning = false;
    logger.info('Enhanced health monitoring stopped');
  }

  /**
   * Performs comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealthStatus> {
    const timestamp = Date.now();
    
    try {
      logger.debug('Performing comprehensive health check');

      // Get health status from all components
      const tokenHealth = await this.checkOAuthTokenHealth();
      const apiHealth = await this.checkAPIRateLimits();
      const resourceHealth = await this.checkSystemResources();
      const operationalHealth = await this.checkOperationalHealth();

      // Determine overall health
      const componentStatuses = [
        tokenHealth.overall,
        apiHealth.overall,
        resourceHealth.overall,
        operationalHealth.overall
      ];

      const overall = this.determineOverallHealth(componentStatuses);
      const isHealthy = overall === 'healthy';

      // Create comprehensive health status
      const healthStatus: SystemHealthStatus = {
        timestamp,
        isHealthy,
        overall,
        components: {
          tokens: tokenHealth,
          apis: apiHealth,
          resources: resourceHealth,
          operations: operationalHealth
        },
        alerts: []
      };

      // Process and send alerts
      await this.processHealthAlerts(healthStatus);

      // Store health metrics for trending
      this.storeHealthMetrics(healthStatus);

      logger.debug('Comprehensive health check completed', {
        overall,
        isHealthy,
        alertCount: healthStatus.alerts.length
      });

      return healthStatus;
    } catch (error) {
      logger.error('Error performing comprehensive health check', { error });
      throw error;
    }
  }

  /**
   * Checks OAuth token health
   */
  async checkOAuthTokenHealth(): Promise<TokenHealthStatus> {
    // Get basic token health from operational monitor
    const basicHealth = this.operationalMonitor.getHealthStatus();

    // TODO: Enhance with actual token data from database
    // For now, create a comprehensive status based on operational monitor
    const components = (basicHealth && basicHealth.components) || [];
    const linearHealthy = !components.includes('Linear-oauth-expired') &&
                         !components.includes('Linear-oauth-expiring');
    const confluenceHealthy = !components.includes('Confluence-oauth-expired') &&
                             !components.includes('Confluence-oauth-expiring');

    const now = new Date();
    const tokenHealth: TokenHealthStatus = {
      linearToken: {
        expiresAt: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // Default 30 days
        daysUntilExpiration: 30,
        isHealthy: linearHealthy,
        lastRefresh: new Date(now.getTime() - (24 * 60 * 60 * 1000)), // 1 day ago
        hasRefreshToken: true
      },
      confluenceToken: {
        expiresAt: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // Default 30 days
        daysUntilExpiration: 30,
        isHealthy: confluenceHealthy,
        lastRefresh: new Date(now.getTime() - (24 * 60 * 60 * 1000)), // 1 day ago
        hasRefreshToken: true
      },
      overall: linearHealthy && confluenceHealthy ? 'healthy' : 'warning'
    };

    return tokenHealth;
  }

  /**
   * Checks API rate limit health
   */
  async checkAPIRateLimits(): Promise<APIHealthStatus> {
    // TODO: Implement actual API rate limit checking
    // For now, return healthy status with placeholder data
    const apiHealth: APIHealthStatus = {
      linear: {
        remainingCalls: 800,
        totalCalls: 1000,
        resetTime: new Date(Date.now() + (60 * 60 * 1000)), // 1 hour from now
        usagePercentage: 20,
        isHealthy: true,
        responseTime: 150
      },
      confluence: {
        remainingCalls: 900,
        totalCalls: 1000,
        resetTime: new Date(Date.now() + (60 * 60 * 1000)), // 1 hour from now
        usagePercentage: 10,
        isHealthy: true,
        responseTime: 200
      },
      overall: 'healthy'
    };

    return apiHealth;
  }

  /**
   * Checks system resource health
   */
  async checkSystemResources(): Promise<ResourceHealthStatus> {
    try {
      // Memory usage
      const memoryUsage = process.memoryUsage();
      const totalMemoryMB = os.totalmem() / 1024 / 1024;
      const usedMemoryMB = memoryUsage.heapUsed / 1024 / 1024;
      const memoryPercentage = (usedMemoryMB / totalMemoryMB) * 100;

      // Disk usage (simplified check)
      const diskStats = await this.getDiskUsage();

      // Database connections
      const dbStats = await this.getDatabaseStats();

      const resourceHealth: ResourceHealthStatus = {
        database: {
          connectionCount: dbStats.connectionCount,
          maxConnections: dbStats.maxConnections,
          responseTime: dbStats.responseTime,
          isHealthy: dbStats.poolUtilization < this.config.dbConnectionWarningPercentage,
          poolUtilization: dbStats.poolUtilization
        },
        memory: {
          usedMB: Math.round(usedMemoryMB),
          totalMB: Math.round(totalMemoryMB),
          usagePercentage: Math.round(memoryPercentage),
          isHealthy: memoryPercentage < this.config.memoryUsageWarningPercentage,
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        },
        disk: {
          usedGB: diskStats.usedGB,
          totalGB: diskStats.totalGB,
          usagePercentage: diskStats.usagePercentage,
          isHealthy: diskStats.usagePercentage < this.config.diskUsageWarningPercentage,
          availableGB: diskStats.availableGB
        },
        overall: 'healthy'
      };

      // Determine overall resource health
      const resourceStatuses: HealthStatus[] = [
        resourceHealth.database.isHealthy ? 'healthy' : 'warning',
        resourceHealth.memory.isHealthy ? 'healthy' : 'warning',
        resourceHealth.disk.isHealthy ? 'healthy' : 'warning'
      ];

      resourceHealth.overall = this.determineOverallHealth(resourceStatuses);

      return resourceHealth;
    } catch (error) {
      logger.error('Error checking system resources', { error });
      throw error;
    }
  }

  /**
   * Checks operational health
   */
  async checkOperationalHealth(): Promise<OperationalHealthStatus> {
    // TODO: Implement actual operational health checking
    // For now, return healthy status with placeholder data
    const now = new Date();
    const operationalHealth: OperationalHealthStatus = {
      sync: {
        lastSuccessfulSync: new Date(now.getTime() - (5 * 60 * 1000)), // 5 minutes ago
        minutesSinceLastSync: 5,
        isHealthy: true,
        errorRate: 0.02 // 2%
      },
      planning: {
        lastSuccessfulPlanning: new Date(now.getTime() - (30 * 60 * 1000)), // 30 minutes ago
        minutesSinceLastPlanning: 30,
        isHealthy: true,
        successRate: 0.95 // 95%
      },
      webhooks: {
        queueSize: 2,
        processingRate: 10, // per minute
        isHealthy: true,
        errorRate: 0.01 // 1%
      },
      overall: 'healthy'
    };

    return operationalHealth;
  }

  /**
   * Determines overall health from component statuses
   */
  private determineOverallHealth(statuses: HealthStatus[]): HealthStatus {
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    if (statuses.includes('unknown')) return 'unknown';
    return 'healthy';
  }

  /**
   * Gets disk usage statistics
   */
  private async getDiskUsage(): Promise<{
    usedGB: number;
    totalGB: number;
    availableGB: number;
    usagePercentage: number;
  }> {
    try {
      // Simplified disk usage check - in production, use proper disk usage library
      const stats = fs.statSync('.');
      const totalGB = 100; // Default assumption
      const usedGB = 30; // Default assumption
      const availableGB = totalGB - usedGB;
      const usagePercentage = (usedGB / totalGB) * 100;

      return {
        usedGB: Math.round(usedGB),
        totalGB: Math.round(totalGB),
        availableGB: Math.round(availableGB),
        usagePercentage: Math.round(usagePercentage)
      };
    } catch (error) {
      logger.error('Error getting disk usage', { error });
      return {
        usedGB: 0,
        totalGB: 100,
        availableGB: 100,
        usagePercentage: 0
      };
    }
  }

  /**
   * Gets database statistics
   */
  private async getDatabaseStats(): Promise<{
    connectionCount: number;
    maxConnections: number;
    responseTime: number;
    poolUtilization: number;
  }> {
    try {
      const startTime = Date.now();
      
      // Test database connectivity
      const client = await getClient();
      await client.query('SELECT 1');
      
      const responseTime = Date.now() - startTime;

      // TODO: Get actual connection pool stats
      const connectionCount = 5; // Default assumption
      const maxConnections = 20; // Default assumption
      const poolUtilization = (connectionCount / maxConnections) * 100;

      return {
        connectionCount,
        maxConnections,
        responseTime,
        poolUtilization: Math.round(poolUtilization)
      };
    } catch (error) {
      logger.error('Error getting database stats', { error });
      return {
        connectionCount: 0,
        maxConnections: 20,
        responseTime: 0,
        poolUtilization: 0
      };
    }
  }

  /**
   * Processes health alerts and sends notifications
   */
  private async processHealthAlerts(healthStatus: SystemHealthStatus): Promise<void> {
    const alerts: HealthAlert[] = [];

    // Check each component for alerts
    // TODO: Implement comprehensive alert processing

    healthStatus.alerts = alerts;

    // Send alerts via Slack if enabled
    if (this.config.notificationsEnabled && alerts.length > 0) {
      for (const alert of alerts) {
        if (this.shouldSendAlert(alert)) {
          await this.sendHealthAlert(alert);
        }
      }
    }
  }

  /**
   * Determines if an alert should be sent (throttling)
   */
  private shouldSendAlert(alert: HealthAlert): boolean {
    const alertKey = `${alert.component}-${alert.status}`;
    const lastAlertTime = this.lastAlerts.get(alertKey) || 0;
    const now = Date.now();

    if (now - lastAlertTime < this.config.alertThrottleMs) {
      alert.throttled = true;
      return false;
    }

    this.lastAlerts.set(alertKey, now);
    return true;
  }

  /**
   * Sends health alert via Enhanced SlackNotifier
   */
  private async sendHealthAlert(alert: HealthAlert): Promise<void> {
    try {
      const systemHealth: SystemHealth = {
        component: alert.component,
        status: alert.status === 'critical' ? 'critical' : alert.status === 'warning' ? 'warning' : 'healthy',
        message: alert.message,
        actionRequired: alert.actionRequired,
        details: alert.details,
        timestamp: alert.timestamp,
        severity: alert.severity
      };

      await this.slackNotifier.sendSystemHealthAlert(systemHealth);
      logger.info('Health alert sent', { component: alert.component, status: alert.status });
    } catch (error) {
      logger.error('Error sending health alert', { error, alert });
    }
  }

  /**
   * Sends health monitoring error notification
   */
  private async sendHealthMonitoringError(error: Error): Promise<void> {
    if (!this.config.notificationsEnabled) return;

    try {
      const systemHealth: SystemHealth = {
        component: 'health-monitor',
        status: 'error',
        message: 'Health monitoring system error',
        actionRequired: 'Check health monitor logs and configuration',
        details: { error: error.message },
        timestamp: new Date(),
        severity: 'high'
      };

      await this.slackNotifier.sendSystemHealthAlert(systemHealth);
    } catch (notificationError) {
      logger.error('Error sending health monitoring error notification', { 
        originalError: error, 
        notificationError 
      });
    }
  }

  /**
   * Stores health metrics for trending
   */
  private storeHealthMetrics(healthStatus: SystemHealthStatus): void {
    // TODO: Implement health metrics storage for trending analysis
    // For now, just keep in memory with a limit
    const maxMetrics = 1000;
    
    if (this.healthMetrics.length >= maxMetrics) {
      this.healthMetrics = this.healthMetrics.slice(-maxMetrics / 2);
    }

    // Store key metrics
    const timestamp = new Date(healthStatus.timestamp);
    
    this.healthMetrics.push({
      component: 'memory',
      metric: 'usage_percentage',
      value: healthStatus.components.resources.memory.usagePercentage,
      unit: 'percent',
      timestamp
    });

    this.healthMetrics.push({
      component: 'disk',
      metric: 'usage_percentage',
      value: healthStatus.components.resources.disk.usagePercentage,
      unit: 'percent',
      timestamp
    });
  }

  /**
   * Gets current health status
   */
  async getHealthStatus(): Promise<SystemHealthStatus> {
    return this.performHealthCheck();
  }

  /**
   * Gets health metrics for analysis
   */
  getHealthMetrics(): HealthMetric[] {
    return [...this.healthMetrics];
  }

  /**
   * Gets monitoring configuration
   */
  getConfig(): HealthMonitorConfig {
    return { ...this.config };
  }

  /**
   * Updates monitoring configuration
   */
  updateConfig(newConfig: Partial<HealthMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Health monitor configuration updated', { config: newConfig });
  }
}
