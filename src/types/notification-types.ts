/**
 * TypeScript interfaces for Enhanced SlackNotifier operational intelligence notifications
 */

export type NotificationType = 'planning' | 'sync' | 'health' | 'budget' | 'workflow' | 'agent';

export interface NotificationConfig {
  // Channel routing for different notification types
  channels: {
    planning: string;           // "#planning-ops"
    health: string;             // "#system-alerts"
    sync: string;               // "#sync-status"
    workflow: string;           // "#dev-workflow"
    errors: string;             // "#critical-alerts"
    agent: string;              // "#agent-updates"
  };

  // Alert thresholds and timing
  thresholds: {
    tokenExpirationWarningDays: number;     // 7 days
    apiUsageWarningPercentage: number;      // 80%
    memoryUsageWarningPercentage: number;   // 85%
    diskUsageWarningPercentage: number;     // 90%
  };

  // Notification enablement flags
  enabled: {
    planningNotifications: boolean;         // true
    syncNotifications: boolean;             // true
    healthNotifications: boolean;           // true
    budgetNotifications: boolean;           // true
    workflowNotifications: boolean;         // true
    agentNotifications: boolean;            // true
  };

  // Throttling configuration
  throttling: {
    intervalMs: number;                     // 60000 (1 minute)
    maxNotificationsPerInterval: number;    // 5
    criticalBypassThrottle: boolean;        // true
  };
}

export interface PlanningStatistics {
  planningTitle: string;
  epicCount: number;
  featureCount: number;
  storyCount: number;
  enablerCount: number;
  durationMinutes: number;
  sourceDocument: string;
  sourceUrl?: string;
  timestamp: Date;
}

export interface SyncResult {
  syncType: 'linear-confluence' | 'confluence-linear' | 'bidirectional';
  linearUpdates: number;
  confluenceUpdates: number;
  conflictsDetected: number;
  conflictsResolved: number;
  conflictsPending: number;
  nextSyncMinutes: number;
  timestamp: Date;
  errors?: string[];
}

export interface SystemHealth {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'error';
  message: string;
  actionRequired?: string;
  details?: Record<string, any>;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface BudgetAlert {
  resourceType: 'api-usage' | 'memory' | 'disk' | 'tokens' | 'rate-limit';
  currentUsage: number;
  limit: number;
  usagePercentage: number;
  timeframe: string;
  actionRequired?: string;
  timestamp: Date;
}

export interface WorkflowEvent {
  eventType: 'pr-created' | 'pr-merged' | 'pr-failed' | 'deployment' | 'build' | 'test';
  title: string;
  description: string;
  status: 'success' | 'failure' | 'pending' | 'in-progress';
  url?: string;
  assignee?: string;
  timestamp: Date;
}

export interface AgentUpdate {
  agentId: string;
  agentType: 'remote' | 'local' | 'cli';
  status: 'assigned' | 'in-progress' | 'completed' | 'failed' | 'blocked';
  taskTitle: string;
  taskUrl?: string;
  message: string;
  assignee?: string;
  timestamp: Date;
}

export interface ThrottleEntry {
  key: string;
  count: number;
  windowStart: number;
}
