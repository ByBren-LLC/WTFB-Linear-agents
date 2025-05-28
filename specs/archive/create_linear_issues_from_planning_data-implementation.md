# Create Linear Issues from Planning Data - Implementation Document

## Overview

This user story will implement the functionality to create Linear issues from extracted planning information. This component will use the Linear API to create properly structured issues with the appropriate hierarchy and relationships.

## User Story

As a Linear Planning Agent, I need to be able to create Linear issues from extracted planning information so that I can maintain the SAFe hierarchy and relationships in Linear.

## Acceptance Criteria

1. The agent can create epics, features, stories, and enablers in Linear
2. The agent can create parent-child relationships between issues
3. The agent can set appropriate labels, priorities, and other attributes
4. The agent can handle API rate limits and errors
5. The agent can update existing issues if they already exist
6. The agent can detect and handle conflicts
7. The agent provides a clean API for creating issues
8. The implementation is well-tested with unit tests
9. The implementation is well-documented with JSDoc comments

## Technical Context

After extracting planning information from a Confluence document, the Linear Planning Agent needs to create corresponding issues in Linear. This involves mapping the planning information to Linear entities and creating the appropriate hierarchy and relationships.

### Existing Code

- `src/planning/models.ts`: Planning information models (to be implemented in the Extract Planning Information task)
- `src/safe/safe_linear_implementation.ts`: SAFe implementation in Linear
- `src/auth/tokens.ts`: Token management for Linear OAuth

### Dependencies

- Extract Planning Information (User Story)
- SAFe Implementation in Linear (Spike)
- Linear API Error Handling (Technical Enabler)

## Implementation Plan

### 1. Implement Issue Creator

- Create a new file `src/linear/issue-creator.ts` for the Linear issue creator
- Implement a class that takes planning information and creates Linear issues
- Implement methods for creating different types of issues

```typescript
// src/linear/issue-creator.ts
import { LinearClient } from '@linear/sdk';
import { PlanningDocument, Epic, Feature, Story, Enabler } from '../planning/models';
import { SAFeLinearImplementation } from '../safe/safe_linear_implementation';
import * as logger from '../utils/logger';

export class LinearIssueCreator {
  private linearClient: LinearClient;
  private safeImplementation: SAFeLinearImplementation;
  private teamId: string;

  constructor(accessToken: string, teamId: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.safeImplementation = new SAFeLinearImplementation(accessToken);
    this.teamId = teamId;
  }

  async createIssuesFromPlanningDocument(planningDocument: PlanningDocument): Promise<{
    epics: Record<string, string>;
    features: Record<string, string>;
    stories: Record<string, string>;
    enablers: Record<string, string>;
  }> {
    // Implementation details
  }

  async createEpic(epic: Epic): Promise<string> {
    // Implementation details
  }

  async createFeature(feature: Feature, epicId?: string): Promise<string> {
    // Implementation details
  }

  async createStory(story: Story, featureId?: string): Promise<string> {
    // Implementation details
  }

  async createEnabler(enabler: Enabler, featureId?: string): Promise<string> {
    // Implementation details
  }
}
```

### 2. Implement Issue Mapping

- Implement functions to map planning information to Linear issues
- Handle conversion of attributes, labels, and other metadata

```typescript
// src/linear/issue-mapper.ts
import { Epic, Feature, Story, Enabler } from '../planning/models';
import { IssueCreateInput } from '@linear/sdk';

export const mapEpicToIssueInput = (epic: Epic, teamId: string): IssueCreateInput => {
  // Implementation details
};

export const mapFeatureToIssueInput = (feature: Feature, teamId: string, epicId?: string): IssueCreateInput => {
  // Implementation details
};

export const mapStoryToIssueInput = (story: Story, teamId: string, featureId?: string): IssueCreateInput => {
  // Implementation details
};

export const mapEnablerToIssueInput = (enabler: Enabler, teamId: string, featureId?: string): IssueCreateInput => {
  // Implementation details
};

export const mapAttributesToLabels = (attributes: Record<string, any>): string[] => {
  // Implementation details
};

export const mapStoryPointsToEstimate = (storyPoints?: number): number | undefined => {
  // Implementation details
};
```

### 3. Implement Issue Updater

- Implement functions to update existing issues
- Handle merging of changes and conflict resolution

```typescript
// src/linear/issue-updater.ts
import { LinearClient, Issue, IssueUpdateInput } from '@linear/sdk';
import { Epic, Feature, Story, Enabler } from '../planning/models';
import * as logger from '../utils/logger';

export class LinearIssueUpdater {
  private linearClient: LinearClient;

  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
  }

  async updateEpic(epicId: string, epic: Epic): Promise<void> {
    // Implementation details
  }

  async updateFeature(featureId: string, feature: Feature): Promise<void> {
    // Implementation details
  }

  async updateStory(storyId: string, story: Story): Promise<void> {
    // Implementation details
  }

  async updateEnabler(enablerId: string, enabler: Enabler): Promise<void> {
    // Implementation details
  }

  async resolveConflicts(existingIssue: Issue, newData: IssueUpdateInput): Promise<IssueUpdateInput> {
    // Implementation details
  }
}
```

### 4. Implement Issue Finder

- Implement functions to find existing issues
- Use titles, identifiers, or other attributes to match issues

```typescript
// src/linear/issue-finder.ts
import { LinearClient, Issue } from '@linear/sdk';
import { Epic, Feature, Story, Enabler } from '../planning/models';
import * as logger from '../utils/logger';

export class LinearIssueFinder {
  private linearClient: LinearClient;
  private teamId: string;

  constructor(accessToken: string, teamId: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.teamId = teamId;
  }

  async findEpic(epic: Epic): Promise<Issue | null> {
    // Implementation details
  }

  async findFeature(feature: Feature): Promise<Issue | null> {
    // Implementation details
  }

  async findStory(story: Story): Promise<Issue | null> {
    // Implementation details
  }

  async findEnabler(enabler: Enabler): Promise<Issue | null> {
    // Implementation details
  }

  async findIssueByTitle(title: string, labelIds?: string[]): Promise<Issue | null> {
    // Implementation details
  }

  async findIssueByIdentifier(identifier: string): Promise<Issue | null> {
    // Implementation details
  }
}
```

### 5. Implement Rate Limiting and Error Handling

- Implement rate limiting to respect Linear API limits
- Implement error handling for API errors
- Implement retry logic for transient errors

```typescript
// src/linear/rate-limiter.ts
export class RateLimiter {
  // Implementation details
}

// src/linear/error-handler.ts
export const handleLinearError = (error: any): Error => {
  // Implementation details
};
```

### 6. Implement Planning Session Manager

- Implement a class to manage the planning session
- Track progress and handle errors during issue creation

```typescript
// src/planning/session-manager.ts
import { PlanningDocument } from './models';
import { LinearIssueCreator } from '../linear/issue-creator';
import { LinearIssueFinder } from '../linear/issue-finder';
import { LinearIssueUpdater } from '../linear/issue-updater';
import * as logger from '../utils/logger';

export class PlanningSessionManager {
  private planningDocument: PlanningDocument;
  private issueCreator: LinearIssueCreator;
  private issueFinder: LinearIssueFinder;
  private issueUpdater: LinearIssueUpdater;
  private sessionId: string;

  constructor(
    planningDocument: PlanningDocument,
    accessToken: string,
    teamId: string,
    sessionId: string
  ) {
    this.planningDocument = planningDocument;
    this.issueCreator = new LinearIssueCreator(accessToken, teamId);
    this.issueFinder = new LinearIssueFinder(accessToken, teamId);
    this.issueUpdater = new LinearIssueUpdater(accessToken);
    this.sessionId = sessionId;
  }

  async createIssues(): Promise<{
    epics: Record<string, string>;
    features: Record<string, string>;
    stories: Record<string, string>;
    enablers: Record<string, string>;
  }> {
    // Implementation details
  }

  async updateProgress(progress: number): Promise<void> {
    // Implementation details
  }

  async handleError(error: Error, item: any): Promise<void> {
    // Implementation details
  }
}
```

### 7. Write Tests

- Write unit tests for all components
- Write integration tests with mock Linear API
- Test error handling and rate limiting

```typescript
// tests/linear/issue-creator.test.ts
describe('LinearIssueCreator', () => {
  // Test cases
});

// tests/linear/issue-mapper.test.ts
describe('Issue Mapper', () => {
  // Test cases
});

// tests/linear/issue-updater.test.ts
describe('LinearIssueUpdater', () => {
  // Test cases
});
```

### 8. Document the API

- Add JSDoc comments to all functions and classes
- Create a README.md file for the Linear issue creator
- Document usage examples and limitations

## Testing Approach

- Unit tests for all components
- Integration tests with mock Linear API
- Test error handling and rate limiting
- Test with various planning document structures

## Definition of Done

- All acceptance criteria are met
- All tests are passing
- Code is well-documented with JSDoc comments
- A README.md file is created for the Linear issue creator
- The implementation is reviewed and approved by the team

## Estimated Effort

- 5 story points (approximately 5 days of work)

## Resources

- [Linear API Documentation](https://developers.linear.app/docs/)
- [Linear SDK Documentation](https://github.com/linear/linear/tree/master/packages/sdk)
- [SAFe Documentation](https://www.scaledagileframework.com/)
