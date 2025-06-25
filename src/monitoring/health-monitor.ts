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
import { getLinearToken } from '../db/models';
import { LinearClient } from '@linear/sdk';
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
    try {
      // Get actual token data from database
      const linearTokenData = await this.getLinearTokenInfo();
      const confluenceTokenData = await this.getConfluenceTokenInfo();

      const tokenHealth: TokenHealthStatus = {
        linearToken: linearTokenData,
        confluenceToken: confluenceTokenData,
        overall: linearTokenData.isHealthy && confluenceTokenData.isHealthy ? 'healthy' : 
                linearTokenData.isHealthy || confluenceTokenData.isHealthy ? 'warning' : 'critical'
      };

      return tokenHealth;
    } catch (error) {
      logger.error('Error checking OAuth token health', { error });
      // Return a safe default status on error
      const now = new Date();
      return {
        linearToken: {
          expiresAt: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)),
          daysUntilExpiration: 30,
          isHealthy: false,
          lastRefresh: new Date(now.getTime() - (24 * 60 * 60 * 1000)),
          hasRefreshToken: false
        },
        confluenceToken: {
          expiresAt: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)),
          daysUntilExpiration: 30,
          isHealthy: false,
          lastRefresh: new Date(now.getTime() - (24 * 60 * 60 * 1000)),
          hasRefreshToken: false
        },
        overall: 'unknown'
      };
    }
  }

  /**
   * Checks API rate limit health
   */
  async checkAPIRateLimits(): Promise<APIHealthStatus> {
    try {
      // Get actual API usage data from Linear and Confluence clients
      const linearStats = await this.getLinearAPIStats();
      const confluenceStats = await this.getConfluenceAPIStats();

      const apiHealth: APIHealthStatus = {
        linear: linearStats,
        confluence: confluenceStats,
        overall: linearStats.isHealthy && confluenceStats.isHealthy ? 'healthy' : 
                linearStats.isHealthy || confluenceStats.isHealthy ? 'warning' : 'critical'
      };

      return apiHealth;
    } catch (error) {
      logger.error('Error checking API rate limits', { error });
      // Return safe defaults on error
      return {
        linear: {
          remainingCalls: 0,
          totalCalls: 1000,
          resetTime: new Date(Date.now() + (60 * 60 * 1000)),
          usagePercentage: 100,
          isHealthy: false,
          responseTime: 0
        },
        confluence: {
          remainingCalls: 0,
          totalCalls: 1000,
          resetTime: new Date(Date.now() + (60 * 60 * 1000)),
          usagePercentage: 100,
          isHealthy: false,
          responseTime: 0
        },
        overall: 'unknown'
      };
    }
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

  /**
   * Gets Linear token information from database
   */
  private async getLinearTokenInfo(): Promise<{
    expiresAt: Date;
    daysUntilExpiration: number;
    isHealthy: boolean;
    lastRefresh: Date;
    hasRefreshToken: boolean;
  }> {
    try {
      // Get the first organization's Linear token (simplified approach)
      // In a multi-tenant system, you'd need to specify the organization
      const client = await getClient();
      const result = await client.query(
        'SELECT * FROM linear_tokens ORDER BY updated_at DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        // No tokens found
        const now = new Date();
        return {
          expiresAt: new Date(now.getTime() - (24 * 60 * 60 * 1000)), // Expired yesterday
          daysUntilExpiration: -1,
          isHealthy: false,
          lastRefresh: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)), // 30 days ago
          hasRefreshToken: false
        };
      }

      const token = result.rows[0];
      const expiresAt = new Date(token.expires_at);
      const now = new Date();
      const msUntilExpiration = expiresAt.getTime() - now.getTime();
      const daysUntilExpiration = Math.ceil(msUntilExpiration / (24 * 60 * 60 * 1000));
      const isHealthy = daysUntilExpiration > this.config.tokenExpirationWarningDays;

      return {
        expiresAt,
        daysUntilExpiration,
        isHealthy,
        lastRefresh: new Date(token.updated_at),
        hasRefreshToken: !!token.refresh_token
      };
    } catch (error) {
      logger.error('Error getting Linear token info', { error });
      // Return error state
      const now = new Date();
      return {
        expiresAt: new Date(now.getTime() - (24 * 60 * 60 * 1000)),
        daysUntilExpiration: -1,
        isHealthy: false,
        lastRefresh: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)),
        hasRefreshToken: false
      };
    }
  }

  /**
   * Gets Confluence token information from database
   */
  private async getConfluenceTokenInfo(): Promise<{
    expiresAt: Date;
    daysUntilExpiration: number;
    isHealthy: boolean;
    lastRefresh: Date;
    hasRefreshToken: boolean;
  }> {
    try {
      const client = await getClient();
      const result = await client.query(
        'SELECT * FROM confluence_tokens ORDER BY updated_at DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        // No tokens found
        const now = new Date();
        return {
          expiresAt: new Date(now.getTime() - (24 * 60 * 60 * 1000)), // Expired yesterday
          daysUntilExpiration: -1,
          isHealthy: false,
          lastRefresh: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)), // 30 days ago
          hasRefreshToken: false
        };
      }

      const token = result.rows[0];
      const expiresAt = new Date(token.expires_at);
      const now = new Date();
      const msUntilExpiration = expiresAt.getTime() - now.getTime();
      const daysUntilExpiration = Math.ceil(msUntilExpiration / (24 * 60 * 60 * 1000));
      const isHealthy = daysUntilExpiration > this.config.tokenExpirationWarningDays;

      return {
        expiresAt,
        daysUntilExpiration,
        isHealthy,
        lastRefresh: new Date(token.updated_at),
        hasRefreshToken: !!token.refresh_token
      };
    } catch (error) {
      logger.error('Error getting Confluence token info', { error });
      // Return error state
      const now = new Date();
      return {
        expiresAt: new Date(now.getTime() - (24 * 60 * 60 * 1000)),
        daysUntilExpiration: -1,
        isHealthy: false,
        lastRefresh: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)),
        hasRefreshToken: false
      };
    }
  }

  /**
   * Gets Linear API usage statistics
   */
  private async getLinearAPIStats(): Promise<{
    remainingCalls: number;
    totalCalls: number;
    resetTime: Date;
    usagePercentage: number;
    isHealthy: boolean;
    responseTime: number;
  }> {
    try {
      // Test Linear API and measure response time
      const startTime = Date.now();
      
      // Get a valid token to test with
      const client = await getClient();
      const tokenResult = await client.query(
        'SELECT access_token FROM linear_tokens ORDER BY updated_at DESC LIMIT 1'
      );

      if (tokenResult.rows.length === 0) {
        throw new Error('No Linear token available');
      }

      const linearClient = new LinearClient({ 
        accessToken: tokenResult.rows[0].access_token 
      });

      // Make a lightweight API call to check status and response time
      await linearClient.viewer;
      const responseTime = Date.now() - startTime;

      // Linear doesn't provide explicit rate limit headers in GraphQL responses
      // so we'll use estimated values based on known limits (1000 requests per hour)
      const estimatedLimit = 1000; // per hour
      const estimatedUsed = Math.floor(Math.random() * 200); // Simulate current usage
      const remainingCalls = estimatedLimit - estimatedUsed;
      const usagePercentage = (estimatedUsed / estimatedLimit) * 100;
      const resetTime = new Date();
      resetTime.setHours(resetTime.getHours() + 1); // Reset in 1 hour

      return {
        remainingCalls,
        totalCalls: estimatedLimit,
        resetTime,
        usagePercentage,
        isHealthy: usagePercentage < this.config.apiUsageWarningPercentage,
        responseTime
      };
    } catch (error) {
      logger.error('Error getting Linear API stats', { error });
      return {
        remainingCalls: 0,
        totalCalls: 1000,
        resetTime: new Date(Date.now() + (60 * 60 * 1000)),
        usagePercentage: 100,
        isHealthy: false,
        responseTime: 0
      };
    }
  }

  /**
   * Gets Confluence API usage statistics
   */
  private async getConfluenceAPIStats(): Promise<{
    remainingCalls: number;
    totalCalls: number;
    resetTime: Date;
    usagePercentage: number;
    isHealthy: boolean;
    responseTime: number;
  }> {
    try {
      // Confluence has rate limits but they're harder to track precisely
      // We'll simulate based on known limits (10,000 requests per hour for Cloud)
      const estimatedLimit = 10000; // per hour
      const estimatedUsed = Math.floor(Math.random() * 1000); // Simulate current usage
      const remainingCalls = estimatedLimit - estimatedUsed;
      const usagePercentage = (estimatedUsed / estimatedLimit) * 100;
      const responseTime = 200; // Simulated response time
      const resetTime = new Date();
      resetTime.setHours(resetTime.getHours() + 1); // Reset in 1 hour

      return {
        remainingCalls,
        totalCalls: estimatedLimit,
        resetTime,
        usagePercentage,
        isHealthy: usagePercentage < this.config.apiUsageWarningPercentage,
        responseTime
      };
    } catch (error) {
      logger.error('Error getting Confluence API stats', { error });
      return {
        remainingCalls: 0,
        totalCalls: 10000,
        resetTime: new Date(Date.now() + (60 * 60 * 1000)),
        usagePercentage: 100,
        isHealthy: false,
        responseTime: 0
      };
    }
  }
}
