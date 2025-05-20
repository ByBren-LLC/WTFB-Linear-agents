# Linear-Confluence Synchronization

This module provides functionality to synchronize Linear issues with Confluence documents. It ensures that changes to planning documents in Confluence are reflected in Linear issues, and vice versa.

## Features

- Bidirectional synchronization between Linear and Confluence
- Automatic detection of changes in both systems
- Conflict resolution with configurable strategies
- Scheduled synchronization with configurable frequency
- API endpoints for managing synchronization configurations
- Detailed synchronization history and conflict tracking

## Components

### Synchronization Manager

The `SynchronizationManager` class is the main entry point for synchronization. It coordinates the synchronization process between Linear and Confluence.

```typescript
import { SynchronizationManager } from './sync/manager';
import { SyncDirection, SyncFrequency } from './sync/models';

// Create a synchronization manager
const manager = new SynchronizationManager('organization-id', 'team-id');

// Synchronize Linear with Confluence
const result = await manager.synchronize({
  id: 1,
  organizationId: 'organization-id',
  teamId: 'team-id',
  confluencePageUrl: 'https://example.atlassian.net/wiki/spaces/SPACE/pages/123456789/Page+Title',
  direction: SyncDirection.BIDIRECTIONAL,
  frequency: SyncFrequency.DAILY,
  enabled: true
});
```

### Change Detector

The `ChangeDetector` class detects changes between Linear and Confluence. It compares the content of Confluence documents with Linear issues and identifies created, updated, and deleted items.

### Conflict Resolver

The `ConflictResolver` class resolves conflicts between Linear and Confluence. It uses a configurable strategy to determine which system's changes should take precedence.

### Synchronization Scheduler

The `SyncScheduler` class schedules synchronization based on the configured frequency. It can run synchronization hourly, daily, or weekly.

### Synchronization API

The synchronization API provides endpoints for managing synchronization configurations and triggering synchronization.

## API Endpoints

- `POST /api/sync/configs`: Create a new sync configuration
- `GET /api/sync/configs/:id`: Get a sync configuration by ID
- `GET /api/sync/configs`: Get sync configurations by organization or team
- `PUT /api/sync/configs/:id`: Update a sync configuration
- `DELETE /api/sync/configs/:id`: Delete a sync configuration
- `POST /api/sync/:id`: Synchronize a configuration
- `GET /api/sync/history/:id`: Get sync history for a configuration

## Database Schema

The synchronization module uses the following database tables:

- `sync_configs`: Stores synchronization configurations
- `sync_history`: Stores synchronization history
- `sync_conflicts`: Stores synchronization conflicts

## Usage

### Creating a Sync Configuration

```typescript
import { createSyncConfig } from '../db/models';
import { SyncDirection, SyncFrequency } from './models';

const config = await createSyncConfig({
  organizationId: 'organization-id',
  teamId: 'team-id',
  confluencePageUrl: 'https://example.atlassian.net/wiki/spaces/SPACE/pages/123456789/Page+Title',
  direction: SyncDirection.BIDIRECTIONAL,
  frequency: SyncFrequency.DAILY,
  enabled: true
});
```

### Triggering Synchronization

```typescript
import { SynchronizationManager } from './manager';
import { getSyncConfig } from '../db/models';

const config = await getSyncConfig(1);
const manager = new SynchronizationManager(config.organization_id, config.team_id);
const result = await manager.synchronize({
  id: config.id,
  organizationId: config.organization_id,
  teamId: config.team_id,
  confluencePageUrl: config.confluence_page_url,
  direction: config.direction,
  frequency: config.frequency,
  lastSyncTime: config.last_sync_time,
  enabled: config.enabled
});
```

### Starting the Scheduler

```typescript
import { syncScheduler } from './scheduler';

// Start the scheduler
syncScheduler.start();

// Stop the scheduler
syncScheduler.stop();
```

## Testing

The synchronization module includes comprehensive unit tests for all components. Run the tests with:

```bash
npm test
```

## Dependencies

- `@linear/sdk`: Linear API client
- `axios`: HTTP client for Confluence API
- `express`: Web framework for API endpoints
- `pg`: PostgreSQL client for database access
