/**
 * Operational Health Monitor for Agent Operations Slack Integration
 * 
 * This module provides system health monitoring that integrates with the
 * Enhanced SlackNotifier from Agent #6 to provide operational intelligence.
 */
import { EnhancedSlackNotifier } from '../integrations/enhanced-slack-notifier';
import { SystemHealth, BudgetAlert } from '../types/notification-types';
import * as logger from '../utils/logger';

/**
 * Health monitor configuration
 */
export interface OperationalHealthConfig {
  /** Check interval in milliseconds */
  checkInterval: number;
  /** OAuth token warning threshold in days */
  oauthWarningDays: number;
  /** API rate limit warning threshold (percentage) */
  apiLimitWarningThreshold: number;
  /** Memory usage warning threshold (percentage) */
  memoryWarningThreshold: number;
  /** Whether to send notifications */
  notificationsEnabled: boolean;
}

/**
 * OAuth token info for monitoring
 */
interface TokenInfo {
  service: string;
  expiresAt: number;
  refreshToken?: string;
}

/**
 * API usage tracking
 */
interface APIUsageInfo {
  service: string;
  usage: number;
  limit: number;
  resetTime: number;
  lastUpdated: number;
}

/**
 * Operational health monitor that integrates with Enhanced SlackNotifier
 */
export class OperationalHealthMonitor {
  private config: OperationalHealthConfig;
  private slackNotifier: EnhancedSlackNotifier;
  private monitoringInterval?: NodeJS.Timeout;
  private tokenStore: Map<string, TokenInfo> = new Map();
  private apiUsageStore: Map<string, APIUsageInfo> = new Map();

  constructor(config?: Partial<OperationalHealthConfig>) {
    this.config = {
      checkInterval: 5 * 60 * 1000, // 5 minutes
      oauthWarningDays: 7, // 7 days
      apiLimitWarningThreshold: 80, // 80%
      memoryWarningThreshold: 85, // 85%
      notificationsEnabled: true,
      ...config
    };

    this.slackNotifier = new EnhancedSlackNotifier();
  }

  /**
   * Starts operational health monitoring
   */
  start(): void {
    logger.info('Starting operational health monitoring', { 
      checkInterval: this.config.checkInterval,
      notificationsEnabled: this.config.notificationsEnabled
    });

    // Perform initial health check
    this.performHealthChecks();

    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.checkInterval);
  }

  /**
   * Stops operational health monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      logger.info('Operational health monitoring stopped');
    }
  }

  /**
   * Registers OAuth token for monitoring
   */
  registerOAuthToken(service: string, expiresAt: number, refreshToken?: string): void {
    this.tokenStore.set(service, {
      service,
      expiresAt,
      refreshToken
    });
    
    logger.info('Registered OAuth token for monitoring', { 
      service, 
      expiresAt: new Date(expiresAt).toISOString() 
    });
  }

  /**
   * Updates API usage for monitoring
   */
  updateAPIUsage(service: string, usage: number, limit: number, resetTime: number): void {
    this.apiUsageStore.set(service, {
      service,
      usage,
      limit,
      resetTime,
      lastUpdated: Date.now()
    });

    const usagePercent = (usage / limit) * 100;
    
    // Send notification if threshold exceeded
    if (this.config.notificationsEnabled && usagePercent > this.config.apiLimitWarningThreshold) {
      this.sendAPILimitAlert(service, usage, limit, usagePercent, resetTime);
    }
  }

  /**
   * Gets current health status summary
   */
  getHealthStatus(): {
    overall: 'healthy' | 'warning' | 'critical';
    components: string[];
    lastUpdated: number;
  } {
    const components: string[] = [];
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check OAuth tokens
    for (const [service, tokenInfo] of this.tokenStore.entries()) {
      const daysUntilExpiry = (tokenInfo.expiresAt - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry <= 0) {
        overall = 'critical';
        components.push(`${service}-oauth-expired`);
      } else if (daysUntilExpiry <= this.config.oauthWarningDays) {
        if (overall !== 'critical') overall = 'warning';
        components.push(`${service}-oauth-expiring`);
      }
    }

    // Check API usage
    for (const [service, apiInfo] of this.apiUsageStore.entries()) {
      const usagePercent = (apiInfo.usage / apiInfo.limit) * 100;
      if (usagePercent > 90) {
        overall = 'critical';
        components.push(`${service}-api-critical`);
      } else if (usagePercent > this.config.apiLimitWarningThreshold) {
        if (overall !== 'critical') overall = 'warning';
        components.push(`${service}-api-warning`);
      }
    }

    return {
      overall,
      components,
      lastUpdated: Date.now()
    };
  }

  /**
   * Performs all health checks
   */
  private async performHealthChecks(): Promise<void> {
    try {
      logger.debug('Performing operational health checks');

      // Check OAuth tokens
      await this.checkOAuthTokens();

      // Check system resources
      await this.checkSystemResources();

      logger.debug('Operational health checks completed');
    } catch (error) {
      logger.error('Error performing operational health checks', { error });
      
      if (this.config.notificationsEnabled) {
        const healthAlert: SystemHealth = {
          component: 'health-monitor',
          status: 'error',
          message: 'Health monitoring system error',
          actionRequired: 'Check health monitor logs and configuration',
          details: { error: (error as Error).message },
          timestamp: new Date(),
          severity: 'high'
        };
        
        await this.slackNotifier.sendSystemHealthAlert(healthAlert);
      }
    }
  }

  /**
   * Checks OAuth token expiration
   */
  private async checkOAuthTokens(): Promise<void> {
    const now = Date.now();

    for (const [service, tokenInfo] of this.tokenStore.entries()) {
      const timeUntilExpiry = tokenInfo.expiresAt - now;
      const daysUntilExpiry = timeUntilExpiry / (1000 * 60 * 60 * 24);
      
      if (daysUntilExpiry <= 0) {
        // Token expired
        if (this.config.notificationsEnabled) {
          const healthAlert: SystemHealth = {
            component: `${service}-oauth`,
            status: 'critical',
            message: `${service} OAuth token has expired`,
            actionRequired: 'Immediate token renewal required',
            details: {
              service,
              expiresAt: tokenInfo.expiresAt,
              hasRefreshToken: !!tokenInfo.refreshToken
            },
            timestamp: new Date(),
            severity: 'critical'
          };
          
          await this.slackNotifier.sendSystemHealthAlert(healthAlert);
        }
      } else if (daysUntilExpiry <= this.config.oauthWarningDays) {
        // Token expiring soon
        if (this.config.notificationsEnabled) {
          const healthAlert: SystemHealth = {
            component: `${service}-oauth`,
            status: 'warning',
            message: `${service} OAuth token expires in ${Math.round(daysUntilExpiry)} days`,
            actionRequired: 'Token renewal recommended',
            details: {
              service,
              expiresAt: tokenInfo.expiresAt,
              daysUntilExpiry: Math.round(daysUntilExpiry),
              hasRefreshToken: !!tokenInfo.refreshToken
            },
            timestamp: new Date(),
            severity: 'medium'
          };
          
          await this.slackNotifier.sendSystemHealthAlert(healthAlert);
        }
      }
    }
  }

  /**
   * Checks system resources
   */
  private async checkSystemResources(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      if (memoryPercent > this.config.memoryWarningThreshold) {
        const severity = memoryPercent > 95 ? 'critical' : 'high';
        const status = memoryPercent > 95 ? 'critical' : 'warning';
        
        if (this.config.notificationsEnabled) {
          const healthAlert: SystemHealth = {
            component: 'system-memory',
            status,
            message: `High memory usage: ${Math.round(memoryPercent)}%`,
            actionRequired: memoryPercent > 95 ? 'Immediate attention required' : 'Monitor memory usage',
            details: {
              memoryUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
              memoryTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
              memoryPercent: Math.round(memoryPercent)
            },
            timestamp: new Date(),
            severity
          };
          
          await this.slackNotifier.sendSystemHealthAlert(healthAlert);
        }
      }
    } catch (error) {
      logger.error('Error checking system resources', { error });
    }
  }

  /**
   * Sends API limit alert using Enhanced SlackNotifier
   */
  private async sendAPILimitAlert(
    service: string, 
    usage: number, 
    limit: number, 
    usagePercent: number, 
    resetTime: number
  ): Promise<void> {
    const budgetAlert: BudgetAlert = {
      resourceType: 'api-usage',
      currentUsage: usage,
      limit,
      usagePercentage: usagePercent,
      timeframe: `Resets at ${new Date(resetTime).toLocaleTimeString()}`,
      actionRequired: usagePercent > 90 ? 'Reduce API usage immediately' : 'Monitor API usage closely',
      timestamp: new Date()
    };

    await this.slackNotifier.sendBudgetAlert(budgetAlert);
  }
}
