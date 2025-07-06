# REST API System

## Overview

The SAFe PULSE Linear Agent REST API provides comprehensive endpoints for health monitoring, planning session management, synchronization operations, and PI (Program Increment) planning. The API follows RESTful principles with JSON request/response formats and comprehensive error handling.

### Key Features

- **Health Monitoring**: Comprehensive system health and metrics endpoints
- **Planning Management**: Complete planning session lifecycle management
- **Synchronization APIs**: Bidirectional Linear-Confluence synchronization
- **PI Planning**: Program Increment planning and management
- **Real-time Webhooks**: Event-driven webhook processing
- **Enterprise Monitoring**: Budget tracking, performance metrics, and alerting

### Integration Points

- **Linear API**: GraphQL integration for issue and project management
- **Confluence API**: REST integration for document synchronization
- **Database Layer**: Persistent storage for sessions and state
- **Authentication System**: OAuth-secured endpoint access
- **Monitoring System**: Health checks and performance tracking

## Architecture

### API Structure Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Health APIs   │    │ Planning APIs   │    │   Sync APIs     │
│                 │    │                 │    │                 │
│ • Basic Health  │    │ • Sessions      │    │ • Start/Stop    │
│ • Detailed      │    │ • Lifecycle     │    │ • Status        │
│ • Metrics       │    │ • State Mgmt    │    │ • Manual Sync   │
│ • Dashboard     │    │ • Process Ctrl  │    │ • Validation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  PI Planning    │
                    │                 │
                    │ • Create PI     │
                    │ • Manage PI     │
                    │ • Confluence    │
                    │   Integration   │
                    └─────────────────┘
```

### Request/Response Patterns

**Standard Response Format**:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-07-06T18:00:00.000Z"
}
```

**Error Response Format**:
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-07-06T18:00:00.000Z"
}
```

## API Reference

### Health Monitoring APIs

#### Basic Health Check
**GET** `/api/health`

Returns basic system health status for load balancers and monitoring systems.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-06T18:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production"
}
```

**Status Values**: `healthy`, `warning`, `critical`

#### Detailed Health Check
**GET** `/api/health/detailed`

Returns comprehensive system health with component-level status.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-06T18:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "components": {
    "api": {
      "status": "healthy",
      "details": { "responseTime": 45 }
    },
    "database": {
      "status": "healthy",
      "details": { "connectionPool": "active" }
    },
    "linear": {
      "status": "healthy",
      "details": { "lastSync": "2025-07-06T17:55:00.000Z" }
    },
    "confluence": {
      "status": "healthy",
      "details": { "lastSync": "2025-07-06T17:50:00.000Z" }
    }
  },
  "alerts": []
}
```

#### Health Metrics
**GET** `/api/health/metrics`

Returns detailed performance metrics and usage statistics.

**Response**:
```json
{
  "timestamp": "2025-07-06T18:00:00.000Z",
  "metrics": {
    "health": {
      "overallScore": 95,
      "componentScores": {
        "api": 98,
        "database": 95,
        "linear": 92,
        "confluence": 90
      }
    },
    "api": {
      "totalRequests": 1250,
      "successRate": 99.2,
      "averageResponseTime": 120,
      "errorRate": 0.8
    },
    "budget": {
      "daily": {
        "used": 45.50,
        "limit": 100.00,
        "percentage": 45.5
      },
      "monthly": {
        "used": 1250.75,
        "limit": 3000.00,
        "percentage": 41.7
      }
    }
  }
}
```

#### System Dashboard
**GET** `/api/health/dashboard`

Returns dashboard-friendly system overview for monitoring interfaces.

**Response**:
```json
{
  "timestamp": "2025-07-06T18:00:00.000Z",
  "overall": {
    "status": "healthy",
    "isHealthy": true,
    "uptime": 3600,
    "environment": "production"
  },
  "summary": {
    "totalComponents": 4,
    "healthyComponents": 4,
    "warningComponents": 0,
    "criticalComponents": 0
  },
  "budget": {
    "dailyUsagePercentage": 45.5,
    "monthlyUsagePercentage": 41.7,
    "isNearLimit": false
  },
  "recentAlerts": []
}
```

### Planning Session APIs

#### Create Planning Session
**POST** `/api/planning/sessions`

Creates a new planning session for Confluence document processing.

**Request Body**:
```json
{
  "title": "Q3 2025 Planning Session",
  "confluencePageUrl": "https://company.atlassian.net/wiki/spaces/PLAN/pages/123456",
  "organizationId": "org-123"
}
```

**Response** (201):
```json
{
  "id": "session-456",
  "title": "Q3 2025 Planning Session",
  "confluencePageUrl": "https://company.atlassian.net/wiki/spaces/PLAN/pages/123456",
  "organizationId": "org-123",
  "status": "created",
  "createdAt": "2025-07-06T18:00:00.000Z"
}
```

#### Get Planning Session
**GET** `/api/planning/sessions/{id}`

Retrieves the current state of a planning session.

**Response**:
```json
{
  "id": "session-456",
  "title": "Q3 2025 Planning Session",
  "status": "processing",
  "progress": {
    "currentStep": "parsing_confluence",
    "completedSteps": ["created", "validated"],
    "totalSteps": 5,
    "percentage": 40
  },
  "results": {
    "issuesCreated": 12,
    "featuresCreated": 3,
    "storiesCreated": 9
  },
  "createdAt": "2025-07-06T18:00:00.000Z",
  "updatedAt": "2025-07-06T18:05:00.000Z"
}
```

#### List Planning Sessions
**GET** `/api/planning/sessions?organizationId={orgId}`

Lists all planning sessions for an organization.

**Query Parameters**:
- `organizationId` (required): Organization identifier
- `status` (optional): Filter by session status
- `limit` (optional): Maximum results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "sessions": [
    {
      "id": "session-456",
      "title": "Q3 2025 Planning Session",
      "status": "completed",
      "createdAt": "2025-07-06T18:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### Start Planning Session
**POST** `/api/planning/sessions/{id}/start`

Starts processing a planning session.

**Response**:
```json
{
  "status": "processing",
  "message": "Planning session started successfully"
}
```

#### Delete Planning Session
**DELETE** `/api/planning/sessions/{id}`

Deletes a planning session and its associated data.

**Response**:
```json
{
  "status": "deleted",
  "message": "Planning session deleted successfully"
}
```

### Synchronization APIs

#### Start Synchronization
**POST** `/api/sync/start`

Initiates bidirectional synchronization between Linear and Confluence.

**Request Body**:
```json
{
  "organizationId": "org-123",
  "linearTeamId": "team-456",
  "confluencePageIdOrUrl": "https://company.atlassian.net/wiki/spaces/PLAN/pages/123456",
  "syncIntervalMs": 300000,
  "autoResolveConflicts": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Synchronization started successfully",
  "status": {
    "isRunning": true,
    "lastSync": "2025-07-06T18:00:00.000Z",
    "nextSync": "2025-07-06T18:05:00.000Z",
    "syncCount": 0,
    "errorCount": 0
  }
}
```

#### Get Synchronization Status
**GET** `/api/sync/status`

Returns current synchronization status and statistics.

**Query Parameters**:
- `organizationId` (required): Organization identifier
- `linearTeamId` (required): Linear team identifier
- `confluencePageIdOrUrl` (required): Confluence page identifier

**Response**:
```json
{
  "success": true,
  "status": {
    "isRunning": true,
    "lastSync": "2025-07-06T18:00:00.000Z",
    "nextSync": "2025-07-06T18:05:00.000Z",
    "syncCount": 15,
    "errorCount": 0,
    "lastError": null,
    "statistics": {
      "issuesCreated": 5,
      "issuesUpdated": 10,
      "conflictsResolved": 2
    }
  }
}
```

#### Manual Synchronization Trigger
**POST** `/api/sync/trigger`

Manually triggers a synchronization cycle.

**Request Body**:
```json
{
  "organizationId": "org-123",
  "linearTeamId": "team-456",
  "confluencePageIdOrUrl": "https://company.atlassian.net/wiki/spaces/PLAN/pages/123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Manual synchronization triggered",
  "syncId": "sync-789",
  "estimatedDuration": "30 seconds"
}
```

### PI Planning APIs

#### Create Program Increment
**POST** `/api/pi-planning/program-increments`

Creates a new Program Increment in Linear.

**Request Body**:
```json
{
  "organizationId": "org-123",
  "teamId": "team-456",
  "name": "PI 2025.3",
  "startDate": "2025-07-01",
  "endDate": "2025-09-30",
  "description": "Q3 2025 Program Increment",
  "objectives": [
    "Deliver new user dashboard",
    "Improve system performance"
  ]
}
```

**Response** (201):
```json
{
  "success": true,
  "programIncrement": {
    "id": "pi-789",
    "name": "PI 2025.3",
    "startDate": "2025-07-01",
    "endDate": "2025-09-30",
    "description": "Q3 2025 Program Increment",
    "status": "planning",
    "linearCycleId": "cycle-123",
    "dbId": 456
  }
}
```

#### Get Program Increment
**GET** `/api/pi-planning/program-increments/{id}`

Retrieves a specific Program Increment.

**Response**:
```json
{
  "success": true,
  "programIncrement": {
    "id": "pi-789",
    "name": "PI 2025.3",
    "startDate": "2025-07-01",
    "endDate": "2025-09-30",
    "status": "active",
    "features": [
      {
        "id": "feature-123",
        "title": "User Dashboard",
        "status": "in_progress"
      }
    ],
    "objectives": [
      {
        "id": "obj-456",
        "description": "Deliver new user dashboard",
        "status": "on_track"
      }
    ]
  }
}
```

#### Create PI from Confluence
**POST** `/api/pi-planning/program-increments/from-confluence`

Creates a Program Increment by parsing a Confluence planning document.

**Request Body**:
```json
{
  "organizationId": "org-123",
  "teamId": "team-456",
  "confluencePageUrl": "https://company.atlassian.net/wiki/spaces/PLAN/pages/123456"
}
```

**Response** (201):
```json
{
  "success": true,
  "programIncrement": {
    "id": "pi-789",
    "name": "PI 2025.3",
    "startDate": "2025-07-01",
    "endDate": "2025-09-30",
    "description": "Parsed from Confluence planning document",
    "status": "planning",
    "dbId": 456,
    "confluenceSource": "https://company.atlassian.net/wiki/spaces/PLAN/pages/123456"
  }
}
```

## Integration Guide

### Authentication Requirements

All API endpoints require valid authentication tokens. The system supports:

1. **OAuth Token Authentication**: For user-initiated requests
2. **Webhook Authentication**: For Linear webhook events
3. **Session Authentication**: For web-based OAuth flows

**Example with OAuth Token**:
```typescript
const response = await fetch('/api/planning/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Planning Session',
    confluencePageUrl: 'https://...',
    organizationId: 'org-123'
  })
});
```

### Error Handling

The API uses standard HTTP status codes and provides detailed error information:

**Error Response Structure**:
```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-07-06T18:00:00.000Z",
  "details": {
    "field": "validation error details"
  }
}
```

**Common Status Codes**:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

### Rate Limiting

The API implements intelligent rate limiting to respect external service limits:

- **Linear API**: Automatic throttling based on Linear's rate limits
- **Confluence API**: Respectful request pacing
- **Health Endpoints**: No rate limiting (for monitoring)
- **Webhook Endpoints**: Signature-based authentication

### Request/Response Examples

#### Complete Planning Session Workflow

```typescript
// 1. Create planning session
const session = await fetch('/api/planning/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Q3 Planning',
    confluencePageUrl: 'https://company.atlassian.net/wiki/spaces/PLAN/pages/123456',
    organizationId: 'org-123'
  })
});

// 2. Start processing
await fetch(`/api/planning/sessions/${session.id}/start`, {
  method: 'POST'
});

// 3. Monitor progress
const status = await fetch(`/api/planning/sessions/${session.id}`);

// 4. Check results when complete
if (status.status === 'completed') {
  console.log(`Created ${status.results.issuesCreated} issues`);
}
```

#### Health Monitoring Integration

```typescript
// Basic health check for load balancer
const health = await fetch('/api/health');
// Returns: { status: 'healthy', uptime: 3600, ... }

// Detailed monitoring dashboard
const dashboard = await fetch('/api/health/dashboard');
// Returns comprehensive system overview

// Performance metrics for alerting
const metrics = await fetch('/api/health/metrics');
// Returns detailed performance data
```

## Examples

### Planning Session Management

```typescript
import { PlanningSessionAPI } from './api-client';

const api = new PlanningSessionAPI(accessToken);

// Create and start planning session
const session = await api.createSession({
  title: 'Sprint Planning',
  confluencePageUrl: 'https://...',
  organizationId: 'org-123'
});

await api.startSession(session.id);

// Monitor progress
const checkProgress = async () => {
  const status = await api.getSession(session.id);
  console.log(`Progress: ${status.progress.percentage}%`);
  
  if (status.status === 'completed') {
    console.log('Planning complete!');
    return;
  }
  
  setTimeout(checkProgress, 5000);
};

checkProgress();
```

### Synchronization Management

```typescript
import { SyncAPI } from './api-client';

const syncApi = new SyncAPI(accessToken);

// Start continuous synchronization
await syncApi.startSync({
  organizationId: 'org-123',
  linearTeamId: 'team-456',
  confluencePageIdOrUrl: 'https://...',
  syncIntervalMs: 300000, // 5 minutes
  autoResolveConflicts: false
});

// Monitor sync status
const status = await syncApi.getStatus({
  organizationId: 'org-123',
  linearTeamId: 'team-456',
  confluencePageIdOrUrl: 'https://...'
});

console.log(`Synced ${status.syncCount} times, ${status.errorCount} errors`);
```

### Health Monitoring

```typescript
import { HealthAPI } from './api-client';

const healthApi = new HealthAPI();

// Implement health check endpoint
app.get('/health', async (req, res) => {
  const health = await healthApi.getBasicHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Dashboard data for monitoring UI
app.get('/dashboard/data', async (req, res) => {
  const dashboard = await healthApi.getDashboard();
  res.json(dashboard);
});
```

## Troubleshooting

### Common Issues

#### "Planning session creation failed"

**Cause**: Invalid Confluence URL or authentication issues
**Solution**: Verify Confluence URL format and OAuth tokens

```bash
# Test Confluence connectivity
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.atlassian.com/ex/confluence/{site-id}/rest/api/content/{page-id}"
```

#### "Synchronization not starting"

**Cause**: Missing required parameters or invalid team/page IDs
**Solution**: Validate all required parameters

```typescript
// Verify parameters before sync
const params = {
  organizationId: 'org-123',
  linearTeamId: 'team-456',
  confluencePageIdOrUrl: 'https://...'
};

// All parameters must be non-empty strings
Object.values(params).forEach(param => {
  if (!param || typeof param !== 'string') {
    throw new Error('Invalid parameter');
  }
});
```

#### "Health check returning critical status"

**Cause**: Component failures or resource exhaustion
**Solution**: Check detailed health endpoint for specific issues

```typescript
const detailed = await fetch('/api/health/detailed');
const critical = detailed.components.filter(c => c.status === 'critical');
console.log('Critical components:', critical);
```

### Performance Optimization

#### Request Batching

For multiple API calls, use batching where possible:

```typescript
// Instead of multiple individual requests
const sessions = await Promise.all([
  api.getSession('session-1'),
  api.getSession('session-2'),
  api.getSession('session-3')
]);

// Use list endpoint with filtering
const sessions = await api.listSessions({
  organizationId: 'org-123',
  ids: ['session-1', 'session-2', 'session-3']
});
```

#### Caching Strategy

Implement appropriate caching for frequently accessed data:

```typescript
// Cache health status for monitoring dashboards
const healthCache = new Map();

const getCachedHealth = async () => {
  const cached = healthCache.get('health');
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.data;
  }
  
  const health = await fetch('/api/health/detailed');
  healthCache.set('health', {
    data: health,
    timestamp: Date.now()
  });
  
  return health;
};
```

---

**This REST API system provides comprehensive functionality for managing the SAFe PULSE Linear agent platform with enterprise-grade reliability and monitoring.** 🚀🏛️
