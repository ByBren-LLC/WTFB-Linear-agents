/**
 * Change Detector
 *
 * This module provides functionality to detect changes between Linear issues and Confluence documents.
 */
import { ConfluenceClient } from '../confluence/client';
import { LinearClientWrapper } from '../linear/client';
import { SyncStore } from './sync-store';
import { PlanningExtractor } from '../planning/extractor';
import { LinearIssueFinder } from '../linear/issue-finder';
import * as logger from '../utils/logger';

/**
 * Change type
 */
export enum ChangeType {
  /** Item was created */
  CREATED = 'created',
  /** Item was updated */
  UPDATED = 'updated',
  /** Item was deleted */
  DELETED = 'deleted'
}

/**
 * Change source
 */
export enum ChangeSource {
  /** Change originated from Linear */
  LINEAR = 'linear',
  /** Change originated from Confluence */
  CONFLUENCE = 'confluence'
}

/**
 * Change item type
 */
export enum ChangeItemType {
  /** Epic */
  EPIC = 'epic',
  /** Feature */
  FEATURE = 'feature',
  /** Story */
  STORY = 'story',
  /** Enabler */
  ENABLER = 'enabler'
}

/**
 * Change
 */
export interface Change {
  /** Change ID */
  id: string;
  /** Change type */
  type: ChangeType;
  /** Change source */
  source: ChangeSource;
  /** Item type */
  itemType: ChangeItemType;
  /** Item ID */
  itemId: string;
  /** Item data */
  itemData: any;
  /** Timestamp of the change */
  timestamp: number;
}

/**
 * Changes
 */
export interface Changes {
  /** Linear changes */
  linearChanges: Change[];
  /** Confluence changes */
  confluenceChanges: Change[];
}

/**
 * Conflict
 */
export interface Conflict {
  /** Conflict ID */
  id: string;
  /** Linear change */
  linearChange?: Change;
  /** Confluence change */
  confluenceChange?: Change;
  /** Resolved change */
  resolvedChange?: Change;
  /** Whether the conflict is resolved */
  isResolved: boolean;
  /** Resolution strategy */
  resolutionStrategy?: 'linear' | 'confluence' | 'manual';
}

/**
 * Change detector
 */
export class ChangeDetector {
  private confluenceClient: ConfluenceClient;
  private linearClient: LinearClientWrapper;
  private syncStore: SyncStore;

  /**
   * Creates a new change detector
   *
   * @param confluenceClient Confluence client
   * @param linearClient Linear client
   * @param syncStore Synchronization store
   */
  constructor(
    confluenceClient: ConfluenceClient,
    linearClient: LinearClientWrapper,
    syncStore: SyncStore
  ) {
    this.confluenceClient = confluenceClient;
    this.linearClient = linearClient;
    this.syncStore = syncStore;
  }

  /**
   * Detects changes between Linear issues and Confluence documents
   *
   * @param confluencePageIdOrUrl Confluence page ID or URL
   * @param linearTeamId Linear team ID
   * @returns Changes
   * @throws Error if there's an issue detecting changes
   */
  async detectChanges(
    confluencePageIdOrUrl: string,
    linearTeamId: string
  ): Promise<Changes> {
    try {
      logger.info('Detecting changes', {
        confluencePageIdOrUrl,
        linearTeamId
      });

      if (!confluencePageIdOrUrl) {
        throw new Error('Confluence page ID or URL is required');
      }

      if (!linearTeamId) {
        throw new Error('Linear team ID is required');
      }

      let lastSyncTimestamp;
      try {
        lastSyncTimestamp = await this.syncStore.getLastSyncTimestamp(
          confluencePageIdOrUrl,
          linearTeamId
        );
        logger.info('Last sync timestamp', { lastSyncTimestamp });
      } catch (error) {
        logger.error('Error getting last sync timestamp', { error });
        throw new Error(`Failed to get last sync timestamp: ${(error as Error).message}`);
      }

      // Detect Linear changes
      let linearChanges;
      try {
        linearChanges = await this.detectLinearChanges(
          linearTeamId,
          lastSyncTimestamp
        );
        logger.info('Linear changes detected', { changeCount: linearChanges.length });
      } catch (error) {
        logger.error('Error detecting Linear changes', { error });
        throw new Error(`Failed to detect Linear changes: ${(error as Error).message}`);
      }

      // Detect Confluence changes
      let confluenceChanges;
      try {
        confluenceChanges = await this.detectConfluenceChanges(
          confluencePageIdOrUrl,
          lastSyncTimestamp
        );
        logger.info('Confluence changes detected', { changeCount: confluenceChanges.length });
      } catch (error) {
        logger.error('Error detecting Confluence changes', { error });
        throw new Error(`Failed to detect Confluence changes: ${(error as Error).message}`);
      }

      logger.info('All changes detected', {
        linearChanges: linearChanges.length,
        confluenceChanges: confluenceChanges.length
      });

      return {
        linearChanges,
        confluenceChanges
      };
    } catch (error) {
      logger.error('Error detecting changes', { error });
      throw error;
    }
  }

  /**
   * Detects conflicts between Linear and Confluence changes
   *
   * @param changes Changes
   * @returns Conflicts
   */
  detectConflicts(changes: Changes): Conflict[] {
    try {
      const conflicts: Conflict[] = [];

      // Check for conflicts (same item changed in both Linear and Confluence)
      for (const linearChange of changes.linearChanges) {
        const conflictingChange = changes.confluenceChanges.find(
          confluenceChange => confluenceChange.itemId === linearChange.itemId
        );

        if (conflictingChange) {
          conflicts.push({
            id: `conflict-${linearChange.itemId}`,
            linearChange,
            confluenceChange: conflictingChange,
            isResolved: false
          });
        }
      }

      logger.info('Conflicts detected', { conflictCount: conflicts.length });
      return conflicts;
    } catch (error) {
      logger.error('Error detecting conflicts', { error });
      throw error;
    }
  }

  /**
   * Detects changes in Linear issues
   *
   * @param linearTeamId Linear team ID
   * @param lastSyncTimestamp Last synchronization timestamp
   * @returns Linear changes
   */
  private async detectLinearChanges(
    linearTeamId: string,
    lastSyncTimestamp: number | null
  ): Promise<Change[]> {
    try {
      const changes: Change[] = [];

      // If this is the first sync, don't detect Linear changes
      if (!lastSyncTimestamp) {
        return changes;
      }

      // Get issues updated since last sync
      const updatedIssues = await this.linearClient.executeQuery(
        () => this.linearClient.getTeamIssues(linearTeamId, {
          updatedAt: { gt: new Date(lastSyncTimestamp).toISOString() }
        }),
        'getTeamIssues'
      );

      // Process updated issues
      for (const issue of updatedIssues.nodes) {
        // Determine item type
        let itemType: ChangeItemType;
        const labels = issue.labels?.nodes || [];
        const labelNames = labels.map((label: { name: string }) => label.name);

        if (labelNames.includes('Epic')) {
          itemType = ChangeItemType.EPIC;
        } else if (labelNames.includes('Feature')) {
          itemType = ChangeItemType.FEATURE;
        } else if (labelNames.includes('Enabler')) {
          itemType = ChangeItemType.ENABLER;
        } else {
          itemType = ChangeItemType.STORY;
        }

        // Determine change type
        let changeType: ChangeType;
        if (new Date(issue.createdAt).getTime() > lastSyncTimestamp) {
          changeType = ChangeType.CREATED;
        } else {
          changeType = ChangeType.UPDATED;
        }

        // Add change
        changes.push({
          id: `linear-change-${issue.id}`,
          type: changeType,
          source: ChangeSource.LINEAR,
          itemType,
          itemId: issue.id,
          itemData: issue,
          timestamp: new Date(issue.updatedAt).getTime()
        });
      }

      // TODO: Detect deleted issues

      logger.info('Linear changes detected', { changeCount: changes.length });
      return changes;
    } catch (error) {
      logger.error('Error detecting Linear changes', { error });
      throw error;
    }
  }

  /**
   * Detects changes in Confluence documents
   *
   * @param confluencePageIdOrUrl Confluence page ID or URL
   * @param lastSyncTimestamp Last synchronization timestamp
   * @returns Confluence changes
   */
  private async detectConfluenceChanges(
    confluencePageIdOrUrl: string,
    lastSyncTimestamp: number | null
  ): Promise<Change[]> {
    try {
      const changes: Change[] = [];

      // Parse the Confluence page
      let document;
      if (confluencePageIdOrUrl.startsWith('http')) {
        document = await this.confluenceClient.parsePageByUrl(confluencePageIdOrUrl);
      } else {
        document = await this.confluenceClient.parsePage(confluencePageIdOrUrl);
      }

      // Extract planning information
      // Convert ConfluenceDocument to expected types
      const elements = document.elements as any[];
      const sections = document.sections as any[];
      const extractor = new PlanningExtractor(elements, sections);
      const planningDocument = extractor.getPlanningDocument();

      // If this is the first sync, treat all items as created
      if (!lastSyncTimestamp) {
        // Add epics
        for (const epic of planningDocument.epics) {
          changes.push({
            id: `confluence-change-${epic.id}`,
            type: ChangeType.CREATED,
            source: ChangeSource.CONFLUENCE,
            itemType: ChangeItemType.EPIC,
            itemId: epic.id,
            itemData: epic,
            timestamp: Date.now()
          });
        }

        // Add features
        const features = planningDocument.features || [];
        for (const feature of features) {
          changes.push({
            id: `confluence-change-${feature.id}`,
            type: ChangeType.CREATED,
            source: ChangeSource.CONFLUENCE,
            itemType: ChangeItemType.FEATURE,
            itemId: feature.id,
            itemData: feature,
            timestamp: Date.now()
          });
        }

        // Add stories
        const stories = planningDocument.stories || [];
        for (const story of stories) {
          changes.push({
            id: `confluence-change-${story.id}`,
            type: ChangeType.CREATED,
            source: ChangeSource.CONFLUENCE,
            itemType: ChangeItemType.STORY,
            itemId: story.id,
            itemData: story,
            timestamp: Date.now()
          });
        }

        // Add enablers
        const enablers = planningDocument.enablers || [];
        for (const enabler of enablers) {
          changes.push({
            id: `confluence-change-${enabler.id}`,
            type: ChangeType.CREATED,
            source: ChangeSource.CONFLUENCE,
            itemType: ChangeItemType.ENABLER,
            itemId: enabler.id,
            itemData: enabler,
            timestamp: Date.now()
          });
        }
      } else {
        // TODO: Implement change detection for subsequent syncs
        // This would require storing the previous state of the planning document
        // and comparing it with the current state
      }

      logger.info('Confluence changes detected', { changeCount: changes.length });
      return changes;
    } catch (error) {
      logger.error('Error detecting Confluence changes', { error });
      throw error;
    }
  }
}
