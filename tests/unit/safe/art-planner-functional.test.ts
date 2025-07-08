/**
 * Functional Tests for ART Planner (LIN-49)
 * Tests core business logic with realistic scenarios
 */

import { ARTPlanner } from '../../../src/safe/art-planner';
import { ProgramIncrement } from '../../../src/safe/pi-model';

describe('ARTPlanner Functional Tests', () => {
  let artPlanner: ARTPlanner;

  beforeEach(() => {
    artPlanner = new ARTPlanner({
      defaultIterationLength: 14,
      bufferCapacity: 0.2,
      enableValueOptimization: false // Start simple
    });
  });

  describe('createIterationStructure', () => {
    it('should create correct number of iterations for 90-day PI', () => {
      const pi: ProgramIncrement = {
        id: 'pi-test',
        name: 'Test PI',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'), // 90 days
        description: 'Test PI',
        features: [],
        status: 'planning'
      };

      // Access private method for testing
      const iterations = (artPlanner as any).createIterationStructure(pi);
      
      expect(iterations.length).toBe(6); // 90 days / 14 day iterations
      expect(iterations[0].name).toBe('Test PI - Iteration 1');
      expect(iterations[0].startDate).toEqual(new Date('2024-01-01'));
    });

    it('should handle custom iteration lengths', () => {
      const customPlanner = new ARTPlanner({ defaultIterationLength: 10 });
      const pi: ProgramIncrement = {
        id: 'pi-custom',
        name: 'Custom PI', 
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'), // 30 days
        description: 'Custom PI',
        features: [],
        status: 'planning'
      };

      const iterations = (customPlanner as any).createIterationStructure(pi);
      
      expect(iterations.length).toBe(3); // 30 days / 10 day iterations
    });
  });

  describe('sortWorkItemsByDependencies', () => {
    it('should sort items with simple dependencies', () => {
      const workItems = [
        {
          id: 'story-1',
          type: 'story',
          title: 'Story 1',
          description: 'Depends on enabler',
          parentId: undefined,
          attributes: {}
        },
        {
          id: 'enabler-1', 
          type: 'enabler',
          title: 'Enabler 1',
          description: 'Foundation enabler',
          parentId: undefined,
          attributes: {}
        }
      ];

      const dependencies = {
        nodes: workItems,
        edges: [
          {
            id: 'dep-1',
            sourceId: 'story-1',
            targetId: 'enabler-1',
            type: 'REQUIRES',
            strength: 'HARD',
            rationale: 'Story needs enabler',
            detectionMethod: 'MANUAL',
            confidence: 1.0,
            triggers: ['foundation'],
            detectedAt: new Date()
          }
        ],
        criticalPath: ['enabler-1', 'story-1'],
        circularDependencies: [],
        validation: { isValid: true, errors: [], warnings: [], info: [] },
        statistics: {
          nodeCount: 2,
          edgeCount: 1, 
          hardDependencies: 1,
          softDependencies: 0,
          averageDependencies: 0.5,
          independentItems: 0,
          highDependencyItems: [],
          longestPath: 2,
          estimatedDuration: 10
        },
        generatedAt: new Date()
      };

      const sorted = (artPlanner as any).sortWorkItemsByDependencies(workItems, dependencies);
      
      expect(sorted.length).toBe(2);
      expect(sorted[0].id).toBe('enabler-1'); // Should come first
      expect(sorted[1].id).toBe('story-1');   // Should come second
    });
  });

  describe('validateDependencies', () => {
    it('should validate clean dependency graph', () => {
      const dependencies = {
        nodes: [],
        edges: [],
        criticalPath: [],
        circularDependencies: [],
        validation: { isValid: true, errors: [], warnings: [], info: [] },
        statistics: {
          nodeCount: 0,
          edgeCount: 0,
          hardDependencies: 0,
          softDependencies: 0,
          averageDependencies: 0,
          independentItems: 0,
          highDependencyItems: [],
          longestPath: 0,
          estimatedDuration: 0
        },
        generatedAt: new Date()
      };

      const result = (artPlanner as any).validateDependencies(dependencies);
      expect(result).toBe(true);
    });

    it('should reject circular dependencies', () => {
      const dependencies = {
        nodes: [],
        edges: [],
        criticalPath: [],
        circularDependencies: [['story-1', 'story-2', 'story-1']],
        validation: { 
          isValid: false, 
          errors: ['Circular dependency detected'],
          warnings: [], 
          info: [] 
        },
        statistics: {
          nodeCount: 2,
          edgeCount: 2,
          hardDependencies: 2,
          softDependencies: 0,
          averageDependencies: 1,
          independentItems: 0,
          highDependencyItems: ['story-1', 'story-2'],
          longestPath: 0,
          estimatedDuration: 0
        },
        generatedAt: new Date()
      };

      expect(() => {
        (artPlanner as any).validateDependencies(dependencies);
      }).toThrow('Invalid dependency graph');
    });
  });

  describe('configuration handling', () => {
    it('should apply buffer capacity correctly', () => {
      const config = (artPlanner as any).config;
      expect(config.bufferCapacity).toBe(0.2);
    });

    it('should use default values for missing config', () => {
      const defaultPlanner = new ARTPlanner();
      const config = (defaultPlanner as any).config;
      
      expect(config.defaultIterationLength).toBe(14);
      expect(config.bufferCapacity).toBe(0.2);
      expect(config.maxCapacityUtilization).toBe(0.8);
    });
  });
});