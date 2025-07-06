/**
 * Progress Tracker Configuration (LIN-64)
 * 
 * Configurable business rules and thresholds for the Progress Tracker
 * to handle edge cases and enterprise requirements.
 */

/**
 * Progress calculation strategy for parent epics
 */
export type EpicProgressStrategy = 'weighted' | 'simple' | 'milestone';

/**
 * Strategy for handling concurrent updates
 */
export type ConcurrentUpdateStrategy = 'merge' | 'latest' | 'conflict';

/**
 * Configuration for Progress Tracker business logic
 */
export interface ProgressTrackerConfig {
  /**
   * Progress calculation rules
   */
  progressCalculation: {
    /** Weight assigned to 0-point stories (default: 1) */
    zeroPointStoryWeight: number;
    
    /** Strategy for calculating parent epic progress */
    parentEpicProgressStrategy: EpicProgressStrategy;
    
    /** Include stories moved between iterations in progress calculation */
    includeMovedStories: boolean;
    
    /** Weight multiplier for enabler stories vs user stories */
    enablerStoryMultiplier: number;
  };
  
  /**
   * Business thresholds for alerts and warnings
   */
  thresholds: {
    /** ART readiness warning threshold (percentage) */
    artReadinessWarning: number;
    
    /** ART readiness critical threshold (percentage) */
    artReadinessCritical: number;
    
    /** Maximum capacity utilization before warning */
    capacityUtilizationMax: number;
    
    /** Minimum capacity utilization for efficiency warning */
    capacityUtilizationMin: number;
    
    /** Progress variance threshold for anomaly detection (percentage) */
    progressVarianceThreshold: number;
  };
  
  /**
   * State transition business rules
   */
  stateTransition: {
    /** Allow epic completion when some children are incomplete */
    allowPartialEpicCompletion: boolean;
    
    /** Require all dependencies to be complete before marking done */
    requireDependencyCompletion: boolean;
    
    /** Automatically progress parent epics based on child states */
    autoProgressParentEpics: boolean;
    
    /** Allow stories to move to done without all subtasks complete */
    allowIncompleteSubtasks: boolean;
  };
  
  /**
   * Integration and error handling configuration
   */
  integration: {
    /** Number of retry attempts for Linear API calls */
    linearApiRetryAttempts: number;
    
    /** Maximum delay tolerance for webhook processing (ms) */
    webhookDelayTolerance: number;
    
    /** Strategy for handling concurrent updates */
    concurrentUpdateStrategy: ConcurrentUpdateStrategy;
    
    /** Rate limit backoff multiplier */
    rateLimitBackoffMultiplier: number;
    
    /** Maximum backoff delay (ms) */
    maxBackoffDelay: number;
  };
  
  /**
   * Monitoring and alerting configuration
   */
  monitoring: {
    /** Enable edge case tracking */
    trackEdgeCases: boolean;
    
    /** Log business rule decisions */
    logBusinessRuleDecisions: boolean;
    
    /** Alert on threshold breaches */
    alertOnThresholdBreach: boolean;
    
    /** Metrics collection interval (ms) */
    metricsCollectionInterval: number;
  };
}

/**
 * Default configuration factory
 */
export function createDefaultConfig(environment: string = 'development'): ProgressTrackerConfig {
  const baseConfig: ProgressTrackerConfig = {
    progressCalculation: {
      zeroPointStoryWeight: 1,
      parentEpicProgressStrategy: 'weighted',
      includeMovedStories: true,
      enablerStoryMultiplier: 1.2 // Enablers are slightly weighted higher
    },
    thresholds: {
      artReadinessWarning: 85,
      artReadinessCritical: 70,
      capacityUtilizationMax: 95,
      capacityUtilizationMin: 70,
      progressVarianceThreshold: 15
    },
    stateTransition: {
      allowPartialEpicCompletion: false,
      requireDependencyCompletion: true,
      autoProgressParentEpics: true,
      allowIncompleteSubtasks: false
    },
    integration: {
      linearApiRetryAttempts: 3,
      webhookDelayTolerance: 5000,
      concurrentUpdateStrategy: 'merge',
      rateLimitBackoffMultiplier: 2,
      maxBackoffDelay: 300000 // 5 minutes
    },
    monitoring: {
      trackEdgeCases: true,
      logBusinessRuleDecisions: true,
      alertOnThresholdBreach: true,
      metricsCollectionInterval: 60000 // 1 minute
    }
  };
  
  // Environment-specific overrides
  if (environment === 'production') {
    baseConfig.thresholds.artReadinessWarning = 90;
    baseConfig.thresholds.artReadinessCritical = 75;
    baseConfig.integration.linearApiRetryAttempts = 5;
    baseConfig.monitoring.metricsCollectionInterval = 30000; // 30 seconds
  }
  
  if (environment === 'test') {
    baseConfig.integration.linearApiRetryAttempts = 1;
    baseConfig.integration.webhookDelayTolerance = 1000;
    baseConfig.monitoring.metricsCollectionInterval = 1000; // 1 second
  }
  
  return baseConfig;
}

/**
 * Configuration validation
 */
export function validateConfig(config: ProgressTrackerConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate thresholds
  if (config.thresholds.artReadinessWarning <= config.thresholds.artReadinessCritical) {
    errors.push('ART readiness warning threshold must be higher than critical threshold');
  }
  
  if (config.thresholds.capacityUtilizationMax <= config.thresholds.capacityUtilizationMin) {
    errors.push('Maximum capacity utilization must be higher than minimum');
  }
  
  if (config.thresholds.progressVarianceThreshold < 0 || config.thresholds.progressVarianceThreshold > 100) {
    errors.push('Progress variance threshold must be between 0 and 100');
  }
  
  // Validate integration settings
  if (config.integration.linearApiRetryAttempts < 0) {
    errors.push('Linear API retry attempts must be non-negative');
  }
  
  if (config.integration.maxBackoffDelay < config.integration.webhookDelayTolerance) {
    errors.push('Maximum backoff delay should be greater than webhook delay tolerance');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}