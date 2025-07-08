/**
 * Additional type definitions for Behavior System (LIN-59)
 * 
 * Extended types for behavior implementation details.
 */

/**
 * Types of autonomous behaviors
 */
export enum BehaviorType {
  STORY_MONITORING = 'story_monitoring',
  ART_HEALTH_MONITORING = 'art_health_monitoring',
  DEPENDENCY_DETECTION = 'dependency_detection',
  WORKFLOW_AUTOMATION = 'workflow_automation',
  PERIODIC_REPORTING = 'periodic_reporting',
  ANOMALY_DETECTION = 'anomaly_detection'
}

/**
 * Story monitoring configuration
 */
export interface StoryMonitoringConfig {
  /** Maximum story points before suggesting decomposition */
  maxStoryPoints: number;
  
  /** Ignore stories with these labels */
  ignoreLabels: string[];
  
  /** Only monitor stories in these states */
  monitorStates: string[];
  
  /** Template for decomposition suggestions */
  suggestionTemplate: string;
}

/**
 * ART health monitoring configuration
 */
export interface ARTHealthConfig {
  /** Minimum readiness score before alerting */
  minReadinessScore: number;
  
  /** Check frequency in hours */
  checkFrequencyHours: number;
  
  /** Teams to monitor */
  monitoredTeams: string[];
  
  /** Stakeholders to notify */
  stakeholders: string[];
}

/**
 * Dependency detection configuration
 */
export interface DependencyDetectionConfig {
  /** Keywords that indicate dependencies */
  dependencyKeywords: string[];
  
  /** Patterns to match (regex) */
  dependencyPatterns: string[];
  
  /** Cross-team mention detection */
  detectCrossTeamMentions: boolean;
  
  /** Minimum confidence to suggest */
  minConfidence: number;
}

/**
 * Workflow automation rules
 */
export interface WorkflowRule {
  /** Rule identifier */
  id: string;
  
  /** Rule name */
  name: string;
  
  /** Trigger condition */
  trigger: {
    type: 'assignment' | 'comment' | 'label' | 'pr_link';
    condition: any;
  };
  
  /** Action to take */
  action: {
    type: 'status_change' | 'label_add' | 'assign' | 'notify';
    params: any;
  };
  
  /** Whether rule is active */
  active: boolean;
}

/**
 * Periodic report configuration
 */
export interface ReportConfig {
  /** Report type */
  type: 'art_health' | 'velocity' | 'dependency' | 'custom';
  
  /** Schedule (cron expression) */
  schedule: string;
  
  /** Teams to include */
  teams: string[];
  
  /** Recipients */
  recipients: string[];
  
  /** Output format */
  format: 'markdown' | 'json' | 'csv';
  
  /** Where to post report */
  destination: {
    type: 'linear_issue' | 'slack' | 'email';
    target: string;
  };
}

/**
 * Anomaly detection rules
 */
export interface AnomalyRule {
  /** Rule identifier */
  id: string;
  
  /** What to check */
  metric: 'story_points' | 'velocity' | 'capacity' | 'dependencies' | 'cycle_time';
  
  /** Detection method */
  method: 'threshold' | 'statistical' | 'pattern';
  
  /** Parameters for detection */
  params: {
    threshold?: number;
    standardDeviations?: number;
    pattern?: string;
  };
  
  /** Severity of anomaly */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Actions to take when detected */
  actions: string[];
}