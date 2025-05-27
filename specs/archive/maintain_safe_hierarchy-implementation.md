# Maintain SAFe Hierarchy - Implementation Document

## Overview
This user story will implement the functionality to maintain the SAFe hierarchy in Linear. This component will ensure that the relationships between epics, features, stories, and enablers are properly maintained in Linear, even as planning documents are updated.

## User Story
As a Linear Planning Agent, I need to be able to maintain the SAFe hierarchy in Linear so that the relationships between work items are properly represented and maintained over time.

## Acceptance Criteria
1. The agent can update existing issues to maintain parent-child relationships
2. The agent can detect and resolve conflicts when relationships change
3. The agent can handle reorganization of the SAFe hierarchy
4. The agent can maintain relationships when new items are added or existing items are removed
5. The agent can handle updates to existing items without disrupting relationships
6. The agent provides a clean API for maintaining the SAFe hierarchy
7. The implementation is well-tested with unit tests
8. The implementation is well-documented with JSDoc comments

## Technical Context
After creating Linear issues from planning information, the Linear Planning Agent needs to maintain the SAFe hierarchy over time. This involves updating existing issues, resolving conflicts, and ensuring that relationships are properly maintained as planning documents are updated.

### Existing Code
- `src/planning/models.ts`: Planning information models (to be implemented in the Extract Planning Information task)
- `src/safe/safe_linear_implementation.ts`: SAFe implementation in Linear
- `src/linear/issue-creator.ts`: Linear issue creator (to be implemented in the Create Linear Issues from Planning Data task)
- `src/linear/issue-updater.ts`: Linear issue updater (to be implemented in the Create Linear Issues from Planning Data task)
- `src/linear/issue-finder.ts`: Linear issue finder (to be implemented in the Create Linear Issues from Planning Data task)

### Dependencies
- Create Linear Issues from Planning Data (User Story)
- SAFe Implementation in Linear (Spike)
- Linear API Error Handling (Technical Enabler)

## Implementation Plan

### 1. Implement Hierarchy Manager
- Create a new file `src/safe/hierarchy-manager.ts` for the SAFe hierarchy manager
- Implement a class that manages the SAFe hierarchy in Linear
- Implement methods for updating and maintaining relationships

```typescript
// src/safe/hierarchy-manager.ts
import { LinearClient, Issue } from '@linear/sdk';
import { PlanningDocument, Epic, Feature, Story, Enabler } from '../planning/models';
import { SAFeLinearImplementation } from './safe_linear_implementation';
import { LinearIssueFinder } from '../linear/issue-finder';
import { LinearIssueUpdater } from '../linear/issue-updater';
import * as logger from '../utils/logger';

export class SAFeHierarchyManager {
  private linearClient: LinearClient;
  private safeImplementation: SAFeLinearImplementation;
  private issueFinder: LinearIssueFinder;
  private issueUpdater: LinearIssueUpdater;
  private teamId: string;

  constructor(accessToken: string, teamId: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.safeImplementation = new SAFeLinearImplementation(accessToken);
    this.issueFinder = new LinearIssueFinder(accessToken, teamId);
    this.issueUpdater = new LinearIssueUpdater(accessToken);
    this.teamId = teamId;
  }

  async updateHierarchy(
    planningDocument: PlanningDocument,
    existingIssues: {
      epics: Record<string, string>;
      features: Record<string, string>;
      stories: Record<string, string>;
      enablers: Record<string, string>;
    }
  ): Promise<void> {
    // Implementation details
  }

  async updateEpicFeatureRelationships(
    epics: Epic[],
    features: Feature[],
    epicIds: Record<string, string>,
    featureIds: Record<string, string>
  ): Promise<void> {
    // Implementation details
  }

  async updateFeatureStoryRelationships(
    features: Feature[],
    stories: Story[],
    featureIds: Record<string, string>,
    storyIds: Record<string, string>
  ): Promise<void> {
    // Implementation details
  }

  async updateFeatureEnablerRelationships(
    features: Feature[],
    enablers: Enabler[],
    featureIds: Record<string, string>,
    enablerIds: Record<string, string>
  ): Promise<void> {
    // Implementation details
  }
}
```

### 2. Implement Relationship Updater
- Implement functions to update relationships between issues
- Handle changes to parent-child relationships

```typescript
// src/safe/relationship-updater.ts
import { LinearClient, Issue } from '@linear/sdk';
import * as logger from '../utils/logger';

export class RelationshipUpdater {
  private linearClient: LinearClient;

  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
  }

  async updateParentChild(childId: string, newParentId: string | null): Promise<void> {
    // Implementation details
  }

  async moveIssue(issueId: string, newParentId: string | null): Promise<void> {
    // Implementation details
  }

  async updateRelationships(
    issueId: string,
    relatedIssueIds: string[],
    relationshipType: string
  ): Promise<void> {
    // Implementation details
  }
}
```

### 3. Implement Conflict Resolution
- Implement functions to detect and resolve conflicts
- Handle cases where relationships have changed

```typescript
// src/safe/conflict-resolver.ts
import { Issue } from '@linear/sdk';
import { Epic, Feature, Story, Enabler } from '../planning/models';
import * as logger from '../utils/logger';

export interface ConflictResolution {
  action: 'update' | 'ignore' | 'delete';
  reason: string;
  data?: any;
}

export class ConflictResolver {
  resolveEpicConflict(existingEpic: Issue, newEpic: Epic): ConflictResolution {
    // Implementation details
  }

  resolveFeatureConflict(existingFeature: Issue, newFeature: Feature): ConflictResolution {
    // Implementation details
  }

  resolveStoryConflict(existingStory: Issue, newStory: Story): ConflictResolution {
    // Implementation details
  }

  resolveEnablerConflict(existingEnabler: Issue, newEnabler: Enabler): ConflictResolution {
    // Implementation details
  }

  resolveParentChildConflict(
    existingParentId: string | null,
    newParentId: string | null
  ): ConflictResolution {
    // Implementation details
  }
}
```

### 4. Implement Hierarchy Validator
- Implement functions to validate the SAFe hierarchy
- Ensure that relationships are valid and consistent

```typescript
// src/safe/hierarchy-validator.ts
import { PlanningDocument } from '../planning/models';
import * as logger from '../utils/logger';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class HierarchyValidator {
  validateHierarchy(planningDocument: PlanningDocument): ValidationResult {
    // Implementation details
  }

  validateEpicFeatureRelationships(planningDocument: PlanningDocument): ValidationResult {
    // Implementation details
  }

  validateFeatureStoryRelationships(planningDocument: PlanningDocument): ValidationResult {
    // Implementation details
  }

  validateFeatureEnablerRelationships(planningDocument: PlanningDocument): ValidationResult {
    // Implementation details
  }
}
```

### 5. Implement Hierarchy Synchronizer
- Implement functions to synchronize the SAFe hierarchy between Confluence and Linear
- Handle cases where items have been added, removed, or modified

```typescript
// src/safe/hierarchy-synchronizer.ts
import { PlanningDocument } from '../planning/models';
import { SAFeHierarchyManager } from './hierarchy-manager';
import { HierarchyValidator } from './hierarchy-validator';
import { LinearIssueFinder } from '../linear/issue-finder';
import { LinearIssueCreator } from '../linear/issue-creator';
import * as logger from '../utils/logger';

export class HierarchySynchronizer {
  private hierarchyManager: SAFeHierarchyManager;
  private hierarchyValidator: HierarchyValidator;
  private issueFinder: LinearIssueFinder;
  private issueCreator: LinearIssueCreator;

  constructor(accessToken: string, teamId: string) {
    this.hierarchyManager = new SAFeHierarchyManager(accessToken, teamId);
    this.hierarchyValidator = new HierarchyValidator();
    this.issueFinder = new LinearIssueFinder(accessToken, teamId);
    this.issueCreator = new LinearIssueCreator(accessToken, teamId);
  }

  async synchronizeHierarchy(
    planningDocument: PlanningDocument,
    existingIssues: {
      epics: Record<string, string>;
      features: Record<string, string>;
      stories: Record<string, string>;
      enablers: Record<string, string>;
    }
  ): Promise<{
    epics: Record<string, string>;
    features: Record<string, string>;
    stories: Record<string, string>;
    enablers: Record<string, string>;
  }> {
    // Implementation details
  }

  async findAddedItems(
    planningDocument: PlanningDocument,
    existingIssues: {
      epics: Record<string, string>;
      features: Record<string, string>;
      stories: Record<string, string>;
      enablers: Record<string, string>;
    }
  ): Promise<{
    epics: Epic[];
    features: Feature[];
    stories: Story[];
    enablers: Enabler[];
  }> {
    // Implementation details
  }

  async findRemovedItems(
    planningDocument: PlanningDocument,
    existingIssues: {
      epics: Record<string, string>;
      features: Record<string, string>;
      stories: Record<string, string>;
      enablers: Record<string, string>;
    }
  ): Promise<{
    epics: string[];
    features: string[];
    stories: string[];
    enablers: string[];
  }> {
    // Implementation details
  }

  async findModifiedItems(
    planningDocument: PlanningDocument,
    existingIssues: {
      epics: Record<string, string>;
      features: Record<string, string>;
      stories: Record<string, string>;
      enablers: Record<string, string>;
    }
  ): Promise<{
    epics: { id: string; epic: Epic }[];
    features: { id: string; feature: Feature }[];
    stories: { id: string; story: Story }[];
    enablers: { id: string; enabler: Enabler }[];
  }> {
    // Implementation details
  }
}
```

### 6. Write Tests
- Write unit tests for all components
- Write integration tests with mock Linear API
- Test conflict resolution and hierarchy validation

```typescript
// tests/safe/hierarchy-manager.test.ts
describe('SAFeHierarchyManager', () => {
  // Test cases
});

// tests/safe/relationship-updater.test.ts
describe('RelationshipUpdater', () => {
  // Test cases
});

// tests/safe/conflict-resolver.test.ts
describe('ConflictResolver', () => {
  // Test cases
});
```

### 7. Document the API
- Add JSDoc comments to all functions and classes
- Create a README.md file for the SAFe hierarchy manager
- Document usage examples and limitations

## Testing Approach
- Unit tests for all components
- Integration tests with mock Linear API
- Test conflict resolution and hierarchy validation
- Test with various planning document structures
- Test with edge cases and malformed data

## Definition of Done
- All acceptance criteria are met
- All tests are passing
- Code is well-documented with JSDoc comments
- A README.md file is created for the SAFe hierarchy manager
- The implementation is reviewed and approved by the team

## Estimated Effort
- 5 story points (approximately 5 days of work)

## Resources
- [Linear API Documentation](https://developers.linear.app/docs/)
- [Linear SDK Documentation](https://github.com/linear/linear/tree/master/packages/sdk)
- [SAFe Documentation](https://www.scaledagileframework.com/)
