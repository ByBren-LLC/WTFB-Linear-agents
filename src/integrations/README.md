# SAFe PULSE Integration System

This module provides comprehensive third-party integrations for the SAFe PULSE Linear agent, with specialized focus on Slack notifications, operational intelligence, and external service coordination. It enables real-time communication and operational awareness across the development ecosystem.

## Features

- **Enhanced Slack Integration**: Operational intelligence notifications with rich formatting
- **Notification Coordination**: Centralized notification management and routing
- **Throttling & Deduplication**: Intelligent alert management to prevent notification spam
- **Multi-Channel Routing**: Context-aware channel selection for different notification types
- **Environment-Aware Configuration**: Automatic configuration based on deployment environment
- **Operational Intelligence**: Planning statistics, sync status, health alerts, and workflow events
- **Budget & Resource Alerts**: Proactive monitoring notifications for system resources

## Overview

The integration system provides seamless connectivity between SAFe PULSE and external services:

- **Slack Notifications**: Planning completion, system health, budget alerts, workflow events
- **Operational Coordination**: Centralized notification management across all system components
- **Real-time Updates**: Immediate notifications for critical system events
- **Intelligent Routing**: Context-aware channel selection and message formatting
- **Throttling Management**: Prevents notification spam while ensuring critical alerts get through

## Architecture

### Core Components

```
src/integrations/
├── slack.ts                      # Base Slack notification service
├── enhanced-slack-notifier.ts    # Enhanced operational intelligence notifier
└── confluence.ts                 # Confluence API integration
```

### Supporting Components

```
src/utils/
└── operational-notification-coordinator.ts  # Centralized notification coordination
```

### Integration Flow

```mermaid
graph TD
    A[System Event] --> B[Notification Coordinator]
    B --> C[Enhanced Slack Notifier]
    C --> D[Channel Routing]
    C --> E[Throttling Check]
    D --> F[Message Formatting]
    E --> F
    F --> G[Slack API]
    G --> H[Slack Channels]
```

## API Reference

### Enhanced Slack Notifier

Advanced Slack integration with operational intelligence:

```typescript
import { EnhancedSlackNotifier } from './enhanced-slack-notifier';
import { NotificationConfig } from '../types/notification-types';

// Configure enhanced notifications
const config: Partial<NotificationConfig> = {
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
    healthNotifications: true,
    budgetNotifications: true
  },
  throttling: {
    intervalMs: 60000,
    maxNotificationsPerInterval: 5,
    criticalBypassThrottle: true
  }
};

// Create enhanced notifier
const slackNotifier = new EnhancedSlackNotifier(config);
```

### Operational Notification Coordinator

Centralized notification management across system components:

```typescript
import { OperationalNotificationCoordinator } from '../utils/operational-notification-coordinator';

// Create coordinator with environment-specific config
const coordinatorConfig = OperationalNotificationCoordinator.createDefaultConfig(
  process.env.NODE_ENV as 'development' | 'staging' | 'production'
);

const coordinator = OperationalNotificationCoordinator.getInstance(coordinatorConfig);

// Send planning completion notification
await coordinator.notifyPlanningCompletion({
  planningTitle: 'Q1 2025 Planning',
  epicCount: 3,
  featureCount: 12,
  storyCount: 45,
  durationMinutes: 15.5,
  sourceDocument: 'Confluence Planning Doc'
});
```

### Base Slack Notifier

Foundation Slack integration service:

```typescript
import { SlackNotifier } from './slack';

// Basic Slack notifications
const slackNotifier = new SlackNotifier();

// Send simple notification
await slackNotifier.sendNotification('System update completed', '#general');

// Send planning completion
await slackNotifier.sendPlanningCompleteNotification(
  'Q1 Planning',
  'LIN-123',
  5
);
```

## Integration Guide

### Setting Up Slack Integration

Configure Slack webhook and environment variables:

```bash
# Environment configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Optional: Channel overrides
SLACK_PLANNING_CHANNEL=#custom-planning
SLACK_ALERTS_CHANNEL=#custom-alerts
```

### Integration with Agent System

Connect integrations with the Enhanced Agent System:

```typescript
import { EnhancedAgentSystem } from '../agent/enhanced-agent-system';
import { OperationalNotificationCoordinator } from '../utils/operational-notification-coordinator';

// Initialize notification coordinator
const coordinator = OperationalNotificationCoordinator.getInstance(
  OperationalNotificationCoordinator.createDefaultConfig('production')
);

// Create agent system with notification integration
const agentSystem = new EnhancedAgentSystem({
  notificationCoordinator: coordinator,
  enableSlackNotifications: true
});

// Agent will automatically send notifications for key events
```

### Monitoring Integration

Connect with monitoring system for health and budget alerts:

```typescript
import { HealthMonitor } from '../monitoring/health-monitor';
import { BudgetMonitor } from '../monitoring/budget-monitor';

// Health monitoring with Slack alerts
const healthMonitor = new HealthMonitor({
  notificationsEnabled: true,
  slackNotifier: new EnhancedSlackNotifier()
});

// Budget monitoring with threshold alerts
const budgetMonitor = new BudgetMonitor({
  slackNotifier: new EnhancedSlackNotifier(),
  alertThresholds: {
    apiUsage: 80,
    resourceUsage: 85
  }
});
```

## Examples

### Complete Notification Setup

```typescript
import {
  EnhancedSlackNotifier,
  OperationalNotificationCoordinator
} from '../integrations';

// Environment-aware configuration
const environment = process.env.NODE_ENV as 'development' | 'staging' | 'production';

// Create notification coordinator
const coordinator = OperationalNotificationCoordinator.getInstance(
  OperationalNotificationCoordinator.createDefaultConfig(environment)
);

// Planning completion notification
await coordinator.notifyPlanningCompletion({
  planningTitle: 'Sprint 24 Planning',
  epicCount: 2,
  featureCount: 8,
  storyCount: 32,
  enablerCount: 3,
  durationMinutes: 12.5,
  sourceDocument: 'Sprint Planning Doc',
  timestamp: new Date()
});

// System health alert
await coordinator.notifySystemHealth({
  component: 'linear-api',
  status: 'warning',
  message: 'API usage at 85% of daily limit',
  actionRequired: 'Monitor usage closely',
  severity: 'medium',
  timestamp: new Date()
});

// Workflow event notification
await coordinator.notifyWorkflowUpdate(
  'deployment',
  'Production Deployment',
  'Deploying version 2.1.0 to production',
  'success',
  'https://github.com/repo/actions/123'
);
```

### Custom Notification Types

Create custom notification handlers for specific use cases:

```typescript
import { EnhancedSlackNotifier } from './enhanced-slack-notifier';

class CustomIntegrationNotifier extends EnhancedSlackNotifier {
  async sendCustomAlert(
    alertType: string,
    message: string,
    details: Record<string, any>
  ): Promise<boolean> {
    // Custom formatting logic
    const formattedMessage = this.formatCustomAlert(alertType, message, details);
    
    // Route to appropriate channel
    const channel = this.getChannelForAlertType(alertType);
    
    // Send with throttling
    return this.sendThrottledNotification(
      `custom-${alertType}`,
      formattedMessage,
      channel,
      'medium'
    );
  }
  
  private formatCustomAlert(
    type: string,
    message: string,
    details: Record<string, any>
  ): string {
    return `🔔 *${type.toUpperCase()}*\n${message}\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``;
  }
}
```

### Batch Notification Processing

Handle multiple notifications efficiently:

```typescript
import { EnhancedSlackNotifier } from './enhanced-slack-notifier';

class BatchNotificationProcessor {
  private notifier: EnhancedSlackNotifier;
  private batchQueue: Array<{
    type: string;
    message: string;
    channel: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  constructor() {
    this.notifier = new EnhancedSlackNotifier();
  }

  async processBatch(): Promise<void> {
    // Sort by priority
    const sortedNotifications = this.batchQueue.sort((a, b) => {
      const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    // Process notifications with throttling
    for (const notification of sortedNotifications) {
      await this.notifier.sendThrottledNotification(
        notification.type,
        notification.message,
        notification.channel,
        notification.priority
      );
    }

    // Clear batch
    this.batchQueue = [];
  }
}
```

## Configuration

### Notification Configuration

```typescript
const notificationConfig: NotificationConfig = {
  channels: {
    planning: '#planning-ops',           // Planning completion and statistics
    health: '#system-alerts',            // System health and monitoring
    sync: '#sync-status',                // Synchronization status updates
    workflow: '#dev-workflow',           // Development workflow events
    errors: '#critical-alerts',          // Critical errors and failures
    agent: '#agent-updates'              // Agent status and updates
  },
  thresholds: {
    tokenExpirationWarningDays: 7,       // OAuth token expiration warning
    apiUsageWarningPercentage: 80,       // API usage threshold
    memoryUsageWarningPercentage: 85,    // Memory usage threshold
    diskUsageWarningPercentage: 90       // Disk usage threshold
  },
  enabled: {
    planningNotifications: true,         // Enable planning notifications
    syncNotifications: true,             // Enable sync notifications
    healthNotifications: true,           // Enable health notifications
    budgetNotifications: true,           // Enable budget notifications
    workflowNotifications: true,         // Enable workflow notifications
    agentNotifications: true             // Enable agent notifications
  },
  throttling: {
    intervalMs: 60000,                   // Throttling window (1 minute)
    maxNotificationsPerInterval: 5,      // Max notifications per window
    criticalBypassThrottle: true         // Allow critical alerts to bypass throttling
  }
};
```

### Environment-Specific Configuration

```typescript
// Development environment
const devConfig = {
  throttling: {
    intervalMs: 30000,                   // Shorter throttling in dev
    maxNotificationsPerInterval: 10      // More notifications allowed
  },
  enabled: {
    planningNotifications: true,
    healthNotifications: false,          // Disable health alerts in dev
    budgetNotifications: false           // Disable budget alerts in dev
  }
};

// Production environment
const prodConfig = {
  throttling: {
    intervalMs: 300000,                  // Longer throttling in prod (5 minutes)
    maxNotificationsPerInterval: 3       // Fewer notifications
  },
  enabled: {
    planningNotifications: true,
    healthNotifications: true,
    budgetNotifications: true,
    workflowNotifications: true,
    agentNotifications: true
  }
};
```

## Troubleshooting

### Common Issues

**Issue**: Slack notifications not being sent
```typescript
// Solution: Check webhook URL and configuration
const slackNotifier = new SlackNotifier();
if (!process.env.SLACK_WEBHOOK_URL) {
  console.error('SLACK_WEBHOOK_URL not configured');
}

// Test notification
const success = await slackNotifier.sendNotification('Test message');
console.log('Notification sent:', success);
```

**Issue**: Too many notifications being throttled
```typescript
// Solution: Adjust throttling configuration
const config: Partial<NotificationConfig> = {
  throttling: {
    intervalMs: 30000,                   // Reduce throttling window
    maxNotificationsPerInterval: 10,     // Increase notification limit
    criticalBypassThrottle: true         // Ensure critical alerts bypass throttling
  }
};
```

**Issue**: Notifications going to wrong channels
```typescript
// Solution: Verify channel configuration
const coordinator = OperationalNotificationCoordinator.getInstance({
  slackConfig: {
    channels: {
      planning: '#correct-planning-channel',
      health: '#correct-health-channel'
    }
  }
});
```

### Debugging Integration Issues

Enable detailed logging for integration debugging:

```typescript
// Debug notification sending
logger.debug('Sending notification', {
  type: notificationType,
  channel: targetChannel,
  throttled: isThrottled,
  message: message.substring(0, 100)
});

// Debug throttling behavior
logger.debug('Throttling check', {
  key: throttleKey,
  lastSent: lastSentTime,
  intervalMs: config.throttling.intervalMs,
  shouldThrottle: shouldThrottle
});
```

## Performance Guidelines

### Notification Optimization

1. **Batch Processing**: Group related notifications to reduce API calls
2. **Intelligent Throttling**: Use appropriate throttling to prevent spam
3. **Channel Routing**: Route notifications to appropriate channels
4. **Message Formatting**: Use efficient message formatting to reduce payload size

### Memory Management

```typescript
// Efficient throttling cache management
class OptimizedThrottleCache {
  private cache = new Map<string, number>();
  private readonly MAX_CACHE_SIZE = 1000;
  
  private cleanupCache(): void {
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1] - b[1]);
      
      // Keep only recent half
      const keepCount = Math.floor(this.MAX_CACHE_SIZE / 2);
      this.cache.clear();
      
      entries.slice(-keepCount).forEach(([key, value]) => {
        this.cache.set(key, value);
      });
    }
  }
}
```

---

**The SAFe PULSE integration system provides seamless connectivity with external services, enabling comprehensive operational intelligence and real-time communication across the development ecosystem.** 🔗📢
