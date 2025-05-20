# Synchronize Linear with Confluence

This module provides functionality to synchronize Linear issues with Confluence documents. It ensures that changes made in either system are reflected in the other, maintaining a consistent state between the two systems.

## Components

### Synchronization Manager (`sync-manager.ts`)

The `SyncManager` class manages the synchronization process:

```typescript
import { SyncManager } from './sync/sync-manager';

// Create a synchronization manager
const syncManager = new SyncManager({
  linearAccessToken: 'your-linear-access-token',
  linearTeamId: 'your-linear-team-id',
  linearOrganizationId: 'your-linear-organization-id',
  confluenceAccessToken: 'your-confluence-access-token',
  confluenceBaseUrl: 'https://your-domain.atlassian.net',
  confluencePageIdOrUrl: 'https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789',
  syncIntervalMs: 5 * 60 * 1000, // 5 minutes
  autoResolveConflicts: false
});

// Start synchronization
await syncManager.start();

// Stop synchronization
syncManager.stop();

// Manually trigger synchronization
const result = await syncManager.sync();

// Get synchronization status
const status = await syncManager.getStatus();
```

### Change Detector (`change-detector.ts`)

The `ChangeDetector` class detects changes between Linear issues and Confluence documents:

```typescript
import { ChangeDetector } from './sync/change-detector';

// Create a change detector
const changeDetector = new ChangeDetector(
  confluenceClient,
  linearClient,
  syncStore
);

// Detect changes
const changes = await changeDetector.detectChanges(
  confluencePageIdOrUrl,
  linearTeamId
);

// Detect conflicts
const conflicts = changeDetector.detectConflicts(changes);
```

### Conflict Resolver (`conflict-resolver.ts`)

The `ConflictResolver` class resolves conflicts between Linear issues and Confluence documents:

```typescript
import { ConflictResolver, ConflictResolutionStrategy } from './sync/conflict-resolver';

// Create a conflict resolver
const conflictResolver = new ConflictResolver(
  confluenceClient,
  linearClient,
  syncStore,
  autoResolveConflicts
);

// Resolve conflicts
const resolvedConflicts = await conflictResolver.resolveConflicts(conflicts);

// Resolve a specific conflict
const resolvedConflict = await conflictResolver.resolveConflict(
  conflict,
  ConflictResolutionStrategy.LINEAR
);

// Get unresolved conflicts
const unresolvedConflicts = await conflictResolver.getUnresolvedConflicts();

// Get resolved conflicts
const resolvedConflicts = await conflictResolver.getResolvedConflicts();
```

### Synchronization Store (`sync-store.ts`)

The `SyncStore` class stores synchronization state:

```typescript
import { SyncStore } from './sync/sync-store';

// Create a synchronization store
const syncStore = new SyncStore();

// Get the last synchronization timestamp
const lastSyncTimestamp = await syncStore.getLastSyncTimestamp(
  confluencePageIdOrUrl,
  linearTeamId
);

// Update the last synchronization timestamp
await syncStore.updateLastSyncTimestamp(
  confluencePageIdOrUrl,
  linearTeamId,
  Date.now()
);

// Store a conflict
await syncStore.storeConflict(conflict);

// Store a resolved conflict
await syncStore.storeResolvedConflict(resolvedConflict);

// Get unresolved conflicts
const unresolvedConflicts = await syncStore.getUnresolvedConflicts();

// Get resolved conflicts
const resolvedConflicts = await syncStore.getResolvedConflicts();

// Get all conflicts
const allConflicts = await syncStore.getAllConflicts();

// Delete a conflict
await syncStore.deleteConflict(conflictId);

// Clear all conflicts
await syncStore.clearConflicts();
```

## API Endpoints

The synchronization module provides the following API endpoints:

### Start Synchronization

```
POST /api/sync/start
```

Request body:
```json
{
  "organizationId": "your-organization-id",
  "linearTeamId": "your-linear-team-id",
  "confluencePageIdOrUrl": "https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789",
  "syncIntervalMs": 300000,
  "autoResolveConflicts": false
}
```

### Stop Synchronization

```
POST /api/sync/stop
```

Request body:
```json
{
  "organizationId": "your-organization-id",
  "linearTeamId": "your-linear-team-id",
  "confluencePageIdOrUrl": "https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789"
}
```

### Get Synchronization Status

```
GET /api/sync/status?organizationId=your-organization-id&linearTeamId=your-linear-team-id&confluencePageIdOrUrl=https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789
```

### Manually Trigger Synchronization

```
POST /api/sync/trigger
```

Request body:
```json
{
  "organizationId": "your-organization-id",
  "linearTeamId": "your-linear-team-id",
  "confluencePageIdOrUrl": "https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789"
}
```

## Synchronization Process

1. **Detect Changes**: The change detector identifies changes in both Linear issues and Confluence documents since the last synchronization.
2. **Detect Conflicts**: The change detector identifies conflicts between Linear and Confluence changes.
3. **Resolve Conflicts**: The conflict resolver resolves conflicts based on the configured resolution strategy.
4. **Apply Changes**: The synchronization manager applies the changes to both systems.
5. **Update State**: The synchronization store updates the synchronization state.

## Conflict Resolution

Conflicts occur when the same item is changed in both Linear and Confluence. The conflict resolver can resolve conflicts in the following ways:

- **Linear as Source of Truth**: Use the Linear change and discard the Confluence change.
- **Confluence as Source of Truth**: Use the Confluence change and discard the Linear change.
- **Manual Resolution**: Store the conflict for manual resolution.

## Database Schema

The synchronization module uses SQLite to store synchronization state:

### Sync State Table

```sql
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  confluence_page_id TEXT NOT NULL,
  linear_team_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(confluence_page_id, linear_team_id)
);
```

### Conflicts Table

```sql
CREATE TABLE IF NOT EXISTS conflicts (
  id TEXT PRIMARY KEY,
  linear_change TEXT NOT NULL,
  confluence_change TEXT NOT NULL,
  is_resolved INTEGER NOT NULL DEFAULT 0,
  resolution_strategy TEXT,
  resolved_change TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sync History Table

```sql
CREATE TABLE IF NOT EXISTS sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  confluence_page_id TEXT NOT NULL,
  linear_team_id TEXT NOT NULL,
  success INTEGER NOT NULL,
  error TEXT,
  created_issues INTEGER NOT NULL DEFAULT 0,
  updated_issues INTEGER NOT NULL DEFAULT 0,
  confluence_changes INTEGER NOT NULL DEFAULT 0,
  conflicts_detected INTEGER NOT NULL DEFAULT 0,
  conflicts_resolved INTEGER NOT NULL DEFAULT 0,
  timestamp INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
