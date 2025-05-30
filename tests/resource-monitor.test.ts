/**
 * Tests for Resource Monitor
 */
import { ResourceMonitor } from '../src/monitoring/resource-monitor';
import { EnhancedSlackNotifier } from '../src/integrations/enhanced-slack-notifier';
import * as logger from '../src/utils/logger';

// Mock dependencies
jest.mock('../src/integrations/enhanced-slack-notifier');
jest.mock('../src/utils/logger');
jest.mock('../src/db/connection');

describe('ResourceMonitor', () => {
  let resourceMonitor: ResourceMonitor;
  let mockSlackNotifier: jest.Mocked<EnhancedSlackNotifier>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockSlackNotifier = new EnhancedSlackNotifier() as jest.Mocked<EnhancedSlackNotifier>;
    mockSlackNotifier.sendSystemHealthAlert = jest.fn().mockResolvedValue(true);
    
    // Mock the EnhancedSlackNotifier constructor to return our mock
    (EnhancedSlackNotifier as jest.MockedClass<typeof EnhancedSlackNotifier>).mockImplementation(() => mockSlackNotifier);

    // Mock database connection
    const mockGetClient = require('../src/db/connection').getClient;
    mockGetClient.mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] })
    });

    // Create resource monitor instance
    resourceMonitor = new ResourceMonitor({
      thresholds: {
        memory: { warning: 85, critical: 95 },
        disk: { warning: 90, critical: 95 },
        database: { connectionWarning: 80, connectionCritical: 95, responseTimeWarning: 1000, responseTimeCritical: 5000 }
      },
      checkInterval: 1000, // 1 second for testing
      notificationsEnabled: true,
      alertThrottleMs: 1000 // 1 second for testing
    });
  });

  afterEach(() => {
    // Clean up
    resourceMonitor.stop();
  });

  describe('constructor', () => {
    it('should create resource monitor with default configuration', () => {
      const monitor = new ResourceMonitor();
      const config = monitor.getConfig();

      expect(config.thresholds.memory.warning).toBe(85);
      expect(config.thresholds.disk.warning).toBe(90);
      expect(config.thresholds.database.connectionWarning).toBe(80);
      expect(config.checkInterval).toBe(2 * 60 * 1000); // 2 minutes
      expect(config.notificationsEnabled).toBe(true);
    });

    it('should create resource monitor with custom configuration', () => {
      const customConfig = {
        thresholds: {
          memory: { warning: 90, critical: 98 },
          disk: { warning: 95, critical: 99 },
          database: { connectionWarning: 85, connectionCritical: 98, responseTimeWarning: 2000, responseTimeCritical: 10000 }
        },
        checkInterval: 5000,
        notificationsEnabled: false
      };

      const monitor = new ResourceMonitor(customConfig);
      const config = monitor.getConfig();

      expect(config.thresholds.memory.warning).toBe(customConfig.thresholds.memory.warning);
      expect(config.thresholds.disk.warning).toBe(customConfig.thresholds.disk.warning);
      expect(config.checkInterval).toBe(customConfig.checkInterval);
      expect(config.notificationsEnabled).toBe(customConfig.notificationsEnabled);
    });
  });

  describe('start and stop', () => {
    it('should start resource monitoring', () => {
      expect(resourceMonitor.isMonitoring()).toBe(false);
      
      resourceMonitor.start();
      expect(resourceMonitor.isMonitoring()).toBe(true);
      
      expect(logger.info).toHaveBeenCalledWith(
        'Starting resource monitoring',
        expect.objectContaining({
          checkInterval: 1000,
          notificationsEnabled: true
        })
      );
    });

    it('should stop resource monitoring', () => {
      resourceMonitor.start();
      expect(resourceMonitor.isMonitoring()).toBe(true);
      
      resourceMonitor.stop();
      expect(resourceMonitor.isMonitoring()).toBe(false);
      
      expect(logger.info).toHaveBeenCalledWith('Stopping resource monitoring');
    });

    it('should not start monitoring if already running', () => {
      resourceMonitor.start();
      resourceMonitor.start(); // Second call

      expect(logger.warn).toHaveBeenCalledWith('Resource monitoring is already running');
    });

    it('should handle stopping when not running', () => {
      resourceMonitor.stop();
      // Should not throw error
      expect(resourceMonitor.isMonitoring()).toBe(false);
    });
  });

  describe('performResourceCheck', () => {
    it('should perform comprehensive resource check', async () => {
      const resourceHealth = await resourceMonitor.performResourceCheck();

      expect(resourceHealth).toHaveProperty('memory');
      expect(resourceHealth).toHaveProperty('disk');
      expect(resourceHealth).toHaveProperty('database');
      expect(resourceHealth).toHaveProperty('overall');
      
      expect(resourceHealth.memory).toHaveProperty('usedMB');
      expect(resourceHealth.memory).toHaveProperty('totalMB');
      expect(resourceHealth.memory).toHaveProperty('usagePercentage');
      expect(resourceHealth.memory).toHaveProperty('isHealthy');
      
      expect(resourceHealth.disk).toHaveProperty('usedGB');
      expect(resourceHealth.disk).toHaveProperty('totalGB');
      expect(resourceHealth.disk).toHaveProperty('usagePercentage');
      expect(resourceHealth.disk).toHaveProperty('isHealthy');
      
      expect(resourceHealth.database).toHaveProperty('connectionCount');
      expect(resourceHealth.database).toHaveProperty('maxConnections');
      expect(resourceHealth.database).toHaveProperty('responseTime');
      expect(resourceHealth.database).toHaveProperty('isHealthy');
    });

    it('should handle database connection errors', async () => {
      const mockGetClient = require('../src/db/connection').getClient;
      mockGetClient.mockRejectedValue(new Error('Database connection error'));

      const resourceHealth = await resourceMonitor.performResourceCheck();

      expect(resourceHealth.database.connectionCount).toBe(0);
      expect(resourceHealth.database.responseTime).toBe(0);
      expect(resourceHealth.database.isHealthy).toBe(true); // Default healthy since poolUtilization is 0
    });

    it('should determine overall health correctly', async () => {
      const resourceHealth = await resourceMonitor.performResourceCheck();
      
      // With default healthy values, overall should be healthy
      expect(resourceHealth.overall).toBe('healthy');
    });
  });

  describe('getResourceHealth', () => {
    it('should return current resource health status', async () => {
      const resourceHealth = await resourceMonitor.getResourceHealth();

      expect(resourceHealth).toHaveProperty('memory');
      expect(resourceHealth).toHaveProperty('disk');
      expect(resourceHealth).toHaveProperty('database');
      expect(resourceHealth).toHaveProperty('overall');
    });
  });

  describe('configuration management', () => {
    it('should get current configuration', () => {
      const config = resourceMonitor.getConfig();

      expect(config).toHaveProperty('thresholds');
      expect(config).toHaveProperty('checkInterval');
      expect(config).toHaveProperty('notificationsEnabled');
      expect(config).toHaveProperty('alertThrottleMs');
      expect(config.thresholds).toHaveProperty('memory');
      expect(config.thresholds).toHaveProperty('disk');
      expect(config.thresholds).toHaveProperty('database');
    });

    it('should update configuration', () => {
      const newConfig = {
        thresholds: {
          memory: { warning: 90, critical: 98 },
          disk: { warning: 95, critical: 99 },
          database: { connectionWarning: 85, connectionCritical: 98, responseTimeWarning: 2000, responseTimeCritical: 10000 }
        },
        notificationsEnabled: false
      };

      resourceMonitor.updateConfig(newConfig);
      const config = resourceMonitor.getConfig();

      expect(config.thresholds.memory.warning).toBe(90);
      expect(config.thresholds.disk.warning).toBe(95);
      expect(config.notificationsEnabled).toBe(false);
    });
  });

  describe('alert processing', () => {
    it('should send memory alert when threshold exceeded', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 1.8 * 1024 * 1024 * 1024, // 1.8 GB
        heapTotal: 2 * 1024 * 1024 * 1024,  // 2 GB
        external: 0,
        arrayBuffers: 0,
        rss: 2 * 1024 * 1024 * 1024 // 2 GB
      });

      // Mock high system memory usage
      const os = require('os');
      os.totalmem = jest.fn().mockReturnValue(2 * 1024 * 1024 * 1024); // 2 GB
      os.freemem = jest.fn().mockReturnValue(0.1 * 1024 * 1024 * 1024); // 0.1 GB free (95% used)

      await resourceMonitor.performResourceCheck();

      expect(mockSlackNotifier.sendSystemHealthAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'system-memory',
          status: 'critical'
        })
      );

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should throttle duplicate alerts', async () => {
      // Mock high memory usage
      const os = require('os');
      os.totalmem = jest.fn().mockReturnValue(2 * 1024 * 1024 * 1024); // 2 GB
      os.freemem = jest.fn().mockReturnValue(0.1 * 1024 * 1024 * 1024); // 0.1 GB free (95% used)

      // Perform multiple checks quickly
      await resourceMonitor.performResourceCheck();
      await resourceMonitor.performResourceCheck();

      // Should only send one alert due to throttling
      expect(mockSlackNotifier.sendSystemHealthAlert).toHaveBeenCalledTimes(1);
    });

    it('should not send alerts when notifications disabled', async () => {
      const monitor = new ResourceMonitor({
        notificationsEnabled: false
      });

      // Mock high memory usage
      const os = require('os');
      os.totalmem = jest.fn().mockReturnValue(2 * 1024 * 1024 * 1024); // 2 GB
      os.freemem = jest.fn().mockReturnValue(0.1 * 1024 * 1024 * 1024); // 0.1 GB free (95% used)

      await monitor.performResourceCheck();

      expect(mockSlackNotifier.sendSystemHealthAlert).not.toHaveBeenCalled();
    });
  });

  describe('health status determination', () => {
    it('should return status for current system usage', async () => {
      const resourceHealth = await resourceMonitor.performResourceCheck();

      // Memory health depends on actual system memory usage
      expect(typeof resourceHealth.memory.isHealthy).toBe('boolean');
      expect(resourceHealth.disk.isHealthy).toBe(true); // Disk defaults to 30% usage
      expect(resourceHealth.database.isHealthy).toBe(true); // Database defaults to healthy
      expect(['healthy', 'warning', 'critical'].includes(resourceHealth.overall)).toBe(true);
    });

    it('should return warning status for high usage', async () => {
      // Mock memory usage at warning threshold (85%)
      const os = require('os');
      os.totalmem = jest.fn().mockReturnValue(2 * 1024 * 1024 * 1024); // 2 GB
      os.freemem = jest.fn().mockReturnValue(0.3 * 1024 * 1024 * 1024); // 0.3 GB free (85% used)

      const resourceHealth = await resourceMonitor.performResourceCheck();
      
      expect(resourceHealth.memory.isHealthy).toBe(false);
      expect(resourceHealth.overall).toBe('warning');
    });

    it('should return critical status for very high usage', async () => {
      // Mock memory usage at critical threshold (95%)
      const os = require('os');
      os.totalmem = jest.fn().mockReturnValue(2 * 1024 * 1024 * 1024); // 2 GB
      os.freemem = jest.fn().mockReturnValue(0.1 * 1024 * 1024 * 1024); // 0.1 GB free (95% used)

      const resourceHealth = await resourceMonitor.performResourceCheck();
      
      expect(resourceHealth.memory.isHealthy).toBe(false);
      expect(resourceHealth.overall).toBe('critical');
    });
  });

  describe('error handling', () => {
    it('should handle errors during resource check gracefully', async () => {
      // Mock an error in memory stats
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory stats error');
      });

      await expect(resourceMonitor.performResourceCheck()).rejects.toThrow('Memory stats error');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle database errors gracefully', async () => {
      const mockGetClient = require('../src/db/connection').getClient;
      mockGetClient.mockRejectedValue(new Error('Database error'));

      const resourceHealth = await resourceMonitor.performResourceCheck();
      
      // Should still return health status with database marked as healthy (poolUtilization is 0)
      expect(resourceHealth.database.isHealthy).toBe(true);
      expect(resourceHealth.database.connectionCount).toBe(0);
    });
  });
});
