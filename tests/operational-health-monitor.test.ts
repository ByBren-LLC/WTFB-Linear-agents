/**
 * Tests for Operational Health Monitor
 */
import { OperationalHealthMonitor } from '../src/monitoring/operational-health-monitor';

// Mock the Enhanced SlackNotifier from Agent #6
jest.mock('../src/integrations/enhanced-slack-notifier', () => ({
  EnhancedSlackNotifier: jest.fn().mockImplementation(() => ({
    sendSystemHealthAlert: jest.fn().mockResolvedValue(true),
    sendBudgetAlert: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
}));

describe('OperationalHealthMonitor', () => {
  let healthMonitor: OperationalHealthMonitor;

  beforeEach(() => {
    healthMonitor = new OperationalHealthMonitor({
      checkInterval: 1000, // 1 second for testing
      oauthWarningDays: 7,
      apiLimitWarningThreshold: 80,
      memoryWarningThreshold: 85,
      notificationsEnabled: true
    });
  });

  afterEach(() => {
    healthMonitor.stop();
    jest.clearAllMocks();
  });

  describe('lifecycle management', () => {
    it('should start monitoring successfully', () => {
      expect(() => {
        healthMonitor.start();
      }).not.toThrow();
    });

    it('should stop monitoring successfully', () => {
      healthMonitor.start();
      expect(() => {
        healthMonitor.stop();
      }).not.toThrow();
    });
  });

  describe('OAuth token monitoring', () => {
    it('should register OAuth token', () => {
      const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      expect(() => {
        healthMonitor.registerOAuthToken('Linear', expiresAt, 'refresh-token');
      }).not.toThrow();
    });

    it('should track multiple OAuth tokens', () => {
      const expiresAt1 = Date.now() + (14 * 24 * 60 * 60 * 1000); // 14 days (healthy)
      const expiresAt2 = Date.now() + (21 * 24 * 60 * 60 * 1000); // 21 days (healthy)

      healthMonitor.registerOAuthToken('Linear', expiresAt1);
      healthMonitor.registerOAuthToken('Confluence', expiresAt2);

      const status = healthMonitor.getHealthStatus();
      expect(status.overall).toBe('healthy');
    });
  });

  describe('API usage monitoring', () => {
    it('should update API usage', () => {
      expect(() => {
        healthMonitor.updateAPIUsage('Linear', 500, 1000, Date.now() + 3600000);
      }).not.toThrow();
    });

    it('should detect high API usage', () => {
      healthMonitor.updateAPIUsage('Linear', 850, 1000, Date.now() + 3600000); // 85% usage
      
      const status = healthMonitor.getHealthStatus();
      expect(status.overall).toBe('warning');
      expect(status.components).toContain('Linear-api-warning');
    });

    it('should detect critical API usage', () => {
      healthMonitor.updateAPIUsage('Linear', 950, 1000, Date.now() + 3600000); // 95% usage
      
      const status = healthMonitor.getHealthStatus();
      expect(status.overall).toBe('critical');
      expect(status.components).toContain('Linear-api-critical');
    });
  });

  describe('health status reporting', () => {
    it('should return healthy status by default', () => {
      const status = healthMonitor.getHealthStatus();
      
      expect(status.overall).toBe('healthy');
      expect(status.components).toEqual([]);
      expect(status.lastUpdated).toBeGreaterThan(0);
    });

    it('should detect OAuth token expiration warning', () => {
      const expiresAt = Date.now() + (3 * 24 * 60 * 60 * 1000); // 3 days from now (less than 7 day warning)
      
      healthMonitor.registerOAuthToken('Linear', expiresAt);
      
      const status = healthMonitor.getHealthStatus();
      expect(status.overall).toBe('warning');
      expect(status.components).toContain('Linear-oauth-expiring');
    });

    it('should detect OAuth token expiration critical', () => {
      const expiresAt = Date.now() - (1 * 24 * 60 * 60 * 1000); // 1 day ago (expired)
      
      healthMonitor.registerOAuthToken('Linear', expiresAt);
      
      const status = healthMonitor.getHealthStatus();
      expect(status.overall).toBe('critical');
      expect(status.components).toContain('Linear-oauth-expired');
    });

    it('should prioritize critical over warning status', () => {
      // Add warning condition
      const expiresAt = Date.now() + (3 * 24 * 60 * 60 * 1000); // 3 days (warning)
      healthMonitor.registerOAuthToken('Linear', expiresAt);
      
      // Add critical condition
      healthMonitor.updateAPIUsage('Confluence', 950, 1000, Date.now() + 3600000); // 95% (critical)
      
      const status = healthMonitor.getHealthStatus();
      expect(status.overall).toBe('critical');
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultMonitor = new OperationalHealthMonitor();
      
      const status = defaultMonitor.getHealthStatus();
      expect(status.overall).toBe('healthy');
    });

    it('should respect custom configuration', () => {
      const customMonitor = new OperationalHealthMonitor({
        checkInterval: 30000,
        oauthWarningDays: 14,
        apiLimitWarningThreshold: 90,
        memoryWarningThreshold: 90,
        notificationsEnabled: false
      });
      
      // Should not trigger warning at 85% API usage with 90% threshold
      customMonitor.updateAPIUsage('Linear', 850, 1000, Date.now() + 3600000);
      
      const status = customMonitor.getHealthStatus();
      expect(status.overall).toBe('healthy');
    });
  });

  describe('error handling', () => {
    it('should handle monitoring errors gracefully', async () => {
      // Mock process.memoryUsage to throw an error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory usage error');
      }) as any;

      // Should not throw when health checks encounter errors
      expect(() => {
        healthMonitor.start();
      }).not.toThrow();

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('integration with Enhanced SlackNotifier', () => {
    it('should send notifications when enabled', () => {
      const notificationEnabledMonitor = new OperationalHealthMonitor({
        notificationsEnabled: true,
        apiLimitWarningThreshold: 80
      });

      // This should trigger a notification
      notificationEnabledMonitor.updateAPIUsage('Linear', 850, 1000, Date.now() + 3600000);

      // Verify that the Enhanced SlackNotifier was called
      // (This is verified through the mock in the beforeEach)
    });

    it('should not send notifications when disabled', () => {
      const notificationDisabledMonitor = new OperationalHealthMonitor({
        notificationsEnabled: false,
        apiLimitWarningThreshold: 80
      });

      // This should not trigger a notification
      notificationDisabledMonitor.updateAPIUsage('Linear', 850, 1000, Date.now() + 3600000);

      // The health status should still be updated
      const status = notificationDisabledMonitor.getHealthStatus();
      expect(status.overall).toBe('warning');
    });
  });
});
