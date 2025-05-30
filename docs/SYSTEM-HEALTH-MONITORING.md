# System Health Monitoring with Slack Notifications

## Overview

The System Health Monitoring component provides comprehensive monitoring of the Linear Planning Agent system with proactive Slack notifications. This implementation extends the existing Enhanced SlackNotifier infrastructure to provide real-time health monitoring, budget tracking, and alerting capabilities.

## Architecture

### Core Components

1. **HealthMonitor** (`src/monitoring/health-monitor.ts`)
   - Comprehensive system health monitoring
   - OAuth token expiration tracking
   - API rate limit monitoring
   - System resource monitoring
   - Integration with Enhanced SlackNotifier

2. **BudgetMonitor** (`src/monitoring/budget-monitor.ts`)
   - API usage tracking and cost calculation
   - Resource usage monitoring
   - Budget threshold alerting
   - Historical usage analysis

3. **ResourceMonitor** (`src/monitoring/resource-monitor.ts`)
   - Detailed system resource monitoring
   - Memory, disk, and database monitoring
   - Performance metrics tracking
   - Resource threshold alerting

4. **Health API** (`src/api/health.ts`)
   - RESTful health check endpoints
   - Dashboard-friendly status reporting
   - Configuration management
   - Monitoring control endpoints

### Integration with Existing Infrastructure

The System Health Monitoring integrates seamlessly with:

- **Enhanced SlackNotifier** (Agent #6) - For notification delivery
- **OperationalNotificationCoordinator** (Agent #5) - For centralized notification management
- **OperationalHealthMonitor** (Agent #5) - For basic health monitoring foundation

## Features

### 1. OAuth Token Monitoring

- **Linear Token Tracking**: Monitors Linear API token expiration
- **Confluence Token Tracking**: Monitors Confluence API token expiration
- **Proactive Alerts**: Warns 7 days before token expiration
- **Refresh Token Management**: Tracks refresh token availability

### 2. API Rate Limit Monitoring

- **Usage Tracking**: Monitors API call usage against limits
- **Rate Limit Alerts**: Warns at 80% usage threshold
- **Response Time Monitoring**: Tracks API response performance
- **Service Health**: Monitors API service availability

### 3. System Resource Monitoring

- **Memory Usage**: Tracks heap and system memory usage
- **Disk Space**: Monitors disk usage and available space
- **Database Connections**: Tracks connection pool utilization
- **Performance Metrics**: Monitors response times and throughput

### 4. Budget Monitoring

- **API Cost Tracking**: Calculates costs for Linear and Confluence API calls
- **Usage Budgets**: Monitors daily and monthly usage limits
- **Cost Alerts**: Warns when approaching budget limits
- **Resource Budgets**: Tracks memory and disk usage budgets

### 5. Health Check Endpoints

- **Basic Health**: `/api/health` - Simple health status
- **Detailed Health**: `/api/health/detailed` - Comprehensive system status
- **Metrics**: `/api/health/metrics` - Historical metrics and trends
- **Dashboard**: `/api/health/dashboard` - Dashboard-friendly status
- **Configuration**: `/api/health/config` - Monitoring configuration

## Configuration

### Health Monitor Configuration

```typescript
interface HealthMonitorConfig {
  checkIntervalMs: number;              // 5 minutes default
  tokenExpirationWarningDays: number;   // 7 days default
  apiUsageWarningPercentage: number;    // 80% default
  memoryUsageWarningPercentage: number; // 85% default
  diskUsageWarningPercentage: number;   // 90% default
  dbConnectionWarningPercentage: number; // 80% default
  alertThrottleMs: number;              // 1 hour default
  notificationsEnabled: boolean;        // true default
  environment: string;                  // development/staging/production
}
```

### Budget Monitor Configuration

```typescript
interface BudgetConfig {
  apiLimits: {
    linear: {
      dailyLimit: number;     // 10,000 default
      monthlyLimit: number;   // 300,000 default
      warningThreshold: number; // 80% default
    };
    confluence: {
      dailyLimit: number;     // 5,000 default
      monthlyLimit: number;   // 150,000 default
      warningThreshold: number; // 80% default
    };
  };
  resourceLimits: {
    memory: {
      maxUsageMB: number;     // 2048 MB default
      warningThreshold: number; // 85% default
    };
    disk: {
      maxUsageGB: number;     // 100 GB default
      warningThreshold: number; // 90% default
    };
  };
  costTracking: {
    enabled: boolean;         // true default
    currency: string;         // 'USD' default
    apiCosts: {
      linearCostPerCall: number;    // $0.001 default
      confluenceCostPerCall: number; // $0.002 default
    };
  };
}
```

## Usage

### Starting Health Monitoring

```typescript
import { HealthMonitor } from './monitoring/health-monitor';

const healthMonitor = new HealthMonitor({
  environment: 'production',
  notificationsEnabled: true,
  checkIntervalMs: 5 * 60 * 1000 // 5 minutes
});

await healthMonitor.startMonitoring();
```

### Recording API Usage

```typescript
import { BudgetMonitor } from './monitoring/budget-monitor';

const budgetMonitor = new BudgetMonitor();

// Record Linear API call
budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);

// Record Confluence API call
budgetMonitor.recordAPIUsage('confluence', '/content', 200, true);
```

### Getting Health Status

```typescript
// Get comprehensive health status
const healthStatus = await healthMonitor.getHealthStatus();

// Get budget usage
const dailyUsage = budgetMonitor.getBudgetUsage('daily');
const monthlyUsage = budgetMonitor.getBudgetUsage('monthly');

// Get API usage statistics
const apiStats = budgetMonitor.getAPIUsageStats();
```

## API Endpoints

### GET /api/health

Basic health check endpoint returning simple status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "components": {
    "api": { "status": "healthy" },
    "database": { "status": "healthy" },
    "notifications": { "status": "healthy" }
  },
  "alerts": []
}
```

### GET /api/health/detailed

Comprehensive health status with detailed component information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "components": {
    "tokens": {
      "status": "healthy",
      "details": {
        "linear": {
          "expiresAt": "2024-02-15T10:30:00Z",
          "daysUntilExpiration": 30,
          "isHealthy": true
        },
        "confluence": {
          "expiresAt": "2024-02-15T10:30:00Z",
          "daysUntilExpiration": 30,
          "isHealthy": true
        }
      }
    },
    "apis": {
      "status": "healthy",
      "details": {
        "linear": {
          "usagePercentage": 20,
          "remainingCalls": 800,
          "responseTime": 150,
          "isHealthy": true
        },
        "confluence": {
          "usagePercentage": 10,
          "remainingCalls": 900,
          "responseTime": 200,
          "isHealthy": true
        }
      }
    },
    "resources": {
      "status": "healthy",
      "details": {
        "memory": {
          "usagePercentage": 25,
          "usedMB": 512,
          "totalMB": 2048,
          "isHealthy": true
        },
        "disk": {
          "usagePercentage": 30,
          "usedGB": 30,
          "totalGB": 100,
          "isHealthy": true
        }
      }
    }
  },
  "budget": {
    "period": "daily",
    "apiUsage": {
      "linear": {
        "calls": 100,
        "limit": 1000,
        "usagePercentage": 10,
        "estimatedCost": 0.1
      }
    },
    "totalEstimatedCost": 0.2,
    "isOverBudget": false
  }
}
```

### POST /api/health/start

Starts health monitoring.

### POST /api/health/stop

Stops health monitoring.

## Notification Types

The system sends various types of notifications through the Enhanced SlackNotifier:

### 1. System Health Alerts

- **OAuth Token Expiration**: Warns when tokens are expiring
- **API Rate Limits**: Alerts when approaching rate limits
- **Resource Usage**: Warns about high memory/disk usage
- **Database Issues**: Alerts about connection or performance issues

### 2. Budget Alerts

- **API Usage**: Warns when approaching daily/monthly limits
- **Cost Tracking**: Alerts about budget overruns
- **Resource Budgets**: Warns about resource usage limits

### 3. Operational Alerts

- **Sync Issues**: Alerts about synchronization problems
- **Planning Failures**: Warns about planning process issues
- **Webhook Problems**: Alerts about webhook processing issues

## Testing

The implementation includes comprehensive test suites:

- **HealthMonitor Tests** (`tests/health-monitor.test.ts`)
- **BudgetMonitor Tests** (`tests/budget-monitor.test.ts`)
- **Health API Tests** (`tests/health-api.test.ts`)

Run tests with:
```bash
npm test -- --testPathPattern="health|budget"
```

## Monitoring Best Practices

1. **Proactive Monitoring**: Set warning thresholds well before critical limits
2. **Alert Throttling**: Prevent notification spam with appropriate throttling
3. **Environment-Specific Configuration**: Use different thresholds for dev/staging/production
4. **Regular Review**: Periodically review and adjust monitoring thresholds
5. **Cost Awareness**: Monitor API usage costs to prevent budget overruns

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Check for memory leaks in application code
2. **API Rate Limits**: Implement exponential backoff and request queuing
3. **Token Expiration**: Ensure refresh token mechanisms are working
4. **Database Connection Issues**: Monitor connection pool settings

### Debugging

Enable debug logging:
```bash
DEBUG=health-monitor,budget-monitor npm start
```

Check health status:
```bash
curl http://localhost:3000/api/health/detailed
```

## Future Enhancements

1. **Metrics Storage**: Implement time-series database for historical metrics
2. **Alerting Rules**: Add configurable alerting rules and conditions
3. **Dashboard UI**: Create web-based monitoring dashboard
4. **Integration**: Add support for additional monitoring services
5. **Predictive Alerts**: Implement trend-based predictive alerting
