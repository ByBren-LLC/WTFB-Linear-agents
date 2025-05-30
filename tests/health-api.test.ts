/**
 * Tests for Health API Endpoints
 */
import request from 'supertest';
import express from 'express';
import healthRoutes, { setHealthComponents } from '../src/api/health';
import { HealthMonitor } from '../src/monitoring/health-monitor';
import { BudgetMonitor } from '../src/monitoring/budget-monitor';
import { OperationalNotificationCoordinator } from '../src/utils/operational-notification-coordinator';

// Mock dependencies
jest.mock('../src/monitoring/health-monitor');
jest.mock('../src/monitoring/budget-monitor');
jest.mock('../src/utils/operational-notification-coordinator');
jest.mock('../src/utils/logger');

// Mock the module constructors
const MockHealthMonitor = jest.mocked(HealthMonitor);
const MockBudgetMonitor = jest.mocked(BudgetMonitor);

describe('Health API Endpoints', () => {
  let app: express.Application;
  let mockHealthMonitor: jest.Mocked<HealthMonitor>;
  let mockBudgetMonitor: jest.Mocked<BudgetMonitor>;
  let mockCoordinator: jest.Mocked<OperationalNotificationCoordinator>;

  beforeEach(() => {
    // Create Express app with health routes
    app = express();
    app.use(express.json());
    app.use('/api/health', healthRoutes);

    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockHealthMonitor = {
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      performHealthCheck: jest.fn(),
      getHealthStatus: jest.fn(),
      getHealthMetrics: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn()
    } as any;

    mockBudgetMonitor = {
      getBudgetUsage: jest.fn(),
      getAPIUsageStats: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
      recordAPIUsage: jest.fn(),
      clearHistory: jest.fn()
    } as any;

    mockCoordinator = {
      getHealthStatus: jest.fn(),
      getCoordinatorStats: jest.fn(),
      getInstance: jest.fn()
    } as any;

    // Mock the constructors
    MockHealthMonitor.mockImplementation(() => mockHealthMonitor);
    MockBudgetMonitor.mockImplementation(() => mockBudgetMonitor);

    // Set the health components for the API
    setHealthComponents(mockHealthMonitor, mockBudgetMonitor, mockCoordinator);

    // Mock static methods
    (OperationalNotificationCoordinator.getInstance as jest.Mock).mockReturnValue(mockCoordinator);
    (OperationalNotificationCoordinator.createDefaultConfig as jest.Mock).mockReturnValue({
      environment: 'development',
      healthMonitoring: { enabled: true }
    });

    // Setup default mock responses
    mockCoordinator.getHealthStatus.mockReturnValue({
      overall: 'healthy',
      components: [],
      lastUpdated: Date.now()
    });

    mockCoordinator.getCoordinatorStats.mockReturnValue({
      environment: 'development',
      healthMonitoringEnabled: true,
      isInitialized: true,
      healthStatus: { overall: 'healthy' },
      slackConfig: {
        channels: {
          planning: 'test-planning',
          health: 'test-health',
          sync: 'test-sync',
          workflow: 'test-workflow',
          errors: 'test-errors',
          agent: 'test-agent'
        },
        thresholds: {
          tokenExpirationWarningDays: 7,
          apiUsageWarningPercentage: 80,
          memoryUsageWarningPercentage: 85,
          diskUsageWarningPercentage: 90
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
          intervalMs: 60000,
          maxNotificationsPerInterval: 10,
          criticalBypassThrottle: true
        }
      }
    });

    mockHealthMonitor.getHealthStatus.mockResolvedValue({
      timestamp: Date.now(),
      isHealthy: true,
      overall: 'healthy',
      components: {
        tokens: {
          linearToken: {
            expiresAt: new Date(),
            daysUntilExpiration: 30,
            isHealthy: true,
            lastRefresh: new Date(),
            hasRefreshToken: true
          },
          confluenceToken: {
            expiresAt: new Date(),
            daysUntilExpiration: 30,
            isHealthy: true,
            lastRefresh: new Date(),
            hasRefreshToken: true
          },
          overall: 'healthy'
        },
        apis: {
          linear: {
            remainingCalls: 800,
            totalCalls: 1000,
            resetTime: new Date(),
            usagePercentage: 20,
            isHealthy: true,
            responseTime: 150
          },
          confluence: {
            remainingCalls: 900,
            totalCalls: 1000,
            resetTime: new Date(),
            usagePercentage: 10,
            isHealthy: true,
            responseTime: 200
          },
          overall: 'healthy'
        },
        resources: {
          memory: {
            usedMB: 512,
            totalMB: 2048,
            usagePercentage: 25,
            isHealthy: true,
            heapUsed: 256,
            heapTotal: 512
          },
          disk: {
            usedGB: 30,
            totalGB: 100,
            usagePercentage: 30,
            isHealthy: true,
            availableGB: 70
          },
          database: {
            connectionCount: 5,
            maxConnections: 20,
            responseTime: 50,
            isHealthy: true,
            poolUtilization: 25
          },
          overall: 'healthy'
        },
        operations: {
          sync: {
            lastSuccessfulSync: new Date(),
            minutesSinceLastSync: 5,
            isHealthy: true,
            errorRate: 0.02
          },
          planning: {
            lastSuccessfulPlanning: new Date(),
            minutesSinceLastPlanning: 30,
            isHealthy: true,
            successRate: 0.95
          },
          webhooks: {
            queueSize: 2,
            processingRate: 10,
            isHealthy: true,
            errorRate: 0.01
          },
          overall: 'healthy'
        }
      },
      alerts: []
    });

    mockBudgetMonitor.getBudgetUsage.mockReturnValue({
      period: 'daily',
      startDate: new Date(),
      endDate: new Date(),
      apiUsage: {
        linear: {
          calls: 100,
          limit: 1000,
          usagePercentage: 10,
          estimatedCost: 0.1
        },
        confluence: {
          calls: 50,
          limit: 500,
          usagePercentage: 10,
          estimatedCost: 0.1
        }
      },
      resourceUsage: {
        memory: {
          averageUsageMB: 512,
          peakUsageMB: 600,
          limit: 2048,
          usagePercentage: 30
        },
        disk: {
          averageUsageGB: 25,
          peakUsageGB: 30,
          limit: 100,
          usagePercentage: 30
        }
      },
      totalEstimatedCost: 0.2,
      isOverBudget: false
    });

    mockBudgetMonitor.getAPIUsageStats.mockReturnValue({
      totalCalls: 150,
      successRate: 95,
      averageResponseTime: 175,
      costToday: 0.2,
      costThisMonth: 5.0
    });

    mockHealthMonitor.getHealthMetrics.mockReturnValue([
      {
        component: 'memory',
        metric: 'usage_percentage',
        value: 25,
        unit: 'percent',
        timestamp: new Date()
      }
    ]);

    mockHealthMonitor.getConfig.mockReturnValue({
      checkIntervalMs: 300000,
      tokenExpirationWarningDays: 7,
      apiUsageWarningPercentage: 80,
      memoryUsageWarningPercentage: 85,
      diskUsageWarningPercentage: 90,
      dbConnectionWarningPercentage: 80,
      alertThrottleMs: 3600000,
      notificationsEnabled: true,
      environment: 'development'
    });

    mockBudgetMonitor.getConfig.mockReturnValue({
      apiLimits: {
        linear: { dailyLimit: 1000, monthlyLimit: 30000, warningThreshold: 80 },
        confluence: { dailyLimit: 500, monthlyLimit: 15000, warningThreshold: 80 }
      },
      resourceLimits: {
        memory: { maxUsageMB: 2048, warningThreshold: 85 },
        disk: { maxUsageGB: 100, warningThreshold: 90 }
      },
      costTracking: {
        enabled: true,
        currency: 'USD',
        apiCosts: { linearCostPerCall: 0.001, confluenceCostPerCall: 0.002 }
      }
    });
  });

  describe('GET /api/health', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('components');
      expect(response.body.components).toHaveProperty('api');
      expect(response.body.components).toHaveProperty('database');
      expect(response.body.components).toHaveProperty('notifications');
    });

    it('should return warning status when system is degraded', async () => {
      mockCoordinator.getHealthStatus.mockReturnValue({
        overall: 'warning',
        components: ['memory-warning'],
        lastUpdated: Date.now()
      });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('warning');
    });

    it('should return critical status with 503 when system is critical', async () => {
      mockCoordinator.getHealthStatus.mockReturnValue({
        overall: 'critical',
        components: ['database-critical'],
        lastUpdated: Date.now()
      });

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body.status).toBe('critical');
    });

    it('should handle errors gracefully', async () => {
      mockCoordinator.getHealthStatus.mockImplementation(() => {
        throw new Error('Health check error');
      });

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'critical');
      expect(response.body).toHaveProperty('error', 'Health check failed');
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed health status', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('components');
      expect(response.body.components).toHaveProperty('tokens');
      expect(response.body.components).toHaveProperty('apis');
      expect(response.body.components).toHaveProperty('resources');
      expect(response.body.components).toHaveProperty('operations');
      expect(response.body).toHaveProperty('budget');
      expect(response.body).toHaveProperty('alerts');
    });

    it('should include token details', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body.components.tokens.details).toHaveProperty('linear');
      expect(response.body.components.tokens.details).toHaveProperty('confluence');
      expect(response.body.components.tokens.details.linear).toHaveProperty('expiresAt');
      expect(response.body.components.tokens.details.linear).toHaveProperty('daysUntilExpiration');
      expect(response.body.components.tokens.details.linear).toHaveProperty('isHealthy');
    });

    it('should include API details with statistics', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body.components.apis.details).toHaveProperty('linear');
      expect(response.body.components.apis.details).toHaveProperty('confluence');
      expect(response.body.components.apis.details).toHaveProperty('statistics');
      expect(response.body.components.apis.details.statistics).toHaveProperty('totalCalls');
      expect(response.body.components.apis.details.statistics).toHaveProperty('successRate');
    });

    it('should include resource details', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body.components.resources.details).toHaveProperty('memory');
      expect(response.body.components.resources.details).toHaveProperty('disk');
      expect(response.body.components.resources.details).toHaveProperty('database');
      expect(response.body.components.resources.details.memory).toHaveProperty('usagePercentage');
      expect(response.body.components.resources.details.memory).toHaveProperty('usedMB');
      expect(response.body.components.resources.details.memory).toHaveProperty('totalMB');
    });

    it('should handle errors in detailed health check', async () => {
      mockHealthMonitor.getHealthStatus.mockRejectedValue(new Error('Detailed check error'));

      const response = await request(app)
        .get('/api/health/detailed')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'critical');
      expect(response.body).toHaveProperty('error', 'Detailed health check failed');
    });
  });

  describe('GET /api/health/metrics', () => {
    it('should return health metrics', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('health');
      expect(response.body.metrics).toHaveProperty('api');
      expect(response.body.metrics).toHaveProperty('budget');
      expect(response.body.metrics.budget).toHaveProperty('daily');
      expect(response.body.metrics.budget).toHaveProperty('monthly');
    });

    it('should handle errors in metrics retrieval', async () => {
      mockHealthMonitor.getHealthMetrics.mockImplementation(() => {
        throw new Error('Metrics error');
      });

      const response = await request(app)
        .get('/api/health/metrics')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to retrieve health metrics');
    });
  });

  describe('GET /api/health/dashboard', () => {
    it('should return dashboard-friendly health data', async () => {
      const response = await request(app)
        .get('/api/health/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('components');
      expect(response.body).toHaveProperty('budget');
      expect(response.body).toHaveProperty('notifications');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body.overall).toHaveProperty('status');
      expect(response.body.overall).toHaveProperty('isHealthy');
      expect(response.body.overall).toHaveProperty('uptime');
    });

    it('should include component status summaries', async () => {
      const response = await request(app)
        .get('/api/health/dashboard')
        .expect(200);

      expect(response.body.components).toHaveProperty('tokens');
      expect(response.body.components).toHaveProperty('apis');
      expect(response.body.components).toHaveProperty('resources');
      expect(response.body.components).toHaveProperty('operations');
      expect(response.body.components.tokens).toHaveProperty('linear');
      expect(response.body.components.tokens).toHaveProperty('confluence');
    });
  });

  describe('GET /api/health/config', () => {
    it('should return health monitoring configuration', async () => {
      const response = await request(app)
        .get('/api/health/config')
        .expect(200);

      expect(response.body).toHaveProperty('health');
      expect(response.body).toHaveProperty('budget');
      expect(response.body).toHaveProperty('coordinator');
      expect(response.body.health).toHaveProperty('checkIntervalMs');
      expect(response.body.health).toHaveProperty('notificationsEnabled');
      expect(response.body.budget).toHaveProperty('apiLimits');
      expect(response.body.budget).toHaveProperty('costTracking');
    });
  });

  describe('POST /api/health/start', () => {
    it('should start health monitoring', async () => {
      mockHealthMonitor.startMonitoring.mockResolvedValue();

      const response = await request(app)
        .post('/api/health/start')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Health monitoring started successfully');
      expect(response.body).toHaveProperty('timestamp');
      expect(mockHealthMonitor.startMonitoring).toHaveBeenCalled();
    });

    it('should handle errors when starting monitoring', async () => {
      mockHealthMonitor.startMonitoring.mockRejectedValue(new Error('Start error'));

      const response = await request(app)
        .post('/api/health/start')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to start health monitoring');
    });
  });

  describe('POST /api/health/stop', () => {
    it('should stop health monitoring', async () => {
      mockHealthMonitor.stopMonitoring.mockResolvedValue();

      const response = await request(app)
        .post('/api/health/stop')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Health monitoring stopped successfully');
      expect(response.body).toHaveProperty('timestamp');
      expect(mockHealthMonitor.stopMonitoring).toHaveBeenCalled();
    });

    it('should handle errors when stopping monitoring', async () => {
      mockHealthMonitor.stopMonitoring.mockRejectedValue(new Error('Stop error'));

      const response = await request(app)
        .post('/api/health/stop')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to stop health monitoring');
    });
  });
});
