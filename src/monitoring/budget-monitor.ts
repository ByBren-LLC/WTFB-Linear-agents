/**
 * Budget Monitor for API Usage Tracking
 * 
 * This module provides comprehensive budget monitoring and cost tracking
 * for API usage and system resources.
 */
import { EnhancedSlackNotifier } from '../integrations/enhanced-slack-notifier';
import {
  BudgetConfig,
  BudgetUsage,
  HealthStatus,
  AlertSeverity
} from '../types/monitoring-types';
import { BudgetAlert } from '../types/notification-types';
import * as logger from '../utils/logger';

/**
 * API usage tracking entry
 */
interface APIUsageEntry {
  service: 'linear' | 'confluence';
  endpoint: string;
  timestamp: Date;
  responseTime: number;
  success: boolean;
  cost: number;
}

/**
 * Resource usage tracking entry
 */
interface ResourceUsageEntry {
  resource: 'memory' | 'disk' | 'database';
  timestamp: Date;
  value: number;
  unit: string;
}

/**
 * Budget monitor for tracking API usage and costs
 */
export class BudgetMonitor {
  private config: BudgetConfig;
  private slackNotifier: EnhancedSlackNotifier;
  private apiUsageHistory: APIUsageEntry[] = [];
  private resourceUsageHistory: ResourceUsageEntry[] = [];
  private lastBudgetCheck: Date = new Date();
  private budgetAlerts: Map<string, Date> = new Map();

  constructor(config?: Partial<BudgetConfig>) {
    this.config = {
      apiLimits: {
        linear: {
          dailyLimit: 10000,
          monthlyLimit: 300000,
          warningThreshold: 80
        },
        confluence: {
          dailyLimit: 5000,
          monthlyLimit: 150000,
          warningThreshold: 80
        }
      },
      resourceLimits: {
        memory: {
          maxUsageMB: 2048,
          warningThreshold: 85
        },
        disk: {
          maxUsageGB: 100,
          warningThreshold: 90
        }
      },
      costTracking: {
        enabled: true,
        currency: 'USD',
        apiCosts: {
          linearCostPerCall: 0.001, // $0.001 per call
          confluenceCostPerCall: 0.002 // $0.002 per call
        }
      },
      ...config
    };

    this.slackNotifier = new EnhancedSlackNotifier();
  }

  /**
   * Records API usage
   */
  recordAPIUsage(
    service: 'linear' | 'confluence',
    endpoint: string,
    responseTime: number,
    success: boolean = true
  ): void {
    const cost = this.calculateAPICallCost(service);
    
    const entry: APIUsageEntry = {
      service,
      endpoint,
      timestamp: new Date(),
      responseTime,
      success,
      cost
    };

    this.apiUsageHistory.push(entry);
    
    // Keep only last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.apiUsageHistory = this.apiUsageHistory.filter(
      entry => entry.timestamp >= thirtyDaysAgo
    );

    logger.debug('API usage recorded', {
      service,
      endpoint,
      responseTime,
      success,
      cost
    });

    // Check budget thresholds (async, but don't wait)
    this.checkBudgetThresholds().catch(error => {
      logger.error('Error checking budget thresholds', { error });
    });
  }

  /**
   * Records resource usage
   */
  recordResourceUsage(
    resource: 'memory' | 'disk' | 'database',
    value: number,
    unit: string
  ): void {
    const entry: ResourceUsageEntry = {
      resource,
      timestamp: new Date(),
      value,
      unit
    };

    this.resourceUsageHistory.push(entry);

    // Keep only last 24 hours of resource data
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    this.resourceUsageHistory = this.resourceUsageHistory.filter(
      entry => entry.timestamp >= twentyFourHoursAgo
    );

    logger.debug('Resource usage recorded', {
      resource,
      value,
      unit
    });
  }

  /**
   * Gets current budget usage for a specific period
   */
  getBudgetUsage(period: 'daily' | 'monthly'): BudgetUsage {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (period === 'daily') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Calculate API usage
    const periodApiUsage = this.apiUsageHistory.filter(
      entry => entry.timestamp >= startDate && entry.timestamp <= endDate
    );

    const linearUsage = periodApiUsage.filter(entry => entry.service === 'linear');
    const confluenceUsage = periodApiUsage.filter(entry => entry.service === 'confluence');

    const linearLimit = period === 'daily' 
      ? this.config.apiLimits.linear.dailyLimit 
      : this.config.apiLimits.linear.monthlyLimit;
    
    const confluenceLimit = period === 'daily'
      ? this.config.apiLimits.confluence.dailyLimit
      : this.config.apiLimits.confluence.monthlyLimit;

    // Calculate resource usage
    const periodResourceUsage = this.resourceUsageHistory.filter(
      entry => entry.timestamp >= startDate && entry.timestamp <= endDate
    );

    const memoryUsage = periodResourceUsage.filter(entry => entry.resource === 'memory');
    const diskUsage = periodResourceUsage.filter(entry => entry.resource === 'disk');

    const averageMemory = memoryUsage.length > 0
      ? memoryUsage.reduce((sum, entry) => sum + entry.value, 0) / memoryUsage.length
      : 0;

    const peakMemory = memoryUsage.length > 0
      ? Math.max(...memoryUsage.map(entry => entry.value))
      : 0;

    const averageDisk = diskUsage.length > 0
      ? diskUsage.reduce((sum, entry) => sum + entry.value, 0) / diskUsage.length
      : 0;

    const peakDisk = diskUsage.length > 0
      ? Math.max(...diskUsage.map(entry => entry.value))
      : 0;

    // Calculate costs
    const linearCost = linearUsage.reduce((sum, entry) => sum + entry.cost, 0);
    const confluenceCost = confluenceUsage.reduce((sum, entry) => sum + entry.cost, 0);
    const totalCost = linearCost + confluenceCost;

    const budgetUsage: BudgetUsage = {
      period,
      startDate,
      endDate,
      apiUsage: {
        linear: {
          calls: linearUsage.length,
          limit: linearLimit,
          usagePercentage: (linearUsage.length / linearLimit) * 100,
          estimatedCost: linearCost
        },
        confluence: {
          calls: confluenceUsage.length,
          limit: confluenceLimit,
          usagePercentage: (confluenceUsage.length / confluenceLimit) * 100,
          estimatedCost: confluenceCost
        }
      },
      resourceUsage: {
        memory: {
          averageUsageMB: Math.round(averageMemory),
          peakUsageMB: Math.round(peakMemory),
          limit: this.config.resourceLimits.memory.maxUsageMB,
          usagePercentage: (peakMemory / this.config.resourceLimits.memory.maxUsageMB) * 100
        },
        disk: {
          averageUsageGB: Math.round(averageDisk),
          peakUsageGB: Math.round(peakDisk),
          limit: this.config.resourceLimits.disk.maxUsageGB,
          usagePercentage: (peakDisk / this.config.resourceLimits.disk.maxUsageGB) * 100
        }
      },
      totalEstimatedCost: totalCost,
      isOverBudget: false // Will be set below
    };

    // Set isOverBudget after budgetUsage is fully defined
    budgetUsage.isOverBudget = this.isOverBudget(budgetUsage);

    return budgetUsage;
  }

  /**
   * Checks if current usage is over budget
   */
  private isOverBudget(budgetUsage: BudgetUsage): boolean {
    return (
      budgetUsage.apiUsage.linear.usagePercentage > 100 ||
      budgetUsage.apiUsage.confluence.usagePercentage > 100 ||
      budgetUsage.resourceUsage.memory.usagePercentage > 100 ||
      budgetUsage.resourceUsage.disk.usagePercentage > 100
    );
  }

  /**
   * Calculates cost per API call
   */
  private calculateAPICallCost(service: 'linear' | 'confluence'): number {
    if (!this.config.costTracking.enabled) {
      return 0;
    }

    return service === 'linear'
      ? this.config.costTracking.apiCosts.linearCostPerCall
      : this.config.costTracking.apiCosts.confluenceCostPerCall;
  }

  /**
   * Checks budget thresholds and sends alerts
   */
  private async checkBudgetThresholds(): Promise<void> {
    const dailyUsage = this.getBudgetUsage('daily');
    const monthlyUsage = this.getBudgetUsage('monthly');

    // Check API usage thresholds
    await this.checkAPIThresholds(dailyUsage, 'daily');
    await this.checkAPIThresholds(monthlyUsage, 'monthly');

    // Check resource usage thresholds
    await this.checkResourceThresholds(dailyUsage);
  }

  /**
   * Checks API usage thresholds
   */
  private async checkAPIThresholds(usage: BudgetUsage, period: 'daily' | 'monthly'): Promise<void> {
    const linearThreshold = this.config.apiLimits.linear.warningThreshold;
    const confluenceThreshold = this.config.apiLimits.confluence.warningThreshold;

    // Check Linear API usage
    if (usage.apiUsage.linear.usagePercentage >= linearThreshold) {
      await this.sendBudgetAlert(
        'linear-api',
        period,
        usage.apiUsage.linear.usagePercentage,
        usage.apiUsage.linear.calls,
        usage.apiUsage.linear.limit,
        usage.apiUsage.linear.estimatedCost
      );
    }

    // Check Confluence API usage
    if (usage.apiUsage.confluence.usagePercentage >= confluenceThreshold) {
      await this.sendBudgetAlert(
        'confluence-api',
        period,
        usage.apiUsage.confluence.usagePercentage,
        usage.apiUsage.confluence.calls,
        usage.apiUsage.confluence.limit,
        usage.apiUsage.confluence.estimatedCost
      );
    }
  }

  /**
   * Checks resource usage thresholds
   */
  private async checkResourceThresholds(usage: BudgetUsage): Promise<void> {
    const memoryThreshold = this.config.resourceLimits.memory.warningThreshold;
    const diskThreshold = this.config.resourceLimits.disk.warningThreshold;

    // Check memory usage
    if (usage.resourceUsage.memory.usagePercentage >= memoryThreshold) {
      await this.sendResourceAlert(
        'memory',
        usage.resourceUsage.memory.usagePercentage,
        usage.resourceUsage.memory.peakUsageMB,
        usage.resourceUsage.memory.limit,
        'MB'
      );
    }

    // Check disk usage
    if (usage.resourceUsage.disk.usagePercentage >= diskThreshold) {
      await this.sendResourceAlert(
        'disk',
        usage.resourceUsage.disk.usagePercentage,
        usage.resourceUsage.disk.peakUsageGB,
        usage.resourceUsage.disk.limit,
        'GB'
      );
    }
  }

  /**
   * Sends budget alert for API usage
   */
  private async sendBudgetAlert(
    resourceType: string,
    period: string,
    usagePercentage: number,
    currentUsage: number,
    limit: number,
    estimatedCost: number
  ): Promise<void> {
    const alertKey = `${resourceType}-${period}`;
    
    // Throttle alerts (once per hour)
    const lastAlert = this.budgetAlerts.get(alertKey);
    const now = new Date();
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < 60 * 60 * 1000) {
      return;
    }

    this.budgetAlerts.set(alertKey, now);

    const budgetAlert: BudgetAlert = {
      resourceType: resourceType.includes('linear') ? 'api-usage' :
                   resourceType.includes('confluence') ? 'api-usage' : 'api-usage',
      currentUsage,
      limit,
      usagePercentage,
      timeframe: period === 'daily' ? 'Today' : 'This month',
      actionRequired: usagePercentage > 90
        ? 'Immediate action required - approaching limit'
        : 'Monitor usage closely',
      timestamp: now
    };

    try {
      await this.slackNotifier.sendBudgetAlert(budgetAlert);
      logger.info('Budget alert sent', {
        resourceType,
        period,
        usagePercentage,
        estimatedCost
      });
    } catch (error) {
      logger.error('Error sending budget alert', { error, alertKey });
    }
  }

  /**
   * Sends resource usage alert
   */
  private async sendResourceAlert(
    resource: string,
    usagePercentage: number,
    currentUsage: number,
    limit: number,
    unit: string
  ): Promise<void> {
    const alertKey = `resource-${resource}`;
    
    // Throttle alerts (once per hour)
    const lastAlert = this.budgetAlerts.get(alertKey);
    const now = new Date();
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < 60 * 60 * 1000) {
      return;
    }

    this.budgetAlerts.set(alertKey, now);

    const budgetAlert: BudgetAlert = {
      resourceType: resource as 'memory' | 'disk',
      currentUsage,
      limit,
      usagePercentage,
      timeframe: 'Current',
      actionRequired: usagePercentage > 95
        ? 'Critical - immediate action required'
        : 'Monitor resource usage',
      timestamp: now
    };

    try {
      await this.slackNotifier.sendBudgetAlert(budgetAlert);
      logger.info('Resource alert sent', {
        resource,
        usagePercentage,
        currentUsage,
        unit
      });
    } catch (error) {
      logger.error('Error sending resource alert', { error, alertKey });
    }
  }

  /**
   * Gets API usage statistics
   */
  getAPIUsageStats(): {
    totalCalls: number;
    successRate: number;
    averageResponseTime: number;
    costToday: number;
    costThisMonth: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayUsage = this.apiUsageHistory.filter(entry => entry.timestamp >= today);
    const monthUsage = this.apiUsageHistory.filter(entry => entry.timestamp >= thisMonth);

    const totalCalls = this.apiUsageHistory.length;
    const successfulCalls = this.apiUsageHistory.filter(entry => entry.success).length;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 100;

    const totalResponseTime = this.apiUsageHistory.reduce(
      (sum, entry) => sum + entry.responseTime, 0
    );
    const averageResponseTime = totalCalls > 0 ? totalResponseTime / totalCalls : 0;

    const costToday = todayUsage.reduce((sum, entry) => sum + entry.cost, 0);
    const costThisMonth = monthUsage.reduce((sum, entry) => sum + entry.cost, 0);

    return {
      totalCalls,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      costToday: Math.round(costToday * 1000) / 1000, // Round to 3 decimal places
      costThisMonth: Math.round(costThisMonth * 1000) / 1000 // Round to 3 decimal places
    };
  }

  /**
   * Gets budget configuration
   */
  getConfig(): BudgetConfig {
    return { ...this.config };
  }

  /**
   * Updates budget configuration
   */
  updateConfig(newConfig: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Budget monitor configuration updated', { config: newConfig });
  }

  /**
   * Clears usage history (for testing)
   */
  clearHistory(): void {
    this.apiUsageHistory = [];
    this.resourceUsageHistory = [];
    this.budgetAlerts.clear();
    logger.info('Budget monitor history cleared');
  }
}
