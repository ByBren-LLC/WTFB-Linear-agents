# Health Monitoring System

A comprehensive health monitoring system for the WTFB Linear Agents application that provides real-time monitoring, alerting, and reporting capabilities.

## Overview

The health monitoring system consists of several interconnected components that work together to provide comprehensive system health visibility:

- **Health Monitor**: Central orchestrator for system health checks
- **Budget Monitor**: Tracks API usage and costs
- **Resource Monitor**: Monitors system resources (memory, disk, database)
- **Operational Health Monitor**: Monitors OAuth tokens and API health
- **Enhanced Slack Notifier**: Sends alerts and notifications
- **Health API**: REST endpoints for health status and management

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Health API    │    │  Health Monitor │    │ Budget Monitor  │
│                 │    │                 │    │                 │
│ REST Endpoints  │◄──►│ Central Control │◄──►│ API Usage &     │
│ for Management  │    │ & Orchestration │    │ Cost Tracking   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│Resource Monitor │    │Operational      │    │Enhanced Slack   │
│                 │    │Health Monitor   │    │Notifier         │
│Memory, Disk,    │◄──►│                 │◄──►│                 │
│Database Health  │    │OAuth & API      │    │Alert & Report   │
└─────────────────┘    │Health Tracking  │    │Distribution     │
                       └─────────────────┘    └─────────────────┘
```

## Components

### Health Monitor (`src/monitoring/health-monitor.ts`)

The central orchestrator that coordinates health checks across all system components.

**Features:**
- Comprehensive health checks across all components
- Configurable monitoring intervals
- Alert processing and throttling
- Health metrics collection for trending
- Integration with all monitoring components

**Configuration:**
```typescript
interface HealthMonitorConfig {
  checkIntervalMs: number;           // Default: 2 minutes
  notificationsEnabled: boolean;     // Default: true
  environment: 'development' | 'staging' | 'production';
  alertThrottleMs: number;          // Default: 5 minutes
  memoryUsageWarningPercentage: number;  // Default: 85%
  diskUsageWarningPercentage: number;    // Default: 90%
  dbConnectionWarningPercentage: number; // Default: 80%
}
```

### Budget Monitor (`src/monitoring/budget-monitor.ts`)

Tracks API usage, costs, and budget compliance across Linear and Confluence APIs.

**Features:**
- Real-time API usage tracking
- Cost calculation and budget monitoring
- Usage threshold alerts
- Historical data retention (30 days API, 24 hours resources)
- Resource usage tracking (memory, disk)

**Configuration:**
```typescript
interface BudgetConfig {
  apiLimits: {
    linear: { dailyLimit: number; monthlyLimit: number; warningThreshold: number };
    confluence: { dailyLimit: number; monthlyLimit: number; warningThreshold: number };
  };
  costTracking: {
    enabled: boolean;
    currency: string;
    apiCosts: {
      linearCostPerCall: number;
      confluenceCostPerCall: number;
    };
  };
}
```

### Resource Monitor (`src/monitoring/resource-monitor.ts`)

Monitors system resources including memory, disk space, and database connections.

**Features:**
- Real-time memory usage monitoring
- Disk space monitoring
- Database connection pool monitoring
- Configurable thresholds for warning/critical alerts
- Automatic alert throttling

**Configuration:**
```typescript
interface ResourceMonitorConfig {
  thresholds: {
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
    database: {
      connectionWarning: number;
      connectionCritical: number;
      responseTimeWarning: number;
      responseTimeCritical: number;
    };
  };
  checkInterval: number;        // Default: 2 minutes
  notificationsEnabled: boolean; // Default: true
  alertThrottleMs: number;      // Default: 5 minutes
}
```

### Operational Health Monitor (`src/monitoring/operational-health-monitor.ts`)

Monitors OAuth token health and API operational status.

**Features:**
- OAuth token expiration monitoring
- API usage pattern analysis
- Health status reporting
- Integration with Enhanced Slack Notifier

### Enhanced Slack Notifier (`src/integrations/enhanced-slack-notifier.ts`)

Sends structured alerts and notifications to Slack channels.

**Features:**
- Budget alerts with usage details
- System health alerts with severity levels
- Structured message formatting
- Error handling and retry logic

## Health API Endpoints

### GET /api/health
Basic health check endpoint returning overall system status.

**Response:**
```json
{
  "status": "healthy|warning|critical",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### GET /api/health/detailed
Comprehensive health status with component details.

**Response:**
```json
{
  "timestamp": 1640995200000,
  "isHealthy": true,
  "overall": "healthy",
  "components": {
    "tokens": { "linearToken": {...}, "confluenceToken": {...} },
    "apis": { "linear": {...}, "confluence": {...} },
    "resources": { "memory": {...}, "disk": {...}, "database": {...} },
    "operations": { "sync": {...}, "planning": {...}, "webhooks": {...} }
  }
}
```

### GET /api/health/metrics
Health metrics for trending and analysis.

### GET /api/health/dashboard
Dashboard-friendly health data with summaries.

### GET /api/health/config
Current health monitoring configuration.

### POST /api/health/start
Start health monitoring.

### POST /api/health/stop
Stop health monitoring.

## Usage

### Starting Health Monitoring

```typescript
import { HealthMonitor } from './src/monitoring/health-monitor';

const healthMonitor = new HealthMonitor({
  environment: 'production',
  notificationsEnabled: true,
  checkIntervalMs: 120000 // 2 minutes
});

await healthMonitor.startMonitoring();
```

### Budget Monitoring

```typescript
import { BudgetMonitor } from './src/monitoring/budget-monitor';

const budgetMonitor = new BudgetMonitor();

// Record API usage
budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);

// Get budget status
const dailyUsage = budgetMonitor.getBudgetUsage('daily');
console.log(`API Usage: ${dailyUsage.apiUsage.linear.usagePercentage}%`);
```

### Resource Monitoring

```typescript
import { ResourceMonitor } from './src/monitoring/resource-monitor';

const resourceMonitor = new ResourceMonitor({
  thresholds: {
    memory: { warning: 85, critical: 95 },
    disk: { warning: 90, critical: 95 }
  }
});

resourceMonitor.start();

// Check resource health
const resourceHealth = await resourceMonitor.performResourceCheck();
console.log(`Memory usage: ${resourceHealth.memory.usagePercentage}%`);
```

## Configuration

### Environment Variables

```bash
# Health monitoring
HEALTH_NOTIFICATIONS_ENABLED=true
HEALTH_CHECK_INTERVAL_MS=120000
HEALTH_ALERT_THROTTLE_MS=300000

# Budget monitoring
BUDGET_TRACKING_ENABLED=true
LINEAR_DAILY_LIMIT=1000
CONFLUENCE_DAILY_LIMIT=500

# Resource monitoring
MEMORY_WARNING_THRESHOLD=85
DISK_WARNING_THRESHOLD=90
DB_CONNECTION_WARNING_THRESHOLD=80
```

## Testing

The health monitoring system includes comprehensive tests:

```bash
# Run all health monitoring tests
npm test -- --testPathPattern="health|budget|resource|operational"

# Run specific component tests
npm test -- tests/health-monitor.test.ts
npm test -- tests/budget-monitor.test.ts
npm test -- tests/resource-monitor.test.ts

# Run integration tests
npm test -- tests/system-health-integration.test.ts
npm test -- tests/health-api.test.ts
```

## Monitoring and Alerts

### Alert Types

1. **Budget Alerts**: Triggered when API usage exceeds thresholds
2. **Resource Alerts**: Triggered when system resources are under pressure
3. **Health Alerts**: Triggered when system components are unhealthy
4. **Token Alerts**: Triggered when OAuth tokens are expiring

### Alert Throttling

All alerts are throttled to prevent spam:
- Default throttle period: 5 minutes
- Configurable per component
- Alerts include throttling status

### Slack Integration

Alerts are sent to Slack with structured formatting:
- Color-coded by severity (green/yellow/red)
- Detailed context and action items
- Links to relevant dashboards

## Performance Considerations

- Health checks are designed to complete within 1 second
- Memory usage is optimized with data retention limits
- Database queries are lightweight and non-blocking
- Alert throttling prevents notification spam

## Troubleshooting

### Common Issues

1. **High Memory Usage Alerts**: Check for memory leaks in application code
2. **Database Connection Alerts**: Verify database connectivity and pool configuration
3. **API Budget Alerts**: Review API usage patterns and optimize calls
4. **Token Expiration Alerts**: Ensure OAuth refresh tokens are working

### Debug Mode

Enable debug logging for detailed monitoring information:

```bash
DEBUG=health-monitor,budget-monitor,resource-monitor npm start
```

## Future Enhancements

- [ ] Integration with external monitoring services (DataDog, New Relic)
- [ ] Custom metric collection and alerting
- [ ] Historical trend analysis and reporting
- [ ] Automated scaling recommendations
- [ ] Integration with CI/CD pipelines for deployment health checks
