# Enhanced SlackNotifier for Operational Intelligence

The Enhanced SlackNotifier extends the base SlackNotifier with operational intelligence methods that provide detailed notifications about planning operations, system health, workflow status, and more.

## Overview

The Enhanced SlackNotifier is designed to complement Linear's existing issue notifications by providing operational insights that help development and planning teams stay informed about system status, planning progress, and workflow events.

## Features

- **Planning Statistics**: Notifications about planning completion with epic/feature/story counts and duration
- **Sync Status Updates**: Information about Linear-Confluence synchronization with conflict details
- **System Health Alerts**: Component status notifications with actionable guidance
- **Budget and Resource Alerts**: Usage monitoring for API limits, memory, disk space, etc.
- **Workflow Notifications**: PR status, deployment, build, and test notifications
- **Agent Updates**: Remote agent assignment and completion notifications
- **Configurable Channels**: Route different notification types to specific Slack channels
- **Throttling**: Prevent notification spam with configurable rate limiting
- **Backward Compatibility**: Extends existing SlackNotifier without breaking changes

## Installation and Setup

### Prerequisites

1. Slack webhook URL configured in environment variables
2. Existing SlackNotifier setup (already available in the project)

### Environment Configuration

Add to your `.env` file:

```bash
# Slack Integration (Required)
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

### Basic Usage

```typescript
import { EnhancedSlackNotifier } from '../integrations/enhanced-slack-notifier';
import { PlanningStatistics } from '../types/notification-types';

// Create notifier with default configuration
const notifier = new EnhancedSlackNotifier();

// Send planning statistics notification
const planningStats: PlanningStatistics = {
  planningTitle: 'Q1 2025 Planning',
  epicCount: 2,
  featureCount: 8,
  storyCount: 45,
  enablerCount: 3,
  durationMinutes: 12.5,
  sourceDocument: 'Q1 Planning Document',
  timestamp: new Date()
};

await notifier.sendPlanningStatistics(planningStats);
```

## Configuration

### Default Configuration

The Enhanced SlackNotifier comes with sensible defaults:

```typescript
{
  channels: {
    planning: '#planning-ops',
    health: '#system-alerts',
    sync: '#sync-status',
    workflow: '#dev-workflow',
    errors: '#critical-alerts',
    agent: '#agent-updates'
  },
  enabled: {
    planningNotifications: true,
    syncNotifications: true,
    healthNotifications: true,
    budgetNotifications: true,
    workflowNotifications: true,
    agentNotifications: true
  },
  throttling: {
    intervalMs: 60000, // 1 minute
    maxNotificationsPerInterval: 5,
    criticalBypassThrottle: true
  },
  thresholds: {
    tokenExpirationWarningDays: 7,
    apiUsageWarningPercentage: 80,
    memoryUsageWarningPercentage: 85,
    diskUsageWarningPercentage: 90
  }
}
```

### Custom Configuration

```typescript
import { EnhancedSlackNotifier, NotificationConfig } from '../integrations/enhanced-slack-notifier';

const customConfig: Partial<NotificationConfig> = {
  channels: {
    planning: '#custom-planning',
    health: '#custom-alerts',
    // ... other channels
  },
  enabled: {
    planningNotifications: true,
    syncNotifications: false, // Disable sync notifications
    // ... other settings
  },
  throttling: {
    intervalMs: 30000, // 30 seconds
    maxNotificationsPerInterval: 3,
    criticalBypassThrottle: true
  }
};

const notifier = new EnhancedSlackNotifier(customConfig);
```

## Notification Types

### 1. Planning Statistics

Notifies about planning completion with detailed metrics:

```typescript
const planningStats: PlanningStatistics = {
  planningTitle: 'Q1 2025 Planning',
  epicCount: 1,
  featureCount: 5,
  storyCount: 23,
  enablerCount: 3,
  durationMinutes: 2.3,
  sourceDocument: 'Q1 Planning Document',
  sourceUrl: 'https://confluence.company.com/planning',
  timestamp: new Date()
};

await notifier.sendPlanningStatistics(planningStats);
```

**Example Output:**
```
📊 Planning Completed: "Q1 2025 Planning"
✅ Created: 1 Epic, 5 Features, 23 Stories, 3 Enablers
⏱️ Duration: 2.3 minutes
📄 Source: Q1 Planning Document
🔗 Link: https://confluence.company.com/planning
```

### 2. Sync Status Updates

Provides information about Linear-Confluence synchronization:

```typescript
const syncResult: SyncResult = {
  syncType: 'bidirectional',
  linearUpdates: 3,
  confluenceUpdates: 1,
  conflictsDetected: 2,
  conflictsResolved: 2,
  conflictsPending: 0,
  nextSyncMinutes: 5,
  timestamp: new Date()
};

await notifier.sendSyncStatusUpdate(syncResult);
```

**Example Output:**
```
🔄 Sync Completed: BIDIRECTIONAL
📝 Changes: 3 Linear updates, 1 Confluence updates
⚠️ Conflicts: 2 detected, 2 auto-resolved
⏱️ Next sync: in 5 minutes
```

### 3. System Health Alerts

Sends component status notifications with actionable guidance:

```typescript
const healthAlert: SystemHealth = {
  component: 'Confluence API Integration',
  status: 'warning',
  message: 'OAuth Token Expiring',
  actionRequired: 'Refresh token or re-authenticate',
  severity: 'medium',
  timestamp: new Date()
};

await notifier.sendSystemHealthAlert(healthAlert);
```

**Example Output:**
```
⚠️ System Alert: OAuth Token Expiring
🟡 Component: Confluence API Integration
⚡ Action needed: Refresh token or re-authenticate
```

### 4. Budget and Resource Alerts

Monitors resource usage and sends alerts when thresholds are exceeded:

```typescript
const budgetAlert: BudgetAlert = {
  resourceType: 'api-usage',
  currentUsage: 800,
  limit: 1000,
  usagePercentage: 80,
  timeframe: 'hourly',
  actionRequired: 'Monitor API usage closely',
  timestamp: new Date()
};

await notifier.sendBudgetAlert(budgetAlert);
```

**Example Output:**
```
🔌 Resource Alert: API-USAGE
📈 Usage: 800/1000 (80%)
⏰ Timeframe: hourly
⚡ Action needed: Monitor API usage closely
```

### 5. Workflow Notifications

Provides updates on PR status, deployments, builds, and tests:

```typescript
const workflowEvent: WorkflowEvent = {
  eventType: 'pr-created',
  title: 'Enhanced SlackNotifier Implementation',
  description: 'Added operational intelligence methods',
  status: 'pending',
  url: 'https://github.com/company/repo/pull/123',
  assignee: 'developer@company.com',
  timestamp: new Date()
};

await notifier.sendWorkflowNotification(workflowEvent);
```

**Example Output:**
```
🔀 PR-CREATED: Enhanced SlackNotifier Implementation
⏳ Status: pending
📝 Added operational intelligence methods
👤 Assignee: developer@company.com
🔗 Link: https://github.com/company/repo/pull/123
```

### 6. Agent Updates

Notifies about remote agent assignments and status changes:

```typescript
const agentUpdate: AgentUpdate = {
  agentId: 'LIN-ARCH-01-S01',
  agentType: 'remote',
  status: 'completed',
  taskTitle: 'Enhanced SlackNotifier Implementation',
  taskUrl: 'https://linear.app/company/issue/WOR-75',
  message: 'Successfully implemented all notification methods',
  assignee: 'remote-agent@company.com',
  timestamp: new Date()
};

await notifier.sendRemoteAgentUpdate(agentUpdate);
```

**Example Output:**
```
✅ Agent Update: LIN-ARCH-01-S01
🌐 Type: remote
📋 Task: Enhanced SlackNotifier Implementation
💬 Successfully implemented all notification methods
👤 Assignee: remote-agent@company.com
🔗 Link: https://linear.app/company/issue/WOR-75
```

## Throttling

The Enhanced SlackNotifier includes built-in throttling to prevent notification spam:

- **Default Window**: 1 minute (60,000ms)
- **Default Limit**: 5 notifications per window
- **Critical Bypass**: Critical health alerts bypass throttling
- **Per-Type Throttling**: Each notification type is throttled separately

### Managing Throttling

```typescript
// Clear throttle cache (useful for testing)
notifier.clearThrottleCache();

// Configure custom throttling
const config = {
  throttling: {
    intervalMs: 30000, // 30 seconds
    maxNotificationsPerInterval: 3,
    criticalBypassThrottle: true
  }
};
```

## Error Handling

The Enhanced SlackNotifier handles errors gracefully:

- **Missing Webhook URL**: Returns `false` without throwing
- **Slack API Failures**: Logs error and returns `false`
- **Invalid Configuration**: Uses defaults for missing values
- **Network Issues**: Handles timeouts and connection errors

## Testing

### Unit Tests

Run unit tests to verify functionality:

```bash
npm test src/integrations/__tests__/enhanced-slack-notifier.test.ts
```

### Integration Tests

Run integration tests to verify compatibility:

```bash
npm test src/integrations/__tests__/enhanced-slack-notifier.integration.test.ts
```

### Manual Testing

Use the example file to test notifications manually:

```bash
npx ts-node src/integrations/examples/enhanced-slack-notifier-example.ts
```

## Troubleshooting

### Common Issues

1. **Notifications not appearing in Slack**
   - Verify `SLACK_WEBHOOK_URL` is set correctly
   - Check that the webhook URL is valid and active
   - Ensure notification type is enabled in configuration

2. **Notifications being throttled**
   - Check throttle configuration
   - Clear throttle cache if needed
   - Verify notification keys are unique

3. **Missing notification content**
   - Verify all required fields are provided in notification data
   - Check that formatting methods are working correctly

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
import * as logger from '../utils/logger';

// The notifier automatically logs debug information
// Check console output for debug messages
```

## Best Practices

1. **Channel Organization**: Use different channels for different notification types
2. **Throttling Configuration**: Adjust throttling based on team preferences
3. **Error Handling**: Always check return values for notification success
4. **Configuration Management**: Use environment-specific configurations
5. **Testing**: Test notifications in development before deploying

## Backward Compatibility

The Enhanced SlackNotifier maintains full backward compatibility with the existing SlackNotifier:

- All existing methods continue to work unchanged
- No breaking changes to existing functionality
- Can be used as a drop-in replacement for SlackNotifier

## Contributing

When contributing to the Enhanced SlackNotifier:

1. Follow existing code patterns and TypeScript conventions
2. Add comprehensive tests for new notification types
3. Update documentation for new features
4. Ensure backward compatibility is maintained
5. Test throttling and error handling scenarios
