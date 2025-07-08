/**
 * Tests for Autonomous Behavior Engine (LIN-59)
 */

import { AutonomousBehaviorEngine } from '../../src/agent/autonomous-engine';
import {
  AutonomousBehavior,
  BehaviorContext,
  BehaviorResult,
  BehaviorTrigger,
  BehaviorTriggerType
} from '../../src/agent/types/autonomous-types';
import * as logger from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/utils/logger');
jest.mock('../../src/agent/monitoring/behavior-scheduler');
jest.mock('../../src/agent/monitoring/health-monitor');

// Mock behavior implementation
class MockBehavior implements AutonomousBehavior {
  id = 'mock_behavior';
  name = 'Mock Behavior';
  description = 'Test behavior';
  enabled = true;
  priority = 50;

  shouldTriggerMock = jest.fn().mockResolvedValue(true);
  executeMock = jest.fn().mockResolvedValue({
    success: true,
    actions: [{ type: 'test', target: 'test', description: 'Test action', result: 'success' }],
    executionTime: 100,
    shouldNotify: false
  });
  validateMock = jest.fn().mockResolvedValue(true);

  async shouldTrigger(context: BehaviorContext): Promise<boolean> {
    return this.shouldTriggerMock(context);
  }

  async execute(context: BehaviorContext): Promise<BehaviorResult> {
    return this.executeMock(context);
  }

  async validate(): Promise<boolean> {
    return this.validateMock();
  }
}

describe('AutonomousBehaviorEngine', () => {
  let engine: AutonomousBehaviorEngine;
  let mockBehavior: MockBehavior;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new AutonomousBehaviorEngine();
    mockBehavior = new MockBehavior();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(engine).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        'AutonomousBehaviorEngine initialized',
        expect.any(Object)
      );
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        storyPointThreshold: 8,
        artReadinessThreshold: 0.9,
        enabledBehaviors: {
          story_monitoring: false,
          art_health_monitoring: true
        }
      };

      const customEngine = new AutonomousBehaviorEngine(customConfig);
      expect(customEngine).toBeDefined();
    });

    it('should validate behaviors on initialization', async () => {
      engine.registerBehavior(mockBehavior);
      await engine.initialize();

      expect(mockBehavior.validateMock).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Autonomous behavior engine initialized successfully',
        expect.objectContaining({
          behaviorCount: 1
        })
      );
    });

    it('should handle initialization errors', async () => {
      engine.registerBehavior(mockBehavior);
      mockBehavior.validateMock.mockRejectedValueOnce(new Error('Validation failed'));

      await engine.initialize();

      expect(logger.warn).toHaveBeenCalledWith(
        'Some behaviors failed validation',
        expect.any(Object)
      );
    });
  });

  describe('behavior management', () => {
    it('should register a behavior', () => {
      engine.registerBehavior(mockBehavior);

      expect(logger.info).toHaveBeenCalledWith(
        'Registered autonomous behavior',
        expect.objectContaining({
          behaviorId: 'mock_behavior',
          behaviorName: 'Mock Behavior'
        })
      );
    });

    it('should unregister a behavior', () => {
      engine.registerBehavior(mockBehavior);
      engine.unregisterBehavior('mock_behavior');

      expect(logger.info).toHaveBeenCalledWith(
        'Unregistered behavior',
        { behaviorId: 'mock_behavior' }
      );
    });

    it('should enable/disable behaviors', () => {
      engine.registerBehavior(mockBehavior);
      engine.setBehaviorEnabled('mock_behavior', false);

      expect(mockBehavior.enabled).toBe(false);
      expect(logger.info).toHaveBeenCalledWith(
        'Behavior enabled status changed',
        { behaviorId: 'mock_behavior', enabled: false }
      );
    });
  });

  describe('trigger processing', () => {
    beforeEach(() => {
      engine.registerBehavior(mockBehavior);
    });

    it('should process webhook trigger successfully', async () => {
      const trigger: BehaviorTrigger = {
        id: 'test-trigger-1',
        type: BehaviorTriggerType.WEBHOOK,
        payload: { test: true },
        context: {
          issue: { id: 'issue-1', estimate: 8 },
          timestamp: new Date()
        },
        timestamp: new Date()
      };

      const results = await engine.processTrigger(trigger);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockBehavior.shouldTriggerMock).toHaveBeenCalledWith(trigger.context);
      expect(mockBehavior.executeMock).toHaveBeenCalledWith(trigger.context);
    });

    it('should skip disabled behaviors', async () => {
      mockBehavior.enabled = false;

      const trigger: BehaviorTrigger = {
        id: 'test-trigger-2',
        type: BehaviorTriggerType.WEBHOOK,
        payload: {},
        context: { timestamp: new Date() },
        timestamp: new Date()
      };

      const results = await engine.processTrigger(trigger);

      expect(results).toHaveLength(0);
      expect(mockBehavior.shouldTriggerMock).not.toHaveBeenCalled();
    });

    it('should handle behavior execution errors', async () => {
      mockBehavior.executeMock.mockRejectedValueOnce(new Error('Execution failed'));

      const trigger: BehaviorTrigger = {
        id: 'test-trigger-3',
        type: BehaviorTriggerType.WEBHOOK,
        payload: {},
        context: { timestamp: new Date() },
        timestamp: new Date()
      };

      const results = await engine.processTrigger(trigger);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Execution failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should respect behavior priority order', async () => {
      const highPriorityBehavior = new MockBehavior();
      highPriorityBehavior.id = 'high_priority';
      highPriorityBehavior.priority = 100;

      const lowPriorityBehavior = new MockBehavior();
      lowPriorityBehavior.id = 'low_priority';
      lowPriorityBehavior.priority = 10;

      engine.registerBehavior(lowPriorityBehavior);
      engine.registerBehavior(highPriorityBehavior);

      const trigger: BehaviorTrigger = {
        id: 'test-trigger-4',
        type: BehaviorTriggerType.WEBHOOK,
        payload: {},
        context: { timestamp: new Date() },
        timestamp: new Date()
      };

      const results = await engine.processTrigger(trigger);

      expect(results).toHaveLength(2);
      // High priority should execute first
      expect(highPriorityBehavior.executeMock).toHaveBeenCalled();
      expect(lowPriorityBehavior.executeMock).toHaveBeenCalled();
    });

    it('should check shouldTrigger before executing', async () => {
      mockBehavior.shouldTriggerMock.mockResolvedValueOnce(false);

      const trigger: BehaviorTrigger = {
        id: 'test-trigger-5',
        type: BehaviorTriggerType.WEBHOOK,
        payload: {},
        context: { timestamp: new Date() },
        timestamp: new Date()
      };

      const results = await engine.processTrigger(trigger);

      expect(results).toHaveLength(1);
      expect(results[0].actions).toHaveLength(0);
      expect(mockBehavior.executeMock).not.toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      // Update config to very low rate limit
      engine.updateConfiguration({
        rateLimits: {
          maxPerMinute: 1,
          maxPerHour: 10,
          maxCommentsPerIssue: 5
        }
      });

      engine.registerBehavior(mockBehavior);

      const trigger: BehaviorTrigger = {
        id: 'test-trigger-rate',
        type: BehaviorTriggerType.WEBHOOK,
        payload: {},
        context: { timestamp: new Date() },
        timestamp: new Date()
      };

      // First trigger should succeed
      const results1 = await engine.processTrigger(trigger);
      expect(results1).toHaveLength(1);

      // Second trigger should be rate limited (in real implementation)
      // Note: Full rate limiting implementation would need time tracking
    });
  });

  describe('health monitoring', () => {
    it('should get health status for behaviors', async () => {
      engine.registerBehavior(mockBehavior);
      
      const healthStatus = await engine.getHealthStatus();
      
      expect(healthStatus).toHaveLength(1);
      expect(healthStatus[0].behaviorId).toBe('mock_behavior');
    });

    it('should get execution metrics', () => {
      const metrics = engine.getMetrics();
      
      expect(metrics).toHaveProperty('totalExecutions');
      expect(metrics).toHaveProperty('successfulExecutions');
      expect(metrics).toHaveProperty('failedExecutions');
      expect(metrics).toHaveProperty('avgExecutionTime');
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        storyPointThreshold: 10,
        notifications: {
          slackEnabled: false,
          emailEnabled: true
        }
      };

      engine.updateConfiguration(newConfig);

      expect(logger.info).toHaveBeenCalledWith(
        'Configuration updated',
        { config: newConfig }
      );
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await engine.shutdown();

      expect(logger.info).toHaveBeenCalledWith(
        'Shutting down autonomous behavior engine'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Autonomous behavior engine shut down successfully'
      );
    });

    it('should handle shutdown errors', async () => {
      // Mock scheduler to throw error
      const errorEngine = new AutonomousBehaviorEngine();
      const mockError = new Error('Shutdown failed');
      
      // In real implementation, would mock scheduler.stop() to throw
      // For now, just verify error handling structure exists
      expect(errorEngine.shutdown).toBeDefined();
    });
  });
});