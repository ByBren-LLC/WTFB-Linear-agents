# Linear-Confluence Synchronization

This document provides comprehensive documentation for the Linear-Confluence synchronization module, which enables bidirectional synchronization between Linear issues and Confluence documents.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
   - [Synchronization Manager](#synchronization-manager)
   - [Change Detector](#change-detector)
   - [Conflict Resolver](#conflict-resolver)
   - [Synchronization Store](#synchronization-store)
4. [API Endpoints](#api-endpoints)
5. [Synchronization Process](#synchronization-process)
6. [Conflict Resolution](#conflict-resolution)
7. [Database Schema](#database-schema)
8. [Error Handling](#error-handling)
9. [Logging](#logging)
10. [Configuration](#configuration)
11. [CLI Usage](#cli-usage)
12. [Troubleshooting](#troubleshooting)

## Overview

The Linear-Confluence synchronization module enables bidirectional synchronization between Linear issues and Confluence documents. It ensures that changes made in either system are reflected in the other, maintaining a consistent state between the two systems.

Key features:
- Bidirectional synchronization between Linear and Confluence
- Automatic detection of changes in both systems
- Conflict detection and resolution
- Configurable synchronization interval
- Comprehensive error handling and logging
- API endpoints for managing synchronization
- CLI interface for synchronization operations

## Architecture

The synchronization module follows a modular architecture with the following components:

1. **Synchronization Manager**: Orchestrates the synchronization process
2. **Change Detector**: Detects changes in Linear and Confluence
3. **Conflict Resolver**: Resolves conflicts between Linear and Confluence changes
4. **Synchronization Store**: Stores synchronization state

The module uses SQLite for storing synchronization state, including the last synchronization timestamp and conflicts.

## Components

### Synchronization Manager

The `SyncManager` class manages the synchronization process. It coordinates the other components and provides a high-level API for starting, stopping, and triggering synchronization.

```typescript
import { SyncManager } from '../sync/sync-manager';

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

### Change Detector

The `ChangeDetector` class detects changes between Linear issues and Confluence documents. It identifies items that have been created, updated, or deleted in either system since the last synchronization.

```typescript
import { ChangeDetector } from '../sync/change-detector';

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

### Conflict Resolver

The `ConflictResolver` class resolves conflicts between Linear issues and Confluence documents. It can automatically resolve conflicts based on a configured strategy or store them for manual resolution.

```typescript
import { ConflictResolver, ConflictResolutionStrategy } from '../sync/conflict-resolver';

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

### Synchronization Store

The `SyncStore` class stores synchronization state, including the last synchronization timestamp and conflicts. It uses SQLite for persistence.

```typescript
import { SyncStore } from '../sync/sync-store';

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

Response:
```json
{
  "success": true,
  "message": "Synchronization started successfully",
  "status": {
    "isRunning": true,
    "lastSyncTimestamp": 1621234567890,
    "nextSyncTimestamp": 1621234867890
  }
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

Response:
```json
{
  "success": true,
  "message": "Synchronization stopped successfully"
}
```

### Get Synchronization Status

```
GET /api/sync/status?organizationId=your-organization-id&linearTeamId=your-linear-team-id&confluencePageIdOrUrl=https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789
```

Response:
```json
{
  "success": true,
  "status": {
    "isRunning": true,
    "lastSyncTimestamp": 1621234567890,
    "nextSyncTimestamp": 1621234867890
  }
}
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

Response:
```json
{
  "success": true,
  "message": "Synchronization triggered successfully",
  "result": {
    "success": true,
    "createdIssues": 5,
    "updatedIssues": 2,
    "confluenceChanges": 3,
    "conflictsDetected": 1,
    "conflictsResolved": 1,
    "timestamp": 1621234567890
  }
}
```

## Synchronization Process

The synchronization process consists of the following steps:

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

## Error Handling

The synchronization module includes comprehensive error handling to ensure robustness and reliability. Each component handles errors at its level and propagates them up the stack with appropriate context.

The `SyncManager` class handles errors at the highest level and ensures that the synchronization process continues even if some steps fail. It returns detailed error information in the synchronization result.

## Logging

The synchronization module uses a structured logging system to provide detailed information about the synchronization process. Logs include information about changes, conflicts, and errors.

## Configuration

The synchronization module can be configured through the `SyncOptions` interface:

```typescript
interface SyncOptions {
  /** Linear API access token */
  linearAccessToken: string;
  /** Linear team ID */
  linearTeamId: string;
  /** Linear organization ID */
  linearOrganizationId: string;
  /** Confluence API access token */
  confluenceAccessToken: string;
  /** Confluence base URL */
  confluenceBaseUrl: string;
  /** Confluence page ID or URL */
  confluencePageIdOrUrl: string;
  /** Synchronization interval in milliseconds (default: 5 minutes) */
  syncIntervalMs?: number;
  /** Whether to automatically resolve conflicts (default: false) */
  autoResolveConflicts?: boolean;
}
```

## CLI Usage

The synchronization module can be used from the command line using the provided CLI:

```bash
# Start synchronization
npm run sync:start -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id

# Stop synchronization
npm run sync:stop -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id

# Get synchronization status
npm run sync:status -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id

# Manually trigger synchronization
npm run sync:trigger -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure that the Linear and Confluence access tokens are valid and have the necessary permissions.
2. **Synchronization Not Starting**: Check that the provided team ID and page ID are correct.
3. **Conflicts Not Resolving**: If auto-resolve is disabled, conflicts must be resolved manually.
4. **Changes Not Applying**: Ensure that the synchronization process has permission to modify the Linear issues and Confluence documents.

### Debugging

To enable debug logging, set the `LOG_LEVEL` environment variable to `debug`:

```bash
LOG_LEVEL=debug npm run sync:start -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id
```

This will provide detailed information about the synchronization process, including API calls, changes, and conflicts.
