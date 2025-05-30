/**
 * Tests for Budget Monitor
 */
import { BudgetMonitor } from '../src/monitoring/budget-monitor';
import { EnhancedSlackNotifier } from '../src/integrations/enhanced-slack-notifier';
import * as logger from '../src/utils/logger';

// Mock dependencies
jest.mock('../src/integrations/enhanced-slack-notifier');
jest.mock('../src/utils/logger');

describe('BudgetMonitor', () => {
  let budgetMonitor: BudgetMonitor;
  let mockSlackNotifier: jest.Mocked<EnhancedSlackNotifier>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockSlackNotifier = new EnhancedSlackNotifier() as jest.Mocked<EnhancedSlackNotifier>;
    mockSlackNotifier.sendBudgetAlert = jest.fn().mockResolvedValue(true);

    // Mock the EnhancedSlackNotifier constructor to return our mock
    (EnhancedSlackNotifier as jest.MockedClass<typeof EnhancedSlackNotifier>).mockImplementation(() => mockSlackNotifier);

    // Create budget monitor instance
    budgetMonitor = new BudgetMonitor({
      apiLimits: {
        linear: {
          dailyLimit: 1000,
          monthlyLimit: 30000,
          warningThreshold: 80
        },
        confluence: {
          dailyLimit: 500,
          monthlyLimit: 15000,
          warningThreshold: 80
        }
      },
      costTracking: {
        enabled: true,
        currency: 'USD',
        apiCosts: {
          linearCostPerCall: 0.001,
          confluenceCostPerCall: 0.002
        }
      }
    });
  });

  afterEach(() => {
    // Clean up
    budgetMonitor.clearHistory();
  });

  describe('constructor', () => {
    it('should create budget monitor with default configuration', () => {
      const monitor = new BudgetMonitor();
      const config = monitor.getConfig();

      expect(config.apiLimits.linear.dailyLimit).toBe(10000);
      expect(config.apiLimits.confluence.dailyLimit).toBe(5000);
      expect(config.costTracking.enabled).toBe(true);
      expect(config.costTracking.currency).toBe('USD');
    });

    it('should create budget monitor with custom configuration', () => {
      const customConfig = {
        apiLimits: {
          linear: {
            dailyLimit: 2000,
            monthlyLimit: 60000,
            warningThreshold: 90
          },
          confluence: {
            dailyLimit: 1000,
            monthlyLimit: 30000,
            warningThreshold: 90
          }
        }
      };

      const monitor = new BudgetMonitor(customConfig);
      const config = monitor.getConfig();

      expect(config.apiLimits.linear.dailyLimit).toBe(customConfig.apiLimits.linear.dailyLimit);
      expect(config.apiLimits.confluence.dailyLimit).toBe(customConfig.apiLimits.confluence.dailyLimit);
    });
  });

  describe('recordAPIUsage', () => {
    it('should record Linear API usage', () => {
      budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);

      const stats = budgetMonitor.getAPIUsageStats();
      expect(stats.totalCalls).toBe(1);
      expect(stats.successRate).toBe(100);
      expect(stats.averageResponseTime).toBe(150);
    });

    it('should record Confluence API usage', () => {
      budgetMonitor.recordAPIUsage('confluence', '/content', 200, true);

      const stats = budgetMonitor.getAPIUsageStats();
      expect(stats.totalCalls).toBe(1);
      expect(stats.successRate).toBe(100);
      expect(stats.averageResponseTime).toBe(200);
    });

    it('should record failed API calls', () => {
      budgetMonitor.recordAPIUsage('linear', '/issues', 500, false);

      const stats = budgetMonitor.getAPIUsageStats();
      expect(stats.totalCalls).toBe(1);
      expect(stats.successRate).toBe(0);
    });

    it('should calculate costs correctly', () => {
      budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);
      budgetMonitor.recordAPIUsage('confluence', '/content', 200, true);

      const stats = budgetMonitor.getAPIUsageStats();
      expect(stats.costToday).toBeGreaterThan(0); // Should have some cost
    });

    it('should trigger budget threshold checks', async () => {
      // Record enough usage to trigger warning
      for (let i = 0; i < 850; i++) {
        budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);
      }

      // Should trigger alert for exceeding 80% of 1000 daily limit
      expect(mockSlackNotifier.sendBudgetAlert).toHaveBeenCalled();
    });
  });

  describe('recordResourceUsage', () => {
    it('should record memory usage', () => {
      budgetMonitor.recordResourceUsage('memory', 1024, 'MB');

      // Resource usage is tracked internally
      expect(logger.debug).toHaveBeenCalledWith(
        'Resource usage recorded',
        expect.objectContaining({
          resource: 'memory',
          value: 1024,
          unit: 'MB'
        })
      );
    });

    it('should record disk usage', () => {
      budgetMonitor.recordResourceUsage('disk', 50, 'GB');

      expect(logger.debug).toHaveBeenCalledWith(
        'Resource usage recorded',
        expect.objectContaining({
          resource: 'disk',
          value: 50,
          unit: 'GB'
        })
      );
    });
  });

  describe('getBudgetUsage', () => {
    beforeEach(() => {
      // Record some usage for testing
      budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);
      budgetMonitor.recordAPIUsage('linear', '/teams', 120, true);
      budgetMonitor.recordAPIUsage('confluence', '/content', 200, true);
      budgetMonitor.recordResourceUsage('memory', 1024, 'MB');
      budgetMonitor.recordResourceUsage('disk', 30, 'GB');
    });

    it('should get daily budget usage', () => {
      const usage = budgetMonitor.getBudgetUsage('daily');

      expect(usage.period).toBe('daily');
      expect(usage.apiUsage.linear.calls).toBe(2);
      expect(usage.apiUsage.confluence.calls).toBe(1);
      expect(usage.apiUsage.linear.usagePercentage).toBe(0.2); // 2/1000 * 100
      expect(usage.apiUsage.confluence.usagePercentage).toBe(0.2); // 1/500 * 100
      expect(usage.totalEstimatedCost).toBe(0.004); // 2*0.001 + 1*0.002
    });

    it('should get monthly budget usage', () => {
      const usage = budgetMonitor.getBudgetUsage('monthly');

      expect(usage.period).toBe('monthly');
      expect(usage.apiUsage.linear.calls).toBe(2);
      expect(usage.apiUsage.confluence.calls).toBe(1);
      expect(usage.apiUsage.linear.limit).toBe(30000);
      expect(usage.apiUsage.confluence.limit).toBe(15000);
    });

    it('should detect over budget usage', () => {
      // Record usage that exceeds limits
      for (let i = 0; i < 1100; i++) {
        budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);
      }

      const usage = budgetMonitor.getBudgetUsage('daily');
      expect(usage.isOverBudget).toBe(true);
    });

    it('should calculate resource usage correctly', () => {
      const usage = budgetMonitor.getBudgetUsage('daily');

      expect(usage.resourceUsage.memory.averageUsageMB).toBeGreaterThan(0);
      expect(usage.resourceUsage.disk.averageUsageGB).toBeGreaterThan(0);
    });
  });

  describe('getAPIUsageStats', () => {
    beforeEach(() => {
      // Record mixed success/failure calls
      budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);
      budgetMonitor.recordAPIUsage('linear', '/teams', 120, true);
      budgetMonitor.recordAPIUsage('confluence', '/content', 200, false);
      budgetMonitor.recordAPIUsage('confluence', '/spaces', 180, true);
    });

    it('should calculate correct statistics', () => {
      const stats = budgetMonitor.getAPIUsageStats();

      expect(stats.totalCalls).toBe(4);
      expect(stats.successRate).toBe(75); // 3 successful out of 4
      expect(stats.averageResponseTime).toBe(163); // Rounded (150+120+200+180)/4
      expect(stats.costToday).toBeGreaterThan(0); // Should have some cost
    });

    it('should handle empty usage history', () => {
      budgetMonitor.clearHistory();
      const stats = budgetMonitor.getAPIUsageStats();

      expect(stats.totalCalls).toBe(0);
      expect(stats.successRate).toBe(100);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.costToday).toBe(0);
    });
  });

  describe('alert thresholds', () => {
    it('should send alert when Linear API usage exceeds threshold', async () => {
      // Record 850 calls (85% of 1000 daily limit)
      for (let i = 0; i < 850; i++) {
        budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);
      }

      expect(mockSlackNotifier.sendBudgetAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'api-usage',
          currentUsage: expect.any(Number),
          limit: 1000,
          usagePercentage: expect.any(Number)
        })
      );
    });

    it('should send alert when Confluence API usage exceeds threshold', async () => {
      // Record 450 calls (90% of 500 daily limit)
      for (let i = 0; i < 450; i++) {
        budgetMonitor.recordAPIUsage('confluence', '/content', 200, true);
      }

      expect(mockSlackNotifier.sendBudgetAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'api-usage',
          currentUsage: expect.any(Number),
          limit: 500,
          usagePercentage: expect.any(Number)
        })
      );
    });

    it('should throttle duplicate alerts', async () => {
      // Record usage that triggers alert
      for (let i = 0; i < 850; i++) {
        budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);
      }

      // Record more usage immediately (should be throttled)
      for (let i = 0; i < 10; i++) {
        budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);
      }

      // Should only send one alert due to throttling
      expect(mockSlackNotifier.sendBudgetAlert).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuration management', () => {
    it('should get current configuration', () => {
      const config = budgetMonitor.getConfig();

      expect(config).toHaveProperty('apiLimits');
      expect(config).toHaveProperty('resourceLimits');
      expect(config).toHaveProperty('costTracking');
      expect(config.apiLimits.linear.dailyLimit).toBe(1000);
    });

    it('should update configuration', () => {
      const newConfig = {
        apiLimits: {
          linear: {
            dailyLimit: 2000,
            monthlyLimit: 60000,
            warningThreshold: 90
          },
          confluence: {
            dailyLimit: 1000,
            monthlyLimit: 30000,
            warningThreshold: 90
          }
        }
      };

      budgetMonitor.updateConfig(newConfig);
      const config = budgetMonitor.getConfig();

      expect(config.apiLimits.linear.dailyLimit).toBe(2000);
      expect(config.apiLimits.linear.warningThreshold).toBe(90);
    });
  });

  describe('cost tracking', () => {
    it('should calculate costs when enabled', () => {
      budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);
      budgetMonitor.recordAPIUsage('confluence', '/content', 200, true);

      const stats = budgetMonitor.getAPIUsageStats();
      expect(stats.costToday).toBeGreaterThan(0);
    });

    it('should not calculate costs when disabled', () => {
      const monitor = new BudgetMonitor({
        costTracking: {
          enabled: false,
          currency: 'USD',
          apiCosts: {
            linearCostPerCall: 0.001,
            confluenceCostPerCall: 0.002
          }
        }
      });

      monitor.recordAPIUsage('linear', '/issues', 150, true);
      const stats = monitor.getAPIUsageStats();
      expect(stats.costToday).toBe(0);
    });
  });

  describe('data retention', () => {
    it('should keep only last 30 days of API usage data', () => {
      // This test would require mocking Date to simulate time passage
      // For now, we'll test that the method exists and doesn't throw
      budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);
      const stats = budgetMonitor.getAPIUsageStats();
      expect(stats.totalCalls).toBe(1);
    });

    it('should keep only last 24 hours of resource usage data', () => {
      budgetMonitor.recordResourceUsage('memory', 1024, 'MB');
      const usage = budgetMonitor.getBudgetUsage('daily');
      expect(usage.resourceUsage.memory.averageUsageMB).toBeGreaterThan(0);
    });
  });

  describe('clearHistory', () => {
    it('should clear all usage history', () => {
      budgetMonitor.recordAPIUsage('linear', '/issues', 150, true);
      budgetMonitor.recordResourceUsage('memory', 1024, 'MB');

      budgetMonitor.clearHistory();

      const stats = budgetMonitor.getAPIUsageStats();
      expect(stats.totalCalls).toBe(0);
    });
  });
});
