# Planning Session State Management - Implementation Document

## Overview
This user story will implement the state management for planning sessions. This component will track the state of planning sessions, including progress, errors, and results, and provide a clean API for updating and querying the state.

## User Story
As a Linear Planning Agent, I need to be able to manage the state of planning sessions so that I can track progress, handle errors, and provide feedback to users.

## Acceptance Criteria
1. The agent can create and initialize planning session state
2. The agent can update planning session progress
3. The agent can record errors and warnings during planning
4. The agent can record the results of planning (created issues)
5. The agent can query the current state of a planning session
6. The agent can handle concurrent updates to planning session state
7. The agent provides a clean API for state management
8. The implementation is well-tested with unit tests
9. The implementation is well-documented with JSDoc comments

## Technical Context
The Linear Planning Agent needs to manage the state of planning sessions as they progress from initialization to completion. This involves tracking progress, recording errors, and storing the results of planning.

### Existing Code
- `src/db/models.ts`: Database models for storing planning sessions
- `src/planning/session-manager.ts`: Planning session manager (to be implemented in the Create Linear Issues from Planning Data task)

### Dependencies
- Create Linear Issues from Planning Data (User Story)
- Planning Session Persistence (User Story)

## Implementation Plan

### 1. Define Planning Session State Model
- Create a new file `src/planning/state.ts` for planning session state models
- Define interfaces for planning session state

```typescript
// src/planning/state.ts
export enum PlanningSessionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface PlanningSessionError {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

export interface PlanningSessionWarning {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

export interface PlanningSessionResult {
  epics: Record<string, string>; // Planning ID -> Linear ID
  features: Record<string, string>;
  stories: Record<string, string>;
  enablers: Record<string, string>;
}

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

export interface PlanningSessionUpdate {
  status?: PlanningSessionStatus;
  progress?: number;
  progressMessage?: string;
  error?: PlanningSessionError;
  warning?: PlanningSessionWarning;
  result?: PlanningSessionResult;
}
```

### 2. Implement State Manager
- Create a new file `src/planning/state-manager.ts` for the planning session state manager
- Implement a class that manages planning session state

```typescript
// src/planning/state-manager.ts
import * as logger from '../utils/logger';
import {
  PlanningSessionState,
  PlanningSessionStatus,
  PlanningSessionUpdate,
  PlanningSessionError,
  PlanningSessionWarning,
  PlanningSessionResult
} from './state';
import {
  createPlanningSession,
  getPlanningSession,
  updatePlanningSession
} from '../db/models';

export class PlanningSessionStateManager {
  private sessionId: string;
  private state: PlanningSessionState | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async initialize(): Promise<PlanningSessionState> {
    try {
      const session = await getPlanningSession(parseInt(this.sessionId, 10));
      
      if (!session) {
        throw new Error(`Planning session not found: ${this.sessionId}`);
      }
      
      this.state = {
        id: session.id.toString(),
        organizationId: session.organization_id,
        confluencePageUrl: session.confluence_page_url,
        planningTitle: session.planning_title,
        status: session.status as PlanningSessionStatus,
        progress: 0,
        errors: [],
        warnings: [],
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
      
      return this.state;
    } catch (error) {
      logger.error('Error initializing planning session state', { error, sessionId: this.sessionId });
      throw error;
    }
  }

  async getState(): Promise<PlanningSessionState> {
    if (!this.state) {
      return this.initialize();
    }
    
    return this.state;
  }

  async updateState(update: PlanningSessionUpdate): Promise<PlanningSessionState> {
    if (!this.state) {
      await this.initialize();
    }
    
    if (!this.state) {
      throw new Error(`Planning session not found: ${this.sessionId}`);
    }
    
    // Update the state
    if (update.status !== undefined) {
      this.state.status = update.status;
    }
    
    if (update.progress !== undefined) {
      this.state.progress = update.progress;
    }
    
    if (update.progressMessage !== undefined) {
      this.state.progressMessage = update.progressMessage;
    }
    
    if (update.error) {
      this.state.errors.push(update.error);
      
      // If we get an error and the status is not already failed, set it to failed
      if (this.state.status !== PlanningSessionStatus.FAILED) {
        this.state.status = PlanningSessionStatus.FAILED;
      }
    }
    
    if (update.warning) {
      this.state.warnings.push(update.warning);
    }
    
    if (update.result) {
      this.state.result = update.result;
      
      // If we get a result and the status is not already completed, set it to completed
      if (this.state.status !== PlanningSessionStatus.COMPLETED) {
        this.state.status = PlanningSessionStatus.COMPLETED;
      }
    }
    
    // Update the timestamp
    this.state.updatedAt = new Date();
    
    // Persist the state
    await this.persistState();
    
    return this.state;
  }

  async setProgress(progress: number, message?: string): Promise<PlanningSessionState> {
    return this.updateState({
      progress,
      progressMessage: message
    });
  }

  async setStatus(status: PlanningSessionStatus): Promise<PlanningSessionState> {
    return this.updateState({
      status
    });
  }

  async addError(message: string, code?: string, details?: any): Promise<PlanningSessionState> {
    return this.updateState({
      error: {
        message,
        code,
        details,
        timestamp: new Date()
      }
    });
  }

  async addWarning(message: string, code?: string, details?: any): Promise<PlanningSessionState> {
    return this.updateState({
      warning: {
        message,
        code,
        details,
        timestamp: new Date()
      }
    });
  }

  async setResult(result: PlanningSessionResult): Promise<PlanningSessionState> {
    return this.updateState({
      result,
      status: PlanningSessionStatus.COMPLETED
    });
  }

  private async persistState(): Promise<void> {
    if (!this.state) {
      return;
    }
    
    try {
      await updatePlanningSession(parseInt(this.sessionId, 10), {
        status: this.state.status,
        // Store other state data as JSON in a metadata field
        metadata: JSON.stringify({
          progress: this.state.progress,
          progressMessage: this.state.progressMessage,
          errors: this.state.errors,
          warnings: this.state.warnings,
          result: this.state.result
        })
      });
    } catch (error) {
      logger.error('Error persisting planning session state', { error, sessionId: this.sessionId });
      throw error;
    }
  }
}
```

### 3. Implement State Store
- Create a new file `src/planning/state-store.ts` for the planning session state store
- Implement a class that stores and retrieves planning session state

```typescript
// src/planning/state-store.ts
import * as logger from '../utils/logger';
import { PlanningSessionState, PlanningSessionStatus } from './state';
import { PlanningSessionStateManager } from './state-manager';
import {
  getPlanningSessionsByOrganization,
  deletePlanningSession
} from '../db/models';

export class PlanningSessionStateStore {
  private stateManagers: Map<string, PlanningSessionStateManager> = new Map();

  async getStateManager(sessionId: string): Promise<PlanningSessionStateManager> {
    let stateManager = this.stateManagers.get(sessionId);
    
    if (!stateManager) {
      stateManager = new PlanningSessionStateManager(sessionId);
      this.stateManagers.set(sessionId, stateManager);
    }
    
    return stateManager;
  }

  async getState(sessionId: string): Promise<PlanningSessionState> {
    const stateManager = await this.getStateManager(sessionId);
    return stateManager.getState();
  }

  async getStatesByOrganization(organizationId: string): Promise<PlanningSessionState[]> {
    try {
      const sessions = await getPlanningSessionsByOrganization(organizationId);
      
      const states: PlanningSessionState[] = [];
      
      for (const session of sessions) {
        const stateManager = await this.getStateManager(session.id.toString());
        const state = await stateManager.getState();
        states.push(state);
      }
      
      return states;
    } catch (error) {
      logger.error('Error getting planning session states by organization', { error, organizationId });
      throw error;
    }
  }

  async deleteState(sessionId: string): Promise<boolean> {
    try {
      // Remove from the state managers map
      this.stateManagers.delete(sessionId);
      
      // Delete from the database
      return await deletePlanningSession(parseInt(sessionId, 10));
    } catch (error) {
      logger.error('Error deleting planning session state', { error, sessionId });
      throw error;
    }
  }
}

// Create a singleton instance
export const planningSessionStateStore = new PlanningSessionStateStore();
```

### 4. Implement State API
- Create a new file `src/api/planning.ts` for the planning session API
- Implement API endpoints for managing planning session state

```typescript
// src/api/planning.ts
import { Router } from 'express';
import * as logger from '../utils/logger';
import { planningSessionStateStore } from '../planning/state-store';
import { PlanningSessionStateManager } from '../planning/state-manager';
import { PlanningSessionStatus } from '../planning/state';
import { createPlanningSession as dbCreatePlanningSession } from '../db/models';
import { startPlanningProcess } from '../planning/process';

const router = Router();

// Create a new planning session
router.post('/sessions', async (req, res) => {
  try {
    const { title, confluencePageUrl, organizationId } = req.body;
    
    if (!title || !confluencePageUrl || !organizationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const session = await dbCreatePlanningSession(
      organizationId,
      confluencePageUrl,
      title
    );
    
    // Initialize the state
    const stateManager = await planningSessionStateStore.getStateManager(session.id.toString());
    await stateManager.initialize();
    
    return res.status(201).json(session);
  } catch (error) {
    logger.error('Error creating planning session', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a planning session
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const state = await planningSessionStateStore.getState(id);
    
    return res.json(state);
  } catch (error) {
    logger.error('Error getting planning session', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get planning sessions by organization
router.get('/sessions', async (req, res) => {
  try {
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organizationId parameter' });
    }
    
    const states = await planningSessionStateStore.getStatesByOrganization(organizationId as string);
    
    return res.json(states);
  } catch (error) {
    logger.error('Error getting planning sessions', { error, organizationId: req.query.organizationId });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start a planning session
router.post('/sessions/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    const stateManager = await planningSessionStateStore.getStateManager(id);
    const state = await stateManager.getState();
    
    if (state.status !== PlanningSessionStatus.PENDING) {
      return res.status(400).json({ error: 'Planning session is not in pending status' });
    }
    
    // Update the status to processing
    await stateManager.setStatus(PlanningSessionStatus.PROCESSING);
    
    // Start the planning process in the background
    startPlanningProcess(id).catch(error => {
      logger.error('Error in planning process', { error, sessionId: id });
    });
    
    return res.json({ status: 'processing' });
  } catch (error) {
    logger.error('Error starting planning session', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a planning session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await planningSessionStateStore.deleteState(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Planning session not found' });
    }
    
    return res.json({ status: 'deleted' });
  } catch (error) {
    logger.error('Error deleting planning session', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### 5. Implement Process Manager
- Create a new file `src/planning/process.ts` for the planning process manager
- Implement a function to start and manage the planning process

```typescript
// src/planning/process.ts
import * as logger from '../utils/logger';
import { planningSessionStateStore } from './state-store';
import { PlanningSessionStatus } from './state';
import { getConfluenceClient } from '../confluence/client';
import { ConfluenceParser } from '../confluence/parser';
import { PlanningExtractor } from '../planning/extractor';
import { LinearIssueCreator } from '../linear/issue-creator';
import { SAFeHierarchyManager } from '../safe/hierarchy-manager';
import { getAccessToken } from '../auth/tokens';
import { getConfluenceToken } from '../auth/confluence-tokens';

export const startPlanningProcess = async (sessionId: string): Promise<void> => {
  const stateManager = await planningSessionStateStore.getStateManager(sessionId);
  const state = await stateManager.getState();
  
  try {
    // Update status to processing
    await stateManager.setStatus(PlanningSessionStatus.PROCESSING);
    await stateManager.setProgress(0, 'Starting planning process');
    
    // Get the Confluence page
    await stateManager.setProgress(10, 'Retrieving Confluence page');
    
    const confluenceToken = await getConfluenceToken(state.organizationId);
    
    if (!confluenceToken) {
      throw new Error('Confluence token not found');
    }
    
    const confluenceClient = getConfluenceClient(confluenceToken);
    const pageId = extractPageIdFromUrl(state.confluencePageUrl);
    const page = await confluenceClient.getPage(pageId);
    
    // Parse the Confluence page
    await stateManager.setProgress(20, 'Parsing Confluence page');
    
    const parser = new ConfluenceParser(page.body.storage.value);
    const document = parser.getFullContent();
    const sections = parser.getDocumentStructure();
    
    // Extract planning information
    await stateManager.setProgress(40, 'Extracting planning information');
    
    const extractor = new PlanningExtractor(document, sections);
    const planningDocument = extractor.getPlanningDocument();
    
    // Create Linear issues
    await stateManager.setProgress(60, 'Creating Linear issues');
    
    const linearToken = await getAccessToken(state.organizationId);
    
    if (!linearToken) {
      throw new Error('Linear token not found');
    }
    
    const teamId = await getLinearTeamId(linearToken);
    
    if (!teamId) {
      throw new Error('Linear team not found');
    }
    
    const issueCreator = new LinearIssueCreator(linearToken, teamId);
    const result = await issueCreator.createIssuesFromPlanningDocument(planningDocument);
    
    // Maintain SAFe hierarchy
    await stateManager.setProgress(80, 'Maintaining SAFe hierarchy');
    
    const hierarchyManager = new SAFeHierarchyManager(linearToken, teamId);
    await hierarchyManager.updateHierarchy(planningDocument, result);
    
    // Complete the planning process
    await stateManager.setProgress(100, 'Planning process completed');
    await stateManager.setResult(result);
    await stateManager.setStatus(PlanningSessionStatus.COMPLETED);
    
    logger.info('Planning process completed successfully', { sessionId });
  } catch (error) {
    logger.error('Error in planning process', { error, sessionId });
    
    await stateManager.addError(error.message, error.code, error.details);
    await stateManager.setStatus(PlanningSessionStatus.FAILED);
  }
};

const extractPageIdFromUrl = (url: string): string => {
  // Implementation details
};

const getLinearTeamId = async (accessToken: string): Promise<string | null> => {
  // Implementation details
};
```

### 6. Write Tests
- Write unit tests for all components
- Write integration tests for the state management
- Test with various scenarios and edge cases

```typescript
// tests/planning/state-manager.test.ts
import { PlanningSessionStateManager } from '../../src/planning/state-manager';
import { PlanningSessionStatus } from '../../src/planning/state';
import * as dbModels from '../../src/db/models';

// Mock the database models
jest.mock('../../src/db/models');

describe('PlanningSessionStateManager', () => {
  // Test cases
});

// tests/planning/state-store.test.ts
import { PlanningSessionStateStore } from '../../src/planning/state-store';
import * as dbModels from '../../src/db/models';

// Mock the database models
jest.mock('../../src/db/models');

describe('PlanningSessionStateStore', () => {
  // Test cases
});
```

### 7. Document the API
- Add JSDoc comments to all functions and classes
- Create a README.md file for the planning session state management
- Document usage examples and limitations

## Testing Approach
- Unit tests for all components
- Integration tests for the state management
- Test with various scenarios and edge cases
- Test concurrent updates to planning session state
- Test error handling and recovery

## Definition of Done
- All acceptance criteria are met
- All tests are passing
- Code is well-documented with JSDoc comments
- A README.md file is created for the planning session state management
- The implementation is reviewed and approved by the team

## Estimated Effort
- 3 story points (approximately 3 days of work)

## Resources
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
