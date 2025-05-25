# Synchronize Linear with Confluence - Implementation Document

## Overview
This user story will implement the functionality to synchronize Linear issues with Confluence documents. This component will ensure that changes to planning documents in Confluence are reflected in Linear issues, and vice versa.

## User Story
As a Linear Planning Agent, I need to be able to synchronize Linear issues with Confluence documents so that changes to planning documents are reflected in Linear issues, and vice versa.

## Acceptance Criteria
1. The agent can detect changes to Confluence documents
2. The agent can update Linear issues based on changes to Confluence documents
3. The agent can detect changes to Linear issues
4. The agent can update Confluence documents based on changes to Linear issues
5. The agent can handle conflicts between Confluence and Linear
6. The agent can synchronize on demand or on a schedule
7. The agent provides a clean API for synchronization
8. The implementation is well-tested with unit tests
9. The implementation is well-documented with JSDoc comments

## Technical Context
The Linear Planning Agent needs to keep Linear issues and Confluence documents in sync. This involves detecting changes to either system, updating the other system accordingly, and handling conflicts.

### Existing Code
- `src/confluence/client.ts`: Confluence API client (to be implemented in the Confluence API Integration task)
- `src/confluence/parser.ts`: Confluence document parser (to be implemented in the Parse Confluence Documents task)
- `src/planning/extractor.ts`: Planning information extractor (to be implemented in the Extract Planning Information task)
- `src/linear/issue-creator.ts`: Linear issue creator (to be implemented in the Create Linear Issues from Planning Data task)
- `src/linear/issue-updater.ts`: Linear issue updater (to be implemented in the Create Linear Issues from Planning Data task)
- `src/safe/hierarchy-manager.ts`: SAFe hierarchy manager (to be implemented in the Maintain SAFe Hierarchy task)

### Dependencies
- Confluence API Integration (Technical Enabler)
- Parse Confluence Documents (User Story)
- Extract Planning Information (User Story)
- Create Linear Issues from Planning Data (User Story)
- Maintain SAFe Hierarchy (User Story)
- Linear API Error Handling (Technical Enabler)

## Implementation Plan

### 1. Implement Synchronization Manager
- Create a new file `src/sync/manager.ts` for the synchronization manager
- Implement a class that manages synchronization between Linear and Confluence

```typescript
// src/sync/manager.ts
import * as logger from '../utils/logger';
import { ConfluenceClient } from '../confluence/client';
import { ConfluenceParser } from '../confluence/parser';
import { PlanningExtractor } from '../planning/extractor';
import { LinearIssueCreator } from '../linear/issue-creator';
import { LinearIssueUpdater } from '../linear/issue-updater';
import { LinearIssueFinder } from '../linear/issue-finder';
import { SAFeHierarchyManager } from '../safe/hierarchy-manager';
import { SyncConfig, SyncResult, SyncDirection, SyncConflict } from './models';
import { ConflictResolver } from './conflict-resolver';
import { ChangeDetector } from './change-detector';
import { getAccessToken } from '../auth/tokens';
import { getConfluenceToken } from '../auth/confluence-tokens';

export class SynchronizationManager {
  private confluenceClient: ConfluenceClient | null = null;
  private linearIssueCreator: LinearIssueCreator | null = null;
  private linearIssueUpdater: LinearIssueUpdater | null = null;
  private linearIssueFinder: LinearIssueFinder | null = null;
  private safeHierarchyManager: SAFeHierarchyManager | null = null;
  private changeDetector: ChangeDetector | null = null;
  private conflictResolver: ConflictResolver | null = null;
  private organizationId: string;
  private teamId: string;

  constructor(organizationId: string, teamId: string) {
    this.organizationId = organizationId;
    this.teamId = teamId;
    this.conflictResolver = new ConflictResolver();
  }

  async initialize(): Promise<void> {
    try {
      // Get tokens
      const linearToken = await getAccessToken(this.organizationId);
      const confluenceToken = await getConfluenceToken(this.organizationId);
      
      if (!linearToken || !confluenceToken) {
        throw new Error('Missing tokens');
      }
      
      // Initialize clients
      this.confluenceClient = new ConfluenceClient(confluenceToken);
      this.linearIssueCreator = new LinearIssueCreator(linearToken, this.teamId);
      this.linearIssueUpdater = new LinearIssueUpdater(linearToken);
      this.linearIssueFinder = new LinearIssueFinder(linearToken, this.teamId);
      this.safeHierarchyManager = new SAFeHierarchyManager(linearToken, this.teamId);
      this.changeDetector = new ChangeDetector(this.confluenceClient, this.linearIssueFinder);
      
      logger.info('Synchronization manager initialized', { organizationId: this.organizationId });
    } catch (error) {
      logger.error('Error initializing synchronization manager', { error, organizationId: this.organizationId });
      throw error;
    }
  }

  async synchronize(config: SyncConfig): Promise<SyncResult> {
    try {
      if (!this.confluenceClient || !this.linearIssueCreator || !this.linearIssueUpdater || !this.linearIssueFinder || !this.safeHierarchyManager || !this.changeDetector) {
        await this.initialize();
      }
      
      if (!this.confluenceClient || !this.linearIssueCreator || !this.linearIssueUpdater || !this.linearIssueFinder || !this.safeHierarchyManager || !this.changeDetector) {
        throw new Error('Failed to initialize synchronization manager');
      }
      
      const result: SyncResult = {
        success: true,
        direction: config.direction,
        changes: {
          created: [],
          updated: [],
          deleted: []
        },
        conflicts: []
      };
      
      // Detect changes
      const changes = await this.changeDetector.detectChanges(config);
      
      // Handle changes based on direction
      if (config.direction === SyncDirection.CONFLUENCE_TO_LINEAR || config.direction === SyncDirection.BIDIRECTIONAL) {
        await this.syncConfluenceToLinear(changes.confluenceChanges, result);
      }
      
      if (config.direction === SyncDirection.LINEAR_TO_CONFLUENCE || config.direction === SyncDirection.BIDIRECTIONAL) {
        await this.syncLinearToConfluence(changes.linearChanges, result);
      }
      
      // Resolve conflicts
      if (config.direction === SyncDirection.BIDIRECTIONAL) {
        await this.resolveConflicts(changes.conflicts, result);
      }
      
      logger.info('Synchronization completed', { result });
      
      return result;
    } catch (error) {
      logger.error('Error during synchronization', { error, config });
      
      return {
        success: false,
        direction: config.direction,
        changes: {
          created: [],
          updated: [],
          deleted: []
        },
        conflicts: [],
        error: error.message
      };
    }
  }

  private async syncConfluenceToLinear(changes: any[], result: SyncResult): Promise<void> {
    // Implementation details
  }

  private async syncLinearToConfluence(changes: any[], result: SyncResult): Promise<void> {
    // Implementation details
  }

  private async resolveConflicts(conflicts: SyncConflict[], result: SyncResult): Promise<void> {
    // Implementation details
  }
}
```

### 2. Implement Synchronization Models
- Create a new file `src/sync/models.ts` for synchronization models
- Define interfaces for synchronization configuration, results, and conflicts

```typescript
// src/sync/models.ts
export enum SyncDirection {
  CONFLUENCE_TO_LINEAR = 'confluence_to_linear',
  LINEAR_TO_CONFLUENCE = 'linear_to_confluence',
  BIDIRECTIONAL = 'bidirectional'
}

export enum SyncFrequency {
  ON_DEMAND = 'on_demand',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly'
}

export interface SyncConfig {
  id?: string;
  organizationId: string;
  teamId: string;
  confluencePageUrl: string;
  direction: SyncDirection;
  frequency: SyncFrequency;
  lastSyncTime?: Date;
  enabled: boolean;
}

export interface SyncChange {
  id: string;
  type: 'epic' | 'feature' | 'story' | 'enabler';
  action: 'created' | 'updated' | 'deleted';
  source: 'confluence' | 'linear';
  sourceId: string;
  targetId?: string;
  data: any;
}

export interface SyncConflict {
  id: string;
  type: 'epic' | 'feature' | 'story' | 'enabler';
  confluenceData: any;
  linearData: any;
  resolution?: 'confluence' | 'linear' | 'manual';
}

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
```

### 3. Implement Change Detector
- Create a new file `src/sync/change-detector.ts` for the change detector
- Implement a class that detects changes between Confluence and Linear

```typescript
// src/sync/change-detector.ts
import * as logger from '../utils/logger';
import { ConfluenceClient } from '../confluence/client';
import { ConfluenceParser } from '../confluence/parser';
import { PlanningExtractor } from '../planning/extractor';
import { LinearIssueFinder } from '../linear/issue-finder';
import { SyncConfig, SyncChange, SyncConflict } from './models';

export class ChangeDetector {
  private confluenceClient: ConfluenceClient;
  private linearIssueFinder: LinearIssueFinder;

  constructor(confluenceClient: ConfluenceClient, linearIssueFinder: LinearIssueFinder) {
    this.confluenceClient = confluenceClient;
    this.linearIssueFinder = linearIssueFinder;
  }

  async detectChanges(config: SyncConfig): Promise<{
    confluenceChanges: SyncChange[];
    linearChanges: SyncChange[];
    conflicts: SyncConflict[];
  }> {
    try {
      // Get Confluence document
      const pageId = this.extractPageIdFromUrl(config.confluencePageUrl);
      const page = await this.confluenceClient.getPage(pageId);
      
      // Parse Confluence document
      const parser = new ConfluenceParser(page.body.storage.value);
      const document = parser.getFullContent();
      const sections = parser.getDocumentStructure();
      
      // Extract planning information
      const extractor = new PlanningExtractor(document, sections);
      const planningDocument = extractor.getPlanningDocument();
      
      // Get Linear issues
      const epics = await this.linearIssueFinder.findEpics();
      const features = await this.linearIssueFinder.findFeatures();
      const stories = await this.linearIssueFinder.findStories();
      const enablers = await this.linearIssueFinder.findEnablers();
      
      // Detect changes
      const confluenceChanges: SyncChange[] = [];
      const linearChanges: SyncChange[] = [];
      const conflicts: SyncConflict[] = [];
      
      // Detect changes in epics
      // Implementation details
      
      // Detect changes in features
      // Implementation details
      
      // Detect changes in stories
      // Implementation details
      
      // Detect changes in enablers
      // Implementation details
      
      return {
        confluenceChanges,
        linearChanges,
        conflicts
      };
    } catch (error) {
      logger.error('Error detecting changes', { error, config });
      throw error;
    }
  }

  private extractPageIdFromUrl(url: string): string {
    // Implementation details
    return '';
  }

  private compareEpics(confluenceEpic: any, linearEpic: any): 'equal' | 'confluence_changed' | 'linear_changed' | 'both_changed' {
    // Implementation details
    return 'equal';
  }

  private compareFeatures(confluenceFeature: any, linearFeature: any): 'equal' | 'confluence_changed' | 'linear_changed' | 'both_changed' {
    // Implementation details
    return 'equal';
  }

  private compareStories(confluenceStory: any, linearStory: any): 'equal' | 'confluence_changed' | 'linear_changed' | 'both_changed' {
    // Implementation details
    return 'equal';
  }

  private compareEnablers(confluenceEnabler: any, linearEnabler: any): 'equal' | 'confluence_changed' | 'linear_changed' | 'both_changed' {
    // Implementation details
    return 'equal';
  }
}
```

### 4. Implement Conflict Resolver
- Create a new file `src/sync/conflict-resolver.ts` for the conflict resolver
- Implement a class that resolves conflicts between Confluence and Linear

```typescript
// src/sync/conflict-resolver.ts
import * as logger from '../utils/logger';
import { SyncConflict } from './models';

export class ConflictResolver {
  resolveConflict(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    try {
      // Implement conflict resolution logic
      // This could be based on rules, timestamps, or other factors
      
      // For now, we'll use a simple rule: prefer Linear for certain fields, Confluence for others
      switch (conflict.type) {
        case 'epic':
          return this.resolveEpicConflict(conflict);
        case 'feature':
          return this.resolveFeatureConflict(conflict);
        case 'story':
          return this.resolveStoryConflict(conflict);
        case 'enabler':
          return this.resolveEnablerConflict(conflict);
        default:
          logger.warn('Unknown conflict type', { conflict });
          return 'manual';
      }
    } catch (error) {
      logger.error('Error resolving conflict', { error, conflict });
      return 'manual';
    }
  }

  private resolveEpicConflict(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    // Implementation details
    return 'manual';
  }

  private resolveFeatureConflict(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    // Implementation details
    return 'manual';
  }

  private resolveStoryConflict(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    // Implementation details
    return 'manual';
  }

  private resolveEnablerConflict(conflict: SyncConflict): 'confluence' | 'linear' | 'manual' {
    // Implementation details
    return 'manual';
  }
}
```

### 5. Implement Synchronization API
- Create a new file `src/api/sync.ts` for the synchronization API
- Implement API endpoints for managing synchronization

```typescript
// src/api/sync.ts
import { Router } from 'express';
import * as logger from '../utils/logger';
import { SynchronizationManager } from '../sync/manager';
import { SyncConfig, SyncDirection, SyncFrequency } from '../sync/models';
import { createSyncConfig, getSyncConfig, getSyncConfigsByOrganization, updateSyncConfig, deleteSyncConfig } from '../db/models';

const router = Router();

// Create a new sync configuration
router.post('/configs', async (req, res) => {
  try {
    const { organizationId, teamId, confluencePageUrl, direction, frequency, enabled } = req.body;
    
    if (!organizationId || !teamId || !confluencePageUrl || !direction || !frequency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const config = await createSyncConfig({
      organizationId,
      teamId,
      confluencePageUrl,
      direction,
      frequency,
      enabled: enabled !== false
    });
    
    return res.status(201).json(config);
  } catch (error) {
    logger.error('Error creating sync configuration', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a sync configuration
router.get('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = await getSyncConfig(parseInt(id, 10));
    
    if (!config) {
      return res.status(404).json({ error: 'Sync configuration not found' });
    }
    
    return res.json(config);
  } catch (error) {
    logger.error('Error getting sync configuration', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sync configurations by organization
router.get('/configs', async (req, res) => {
  try {
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organizationId parameter' });
    }
    
    const configs = await getSyncConfigsByOrganization(organizationId as string);
    
    return res.json(configs);
  } catch (error) {
    logger.error('Error getting sync configurations', { error, organizationId: req.query.organizationId });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a sync configuration
router.put('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { confluencePageUrl, direction, frequency, enabled } = req.body;
    
    const config = await getSyncConfig(parseInt(id, 10));
    
    if (!config) {
      return res.status(404).json({ error: 'Sync configuration not found' });
    }
    
    const updatedConfig = await updateSyncConfig(parseInt(id, 10), {
      confluencePageUrl,
      direction,
      frequency,
      enabled
    });
    
    return res.json(updatedConfig);
  } catch (error) {
    logger.error('Error updating sync configuration', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a sync configuration
router.delete('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await deleteSyncConfig(parseInt(id, 10));
    
    if (!deleted) {
      return res.status(404).json({ error: 'Sync configuration not found' });
    }
    
    return res.json({ status: 'deleted' });
  } catch (error) {
    logger.error('Error deleting sync configuration', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Synchronize now
router.post('/sync/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = await getSyncConfig(parseInt(id, 10));
    
    if (!config) {
      return res.status(404).json({ error: 'Sync configuration not found' });
    }
    
    const syncManager = new SynchronizationManager(config.organizationId, config.teamId);
    const result = await syncManager.synchronize(config);
    
    // Update last sync time
    await updateSyncConfig(parseInt(id, 10), {
      lastSyncTime: new Date()
    });
    
    return res.json(result);
  } catch (error) {
    logger.error('Error synchronizing', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### 6. Implement Scheduled Synchronization
- Create a new file `src/sync/scheduler.ts` for the synchronization scheduler
- Implement a class that schedules synchronization based on frequency

```typescript
// src/sync/scheduler.ts
import * as logger from '../utils/logger';
import { SynchronizationManager } from './manager';
import { SyncConfig, SyncFrequency } from './models';
import { getSyncConfigsByFrequency, updateSyncConfig } from '../db/models';

export class SyncScheduler {
  private hourlyInterval: NodeJS.Timeout | null = null;
  private dailyInterval: NodeJS.Timeout | null = null;
  private weeklyInterval: NodeJS.Timeout | null = null;

  start(): void {
    // Schedule hourly sync
    this.hourlyInterval = setInterval(async () => {
      await this.runScheduledSync(SyncFrequency.HOURLY);
    }, 60 * 60 * 1000); // 1 hour
    
    // Schedule daily sync
    this.dailyInterval = setInterval(async () => {
      await this.runScheduledSync(SyncFrequency.DAILY);
    }, 24 * 60 * 60 * 1000); // 1 day
    
    // Schedule weekly sync
    this.weeklyInterval = setInterval(async () => {
      await this.runScheduledSync(SyncFrequency.WEEKLY);
    }, 7 * 24 * 60 * 60 * 1000); // 1 week
    
    logger.info('Sync scheduler started');
  }

  stop(): void {
    if (this.hourlyInterval) {
      clearInterval(this.hourlyInterval);
      this.hourlyInterval = null;
    }
    
    if (this.dailyInterval) {
      clearInterval(this.dailyInterval);
      this.dailyInterval = null;
    }
    
    if (this.weeklyInterval) {
      clearInterval(this.weeklyInterval);
      this.weeklyInterval = null;
    }
    
    logger.info('Sync scheduler stopped');
  }

  private async runScheduledSync(frequency: SyncFrequency): Promise<void> {
    try {
      // Get configs for this frequency
      const configs = await getSyncConfigsByFrequency(frequency);
      
      logger.info(`Running scheduled sync for ${frequency} frequency`, { count: configs.length });
      
      // Run sync for each config
      for (const config of configs) {
        if (!config.enabled) {
          continue;
        }
        
        try {
          const syncManager = new SynchronizationManager(config.organizationId, config.teamId);
          await syncManager.synchronize(config);
          
          // Update last sync time
          await updateSyncConfig(config.id, {
            lastSyncTime: new Date()
          });
        } catch (error) {
          logger.error('Error during scheduled sync', { error, config });
        }
      }
      
      logger.info(`Completed scheduled sync for ${frequency} frequency`);
    } catch (error) {
      logger.error('Error running scheduled sync', { error, frequency });
    }
  }
}

// Create a singleton instance
export const syncScheduler = new SyncScheduler();
```

### 7. Write Tests
- Write unit tests for all components
- Write integration tests for the synchronization functionality
- Test with various scenarios and edge cases

```typescript
// tests/sync/manager.test.ts
import { SynchronizationManager } from '../../src/sync/manager';
import { SyncDirection, SyncFrequency } from '../../src/sync/models';
import { ConfluenceClient } from '../../src/confluence/client';
import { LinearIssueFinder } from '../../src/linear/issue-finder';
import { LinearIssueCreator } from '../../src/linear/issue-creator';
import { LinearIssueUpdater } from '../../src/linear/issue-updater';
import { SAFeHierarchyManager } from '../../src/safe/hierarchy-manager';

// Mock dependencies
jest.mock('../../src/confluence/client');
jest.mock('../../src/linear/issue-finder');
jest.mock('../../src/linear/issue-creator');
jest.mock('../../src/linear/issue-updater');
jest.mock('../../src/safe/hierarchy-manager');
jest.mock('../../src/auth/tokens');
jest.mock('../../src/auth/confluence-tokens');

describe('SynchronizationManager', () => {
  // Test cases
});

// tests/sync/change-detector.test.ts
import { ChangeDetector } from '../../src/sync/change-detector';
import { ConfluenceClient } from '../../src/confluence/client';
import { LinearIssueFinder } from '../../src/linear/issue-finder';
import { SyncDirection, SyncFrequency } from '../../src/sync/models';

// Mock dependencies
jest.mock('../../src/confluence/client');
jest.mock('../../src/linear/issue-finder');

describe('ChangeDetector', () => {
  // Test cases
});
```

### 8. Document the API
- Add JSDoc comments to all functions and classes
- Create a README.md file for the synchronization functionality
- Document usage examples and limitations

## Testing Approach
- Unit tests for all components
- Integration tests for the synchronization functionality
- Test with various scenarios and edge cases
- Test with real Linear and Confluence instances
- Test conflict resolution with different types of conflicts

## Definition of Done
- All acceptance criteria are met
- All tests are passing
- Code is well-documented with JSDoc comments
- A README.md file is created for the synchronization functionality
- The implementation is reviewed and approved by the team

## Estimated Effort
- 8 story points (approximately 8 days of work)

## Resources
- [Confluence API Documentation](https://developer.atlassian.com/cloud/confluence/rest/v1/intro/)
- [Linear API Documentation](https://developers.linear.app/docs/)
- [Linear SDK Documentation](https://github.com/linear/linear/tree/master/packages/sdk)
