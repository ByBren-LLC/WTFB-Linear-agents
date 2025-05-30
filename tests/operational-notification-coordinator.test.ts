/**
 * Tests for Operational Notification Coordinator
 */
import { OperationalNotificationCoordinator } from '../src/utils/operational-notification-coordinator';

// Mock the Enhanced SlackNotifier from Agent #6
jest.mock('../src/integrations/enhanced-slack-notifier', () => ({
  EnhancedSlackNotifier: jest.fn().mockImplementation(() => ({
    sendPlanningStatistics: jest.fn().mockResolvedValue(true),
    sendSyncStatusUpdate: jest.fn().mockResolvedValue(true),
    sendWorkflowNotification: jest.fn().mockResolvedValue(true),
    sendRemoteAgentUpdate: jest.fn().mockResolvedValue(true),
    getConfig: jest.fn().mockReturnValue({
      enabled: {
        planningNotifications: true,
        syncNotifications: true,
        healthNotifications: true,
        budgetNotifications: true,
        workflowNotifications: true,
        agentNotifications: true
      }
    }),
    updateConfig: jest.fn()
  }))
}));

// Mock the Operational Health Monitor
jest.mock('../src/monitoring/operational-health-monitor', () => ({
  OperationalHealthMonitor: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    registerOAuthToken: jest.fn(),
    updateAPIUsage: jest.fn(),
    getHealthStatus: jest.fn().mockReturnValue({
      overall: 'healthy',
      components: [],
      lastUpdated: Date.now()
    })
  }))
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
}));

describe('OperationalNotificationCoordinator', () => {
  let coordinator: OperationalNotificationCoordinator;

  beforeEach(() => {
    // Reset singleton instance
    (OperationalNotificationCoordinator as any).instance = undefined;
    
    const config = OperationalNotificationCoordinator.createDefaultConfig('development');
    coordinator = OperationalNotificationCoordinator.getInstance(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const config = OperationalNotificationCoordinator.createDefaultConfig('development');
      const instance1 = OperationalNotificationCoordinator.getInstance(config);
      const instance2 = OperationalNotificationCoordinator.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should throw error if accessed without config on first use', () => {
      (OperationalNotificationCoordinator as any).instance = undefined;
      
      expect(() => {
        OperationalNotificationCoordinator.getInstance();
      }).toThrow('OperationalNotificationCoordinator must be initialized with config on first use');
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(coordinator.initialize()).resolves.not.toThrow();
    });

    it('should not reinitialize if already initialized', async () => {
      await coordinator.initialize();
      await expect(coordinator.initialize()).resolves.not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', async () => {
      await coordinator.initialize();
      await expect(coordinator.shutdown()).resolves.not.toThrow();
    });
  });

  describe('planning notifications', () => {
    it('should send planning completion notification', async () => {
      const result = await coordinator.notifyPlanningCompletion(
        'Test Planning',
        1, // epicCount
        5, // featureCount
        15, // storyCount
        2, // enablerCount
        120, // durationMinutes
        'Test Document',
        'https://example.com'
      );

      expect(result).toBe(true);
    });
  });

  describe('sync notifications', () => {
    it('should send sync status notification', async () => {
      const syncResult = {
        syncType: 'bidirectional' as const,
        linearUpdates: 3,
        confluenceUpdates: 2,
        conflictsDetected: 1,
        conflictsResolved: 1,
        conflictsPending: 0,
        nextSyncMinutes: 60
      };

      const result = await coordinator.notifySyncStatus(syncResult);

      expect(result).toBe(true);
    });
  });

  describe('workflow notifications', () => {
    it('should send workflow update notification', async () => {
      const result = await coordinator.notifyWorkflowUpdate(
        'pr-created',
        'Test PR',
        'Test PR description',
        'success',
        'https://github.com/test/pr',
        'testuser'
      );

      expect(result).toBe(true);
    });
  });

  describe('agent notifications', () => {
    it('should send agent update notification', async () => {
      const result = await coordinator.notifyAgentUpdate(
        'agent-123',
        'remote',
        'assigned',
        'Test Task',
        'Agent assigned to task',
        'https://linear.app/task',
        'testuser'
      );

      expect(result).toBe(true);
    });
  });

  describe('health monitoring integration', () => {
    it('should register OAuth token', () => {
      expect(() => {
        coordinator.registerOAuthToken(
          'Linear',
          Date.now() + 86400000, // 1 day from now
          'refresh-token'
        );
      }).not.toThrow();
    });

    it('should update API usage', () => {
      expect(() => {
        coordinator.updateAPIUsage(
          'Linear',
          850,
          1000,
          Date.now() + 3600000
        );
      }).not.toThrow();
    });

    it('should get health status', () => {
      const status = coordinator.getHealthStatus();
      
      expect(status).toHaveProperty('overall');
      expect(status).toHaveProperty('components');
      expect(status).toHaveProperty('lastUpdated');
    });
  });

  describe('configuration', () => {
    it('should create default config for development', () => {
      const config = OperationalNotificationCoordinator.createDefaultConfig('development');
      
      expect(config.environment).toBe('development');
      expect(config.healthMonitoring.enabled).toBe(true);
    });

    it('should create default config for production', () => {
      const config = OperationalNotificationCoordinator.createDefaultConfig('production');
      
      expect(config.environment).toBe('production');
      expect(config.healthMonitoring.checkInterval).toBe(2 * 60 * 1000); // 2 minutes
    });

    it('should validate valid configuration', () => {
      const config = OperationalNotificationCoordinator.createDefaultConfig('development');
      
      expect(OperationalNotificationCoordinator.validateConfig(config)).toBe(true);
    });

    it('should reject invalid environment', () => {
      const config = {
        environment: 'invalid' as any,
        healthMonitoring: { enabled: true }
      };
      
      expect(OperationalNotificationCoordinator.validateConfig(config)).toBe(false);
    });

    it('should reject too short health check interval', () => {
      const config = {
        environment: 'development' as const,
        healthMonitoring: {
          enabled: true,
          checkInterval: 10000 // 10 seconds - too short
        }
      };
      
      expect(OperationalNotificationCoordinator.validateConfig(config)).toBe(false);
    });
  });

  describe('statistics and configuration management', () => {
    it('should return coordinator statistics', () => {
      const stats = coordinator.getCoordinatorStats();
      
      expect(stats).toHaveProperty('environment');
      expect(stats).toHaveProperty('healthMonitoringEnabled');
      expect(stats).toHaveProperty('isInitialized');
      expect(stats).toHaveProperty('healthStatus');
      expect(stats).toHaveProperty('slackConfig');
    });

    it('should update Slack configuration', () => {
      const newConfig = {
        enabled: {
          planningNotifications: false,
          syncNotifications: true,
          healthNotifications: true,
          budgetNotifications: true,
          workflowNotifications: true,
          agentNotifications: true
        }
      };

      expect(() => {
        coordinator.updateSlackConfig(newConfig);
      }).not.toThrow();
    });
  });
});
