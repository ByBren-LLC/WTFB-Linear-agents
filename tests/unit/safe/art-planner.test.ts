/**
 * Unit Tests for ART Planner (LIN-49)
 * 
 * Tests individual components of the ART planning system
 * following SAFe testing practices.
 */

import { ARTPlanner } from '../../../src/safe/art-planner';
import { IterationAllocator } from '../../../src/safe/iteration-allocator';
import { CapacityManager } from '../../../src/safe/capacity-manager';
import { ARTValidator } from '../../../src/safe/art-validator';
import { ValueDeliveryAnalyzer } from '../../../src/safe/value-delivery-analyzer';
import {
  ProgramIncrement,
  PlanningWorkItem,
  ARTTeam,
  ARTPlanningConfig
} from '../../../src/types/art-planning-types';

// Mock dependencies
jest.mock('../../../src/safe/iteration-allocator');
jest.mock('../../../src/safe/capacity-manager');
jest.mock('../../../src/safe/art-validator');
jest.mock('../../../src/safe/value-delivery-analyzer');

describe('ARTPlanner', () => {
  let artPlanner: ARTPlanner;
  let mockIterationAllocator: jest.Mocked<IterationAllocator>;
  let mockCapacityManager: jest.Mocked<CapacityManager>;
  let mockValidator: jest.Mocked<ARTValidator>;

  // Shared test data
  let mockPI: ProgramIncrement;
  let mockWorkItems: PlanningWorkItem[];
  let mockDependencies: any;
  let mockTeams: ARTTeam[];
  let mockValueAnalyzer: jest.Mocked<ValueDeliveryAnalyzer>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create instance with default config
    artPlanner = new ARTPlanner();
    
    // Get mocked instances
    mockIterationAllocator = (IterationAllocator as jest.MockedClass<typeof IterationAllocator>).mock.instances[0] as jest.Mocked<IterationAllocator>;
    mockCapacityManager = (CapacityManager as jest.MockedClass<typeof CapacityManager>).mock.instances[0] as jest.Mocked<CapacityManager>;
    mockValidator = (ARTValidator as jest.MockedClass<typeof ARTValidator>).mock.instances[0] as jest.Mocked<ARTValidator>;
    mockValueAnalyzer = (ValueDeliveryAnalyzer as jest.MockedClass<typeof ValueDeliveryAnalyzer>).mock.instances[0] as jest.Mocked<ValueDeliveryAnalyzer>;
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const planner = new ARTPlanner();
      expect(planner).toBeDefined();
      expect(IterationAllocator).toHaveBeenCalledWith(expect.any(Object));
      expect(CapacityManager).toHaveBeenCalledWith(expect.any(Object));
      expect(ARTValidator).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<ARTPlanningConfig> = {
        defaultIterationLength: 10,
        bufferCapacity: 0.3,
        enableValueOptimization: true
      };
      
      const planner = new ARTPlanner(customConfig);
      expect(planner).toBeDefined();
    });
  });

  describe('planART', () => {
    let mockPI: ProgramIncrement;
    let mockWorkItems: PlanningWorkItem[];
    let mockDependencies: any;
    let mockTeams: ARTTeam[];

    beforeEach(() => {
      mockPI = {
        id: 'pi-test',
        name: 'Test PI',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        description: 'Test Program Increment',
        features: [],
        status: 'planning'
      };

      mockWorkItems = [
        {
          id: 'story-1',
          type: 'story',
          title: 'Test Story 1',
          description: 'Test description',
          parentId: undefined,
          attributes: {},
          acceptanceCriteria: ['Test criteria 1', 'Test criteria 2']
        }
      ];

      mockDependencies = {
        nodes: mockWorkItems,
        edges: [],
        criticalPath: [],
        circularDependencies: [],
        validation: { isValid: true, errors: [], warnings: [], info: [] },
        statistics: {
          nodeCount: 1,
          edgeCount: 0,
          hardDependencies: 0,
          softDependencies: 0,
          averageDependencies: 0,
          independentItems: 1,
          highDependencyItems: [],
          longestPath: 1,
          estimatedDuration: 14
        },
        generatedAt: new Date()
      };

      mockTeams = [
        {
          id: 'team-1',
          name: 'Test Team',
          memberCount: 5,
          averageVelocity: 30,
          specializations: ['frontend'],
          capacityFactor: 0.8,
          timezone: 'UTC'
        }
      ];
    });

    it('should create ART plan with iterations', async () => {
      // Mock the allocator response
      mockIterationAllocator.allocateWorkItems.mockResolvedValue({
        allocated: [],
        unallocated: [],
        statistics: {
          totalWorkItems: 0,
          allocatedWorkItems: 0,
          unallocatedWorkItems: 0,
          totalStoryPoints: 0,
          allocatedStoryPoints: 0,
          averageCapacityUtilization: 0,
          iterationCount: 0
        },
        issues: []
      });

      const result = await artPlanner.planART(
        mockPI,
        mockWorkItems,
        mockDependencies,
        mockTeams
      );

      expect(result).toBeDefined();
      expect(result.programIncrement).toBe(mockPI);
      expect(result.iterations).toBeDefined();
      expect(result.artReadiness).toBeDefined();
    });

    it('should handle empty work items', async () => {
      const result = await artPlanner.planART(
        mockPI,
        [],
        { ...mockDependencies, nodes: [] },
        mockTeams
      );

      expect(result.workItems).toHaveLength(0);
      expect(result.summary.totalStoryPoints).toBe(0);
    });

    it('should validate dependencies before planning', async () => {
      // Add circular dependency
      const circularDeps = {
        ...mockDependencies,
        circularDependencies: [['story-1', 'story-2', 'story-1']],
        validation: {
          isValid: false,
          errors: ['Circular dependency detected'],
          warnings: [],
          info: []
        }
      };

      await expect(
        artPlanner.planART(mockPI, mockWorkItems, circularDeps, mockTeams)
      ).rejects.toThrow('Invalid dependency graph');
    });
  });

  describe('createIterationStructure', () => {
    it('should create correct number of iterations', () => {
      const pi: ProgramIncrement = {
        id: 'pi-1',
        name: 'PI 1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        description: 'Test PI',
        features: [],
        status: 'planning'
      };

      // Access private method through any cast (for testing only)
      const iterations = (artPlanner as any).createIterationStructure(pi);
      
      expect(iterations.length).toBe(6); // 90 days / 14 day iterations
      expect(iterations[0].name).toBe('PI 1 - Iteration 1');
      expect(iterations[0].startDate).toEqual(new Date('2024-01-01'));
    });

    it('should handle custom iteration length', () => {
      const customPlanner = new ARTPlanner({ defaultIterationLength: 10 });
      const pi: ProgramIncrement = {
        id: 'pi-1',
        name: 'PI 1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        description: 'Test PI',
        features: [],
        status: 'planning'
      };

      const iterations = (customPlanner as any).createIterationStructure(pi);
      
      expect(iterations.length).toBe(3); // 30 days / 10 day iterations
    });
  });

  describe('error handling', () => {
    it('should handle allocation failures gracefully', async () => {
      mockIterationAllocator.allocateWorkItems.mockRejectedValue(
        new Error('Allocation failed')
      );

      await expect(
        artPlanner.planART(mockPI, mockWorkItems, mockDependencies, mockTeams)
      ).rejects.toThrow('Allocation failed');
    });

    it('should handle invalid PI dates', async () => {
      const invalidPI = {
        ...mockPI,
        startDate: new Date('2024-03-31'),
        endDate: new Date('2024-01-01') // End before start
      };

      await expect(
        artPlanner.planART(invalidPI, mockWorkItems, mockDependencies, mockTeams)
      ).rejects.toThrow();
    });
  });

  describe('value optimization', () => {
    beforeEach(() => {
      artPlanner = new ARTPlanner({ enableValueOptimization: true });
    });

    it('should apply value optimization when enabled', async () => {
      mockIterationAllocator.allocateWorkItems.mockResolvedValue({
        iterations: [],
        unallocatedItems: []
      });

      mockValueAnalyzer.analyzeIterationValue.mockResolvedValue({
        iterationId: 'test',
        primaryValueStreams: [],
        workingSoftwareComponents: [],
        valueDeliveryScore: 0.8,
        userImpactAssessment: {} as any,
        businessValueRealization: {} as any
      });

      await artPlanner.planART(mockPI, mockWorkItems, mockDependencies, mockTeams);

      expect(mockValueAnalyzer.analyzeIterationValue).toHaveBeenCalled();
    });
  });
});