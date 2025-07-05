/**
 * Comprehensive Unit Tests for Dependency Mapping System (LIN-48)
 */

import { DependencyMapper } from '../../src/safe/dependency-mapper';
import { LinearDependencyManager } from '../../src/safe/linear-dependency-manager';
import {
  WorkItem,
  DependencyRelationship,
  DependencyType,
  DependencyStrength,
  DetectionMethod,
  DependencyDetectionConfig
} from '../../src/types/dependency-types';
import { Story, Feature, Epic } from '../../src/planning/models';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('DependencyMapper', () => {
  let dependencyMapper: DependencyMapper;
  let mockWorkItems: WorkItem[];

  beforeEach(() => {
    dependencyMapper = new DependencyMapper();
    mockWorkItems = createMockWorkItems();
  });

  describe('Core Dependency Detection', () => {
    it('should detect technical dependencies between work items', async () => {
      const workItems = [
        createMockStory('story-1', 'Implement user authentication API', 'Create REST API for user login and registration using OAuth'),
        createMockStory('story-2', 'Build user profile service', 'Develop user profile management service that integrates with authentication API')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      expect(result.graph.edges).toHaveLength(1);
      expect(result.graph.edges[0].type).toBe(DependencyType.REQUIRES);
      expect(result.graph.edges[0].sourceId).toBe('story-2');
      expect(result.graph.edges[0].targetId).toBe('story-1');
      expect(result.graph.edges[0].detectionMethod).toBe(DetectionMethod.SEMANTIC);
      expect(result.graph.edges[0].triggers).toContain('api');
    });

    it('should detect business dependencies from user flows', async () => {
      const workItems = [
        createMockStory('story-1', 'User registration flow', 'As a user I want to register for an account'),
        createMockStory('story-2', 'User login flow', 'As a user I want to login after registration is complete')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      expect(result.graph.edges.length).toBeGreaterThan(0);
      const businessDep = result.graph.edges.find(e => e.sourceId === 'story-2' && e.targetId === 'story-1');
      expect(businessDep).toBeDefined();
      expect(businessDep?.type).toBe(DependencyType.REQUIRES);
    });

    it('should assign appropriate confidence scores', async () => {
      const workItems = [
        createMockStory('story-1', 'Database schema migration', 'Update user table schema with new fields'),
        createMockStory('story-2', 'User profile API', 'API that requires updated database schema')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      expect(result.graph.edges).toHaveLength(1);
      expect(result.graph.edges[0].confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.graph.edges[0].strength).toBe(DependencyStrength.HARD);
    });

    it('should filter dependencies below confidence threshold', async () => {
      const config: Partial<DependencyDetectionConfig> = {
        confidenceThreshold: 0.8
      };
      const mapper = new DependencyMapper(config);
      
      const workItems = [
        createMockStory('story-1', 'Feature A', 'Some feature'),
        createMockStory('story-2', 'Feature B', 'Another feature')
      ];

      const result = await mapper.mapDependencies(workItems);

      // Should have no dependencies due to high confidence threshold
      expect(result.graph.edges).toHaveLength(0);
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect simple circular dependencies', async () => {
      const workItems = [
        createMockStory('story-1', 'Feature A depends on B', 'This feature requires Feature B'),
        createMockStory('story-2', 'Feature B depends on A', 'This feature requires Feature A')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      expect(result.graph.circularDependencies).toHaveLength(1);
      expect(result.graph.circularDependencies[0].cycle).toContain('story-1');
      expect(result.graph.circularDependencies[0].cycle).toContain('story-2');
      expect(result.graph.circularDependencies[0].severity).toBe('critical');
    });

    it('should detect complex circular dependencies', async () => {
      const workItems = [
        createMockStory('story-1', 'Feature A needs B', 'Requires Feature B'),
        createMockStory('story-2', 'Feature B needs C', 'Requires Feature C'),
        createMockStory('story-3', 'Feature C needs A', 'Requires Feature A')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      const cycle = result.graph.circularDependencies.find(cd => cd.cycle.length === 3);
      expect(cycle).toBeDefined();
      expect(cycle?.cycle).toContain('story-1');
      expect(cycle?.cycle).toContain('story-2');
      expect(cycle?.cycle).toContain('story-3');
    });

    it('should provide resolution suggestions for circular dependencies', async () => {
      const workItems = [
        createMockStory('story-1', 'Feature A blocks B', 'This feature blocks Feature B'),
        createMockStory('story-2', 'Feature B blocks A', 'This feature blocks Feature A')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      expect(result.graph.circularDependencies).toHaveLength(1);
      expect(result.graph.circularDependencies[0].resolutionSuggestions).toContain(
        'Review the necessity of each dependency in the cycle'
      );
    });
  });

  describe('Critical Path Calculation', () => {
    it('should calculate critical path for linear dependencies', async () => {
      const workItems = [
        createMockStory('story-1', 'Foundation', 'Base story', undefined, 3),
        createMockStory('story-2', 'Middle requires Foundation', 'Requires story-1', undefined, 2),
        createMockStory('story-3', 'Top requires Middle', 'Requires story-2', undefined, 5)
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      expect(result.graph.criticalPath).toContain('story-1');
      expect(result.graph.criticalPath).toContain('story-2');
      expect(result.graph.criticalPath).toContain('story-3');
      // Should be in dependency order
      const story1Index = result.graph.criticalPath.indexOf('story-1');
      const story2Index = result.graph.criticalPath.indexOf('story-2');
      const story3Index = result.graph.criticalPath.indexOf('story-3');
      expect(story1Index).toBeLessThan(story2Index);
      expect(story2Index).toBeLessThan(story3Index);
    });

    it('should consider story points in critical path calculation', async () => {
      const workItems = [
        createMockStory('high-points', 'Large story', 'Big story', undefined, 8),
        createMockStory('low-points', 'Small story', 'Small story', undefined, 1)
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      // High point story should be on critical path if no dependencies
      expect(result.graph.statistics.estimatedDuration).toBe(9); // 8 + 1
    });
  });

  describe('Graph Validation', () => {
    it('should validate healthy dependency graphs', async () => {
      const workItems = [
        createMockStory('story-1', 'Independent story', 'No dependencies'),
        createMockStory('story-2', 'Another independent story', 'Also no dependencies')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      expect(result.graph.validation.isValid).toBe(true);
      expect(result.graph.validation.errors).toHaveLength(0);
    });

    it('should report validation errors for critical circular dependencies', async () => {
      const workItems = [
        createMockStory('story-1', 'Feature A blocks B', 'This feature blocks Feature B'),
        createMockStory('story-2', 'Feature B blocks A', 'This feature blocks Feature A')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      expect(result.graph.validation.isValid).toBe(false);
      expect(result.graph.validation.errors).toHaveLength(1);
      expect(result.graph.validation.errors[0].code).toBe('CRITICAL_CIRCULAR_DEPENDENCIES');
    });

    it('should identify isolated nodes', async () => {
      const workItems = [
        createMockStory('connected-1', 'Feature A needs B', 'Requires Feature B'),
        createMockStory('connected-2', 'Feature B', 'Base feature'),
        createMockStory('isolated', 'Isolated feature', 'No connections')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      const isolatedInfo = result.graph.validation.info.find(i => i.code === 'ISOLATED_NODES');
      expect(isolatedInfo).toBeDefined();
      expect(isolatedInfo?.affectedItems).toContain('isolated');
    });
  });

  describe('Graph Statistics', () => {
    it('should calculate accurate graph statistics', async () => {
      const workItems = [
        createMockStory('story-1', 'Feature A needs B', 'Requires Feature B'),
        createMockStory('story-2', 'Feature B needs C', 'Requires Feature C'),
        createMockStory('story-3', 'Feature C', 'Base feature'),
        createMockStory('story-4', 'Independent', 'No dependencies')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      expect(result.graph.statistics.nodeCount).toBe(4);
      expect(result.graph.statistics.edgeCount).toBeGreaterThan(0);
      expect(result.graph.statistics.independentItems).toBeGreaterThanOrEqual(1);
      expect(result.graph.statistics.averageDependencies).toBeGreaterThanOrEqual(0);
    });

    it('should identify high dependency items', async () => {
      const workItems = [
        createMockStory('popular', 'Popular feature', 'Everyone depends on this'),
        createMockStory('dep-1', 'Dependent 1 needs popular', 'Requires popular feature'),
        createMockStory('dep-2', 'Dependent 2 needs popular', 'Requires popular feature'),
        createMockStory('dep-3', 'Dependent 3 needs popular', 'Requires popular feature'),
        createMockStory('dep-4', 'Dependent 4 needs popular', 'Requires popular feature')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      // Popular feature should be identified as high dependency item
      expect(result.graph.statistics.highDependencyItems.length).toBeGreaterThan(0);
    });
  });

  describe('Linear Integration Preparation', () => {
    it('should prepare Linear relationships from dependencies', async () => {
      const workItems = [
        createMockStory('story-1', 'Database setup', 'Setup database'),
        createMockStory('story-2', 'API using database', 'API requires database')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      expect(result.linearRelationships).toHaveLength(1);
      expect(result.linearRelationships[0].sourceIssueId).toBe('story-2');
      expect(result.linearRelationships[0].targetIssueId).toBe('story-1');
      expect(result.linearRelationships[0].relationType).toBe('blocked_by');
      expect(result.linearRelationships[0].comment).toContain('Confidence:');
    });

    it('should map dependency types to correct Linear relationship types', async () => {
      const mapper = new DependencyMapper();
      
      // Test different mapping scenarios through the public interface
      const blockingWorkItems = [
        createMockStory('story-1', 'Blocking feature', 'This blocks other work'),
        createMockStory('story-2', 'Feature blocked by 1', 'This is blocked by blocking feature')
      ];

      const result = await mapper.mapDependencies(blockingWorkItems);
      
      if (result.linearRelationships.length > 0) {
        const relType = result.linearRelationships[0].relationType;
        expect(['blocks', 'blocked_by', 'related']).toContain(relType);
      }
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle empty work item list', async () => {
      const result = await dependencyMapper.mapDependencies([]);

      expect(result.graph.nodes).toHaveLength(0);
      expect(result.graph.edges).toHaveLength(0);
      expect(result.summary.totalDependencies).toBe(0);
    });

    it('should handle work items with minimal content', async () => {
      const workItems = [
        createMockStory('story-1', 'A', 'B'),
        createMockStory('story-2', 'C', 'D')
      ];

      const result = await dependencyMapper.mapDependencies(workItems);

      expect(result.graph.nodes).toHaveLength(2);
      expect(result.summary.processingTime).toBeGreaterThan(0);
    });

    it('should complete processing within reasonable time', async () => {
      const workItems = Array.from({ length: 50 }, (_, i) => 
        createMockStory(`story-${i}`, `Feature ${i}`, `Description for feature ${i}`)
      );

      const startTime = Date.now();
      const result = await dependencyMapper.mapDependencies(workItems);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.graph.nodes).toHaveLength(50);
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom configuration', async () => {
      const config: Partial<DependencyDetectionConfig> = {
        confidenceThreshold: 0.9,
        enableSemanticAnalysis: false,
        inheritParentDependencies: false
      };
      
      const mapper = new DependencyMapper(config);
      const workItems = createMockWorkItems();

      const result = await mapper.mapDependencies(workItems);

      // With high confidence threshold and disabled semantic analysis,
      // should have fewer dependencies
      expect(result.graph.edges.length).toBeLessThanOrEqual(1);
    });

    it('should handle parent-child dependencies when enabled', async () => {
      const config: Partial<DependencyDetectionConfig> = {
        inheritParentDependencies: true
      };
      
      const mapper = new DependencyMapper(config);
      const workItems = [
        createMockFeature('feature-1', 'Parent feature', 'Parent feature'),
        createMockStory('story-1', 'Child story', 'Child story', 'feature-1')
      ];

      const result = await mapper.mapDependencies(workItems);

      const inheritedDep = result.graph.edges.find(e => 
        e.detectionMethod === DetectionMethod.INHERITED
      );
      expect(inheritedDep).toBeDefined();
      expect(inheritedDep?.sourceId).toBe('story-1');
      expect(inheritedDep?.targetId).toBe('feature-1');
    });
  });
});

describe('LinearDependencyManager', () => {
  let mockLinearClient: any;
  let dependencyManager: LinearDependencyManager;

  beforeEach(() => {
    mockLinearClient = {
      createIssueRelation: jest.fn().mockResolvedValue({}),
      createComment: jest.fn().mockResolvedValue({})
    };
    
    dependencyManager = new LinearDependencyManager(mockLinearClient);
  });

  describe('Relationship Creation', () => {
    it('should create Linear relationships from dependencies', async () => {
      const dependencies = [createMockDependency('story-1', 'story-2')];

      const result = await dependencyManager.createDependencyRelationships(dependencies);

      expect(result.created).toBe(1);
      expect(result.failed).toHaveLength(0);
      expect(mockLinearClient.createIssueRelation).toHaveBeenCalledWith({
        issueId: 'story-1',
        relatedIssueId: 'story-2',
        type: 'blocked_by'
      });
    });

    it('should handle batch processing', async () => {
      const dependencies = Array.from({ length: 25 }, (_, i) => 
        createMockDependency(`story-${i}`, `story-${i + 1}`)
      );

      const result = await dependencyManager.createDependencyRelationships(dependencies);

      expect(result.created).toBe(25);
      expect(mockLinearClient.createIssueRelation).toHaveBeenCalledTimes(25);
    });

    it('should handle dry run mode', async () => {
      const config = { dryRun: true };
      const manager = new LinearDependencyManager(mockLinearClient, config);
      const dependencies = [createMockDependency('story-1', 'story-2')];

      const result = await manager.createDependencyRelationships(dependencies);

      expect(result.created).toBe(1);
      expect(result.dryRun).toBe(true);
      expect(mockLinearClient.createIssueRelation).not.toHaveBeenCalled();
    });

    it('should retry on failures', async () => {
      mockLinearClient.createIssueRelation
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockResolvedValueOnce({});

      const dependencies = [createMockDependency('story-1', 'story-2')];

      const result = await dependencyManager.createDependencyRelationships(dependencies);

      expect(result.created).toBe(1);
      expect(mockLinearClient.createIssueRelation).toHaveBeenCalledTimes(2);
    });

    it('should handle permanent failures gracefully', async () => {
      mockLinearClient.createIssueRelation.mockRejectedValue(new Error('Permanent error'));

      const dependencies = [createMockDependency('story-1', 'story-2')];

      const result = await dependencyManager.createDependencyRelationships(dependencies);

      expect(result.created).toBe(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('Permanent error');
    });
  });

  describe('Comment Generation', () => {
    it('should generate detailed comments when enabled', async () => {
      const config = { includeDetailedComments: true };
      const manager = new LinearDependencyManager(mockLinearClient, config);
      const dependencies = [createMockDependency('story-1', 'story-2')];

      await manager.createDependencyRelationships(dependencies);

      expect(mockLinearClient.createComment).toHaveBeenCalledWith({
        issueId: 'story-1',
        body: expect.stringContaining('🔗 **Dependency**:')
      });
    });

    it('should skip detailed comments when disabled', async () => {
      const config = { includeDetailedComments: false };
      const manager = new LinearDependencyManager(mockLinearClient, config);
      const dependencies = [createMockDependency('story-1', 'story-2')];

      await manager.createDependencyRelationships(dependencies);

      expect(mockLinearClient.createComment).toHaveBeenCalledWith({
        issueId: 'story-1',
        body: 'Test dependency rationale'
      });
    });
  });
});

// Helper functions for creating mock data

function createMockWorkItems(): WorkItem[] {
  return [
    createMockStory('story-1', 'User authentication', 'Implement user login and registration'),
    createMockStory('story-2', 'User profile', 'Create user profile management'),
    createMockFeature('feature-1', 'User management', 'Complete user management system')
  ];
}

function createMockStory(
  id: string, 
  title: string, 
  description: string, 
  parentId?: string,
  storyPoints: number = 3
): Story {
  return {
    id,
    title,
    description,
    type: 'story',
    storyPoints,
    priority: 3,
    parentId,
    acceptanceCriteria: [`Given ${title}, when implemented, then ${description}`],
    status: 'todo',
    teamId: 'team-1',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function createMockFeature(
  id: string, 
  title: string, 
  description: string,
  parentId?: string
): Feature {
  return {
    id,
    title,
    description,
    type: 'feature',
    parentId,
    businessValue: 'High business value',
    acceptanceCriteria: [`Feature ${title} provides ${description}`],
    status: 'todo',
    teamId: 'team-1',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function createMockDependency(sourceId: string, targetId: string): DependencyRelationship {
  return {
    id: `dep_${sourceId}_${targetId}`,
    sourceId,
    targetId,
    type: DependencyType.REQUIRES,
    strength: DependencyStrength.HARD,
    rationale: 'Test dependency rationale',
    detectionMethod: DetectionMethod.SEMANTIC,
    confidence: 0.8,
    triggers: ['test', 'dependency'],
    detectedAt: new Date()
  };
}