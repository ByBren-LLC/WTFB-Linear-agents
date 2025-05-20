# Linear Issue Creator

This module provides functionality to create Linear issues from planning information. It uses the Linear API to create properly structured issues with the appropriate hierarchy and relationships.

## Components

### Issue Creator

The `LinearIssueCreator` class is responsible for creating issues in Linear from planning information. It handles creation of epics, features, stories, and enablers.

```typescript
const issueCreator = new LinearIssueCreator(accessToken, teamId);
const result = await issueCreator.createIssuesFromPlanningDocument(planningDocument);
```

### Issue Mapper

The `issue-mapper.ts` module provides functions to map planning information to Linear issues. It handles conversion of attributes, labels, and other metadata.

```typescript
const issueInput = await mapEpicToIssueInput(epic, teamId, labelIds);
```

### Issue Finder

The `LinearIssueFinder` class is responsible for finding existing issues in Linear. It uses titles, identifiers, or other attributes to match issues.

```typescript
const issueFinder = new LinearIssueFinder(accessToken, teamId);
const existingEpic = await issueFinder.findEpic(epic);
```

### Issue Updater

The `LinearIssueUpdater` class is responsible for updating existing issues in Linear. It handles merging of changes and conflict resolution.

```typescript
const issueUpdater = new LinearIssueUpdater(accessToken);
await issueUpdater.updateEpic(epicId, epic);
```

### Rate Limiter

The `RateLimiter` class is responsible for respecting Linear API rate limits. It ensures that requests are made within the allowed limits.

```typescript
const rateLimiter = new RateLimiter();
await rateLimiter.waitForRequest();
```

### Error Handler

The `error-handler.ts` module provides error handling utilities for Linear API errors. It includes functions to handle errors, determine if they are retryable, and retry with exponential backoff.

```typescript
try {
  // Make API call
} catch (error) {
  throw handleLinearError(error);
}
```

## Planning Session Manager

The `PlanningSessionManager` class is responsible for managing the planning session. It tracks progress and handles errors during issue creation.

```typescript
const sessionManager = new PlanningSessionManager(
  planningDocument,
  accessToken,
  teamId,
  sessionId
);
const result = await sessionManager.createIssues();
```

## Usage

```typescript
import { PlanningDocument } from '../planning/models';
import { PlanningSessionManager } from '../planning/session-manager';

// Create a planning document
const planningDocument: PlanningDocument = {
  id: 'doc-123',
  title: 'Q3 Planning',
  description: 'Planning for Q3',
  epics: [
    {
      id: 'epic-1',
      title: 'Improve User Experience',
      description: 'Enhance the user experience across the platform',
      features: [
        {
          id: 'feature-1',
          title: 'Redesign Dashboard',
          description: 'Redesign the dashboard for better usability',
          stories: [
            {
              id: 'story-1',
              title: 'Create wireframes',
              description: 'Create wireframes for the new dashboard',
              storyPoints: 3
            }
          ]
        }
      ]
    }
  ]
};

// Create a session manager
const sessionManager = new PlanningSessionManager(
  planningDocument,
  'linear-access-token',
  'linear-team-id',
  'session-123'
);

// Create issues
const result = await sessionManager.createIssues();
console.log(result);
```

## Error Handling

The module includes comprehensive error handling for Linear API errors. It handles rate limits, authentication errors, permission errors, and network errors.

```typescript
try {
  const result = await sessionManager.createIssues();
  console.log(result);
} catch (error) {
  console.error('Error creating issues:', error);
}
```

## Rate Limiting

The module respects Linear API rate limits. It uses a rate limiter to ensure that requests are made within the allowed limits.

```typescript
const rateLimiter = new RateLimiter();
await rateLimiter.waitForRequest();
// Make API call
rateLimiter.recordRequest();
```

## Conflict Resolution

The module handles conflicts when updating existing issues. It merges changes intelligently to avoid overwriting existing data.

```typescript
const resolvedData = await issueUpdater.resolveConflicts(existingIssue, newData);
```
