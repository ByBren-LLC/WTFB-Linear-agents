/**
 * Planning Session State Models
 * 
 * This module defines the interfaces and types for planning session state management.
 */

/**
 * Enum representing the possible states of a planning session
 */
export enum PlanningSessionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Interface representing an error that occurred during a planning session
 */
export interface PlanningSessionError {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

/**
 * Interface representing a warning that occurred during a planning session
 */
export interface PlanningSessionWarning {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

/**
 * Interface representing the results of a planning session (created issues)
 */
export interface PlanningSessionResult {
  epics: Record<string, string>; // Planning ID -> Linear ID
  features: Record<string, string>;
  stories: Record<string, string>;
  enablers: Record<string, string>;
}

/**
 * Interface representing the complete state of a planning session
 */
export interface PlanningSessionState {
  id: string;
  organizationId: string;
  confluencePageUrl: string;
  planningTitle: string;
  status: PlanningSessionStatus;
  progress: number;
  progressMessage?: string;
  errors: PlanningSessionError[];
  warnings: PlanningSessionWarning[];
  result?: PlanningSessionResult;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing an update to a planning session state
 */
export interface PlanningSessionUpdate {
  status?: PlanningSessionStatus;
  progress?: number;
  progressMessage?: string;
  error?: PlanningSessionError;
  warning?: PlanningSessionWarning;
  result?: PlanningSessionResult;
}
