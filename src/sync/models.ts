/**
 * Synchronization models for Linear Planning Agent
 *
 * This module defines the interfaces and enums for synchronization between Linear and Confluence.
 */

/**
 * Synchronization direction
 */
export enum SyncDirection {
  CONFLUENCE_TO_LINEAR = 'confluence_to_linear',
  LINEAR_TO_CONFLUENCE = 'linear_to_confluence',
  BIDIRECTIONAL = 'bidirectional'
}

/**
 * Synchronization frequency
 */
export enum SyncFrequency {
  ON_DEMAND = 'on_demand',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly'
}

/**
 * Synchronization configuration
 */
export interface SyncConfig {
  id?: number;
  organizationId: string;
  teamId: string;
  confluencePageUrl: string;
  direction: SyncDirection;
  frequency: SyncFrequency;
  lastSyncTime?: Date;
  enabled: boolean;
}

/**
 * Synchronization change
 */
export interface SyncChange {
  id: string;
  type: 'epic' | 'feature' | 'story' | 'enabler';
  action: 'created' | 'updated' | 'deleted';
  source: 'confluence' | 'linear';
  sourceId: string;
  targetId?: string;
  data: any;
}

/**
 * Synchronization conflict
 */
export interface SyncConflict {
  id: string;
  type: 'epic' | 'feature' | 'story' | 'enabler';
  confluenceData: any;
  linearData: any;
  resolution?: 'confluence' | 'linear' | 'manual';
}

/**
 * Synchronization result
 */
export interface SyncResult {
  success: boolean;
  direction: SyncDirection;
  changes: {
    created: SyncChange[];
    updated: SyncChange[];
    deleted: SyncChange[];
  };
  conflicts: SyncConflict[];
  error?: string;
}

/**
 * Synchronization changes
 */
export interface SyncChanges {
  confluenceChanges: SyncChange[];
  linearChanges: SyncChange[];
  conflicts: SyncConflict[];
}
