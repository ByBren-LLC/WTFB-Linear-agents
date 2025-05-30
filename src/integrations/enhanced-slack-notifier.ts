/**
 * Enhanced SlackNotifier with operational intelligence methods
 * Extends the base SlackNotifier with specialized notification types
 */
import { SlackNotifier } from './slack';
import * as logger from '../utils/logger';
import {
  NotificationConfig,
  NotificationType,
  PlanningStatistics,
  SyncResult,
  SystemHealth,
  BudgetAlert,
  WorkflowEvent,
  AgentUpdate,
  ThrottleEntry
} from '../types/notification-types';

/**
 * Enhanced SlackNotifier with operational intelligence capabilities
 */
export class EnhancedSlackNotifier extends SlackNotifier {
  private config: NotificationConfig;
  private throttleCache: Map<string, ThrottleEntry>;

  constructor(config?: Partial<NotificationConfig>) {
    super();
    
    // Default configuration
    this.config = {
      channels: {
        planning: '#planning-ops',
        health: '#system-alerts',
        sync: '#sync-status',
        workflow: '#dev-workflow',
        errors: '#critical-alerts',
        agent: '#agent-updates'
      },
      thresholds: {
        tokenExpirationWarningDays: 7,
        apiUsageWarningPercentage: 80,
        memoryUsageWarningPercentage: 85,
        diskUsageWarningPercentage: 90
      },
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
      ...config
    };
    
    this.throttleCache = new Map();
  }

  /**
   * Send planning statistics notification
   */
  async sendPlanningStatistics(stats: PlanningStatistics): Promise<boolean> {
    if (!this.isNotificationEnabled('planning')) {
      logger.debug('Planning notifications disabled');
      return false;
    }

    if (this.shouldThrottleNotification('planning', `planning-${stats.planningTitle}`)) {
      logger.debug('Planning notification throttled', { planningTitle: stats.planningTitle });
      return false;
    }

    const message = this.formatPlanningStatistics(stats);
    const channel = this.getChannelForNotification('planning');
    
    logger.info('Sending planning statistics notification', { 
      planningTitle: stats.planningTitle,
      channel 
    });
    
    return this.sendNotification(message, channel);
  }

  /**
   * Send sync status update notification
   */
  async sendSyncStatusUpdate(syncResult: SyncResult): Promise<boolean> {
    if (!this.isNotificationEnabled('sync')) {
      logger.debug('Sync notifications disabled');
      return false;
    }

    const throttleKey = `sync-${syncResult.syncType}`;
    if (this.shouldThrottleNotification('sync', throttleKey)) {
      logger.debug('Sync notification throttled', { syncType: syncResult.syncType });
      return false;
    }

    const message = this.formatSyncStatus(syncResult);
    const channel = this.getChannelForNotification('sync');
    
    logger.info('Sending sync status notification', { 
      syncType: syncResult.syncType,
      channel 
    });
    
    return this.sendNotification(message, channel);
  }

  /**
   * Send system health alert notification
   */
  async sendSystemHealthAlert(health: SystemHealth): Promise<boolean> {
    if (!this.isNotificationEnabled('health')) {
      logger.debug('Health notifications disabled');
      return false;
    }

    // Critical alerts bypass throttling
    const isCritical = health.severity === 'critical';
    const throttleKey = `health-${health.component}`;

    if (!isCritical && this.shouldThrottleNotification('health', throttleKey)) {
      logger.debug('Health notification throttled', { component: health.component });
      return false;
    }

    const message = this.formatSystemHealth(health);
    const channel = this.getChannelForNotification('health');

    logger.info('Sending system health notification', {
      component: health.component,
      severity: health.severity,
      channel
    });

    return this.sendNotification(message, channel);
  }

  /**
   * Send budget alert notification
   */
  async sendBudgetAlert(budget: BudgetAlert): Promise<boolean> {
    if (!this.isNotificationEnabled('budget')) {
      logger.debug('Budget notifications disabled');
      return false;
    }

    const throttleKey = `budget-${budget.resourceType}`;
    if (this.shouldThrottleNotification('budget', throttleKey)) {
      logger.debug('Budget notification throttled', { resourceType: budget.resourceType });
      return false;
    }

    const message = this.formatBudgetAlert(budget);
    const channel = this.getChannelForNotification('health'); // Budget alerts go to health channel
    
    logger.info('Sending budget alert notification', { 
      resourceType: budget.resourceType,
      usagePercentage: budget.usagePercentage,
      channel 
    });
    
    return this.sendNotification(message, channel);
  }

  /**
   * Send workflow notification
   */
  async sendWorkflowNotification(workflow: WorkflowEvent): Promise<boolean> {
    if (!this.isNotificationEnabled('workflow')) {
      logger.debug('Workflow notifications disabled');
      return false;
    }

    const throttleKey = `workflow-${workflow.eventType}-${workflow.title}`;
    if (this.shouldThrottleNotification('workflow', throttleKey)) {
      logger.debug('Workflow notification throttled', { eventType: workflow.eventType });
      return false;
    }

    const message = this.formatWorkflowEvent(workflow);
    const channel = this.getChannelForNotification('workflow');
    
    logger.info('Sending workflow notification', { 
      eventType: workflow.eventType,
      status: workflow.status,
      channel 
    });
    
    return this.sendNotification(message, channel);
  }

  /**
   * Send remote agent update notification
   */
  async sendRemoteAgentUpdate(agent: AgentUpdate): Promise<boolean> {
    if (!this.isNotificationEnabled('agent')) {
      logger.debug('Agent notifications disabled');
      return false;
    }

    const throttleKey = `agent-${agent.agentId}-${agent.status}`;
    if (this.shouldThrottleNotification('agent', throttleKey)) {
      logger.debug('Agent notification throttled', { agentId: agent.agentId });
      return false;
    }

    const message = this.formatAgentUpdate(agent);
    const channel = this.getChannelForNotification('agent');
    
    logger.info('Sending agent update notification', { 
      agentId: agent.agentId,
      status: agent.status,
      channel 
    });
    
    return this.sendNotification(message, channel);
  }

  /**
   * Check if a notification type is enabled
   */
  private isNotificationEnabled(type: NotificationType): boolean {
    switch (type) {
      case 'planning':
        return this.config.enabled.planningNotifications;
      case 'sync':
        return this.config.enabled.syncNotifications;
      case 'health':
        return this.config.enabled.healthNotifications;
      case 'budget':
        return this.config.enabled.budgetNotifications;
      case 'workflow':
        return this.config.enabled.workflowNotifications;
      case 'agent':
        return this.config.enabled.agentNotifications;
      default:
        return false;
    }
  }

  /**
   * Get the channel for a notification type
   */
  private getChannelForNotification(type: NotificationType): string | undefined {
    switch (type) {
      case 'planning':
        return this.config.channels.planning;
      case 'sync':
        return this.config.channels.sync;
      case 'health':
        return this.config.channels.health;
      case 'budget':
        return this.config.channels.health; // Budget alerts go to health channel
      case 'workflow':
        return this.config.channels.workflow;
      case 'agent':
        return this.config.channels.agent;
      default:
        return undefined;
    }
  }

  /**
   * Check if a notification should be throttled
   */
  private shouldThrottleNotification(type: NotificationType, key: string): boolean {
    const now = Date.now();
    const throttleKey = `${type}-${key}`;
    const entry = this.throttleCache.get(throttleKey);

    if (!entry) {
      // First notification for this key
      this.throttleCache.set(throttleKey, {
        key: throttleKey,
        count: 1,
        windowStart: now
      });
      return false;
    }

    // Check if we're still in the same time window
    const windowElapsed = now - entry.windowStart;
    if (windowElapsed >= this.config.throttling.intervalMs) {
      // New time window, reset counter
      this.throttleCache.set(throttleKey, {
        key: throttleKey,
        count: 1,
        windowStart: now
      });
      return false;
    }

    // Check if we've exceeded the limit
    if (entry.count >= this.config.throttling.maxNotificationsPerInterval) {
      return true; // Throttle this notification
    }

    // Increment counter
    entry.count++;
    this.throttleCache.set(throttleKey, entry);
    return false;
  }

  /**
   * Format planning statistics notification
   */
  private formatPlanningStatistics(stats: PlanningStatistics): string {
    const items = [];
    if (stats.epicCount > 0) items.push(`${stats.epicCount} Epic${stats.epicCount > 1 ? 's' : ''}`);
    if (stats.featureCount > 0) items.push(`${stats.featureCount} Feature${stats.featureCount > 1 ? 's' : ''}`);
    if (stats.storyCount > 0) items.push(`${stats.storyCount} Stor${stats.storyCount > 1 ? 'ies' : 'y'}`);
    if (stats.enablerCount > 0) items.push(`${stats.enablerCount} Enabler${stats.enablerCount > 1 ? 's' : ''}`);

    const itemsText = items.length > 0 ? items.join(', ') : 'No items';

    return [
      `📊 Planning Completed: "${stats.planningTitle}"`,
      `✅ Created: ${itemsText}`,
      `⏱️ Duration: ${stats.durationMinutes.toFixed(1)} minutes`,
      `📄 Source: ${stats.sourceDocument}`,
      stats.sourceUrl ? `🔗 Link: ${stats.sourceUrl}` : null
    ].filter(Boolean).join('\n');
  }

  /**
   * Format sync status notification
   */
  private formatSyncStatus(syncResult: SyncResult): string {
    const syncTypeDisplay = syncResult.syncType.replace('-', ' ↔ ').toUpperCase();
    const conflictStatus = syncResult.conflictsDetected > 0
      ? `⚠️ Conflicts: ${syncResult.conflictsDetected} detected, ${syncResult.conflictsResolved} auto-resolved`
      : '✅ No conflicts detected';

    return [
      `🔄 Sync Completed: ${syncTypeDisplay}`,
      `📝 Changes: ${syncResult.linearUpdates} Linear updates, ${syncResult.confluenceUpdates} Confluence updates`,
      conflictStatus,
      syncResult.conflictsPending > 0 ? `🚨 Manual resolution needed: ${syncResult.conflictsPending} conflicts` : null,
      `⏱️ Next sync: in ${syncResult.nextSyncMinutes} minutes`,
      syncResult.errors && syncResult.errors.length > 0 ? `❌ Errors: ${syncResult.errors.join(', ')}` : null
    ].filter(Boolean).join('\n');
  }

  /**
   * Format system health notification
   */
  private formatSystemHealth(health: SystemHealth): string {
    const statusEmoji: Record<string, string> = {
      healthy: '✅',
      warning: '⚠️',
      critical: '🚨',
      error: '❌'
    };

    const severityEmoji: Record<string, string> = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    return [
      `${statusEmoji[health.status] || '❓'} System Alert: ${health.message}`,
      `${severityEmoji[health.severity] || '⚪'} Component: ${health.component}`,
      health.actionRequired ? `⚡ Action needed: ${health.actionRequired}` : null,
      health.details ? `📍 Details: ${JSON.stringify(health.details)}` : null
    ].filter(Boolean).join('\n');
  }

  /**
   * Format budget alert notification
   */
  private formatBudgetAlert(budget: BudgetAlert): string {
    const resourceEmoji: Record<string, string> = {
      'api-usage': '🔌',
      'memory': '💾',
      'disk': '💿',
      'tokens': '🔑',
      'rate-limit': '⏱️'
    };

    const emoji = resourceEmoji[budget.resourceType] || '📊';
    const percentage = Math.round(budget.usagePercentage);

    return [
      `${emoji} Resource Alert: ${budget.resourceType.toUpperCase()}`,
      `📈 Usage: ${budget.currentUsage}/${budget.limit} (${percentage}%)`,
      `⏰ Timeframe: ${budget.timeframe}`,
      budget.actionRequired ? `⚡ Action needed: ${budget.actionRequired}` : null
    ].filter(Boolean).join('\n');
  }

  /**
   * Format workflow event notification
   */
  private formatWorkflowEvent(workflow: WorkflowEvent): string {
    const eventEmoji: Record<string, string> = {
      'pr-created': '🔀',
      'pr-merged': '✅',
      'pr-failed': '❌',
      'deployment': '🚀',
      'build': '🔨',
      'test': '🧪'
    };

    const statusEmoji: Record<string, string> = {
      success: '✅',
      failure: '❌',
      pending: '⏳',
      'in-progress': '🔄'
    };

    return [
      `${eventEmoji[workflow.eventType] || '📋'} ${workflow.eventType.toUpperCase()}: ${workflow.title}`,
      `${statusEmoji[workflow.status] || '❓'} Status: ${workflow.status}`,
      `📝 ${workflow.description}`,
      workflow.assignee ? `👤 Assignee: ${workflow.assignee}` : null,
      workflow.url ? `🔗 Link: ${workflow.url}` : null
    ].filter(Boolean).join('\n');
  }

  /**
   * Format agent update notification
   */
  private formatAgentUpdate(agent: AgentUpdate): string {
    const statusEmoji: Record<string, string> = {
      assigned: '📋',
      'in-progress': '🔄',
      completed: '✅',
      failed: '❌',
      blocked: '🚫'
    };

    const typeEmoji: Record<string, string> = {
      remote: '🌐',
      local: '💻',
      cli: '⌨️'
    };

    return [
      `${statusEmoji[agent.status] || '❓'} Agent Update: ${agent.agentId}`,
      `${typeEmoji[agent.agentType] || '🤖'} Type: ${agent.agentType}`,
      `📋 Task: ${agent.taskTitle}`,
      `💬 ${agent.message}`,
      agent.assignee ? `👤 Assignee: ${agent.assignee}` : null,
      agent.taskUrl ? `🔗 Link: ${agent.taskUrl}` : null
    ].filter(Boolean).join('\n');
  }

  /**
   * Update notification configuration
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Updated notification configuration', { config: newConfig });
  }

  /**
   * Clear throttle cache (useful for testing)
   */
  clearThrottleCache(): void {
    this.throttleCache.clear();
    logger.debug('Cleared notification throttle cache');
  }

  /**
   * Get current configuration
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }
}
