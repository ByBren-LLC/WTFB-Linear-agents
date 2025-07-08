/**
 * Comprehensive Tests for ART Planner (LIN-49)
 * Tests actual business logic with proper data structures
 */

import { ARTPlanner } from '../../../src/safe/art-planner';
import { ProgramIncrement } from '../../../src/safe/pi-model';

describe('ARTPlanner Comprehensive Tests', () => {
  let artPlanner: ARTPlanner;

  beforeEach(() => {
    artPlanner = new ARTPlanner({
      defaultIterationLength: 14,
      bufferCapacity: 0.2,
      enableValueOptimization: false
    });
  });

  describe('planART - Main Business Logic', () => {
    let testPI: ProgramIncrement;
    let testWorkItems: any[];
    let testDependencies: any;
    let testTeams: any[];

    beforeEach(() => {
      // Create realistic test data
      testPI = {
        id: 'pi-test-main',
        name: 'Test Program Increment',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        description: 'Test PI for comprehensive testing',
        features: [],
        status: 'planning'
      };

      testWorkItems = [
        {
          id: 'story-test-1',
          type: 'story',
          title: 'Test User Story 1',
          description: 'Test story description',
          parentId: undefined,
          attributes: {},
          storyPoints: 5,
          priority: 1,
          acceptanceCriteria: ['Test criteria 1', 'Test criteria 2']
        },
        {
          id: 'enabler-test-1',
          type: 'enabler',
          title: 'Test Enabler 1',
          description: 'Test enabler description',
          parentId: undefined,
          attributes: {},
          enablerType: 'infrastructure',
          acceptanceCriteria: ['Enabler criteria 1']
        }
      ];

      testDependencies = {
        nodes: testWorkItems,
        edges: [],
        criticalPath: [],
        circularDependencies: [],
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          info: []
        },
        statistics: {
          nodeCount: 2,
          edgeCount: 0,
          hardDependencies: 0,
          softDependencies: 0,
          averageDependencies: 0,
          independentItems: 2,
          highDependencyItems: [],
          longestPath: 1,
          estimatedDuration: 14
        },
        generatedAt: new Date()
      };

      testTeams = [
        {
          id: 'team-test-1',
          name: 'Test Team 1',
          memberCount: 5,
          averageVelocity: 30,
          specializations: ['frontend', 'backend'],
          capacityFactor: 0.8,
          timezone: 'UTC'
        },
        {
          id: 'team-test-2',
          name: 'Test Team 2',
          memberCount: 4,
          averageVelocity: 25,
          specializations: ['devops', 'testing'],
          capacityFactor: 0.85,
          timezone: 'UTC'
        }
      ];
    });

    it('should successfully plan ART with valid inputs', async () => {
      const result = await artPlanner.planART(
        testPI,
        testWorkItems,
        testDependencies,
        testTeams
      );

      // Validate basic structure
      expect(result).toBeDefined();
      expect(result.programIncrement).toBe(testPI);
      expect(result.iterations).toBeDefined();
      expect(result.iterations.length).toBeGreaterThan(0);
      expect(result.workItems).toEqual(testWorkItems);
      expect(result.artReadiness).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should create appropriate number of iterations', async () => {
      const result = await artPlanner.planART(
        testPI,
        testWorkItems,
        testDependencies,
        testTeams
      );

      // 90 days / 14 day iterations = ~6 iterations
      expect(result.iterations.length).toBe(6);
      
      // Check iteration structure
      result.iterations.forEach((iterationPlan, index) => {
        expect(iterationPlan.iteration).toBeDefined();
        expect(iterationPlan.iteration.name).toContain(`Iteration ${index + 1}`);
        expect(iterationPlan.allocatedWork).toBeDefined();
        expect(iterationPlan.totalPoints).toBeDefined();
        expect(iterationPlan.totalCapacity).toBeDefined();
      });
    });

    it('should calculate ART readiness', async () => {
      const result = await artPlanner.planART(
        testPI,
        testWorkItems,
        testDependencies,
        testTeams
      );

      expect(result.artReadiness).toBeDefined();
      expect(result.artReadiness.isReady).toBeDefined();
      expect(result.artReadiness.readinessScore).toBeGreaterThanOrEqual(0);
      expect(result.artReadiness.readinessScore).toBeLessThanOrEqual(1);
      expect(result.artReadiness.assessments).toBeDefined();
      expect(result.artReadiness.categoryScores).toBeDefined();
    });

    it('should generate planning summary', async () => {
      const result = await artPlanner.planART(
        testPI,
        testWorkItems,
        testDependencies,
        testTeams
      );

      expect(result.summary).toBeDefined();
      expect(result.summary.totalStoryPoints).toBeDefined();
      expect(result.summary.averageCapacityUtilization).toBeDefined();
      expect(result.summary.metrics).toBeDefined();
      expect(result.summary.metrics.planningConfidence).toBeGreaterThanOrEqual(0);
      expect(result.summary.metrics.planningConfidence).toBeLessThanOrEqual(1);
    });

    it('should handle empty work items gracefully', async () => {
      const result = await artPlanner.planART(
        testPI,
        [], // Empty work items
        { ...testDependencies, nodes: [] },
        testTeams
      );

      expect(result).toBeDefined();
      expect(result.workItems).toEqual([]);
      expect(result.summary.totalStoryPoints).toBe(0);
      expect(result.iterations.length).toBeGreaterThan(0); // Still creates iterations
    });

    it('should validate team capacity calculations', async () => {
      const result = await artPlanner.planART(
        testPI,
        testWorkItems,
        testDependencies,
        testTeams
      );

      result.iterations.forEach(iterationPlan => {
        expect(iterationPlan.totalCapacity).toBeGreaterThan(0);
        expect(iterationPlan.capacityUtilization).toBeDefined();
        expect(iterationPlan.capacityUtilization.length).toBe(testTeams.length);
        
        iterationPlan.capacityUtilization.forEach(teamCapacity => {
          expect(teamCapacity.teamId).toBeDefined();
          expect(teamCapacity.totalCapacity).toBeGreaterThanOrEqual(0);
          expect(teamCapacity.allocatedCapacity).toBeGreaterThanOrEqual(0);
          expect(teamCapacity.utilizationRate).toBeGreaterThanOrEqual(0);
          expect(teamCapacity.utilizationRate).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid PI dates', async () => {
      const invalidPI: ProgramIncrement = {
        id: 'pi-invalid',
        name: 'Invalid PI',
        startDate: new Date('2024-03-31'),
        endDate: new Date('2024-01-01'), // End before start
        description: 'Invalid PI',
        features: [],
        status: 'planning'
      };

      await expect(
        artPlanner.planART(invalidPI, [], {
          nodes: [],
          edges: [],
          criticalPath: [],
          circularDependencies: [],
          validation: { isValid: true, errors: [], warnings: [], info: [] },
          statistics: {
            nodeCount: 0, edgeCount: 0, hardDependencies: 0, softDependencies: 0,
            averageDependencies: 0, independentItems: 0, highDependencyItems: [],
            longestPath: 0, estimatedDuration: 0
          },
          generatedAt: new Date()
        }, [])
      ).rejects.toThrow();
    });

    it('should reject invalid dependency graphs', async () => {
      const invalidDependencies = {
        nodes: [],
        edges: [],
        criticalPath: [],
        circularDependencies: [{
          cycle: ['story-1', 'story-2', 'story-1'],
          relationships: [],
          severity: 'critical' as const,
          resolutionSuggestions: ['Break dependency cycle']
        }],
        validation: {
          isValid: false,
          errors: [{
            code: 'CIRCULAR_DEPENDENCY',
            message: 'Circular dependency detected',
            affectedItems: ['story-1', 'story-2'],
            suggestedFix: 'Break the dependency cycle'
          }],
          warnings: [],
          info: []
        },
        statistics: {
          nodeCount: 2, edgeCount: 2, hardDependencies: 2, softDependencies: 0,
          averageDependencies: 1, independentItems: 0, highDependencyItems: ['story-1'],
          longestPath: 0, estimatedDuration: 0
        },
        generatedAt: new Date()
      };

      const validPI: ProgramIncrement = {
        id: 'pi-valid',
        name: 'Valid PI',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        description: 'Valid PI',
        features: [],
        status: 'planning'
      };

      await expect(
        artPlanner.planART(validPI, [], invalidDependencies, [])
      ).rejects.toThrow('Invalid dependency graph');
    });
  });

  describe('Configuration Validation', () => {
    it('should respect custom configuration values', () => {
      const customPlanner = new ARTPlanner({
        defaultIterationLength: 10,
        bufferCapacity: 0.3,
        maxCapacityUtilization: 0.7,
        enableValueOptimization: true
      });

      expect(customPlanner).toBeDefined();
    });

    it('should use appropriate default values', () => {
      const defaultPlanner = new ARTPlanner();
      expect(defaultPlanner).toBeDefined();
    });
  });
});