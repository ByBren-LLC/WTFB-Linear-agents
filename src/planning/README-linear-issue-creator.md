# Linear Issue Creator from Planning Data

This module provides functionality to create Linear issues from planning data extracted from Confluence documents. It maps the SAFe hierarchy (Epics, Features, Stories, and Enablers) to Linear issues and maintains the parent-child relationships.

## Components

### Linear Issue Creator (`linear-issue-creator.ts`)

The `LinearIssueCreatorFromPlanning` class creates Linear issues from planning data:

```typescript
import { LinearIssueCreatorFromPlanning } from './planning/linear-issue-creator';

// Create a new instance with options
const issueCreator = new LinearIssueCreatorFromPlanning({
  linearAccessToken: 'your-linear-access-token',
  linearTeamId: 'your-linear-team-id',
  linearOrganizationId: 'your-linear-organization-id',
  confluenceAccessToken: 'your-confluence-access-token',
  confluenceBaseUrl: 'https://your-domain.atlassian.net',
  confluencePageIdOrUrl: 'https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789'
});

// Create issues from Confluence planning data
const result = await issueCreator.createIssuesFromConfluence();

// Or create issues from an existing planning document
const result = await issueCreator.createIssuesFromPlanningDocument(planningDocument);
```

### Planning Issue Mapper (`planning-issue-mapper.ts`)

The `PlanningIssueMapper` class maps planning data to Linear issues:

```typescript
import { PlanningIssueMapper } from '../linear/planning-issue-mapper';

// Create a new instance
const mapper = new PlanningIssueMapper(
  'your-linear-access-token',
  'your-linear-team-id',
  'your-linear-organization-id'
);

// Map planning data to Linear issues
const result = await mapper.mapToLinear(planningDocument);
```

## Workflow

1. **Parse Confluence Page**: The Confluence page is parsed using the Confluence parser.
2. **Extract Planning Information**: Planning information is extracted from the parsed Confluence document.
3. **Map Planning Data to Linear Issues**: The planning data is mapped to Linear issues.
4. **Update Hierarchy Relationships**: The parent-child relationships are updated in Linear.

## Issue Creation Process

### Epics

Epics are created in Linear with the following properties:
- Title: `[EPIC] {epic.title}`
- Description: `{epic.description}`
- Labels: `Epic` label plus any additional labels
- External ID: `{epic.id}`

### Features

Features are created in Linear with the following properties:
- Title: `[FEATURE] {feature.title}`
- Description: `{feature.description}`
- Labels: `Feature` label plus `Business` or `Enabler` label and any additional labels
- Parent: Epic (if available)
- External ID: `{feature.id}`

### Stories

Stories are created in Linear with the following properties:
- Title: `{story.title}`
- Description: `{story.description}` plus formatted acceptance criteria
- Parent: Feature (if available)
- External ID: `{story.id}`

### Enablers

Enablers are created in Linear with the following properties:
- Title: `[ENABLER] {enabler.title}`
- Description: `{enabler.description}`
- Labels: `Enabler` label plus enabler type label and any additional labels
- Parent: Feature (if available)
- External ID: `{enabler.id}`

## Hierarchy Management

The module uses the `SAFeHierarchyManager` to maintain the parent-child relationships between Epics, Features, Stories, and Enablers in Linear. It ensures that:

- Features are children of their parent Epics
- Stories are children of their parent Features
- Enablers are children of their parent Features

## Error Handling

The module includes comprehensive error handling:

- Each item (Epic, Feature, Story, Enabler) is processed independently
- Errors are logged and included in the result
- The process continues even if some items fail

## Result

The result of the issue creation process includes:

- Mapping of planning item IDs to Linear issue IDs
- Count of created, updated, and failed items
- Errors that occurred during the process
- The planning document that was processed

## Dependencies

This module depends on:
- Confluence API Integration
- Parse Confluence Documents
- Extract Planning Information
- Linear API Error Handling
- Maintain SAFe Hierarchy

## Limitations

- The module assumes that the planning document follows the SAFe hierarchy
- It requires appropriate permissions in Linear to create and update issues
- It requires appropriate permissions in Confluence to read pages
