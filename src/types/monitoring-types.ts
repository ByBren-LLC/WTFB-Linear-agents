/**
 * Enhanced monitoring types for System Health Monitoring
 * 
 * This module extends the existing notification types with comprehensive
 * health monitoring data structures for the Linear Planning Agent.
 */

/**
 * Health status levels
 */
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * OAuth token health status
 */
export interface TokenHealthStatus {
  linearToken: {
    expiresAt: Date;
    daysUntilExpiration: number;
    isHealthy: boolean;
    lastRefresh: Date;
    hasRefreshToken: boolean;
  };
  confluenceToken: {
    expiresAt: Date;
    daysUntilExpiration: number;
    isHealthy: boolean;
    lastRefresh: Date;
    hasRefreshToken: boolean;
  };
  overall: HealthStatus;
}

/**
 * API rate limit health status
 */
export interface APIHealthStatus {
  linear: {
    remainingCalls: number;
    totalCalls: number;
    resetTime: Date;
    usagePercentage: number;
    isHealthy: boolean;
    responseTime: number;
  };
  confluence: {
    remainingCalls: number;
    totalCalls: number;
    resetTime: Date;
    usagePercentage: number;
    isHealthy: boolean;
    responseTime: number;
  };
  overall: HealthStatus;
}

/**
 * System resource health status
 */
export interface ResourceHealthStatus {
  database: {
    connectionCount: number;
    maxConnections: number;
    responseTime: number;
    isHealthy: boolean;
    poolUtilization: number;
  };
  memory: {
    usedMB: number;
    totalMB: number;
    usagePercentage: number;
    isHealthy: boolean;
    heapUsed: number;
    heapTotal: number;
  };
  disk: {
    usedGB: number;
    totalGB: number;
    usagePercentage: number;
    isHealthy: boolean;
    availableGB: number;
  };
  overall: HealthStatus;
}

/**
 * Operational health status
 */
export interface OperationalHealthStatus {
  sync: {
    lastSuccessfulSync: Date;
    minutesSinceLastSync: number;
    isHealthy: boolean;
    errorRate: number;
  };
  planning: {
    lastSuccessfulPlanning: Date;
    minutesSinceLastPlanning: number;
    isHealthy: boolean;
    successRate: number;
  };
  webhooks: {
    queueSize: number;
    processingRate: number;
    isHealthy: boolean;
    errorRate: number;
  };
  overall: HealthStatus;
}

/**
 * Comprehensive system health status
 */
export interface SystemHealthStatus {
  timestamp: number;
  isHealthy: boolean;
  overall: HealthStatus;
  components: {
    tokens: TokenHealthStatus;
    apis: APIHealthStatus;
    resources: ResourceHealthStatus;
    operations: OperationalHealthStatus;
  };
  alerts: HealthAlert[];
}

/**
 * Health alert configuration
 */
export interface AlertThreshold {
  warning: number;
  critical: number;
  enabled: boolean;
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitorConfig {
  /** Check interval in milliseconds */
  checkIntervalMs: number;
  /** OAuth token warning threshold in days */
  tokenExpirationWarningDays: number;
  /** API usage warning threshold (percentage) */
  apiUsageWarningPercentage: number;
  /** Memory usage warning threshold (percentage) */
  memoryUsageWarningPercentage: number;
  /** Disk usage warning threshold (percentage) */
  diskUsageWarningPercentage: number;
  /** Database connection warning threshold (percentage) */
  dbConnectionWarningPercentage: number;
  /** Alert throttle time in milliseconds */
  alertThrottleMs: number;
  /** Whether to send notifications */
  notificationsEnabled: boolean;
  /** Environment-specific settings */
  environment: 'development' | 'staging' | 'production';
}

/**
 * Health alert
 */
export interface HealthAlert {
  id: string;
  component: string;
  status: HealthStatus;
  severity: AlertSeverity;
  message: string;
  actionRequired: string;
  details: Record<string, any>;
  timestamp: Date;
  throttled: boolean;
}

/**
 * Budget monitoring configuration
 */
export interface BudgetConfig {
  /** API usage budget limits */
  apiLimits: {
    linear: {
      dailyLimit: number;
      monthlyLimit: number;
      warningThreshold: number; // percentage
    };
    confluence: {
      dailyLimit: number;
      monthlyLimit: number;
      warningThreshold: number; // percentage
    };
  };
  /** Resource usage budget limits */
  resourceLimits: {
    memory: {
      maxUsageMB: number;
      warningThreshold: number; // percentage
    };
    disk: {
      maxUsageGB: number;
      warningThreshold: number; // percentage
    };
  };
  /** Cost tracking */
  costTracking: {
    enabled: boolean;
    currency: string;
    apiCosts: {
      linearCostPerCall: number;
      confluenceCostPerCall: number;
    };
  };
}

/**
 * Budget usage tracking
 */
export interface BudgetUsage {
  period: 'daily' | 'monthly';
  startDate: Date;
  endDate: Date;
  apiUsage: {
    linear: {
      calls: number;
      limit: number;
      usagePercentage: number;
      estimatedCost: number;
    };
    confluence: {
      calls: number;
      limit: number;
      usagePercentage: number;
      estimatedCost: number;
    };
  };
  resourceUsage: {
    memory: {
      averageUsageMB: number;
      peakUsageMB: number;
      limit: number;
      usagePercentage: number;
    };
    disk: {
      averageUsageGB: number;
      peakUsageGB: number;
      limit: number;
      usagePercentage: number;
    };
  };
  totalEstimatedCost: number;
  isOverBudget: boolean;
}

/**
 * Health metrics for trending and analysis
 */
export interface HealthMetric {
  component: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: Date;
  threshold?: AlertThreshold;
}

/**
 * Health check endpoint response
 */
export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  components: {
    [key: string]: {
      status: HealthStatus;
      details?: Record<string, any>;
    };
  };
  alerts: HealthAlert[];
  budget?: BudgetUsage;
}
