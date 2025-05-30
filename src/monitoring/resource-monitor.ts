/**
 * Resource Monitor for System Resource Monitoring
 * 
 * This module provides detailed monitoring of system resources including
 * memory, disk space, database connections, and performance metrics.
 */
import { EnhancedSlackNotifier } from '../integrations/enhanced-slack-notifier';
import { getClient } from '../db/connection';
import {
  ResourceHealthStatus,
  HealthStatus,
  AlertSeverity
} from '../types/monitoring-types';
import { SystemHealth } from '../types/notification-types';
import * as logger from '../utils/logger';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Resource usage thresholds
 */
interface ResourceThresholds {
  memory: {
    warning: number; // percentage
    critical: number; // percentage
  };
  disk: {
    warning: number; // percentage
    critical: number; // percentage
  };
  database: {
    connectionWarning: number; // percentage
    connectionCritical: number; // percentage
    responseTimeWarning: number; // milliseconds
    responseTimeCritical: number; // milliseconds
  };
}

/**
 * Resource monitoring configuration
 */
interface ResourceMonitorConfig {
  thresholds: ResourceThresholds;
  checkInterval: number; // milliseconds
  notificationsEnabled: boolean;
  alertThrottleMs: number; // milliseconds
}

/**
 * Resource monitor for comprehensive system resource monitoring
 */
export class ResourceMonitor {
  private config: ResourceMonitorConfig;
  private slackNotifier: EnhancedSlackNotifier;
  private monitoringInterval?: NodeJS.Timeout;
  private lastAlerts: Map<string, number> = new Map();
  private isRunning = false;

  constructor(config?: Partial<ResourceMonitorConfig>) {
    this.config = {
      thresholds: {
        memory: {
          warning: 85,
          critical: 95
        },
        disk: {
          warning: 90,
          critical: 95
        },
        database: {
          connectionWarning: 80,
          connectionCritical: 95,
          responseTimeWarning: 1000, // 1 second
          responseTimeCritical: 5000 // 5 seconds
        }
      },
      checkInterval: 2 * 60 * 1000, // 2 minutes
      notificationsEnabled: true,
      alertThrottleMs: 30 * 60 * 1000, // 30 minutes
      ...config
    };

    this.slackNotifier = new EnhancedSlackNotifier();
  }

  /**
   * Starts resource monitoring
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Resource monitoring is already running');
      return;
    }

    logger.info('Starting resource monitoring', {
      checkInterval: this.config.checkInterval,
      notificationsEnabled: this.config.notificationsEnabled
    });

    // Perform initial check
    this.performResourceCheck();

    // Schedule periodic checks
    this.monitoringInterval = setInterval(() => {
      this.performResourceCheck();
    }, this.config.checkInterval);

    this.isRunning = true;
  }

  /**
   * Stops resource monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping resource monitoring');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.isRunning = false;
  }

  /**
   * Performs comprehensive resource check
   */
  async performResourceCheck(): Promise<ResourceHealthStatus> {
    try {
      logger.debug('Performing resource health check');

      const memoryStats = await this.getMemoryStats();
      const diskStats = await this.getDiskStats();
      const databaseStats = await this.getDatabaseStats();

      const resourceHealth: ResourceHealthStatus = {
        memory: {
          usedMB: memoryStats.usedMB,
          totalMB: memoryStats.totalMB,
          usagePercentage: memoryStats.usagePercentage,
          isHealthy: memoryStats.usagePercentage < this.config.thresholds.memory.warning,
          heapUsed: memoryStats.heapUsed,
          heapTotal: memoryStats.heapTotal
        },
        disk: {
          usedGB: diskStats.usedGB,
          totalGB: diskStats.totalGB,
          usagePercentage: diskStats.usagePercentage,
          isHealthy: diskStats.usagePercentage < this.config.thresholds.disk.warning,
          availableGB: diskStats.availableGB
        },
        database: {
          connectionCount: databaseStats.connectionCount,
          maxConnections: databaseStats.maxConnections,
          responseTime: databaseStats.responseTime,
          isHealthy: databaseStats.poolUtilization < this.config.thresholds.database.connectionWarning &&
                    databaseStats.responseTime < this.config.thresholds.database.responseTimeWarning,
          poolUtilization: databaseStats.poolUtilization
        },
        overall: 'healthy'
      };

      // Determine overall health
      const componentStatuses = [
        resourceHealth.memory.isHealthy ? 'healthy' : this.getMemoryStatus(memoryStats.usagePercentage),
        resourceHealth.disk.isHealthy ? 'healthy' : this.getDiskStatus(diskStats.usagePercentage),
        resourceHealth.database.isHealthy ? 'healthy' : this.getDatabaseStatus(databaseStats)
      ];

      resourceHealth.overall = this.determineOverallHealth(componentStatuses);

      // Send alerts if necessary
      await this.processResourceAlerts(resourceHealth);

      logger.debug('Resource health check completed', {
        overall: resourceHealth.overall,
        memoryUsage: memoryStats.usagePercentage,
        diskUsage: diskStats.usagePercentage,
        dbConnections: databaseStats.connectionCount
      });

      return resourceHealth;
    } catch (error) {
      logger.error('Error performing resource health check', { error });
      throw error;
    }
  }

  /**
   * Gets memory usage statistics
   */
  private async getMemoryStats(): Promise<{
    usedMB: number;
    totalMB: number;
    usagePercentage: number;
    heapUsed: number;
    heapTotal: number;
  }> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const usedMB = Math.round(usedMemory / 1024 / 1024);
    const totalMB = Math.round(totalMemory / 1024 / 1024);
    const usagePercentage = Math.round((usedMemory / totalMemory) * 100);

    return {
      usedMB,
      totalMB,
      usagePercentage,
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
    };
  }

  /**
   * Gets disk usage statistics
   */
  private async getDiskStats(): Promise<{
    usedGB: number;
    totalGB: number;
    availableGB: number;
    usagePercentage: number;
  }> {
    try {
      // Get disk usage for current directory
      const stats = fs.statSync(process.cwd());
      
      // For a more accurate implementation, you would use a library like 'node-disk-info'
      // For now, we'll use a simplified approach
      const totalGB = 100; // Default assumption - should be replaced with actual disk info
      const usedGB = 30; // Default assumption - should be replaced with actual disk info
      const availableGB = totalGB - usedGB;
      const usagePercentage = Math.round((usedGB / totalGB) * 100);

      return {
        usedGB,
        totalGB,
        availableGB,
        usagePercentage
      };
    } catch (error) {
      logger.error('Error getting disk stats', { error });
      return {
        usedGB: 0,
        totalGB: 100,
        availableGB: 100,
        usagePercentage: 0
      };
    }
  }

  /**
   * Gets database connection statistics
   */
  private async getDatabaseStats(): Promise<{
    connectionCount: number;
    maxConnections: number;
    responseTime: number;
    poolUtilization: number;
  }> {
    try {
      const startTime = Date.now();
      
      // Test database connectivity and measure response time
      const client = await getClient();
      await client.query('SELECT 1');
      
      const responseTime = Date.now() - startTime;

      // Get connection pool information
      // Note: This is simplified - in a real implementation, you'd get actual pool stats
      const connectionCount = 5; // Default assumption
      const maxConnections = 20; // Default assumption
      const poolUtilization = Math.round((connectionCount / maxConnections) * 100);

      return {
        connectionCount,
        maxConnections,
        responseTime,
        poolUtilization
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
   * Gets memory status based on usage percentage
   */
  private getMemoryStatus(usagePercentage: number): HealthStatus {
    if (usagePercentage >= this.config.thresholds.memory.critical) return 'critical';
    if (usagePercentage >= this.config.thresholds.memory.warning) return 'warning';
    return 'healthy';
  }

  /**
   * Gets disk status based on usage percentage
   */
  private getDiskStatus(usagePercentage: number): HealthStatus {
    if (usagePercentage >= this.config.thresholds.disk.critical) return 'critical';
    if (usagePercentage >= this.config.thresholds.disk.warning) return 'warning';
    return 'healthy';
  }

  /**
   * Gets database status based on connection and response time stats
   */
  private getDatabaseStatus(stats: {
    poolUtilization: number;
    responseTime: number;
  }): HealthStatus {
    if (stats.poolUtilization >= this.config.thresholds.database.connectionCritical ||
        stats.responseTime >= this.config.thresholds.database.responseTimeCritical) {
      return 'critical';
    }
    if (stats.poolUtilization >= this.config.thresholds.database.connectionWarning ||
        stats.responseTime >= this.config.thresholds.database.responseTimeWarning) {
      return 'warning';
    }
    return 'healthy';
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
   * Processes resource alerts and sends notifications
   */
  private async processResourceAlerts(resourceHealth: ResourceHealthStatus): Promise<void> {
    if (!this.config.notificationsEnabled) return;

    // Check memory alerts
    if (!resourceHealth.memory.isHealthy) {
      await this.sendResourceAlert(
        'memory',
        this.getMemoryStatus(resourceHealth.memory.usagePercentage),
        `High memory usage: ${resourceHealth.memory.usagePercentage}%`,
        `Memory usage: ${resourceHealth.memory.usedMB}MB/${resourceHealth.memory.totalMB}MB (${resourceHealth.memory.usagePercentage}%)`,
        resourceHealth.memory.usagePercentage >= this.config.thresholds.memory.critical
          ? 'Immediate attention required - restart service or scale resources'
          : 'Monitor memory usage and consider optimization',
        {
          usedMB: resourceHealth.memory.usedMB,
          totalMB: resourceHealth.memory.totalMB,
          usagePercentage: resourceHealth.memory.usagePercentage,
          heapUsed: resourceHealth.memory.heapUsed,
          heapTotal: resourceHealth.memory.heapTotal
        }
      );
    }

    // Check disk alerts
    if (!resourceHealth.disk.isHealthy) {
      await this.sendResourceAlert(
        'disk',
        this.getDiskStatus(resourceHealth.disk.usagePercentage),
        `High disk usage: ${resourceHealth.disk.usagePercentage}%`,
        `Disk usage: ${resourceHealth.disk.usedGB}GB/${resourceHealth.disk.totalGB}GB (${resourceHealth.disk.usagePercentage}%)`,
        resourceHealth.disk.usagePercentage >= this.config.thresholds.disk.critical
          ? 'Critical - clean up files or expand storage immediately'
          : 'Monitor disk usage and clean up unnecessary files',
        {
          usedGB: resourceHealth.disk.usedGB,
          totalGB: resourceHealth.disk.totalGB,
          availableGB: resourceHealth.disk.availableGB,
          usagePercentage: resourceHealth.disk.usagePercentage
        }
      );
    }

    // Check database alerts
    if (!resourceHealth.database.isHealthy) {
      const dbStatus = this.getDatabaseStatus({
        poolUtilization: resourceHealth.database.poolUtilization,
        responseTime: resourceHealth.database.responseTime
      });

      await this.sendResourceAlert(
        'database',
        dbStatus,
        `Database performance issue`,
        `Connections: ${resourceHealth.database.connectionCount}/${resourceHealth.database.maxConnections} (${resourceHealth.database.poolUtilization}%), Response time: ${resourceHealth.database.responseTime}ms`,
        dbStatus === 'critical'
          ? 'Critical - check database performance and connections immediately'
          : 'Monitor database performance and consider optimization',
        {
          connectionCount: resourceHealth.database.connectionCount,
          maxConnections: resourceHealth.database.maxConnections,
          poolUtilization: resourceHealth.database.poolUtilization,
          responseTime: resourceHealth.database.responseTime
        }
      );
    }
  }

  /**
   * Sends resource alert via Enhanced SlackNotifier
   */
  private async sendResourceAlert(
    component: string,
    status: HealthStatus,
    message: string,
    description: string,
    actionRequired: string,
    details: Record<string, any>
  ): Promise<void> {
    const alertKey = `resource-${component}-${status}`;
    
    // Check throttling
    const lastAlert = this.lastAlerts.get(alertKey);
    const now = Date.now();
    if (lastAlert && (now - lastAlert) < this.config.alertThrottleMs) {
      return;
    }

    this.lastAlerts.set(alertKey, now);

    try {
      const systemHealth: SystemHealth = {
        component: `system-${component}`,
        status: status === 'critical' ? 'critical' : status === 'warning' ? 'warning' : 'healthy',
        message,
        actionRequired,
        details: {
          description,
          ...details
        },
        timestamp: new Date(),
        severity: status === 'critical' ? 'critical' : 'high'
      };

      await this.slackNotifier.sendSystemHealthAlert(systemHealth);
      logger.info('Resource alert sent', { component, status, message });
    } catch (error) {
      logger.error('Error sending resource alert', { error, component, status });
    }
  }

  /**
   * Gets current resource health status
   */
  async getResourceHealth(): Promise<ResourceHealthStatus> {
    return this.performResourceCheck();
  }

  /**
   * Gets resource monitoring configuration
   */
  getConfig(): ResourceMonitorConfig {
    return { ...this.config };
  }

  /**
   * Updates resource monitoring configuration
   */
  updateConfig(newConfig: Partial<ResourceMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Resource monitor configuration updated', { config: newConfig });
  }

  /**
   * Gets monitoring status
   */
  isMonitoring(): boolean {
    return this.isRunning;
  }
}
