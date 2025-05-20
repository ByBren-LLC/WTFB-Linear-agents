# SAFe Hierarchy Manager

This module provides utilities for managing the SAFe hierarchy in Linear. It ensures that the relationships between epics, features, stories, and enablers are properly maintained in Linear, even as planning documents are updated.

## Components

### SAFeHierarchyManager

The `SAFeHierarchyManager` class is responsible for updating the SAFe hierarchy in Linear based on a planning document. It ensures that parent-child relationships are properly maintained between epics, features, stories, and enablers.

```typescript
const hierarchyManager = new SAFeHierarchyManager(accessToken, teamId);

await hierarchyManager.updateHierarchy(planningDocument, existingIssues);
```

### RelationshipUpdater

The `RelationshipUpdater` class provides utilities for updating relationships between issues in Linear. It can update parent-child relationships and other types of relationships.

```typescript
const relationshipUpdater = new RelationshipUpdater(accessToken);

await relationshipUpdater.updateParentChild(childId, newParentId);
await relationshipUpdater.moveIssue(issueId, newParentId);
await relationshipUpdater.updateRelationships(issueId, relatedIssueIds, relationshipType);
```

### ConflictResolver

The `ConflictResolver` class provides utilities for resolving conflicts in the SAFe hierarchy. It can resolve conflicts between existing issues in Linear and new items from a planning document.

```typescript
const conflictResolver = new ConflictResolver();

const resolution = conflictResolver.resolveEpicConflict(existingEpic, newEpic);
const resolution = conflictResolver.resolveFeatureConflict(existingFeature, newFeature);
const resolution = conflictResolver.resolveStoryConflict(existingStory, newStory);
const resolution = conflictResolver.resolveEnablerConflict(existingEnabler, newEnabler);
const resolution = conflictResolver.resolveParentChildConflict(existingParentId, newParentId);
```

### HierarchyValidator

The `HierarchyValidator` class provides utilities for validating the SAFe hierarchy. It can validate that relationships between epics, features, stories, and enablers are valid and consistent.

```typescript
const hierarchyValidator = new HierarchyValidator();

const validationResult = hierarchyValidator.validateHierarchy(planningDocument);
const epicFeatureResult = hierarchyValidator.validateEpicFeatureRelationships(planningDocument);
const featureStoryResult = hierarchyValidator.validateFeatureStoryRelationships(planningDocument);
const featureEnablerResult = hierarchyValidator.validateFeatureEnablerRelationships(planningDocument);
```

### HierarchySynchronizer

The `HierarchySynchronizer` class provides utilities for synchronizing the SAFe hierarchy between Confluence and Linear. It can find added, removed, and modified items, and update the hierarchy accordingly.

```typescript
const synchronizer = new HierarchySynchronizer(accessToken, teamId);

const updatedIssueIds = await synchronizer.synchronizeHierarchy(planningDocument, existingIssues);
const addedItems = await synchronizer.findAddedItems(planningDocument, existingIssues);
const removedItems = await synchronizer.findRemovedItems(planningDocument, existingIssues);
const modifiedItems = await synchronizer.findModifiedItems(planningDocument, existingIssues);
```

## Usage

To use the SAFe hierarchy manager, you need to:

1. Create a planning document with epics, features, stories, and enablers
2. Get the existing issue IDs from Linear
3. Synchronize the hierarchy

```typescript
import { HierarchySynchronizer } from './hierarchy-synchronizer';
import { PlanningDocument } from '../planning/models';

// Create a planning document
const planningDocument: PlanningDocument = {
  id: 'planning-document-id',
  title: 'Planning Document',
  epics: [...],
  features: [...],
  stories: [...],
  enablers: [...]
};

// Get existing issue IDs from Linear
const existingIssues = {
  epics: { 'epic-id': 'linear-epic-id', ... },
  features: { 'feature-id': 'linear-feature-id', ... },
  stories: { 'story-id': 'linear-story-id', ... },
  enablers: { 'enabler-id': 'linear-enabler-id', ... }
};

// Synchronize the hierarchy
const synchronizer = new HierarchySynchronizer(accessToken, teamId);
const updatedIssueIds = await synchronizer.synchronizeHierarchy(planningDocument, existingIssues);
```

## Error Handling

All methods in the SAFe hierarchy manager log errors and throw exceptions when errors occur. You should wrap calls to these methods in try-catch blocks to handle errors appropriately.

```typescript
try {
  await synchronizer.synchronizeHierarchy(planningDocument, existingIssues);
} catch (error) {
  console.error('Error synchronizing hierarchy:', error);
}
```

## Limitations

- The SAFe hierarchy manager assumes that the planning document is valid and consistent. You should validate the planning document before using it.
- The SAFe hierarchy manager does not handle deleted items in Linear. It only updates existing items and creates new ones.
- The SAFe hierarchy manager does not handle changes to issue types (e.g., converting a story to a feature).
