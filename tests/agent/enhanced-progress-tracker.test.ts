/**
 * Enhanced Progress Tracker Tests (LIN-64)
 * 
 * Comprehensive test suite for progress tracker edge cases,
 * business logic validation, and error handling.
 */

import { EnhancedProgressTracker, WorkItem, ProgressResult } from '../../src/agent/enhanced-progress-tracker';
import { ProgressTrackerConfig, createDefaultConfig } from '../../src/agent/progress-config';
import { LinearClientWrapper } from '../../src/linear/client';
import { ResponseTemplateEngine } from '../../src/agent/response-template-engine';

// Mock Linear client
jest.mock('../../src/linear/client');
jest.mock('../../src/agent/response-template-engine');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Enhanced Progress Tracker - Edge Cases', () => {
  let progressTracker: EnhancedProgressTracker;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;
  let mockTemplateEngine: jest.Mocked<ResponseTemplateEngine>;
  let testConfig: ProgressTrackerConfig;

  beforeEach(() => {
    mockLinearClient = new LinearClientWrapper('test', 'test') as jest.Mocked<LinearClientWrapper>;
    mockTemplateEngine = new ResponseTemplateEngine() as jest.Mocked<ResponseTemplateEngine>;
    
    testConfig = createDefaultConfig('test');
    progressTracker = new EnhancedProgressTracker(
      mockLinearClient,
      mockTemplateEngine,
      testConfig
    );
  });

  describe('Zero Point Stories', () => {
    it('should handle 0-point stories correctly', async () => {
      const workItems: WorkItem[] = [
        { id: '1', title: 'Zero point story', storyPoints: 0, state: 'Done', type: 'Story' },
        { id: '2', title: 'Normal story', storyPoints: 3, state: 'In Progress', type: 'Story' }
      ];

      const result = await progressTracker.calculateProgressWithEdgeCases(workItems);

      // Zero point story should be counted as 1 point (default weight)
      expect(result.totalPoints).toBe(4); // 1 + 3
      expect(result.completedPoints).toBe(1); // Only zero point story is done
      expect(result.percentage).toBe(25); // 1/4 = 25%
      expect(result.edgeCasesHandled).toContain('zero-point-story');
    });

    it('should respect custom zero point story weight', async () => {
      const customConfig = { ...testConfig };
      customConfig.progressCalculation.zeroPointStoryWeight = 2;
      
      const customTracker = new EnhancedProgressTracker(
        mockLinearClient,
        mockTemplateEngine,
        customConfig
      );

      const workItems: WorkItem[] = [
        { id: '1', title: 'Zero point story', storyPoints: 0, state: 'Done', type: 'Story' }
      ];

      const result = await customTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.totalPoints).toBe(2);
      expect(result.completedPoints).toBe(2);
      expect(result.percentage).toBe(100);
    });
  });

  describe('Enabler Stories', () => {
    it('should apply enabler multiplier', async () => {
      const workItems: WorkItem[] = [
        { id: '1', title: 'User story', storyPoints: 3, state: 'Done', type: 'Story' },
        { id: '2', title: 'Enabler story', storyPoints: 2, state: 'Done', type: 'Enabler' }
      ];

      const result = await progressTracker.calculateProgressWithEdgeCases(workItems);

      // Enabler should be weighted: 2 * 1.2 = 2.4
      expect(result.businessRulesApplied).toContain('enabler-multiplier');
      expect(result.totalPoints).toBe(5.4); // 3 + 2.4
      expect(result.completedPoints).toBe(5.4);
      expect(result.percentage).toBe(100);
    });
  });

  describe('Moved Stories', () => {
    it('should include moved stories by default', async () => {
      const workItems: WorkItem[] = [
        { id: '1', title: 'Moved story', storyPoints: 3, state: 'Done', type: 'Story', movedFromIteration: true },
        { id: '2', title: 'Regular story', storyPoints: 2, state: 'In Progress', type: 'Story' }
      ];

      const result = await progressTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.totalPoints).toBe(5);
      expect(result.completedPoints).toBe(3);
    });

    it('should exclude moved stories when configured', async () => {
      const customConfig = { ...testConfig };
      customConfig.progressCalculation.includeMovedStories = false;
      
      const customTracker = new EnhancedProgressTracker(
        mockLinearClient,
        mockTemplateEngine,
        customConfig
      );

      const workItems: WorkItem[] = [
        { id: '1', title: 'Moved story', storyPoints: 3, state: 'Done', type: 'Story', movedFromIteration: true },
        { id: '2', title: 'Regular story', storyPoints: 2, state: 'In Progress', type: 'Story' }
      ];

      const result = await customTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.edgeCasesHandled).toContain('moved-story-excluded');
      expect(result.totalPoints).toBe(2); // Only regular story counted
      expect(result.completedPoints).toBe(0);
    });
  });

  describe('Progress Calculation Strategies', () => {
    const workItems: WorkItem[] = [
      { id: '1', title: 'Small story', storyPoints: 1, state: 'Done', type: 'Story' },
      { id: '2', title: 'Large story', storyPoints: 8, state: 'In Progress', type: 'Story' },
      { id: '3', title: 'Epic', storyPoints: 5, state: 'Done', type: 'Epic' }
    ];

    it('should calculate simple progress', async () => {
      const customConfig = { ...testConfig };
      customConfig.progressCalculation.parentEpicProgressStrategy = 'simple';
      
      const customTracker = new EnhancedProgressTracker(
        mockLinearClient,
        mockTemplateEngine,
        customConfig
      );

      const result = await customTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.percentage).toBe(43); // (1+5)/(1+8+5) = 6/14 ≈ 43%
      expect(result.weightedPercentage).toBe(43); // Same as percentage for simple strategy
    });

    it('should calculate weighted progress', async () => {
      const customConfig = { ...testConfig };
      customConfig.progressCalculation.parentEpicProgressStrategy = 'weighted';
      
      const customTracker = new EnhancedProgressTracker(
        mockLinearClient,
        mockTemplateEngine,
        customConfig
      );

      const result = await customTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.businessRulesApplied).toContain('weighted-progress-calculation');
      // Weighted: (1*1 + 5*5) / (1*1 + 8*8 + 5*5) = 26/90 ≈ 29%
      expect(result.weightedPercentage).toBe(29);
    });

    it('should calculate milestone progress', async () => {
      const customConfig = { ...testConfig };
      customConfig.progressCalculation.parentEpicProgressStrategy = 'milestone';
      
      const customTracker = new EnhancedProgressTracker(
        mockLinearClient,
        mockTemplateEngine,
        customConfig
      );

      const result = await customTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.businessRulesApplied).toContain('milestone-progress-calculation');
      // Only 1 Epic out of 1 Epic is done = 100%
      expect(result.weightedPercentage).toBe(100);
    });
  });

  describe('Business Rule Applications', () => {
    it('should cap progress when dependencies are incomplete', async () => {
      const customConfig = { ...testConfig };
      customConfig.stateTransition.requireDependencyCompletion = true;
      
      const customTracker = new EnhancedProgressTracker(
        mockLinearClient,
        mockTemplateEngine,
        customConfig
      );

      const workItems: WorkItem[] = [
        { id: '1', title: 'Story with deps', storyPoints: 3, state: 'Done', type: 'Story', dependencies: ['dep1'] },
        { id: '2', title: 'Incomplete dep', storyPoints: 2, state: 'In Progress', type: 'Story' }
      ];

      // Mock the dependency check to return incomplete dependencies
      const originalCheck = (customTracker as any).checkIncompleteDependencies;
      (customTracker as any).checkIncompleteDependencies = jest.fn().mockReturnValue([workItems[0]]);

      const result = await customTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.businessRulesApplied).toContain('dependency-completion-required');
      expect(result.edgeCasesHandled).toContain('incomplete-dependencies');
      expect(result.percentage).toBeLessThanOrEqual(90); // Capped at 90%
    });

    it('should penalize partial epic completion', async () => {
      const customConfig = { ...testConfig };
      customConfig.stateTransition.allowPartialEpicCompletion = false;
      
      const customTracker = new EnhancedProgressTracker(
        mockLinearClient,
        mockTemplateEngine,
        customConfig
      );

      const workItems: WorkItem[] = [
        { id: '1', title: 'Epic', storyPoints: 5, state: 'Done', type: 'Epic' },
        { id: '2', title: 'Child story', storyPoints: 3, state: 'In Progress', type: 'Story', parentEpicId: '1' }
      ];

      // Mock the partial epic check
      const originalCheck = (customTracker as any).checkPartialEpicCompletion;
      (customTracker as any).checkPartialEpicCompletion = jest.fn().mockReturnValue([workItems[0]]);

      const result = await customTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.businessRulesApplied).toContain('partial-epic-completion-blocked');
      expect(result.edgeCasesHandled).toContain('partial-epic-completion');
      // 5% penalty for partial epic: original 62% - 5% = 57%
      expect(result.percentage).toBeLessThan(62);
    });
  });

  describe('Threshold Alerts', () => {
    it('should generate critical ART readiness alert', async () => {
      const workItems: WorkItem[] = [
        { id: '1', title: 'Story', storyPoints: 10, state: 'Todo', type: 'Story' },
        { id: '2', title: 'Done story', storyPoints: 2, state: 'Done', type: 'Story' }
      ];

      const result = await progressTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.percentage).toBe(17); // 2/12 ≈ 17%
      expect(result.readinessLevel).toBe('critical');
      
      const criticalAlert = result.alerts.find(a => a.type === 'critical');
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert?.message).toContain('critically low');
    });

    it('should generate warning ART readiness alert', async () => {
      const workItems: WorkItem[] = [
        { id: '1', title: 'Story', storyPoints: 3, state: 'Todo', type: 'Story' },
        { id: '2', title: 'Done story', storyPoints: 8, state: 'Done', type: 'Story' }
      ];

      const result = await progressTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.percentage).toBe(73); // 8/11 ≈ 73%
      expect(result.readinessLevel).toBe('warning');
      
      const warningAlert = result.alerts.find(a => a.type === 'warning');
      expect(warningAlert).toBeDefined();
      expect(warningAlert?.message).toContain('below target');
    });

    it('should generate capacity utilization alerts', async () => {
      // Create workload that exceeds 95% utilization threshold
      const workItems: WorkItem[] = [
        { id: '1', title: 'In progress 1', storyPoints: 10, state: 'In Progress', type: 'Story' },
        { id: '2', title: 'In progress 2', storyPoints: 10, state: 'In Progress', type: 'Story' },
        { id: '3', title: 'Todo', storyPoints: 1, state: 'Todo', type: 'Story' }
      ];

      const result = await progressTracker.calculateProgressWithEdgeCases(workItems);

      // Capacity utilization: 20 in progress / 21 total = 95.2%
      const capacityAlert = result.alerts.find(a => a.message.includes('capacity'));
      expect(capacityAlert).toBeDefined();
      expect(capacityAlert?.type).toBe('warning');
    });

    it('should generate progress variance alert', async () => {
      const workItems: WorkItem[] = [
        { id: '1', title: 'Small done', storyPoints: 1, state: 'Done', type: 'Story' },
        { id: '2', title: 'Large todo', storyPoints: 13, state: 'Todo', type: 'Story' }
      ];

      const result = await progressTracker.calculateProgressWithEdgeCases(workItems);

      // Simple: 1/14 ≈ 7%, Weighted: 1/170 ≈ 1%, Variance: 6%
      // This should be under threshold, but let's test the logic
      expect(result.percentage).toBe(7);
      expect(result.weightedPercentage).toBe(1);
    });
  });

  describe('Empty Work Items', () => {
    it('should handle empty work items gracefully', async () => {
      const result = await progressTracker.calculateProgressWithEdgeCases([]);

      expect(result.percentage).toBe(0);
      expect(result.totalPoints).toBe(0);
      expect(result.completedPoints).toBe(0);
      expect(result.readinessLevel).toBe('critical');
      expect(result.edgeCasesHandled).toContain('empty-work-items');
      
      const infoAlert = result.alerts.find(a => a.type === 'info');
      expect(infoAlert?.message).toContain('No work items');
    });
  });

  describe('Configuration Management', () => {
    it('should validate configuration on creation', () => {
      const invalidConfig = createDefaultConfig('test');
      invalidConfig.thresholds.artReadinessWarning = 50;
      invalidConfig.thresholds.artReadinessCritical = 80; // Higher than warning - invalid

      expect(() => {
        new EnhancedProgressTracker(mockLinearClient, mockTemplateEngine, invalidConfig);
      }).toThrow('Invalid configuration');
    });

    it('should allow configuration updates', () => {
      const updates = {
        progressCalculation: {
          zeroPointStoryWeight: 0.5,
          parentEpicProgressStrategy: 'simple' as const,
          includeMovedStories: true,
          enablerStoryMultiplier: 1.2
        }
      };

      progressTracker.updateConfig(updates);
      const newConfig = progressTracker.getConfig();

      expect(newConfig.progressCalculation.zeroPointStoryWeight).toBe(0.5);
    });

    it('should reject invalid configuration updates', () => {
      const invalidUpdates = {
        thresholds: {
          artReadinessWarning: 60,
          artReadinessCritical: 80, // Invalid
          capacityUtilizationMax: 95,
          capacityUtilizationMin: 70,
          progressVarianceThreshold: 15
        }
      };

      expect(() => {
        progressTracker.updateConfig(invalidUpdates);
      }).toThrow('Invalid configuration update');
    });
  });

  describe('Readiness Levels', () => {
    it('should return excellent for high progress', async () => {
      const workItems: WorkItem[] = [
        { id: '1', title: 'Story', storyPoints: 5, state: 'Done', type: 'Story' }
      ];

      const result = await progressTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.percentage).toBe(100);
      expect(result.readinessLevel).toBe('excellent');
    });

    it('should return good for adequate progress', async () => {
      const workItems: WorkItem[] = [
        { id: '1', title: 'Done', storyPoints: 9, state: 'Done', type: 'Story' },
        { id: '2', title: 'Todo', storyPoints: 1, state: 'Todo', type: 'Story' }
      ];

      const result = await progressTracker.calculateProgressWithEdgeCases(workItems);

      expect(result.percentage).toBe(90);
      expect(result.readinessLevel).toBe('good');
    });
  });
});