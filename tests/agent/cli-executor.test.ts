/**
 * CLI Executor Tests
 * 
 * Tests for the CLI executor bridge that connects command intelligence to SAFe modules.
 */

import { CLIExecutor, ExecutionResult } from '../../src/agent/cli-executor';
import { LinearClientWrapper } from '../../src/linear/client';
import { ParsedCommand, CommandIntent, IssueContext } from '../../src/agent/types/command-types';
import { CommandParameters } from '../../src/agent/types/parameter-types';
import * as logger from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/linear/client');
jest.mock('../../src/db/connection');
jest.mock('../../src/utils/logger');

// Mock SAFe modules with proper implementations
jest.mock('../../src/safe/art-planner', () => ({
  ARTPlanner: jest.fn().mockImplementation(() => ({
    planART: jest.fn().mockResolvedValue({
      programIncrement: { id: 'PI-2025-Q1' },
      iterations: [{}, {}, {}, {}, {}, {}], // 6 iterations
      workItems: [],
      dependencies: { edges: [] },
      artReadiness: { 
        readinessScore: 0.85,
        criticalBlockers: [],
        recommendations: []
      },
      summary: {
        totalStoryPoints: 100,
        averageCapacityUtilization: 0.75,
        valueDeliveryConfidence: 0.8
      }
    })
  }))
}));

jest.mock('../../src/safe/story-decomposition-engine', () => ({
  StoryDecompositionEngine: jest.fn().mockImplementation(() => ({
    decomposeStory: jest.fn().mockResolvedValue({
      parentStory: { id: 'LIN-123' },
      subStories: [
        { title: 'Sub-story 1', storyPoints: 3, type: 'story', acceptanceCriteria: [] },
        { title: 'Sub-story 2', storyPoints: 2, type: 'story', acceptanceCriteria: [] }
      ],
      decompositionRationale: 'Story decomposed successfully',
      pointsDistribution: [3, 2],
      criteriaMapping: [],
      decompositionId: 'decomp-123',
      timestamp: new Date()
    })
  }))
}));

jest.mock('../../src/safe/value-delivery-analyzer', () => ({
  ValueDeliveryAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeIterationValue: jest.fn().mockResolvedValue({
      iterationId: 'current',
      primaryValueStreams: [],
      workingSoftwareComponents: [],
      valueDeliveryScore: 0.87,
      userImpactAssessment: {
        impactedUserCount: 1000,
        estimatedAdoptionRate: 0.75
      },
      businessValueRealization: {
        estimatedRevenue: 50000,
        costSavings: 20000
      },
      deliveryRisks: [],
      improvementRecommendations: [],
      confidenceScore: 0.85
    })
  }))
}));

jest.mock('../../src/safe/dependency-mapper', () => ({
  DependencyMapper: jest.fn().mockImplementation(() => ({
    mapDependencies: jest.fn().mockResolvedValue({
      graph: {
        nodes: [],
        edges: [],
        criticalPath: [],
        circularDependencies: [],
        validation: { warnings: [] }
      },
      linearRelationships: [],
      summary: {
        totalDependencies: 0,
        technicalDependencies: 0,
        businessDependencies: 0,
        circularDependencies: 0,
        validationErrors: 0,
        processingTime: 100
      },
      timestamp: new Date()
    })
  }))
}));

jest.mock('../../src/safe/art-readiness-optimizer', () => ({
  ARTReadinessOptimizer: jest.fn().mockImplementation(() => ({
    optimizeARTReadiness: jest.fn().mockResolvedValue({
      originalPlan: {},
      optimizedIterations: [],
      improvementActions: [],
      readinessScoreImprovement: 0.1,
      valueDeliveryImprovement: 0.15,
      riskReduction: {
        riskReductionPercentage: 0.2,
        risksEliminated: 2,
        remainingHighRisks: 1,
        mitigationStrategies: []
      },
      implementationComplexity: 'medium'
    })
  }))
}));

describe('CLIExecutor', () => {
  let executor: CLIExecutor;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;
  let mockDbConnection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a properly mocked LinearClientWrapper
    mockLinearClient = {
      getIssue: jest.fn().mockResolvedValue({
        id: 'issue-123',
        identifier: 'LIN-123',
        title: 'Test Story',
        description: 'Test description',
        estimate: 8,
        state: { name: 'Todo' },
        team: { id: 'team-123', name: 'Test Team' },
        labels: { nodes: [{ name: 'story' }] }
      }),
      getIssues: jest.fn().mockResolvedValue({
        nodes: [{
          id: 'issue-123',
          identifier: 'LIN-123',
          title: 'Test Story',
          estimate: 5,
          state: { name: 'Todo' },
          team: { id: 'team-123', name: 'Test Team' },
          labels: { nodes: [{ name: 'story' }] }
        }]
      }),
      getTeam: jest.fn().mockResolvedValue({
        id: 'team-123',
        key: 'TEST',
        name: 'Test Team'
      }),
      getTeams: jest.fn().mockResolvedValue({
        nodes: [{
          id: 'team-123',
          key: 'TEST',
          name: 'Test Team'
        }]
      }),
      getIssueRelations: jest.fn().mockResolvedValue({
        nodes: []
      })
    } as any;
    
    mockDbConnection = {}; // Mock database connection
    
    executor = new CLIExecutor(mockLinearClient, mockDbConnection);
  });

  describe('Command Execution', () => {
    it('should execute ART_PLAN command successfully', async () => {
      const command = createTestCommand(CommandIntent.ART_PLAN, {
        piId: 'PI-2025-Q1',
        teamId: 'LIN'
      });

      const result = await executor.execute(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('art-plan');
      expect(result.parameters.piId).toBe('PI-2025-Q1');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.metadata?.executionId).toBeDefined();
    });

    it('should execute STORY_DECOMPOSE command successfully', async () => {
      const command = createTestCommand(CommandIntent.STORY_DECOMPOSE, {
        storyId: 'LIN-123',
        targetSize: 5
      });

      const result = await executor.execute(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('story-decompose');
      expect(result.parameters.storyId).toBe('LIN-123');
      expect(result.data.decomposition.targetSize).toBe(5);
    });

    it('should execute VALUE_ANALYZE command successfully', async () => {
      const command = createTestCommand(CommandIntent.VALUE_ANALYZE, {
        scope: { type: 'team', id: 'LIN', explicit: true },
        timeframe: { type: 'current', period: 'pi' }
      });

      const result = await executor.execute(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('value-analyze');
      expect(result.data.analysis.scope).toBeDefined();
    });

    it('should execute DEPENDENCY_MAP command successfully', async () => {
      // Ensure getIssue returns data for the specific ID
      mockLinearClient.getIssue.mockResolvedValue({
        id: 'LIN-123',
        identifier: 'LIN-123',
        title: 'Test Story',
        description: 'Test description',
        estimate: 8,
        state: { name: 'Todo' },
        team: { id: 'team-123', name: 'Test Team' },
        labels: { nodes: [{ name: 'story' }] }
      });

      const command = createTestCommand(CommandIntent.DEPENDENCY_MAP, {
        fromId: 'LIN-123',
        direction: 'upstream',
        maxDepth: 3
      });

      const result = await executor.execute(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('dependency-map');
      expect(result.data.mapping.direction).toBe('upstream');
    });

    it('should execute STATUS_CHECK command successfully', async () => {
      const command = createTestCommand(CommandIntent.STATUS_CHECK, {
        format: 'markdown'
      });

      const result = await executor.execute(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('status-check');
      expect(result.data.status.format).toBe('markdown');
    });

    it('should execute HELP command successfully', async () => {
      const command = createTestCommand(CommandIntent.HELP, {});

      const result = await executor.execute(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe('help');
      expect(result.data.commands).toBeDefined();
      expect(Array.isArray(result.data.commands)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported command intent', async () => {
      const command = createTestCommand(CommandIntent.UNKNOWN, {});

      const result = await executor.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported command intent');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle execution timeout', async () => {
      // Create a new executor instance with a short timeout
      const shortTimeoutExecutor = new CLIExecutor(mockLinearClient, mockDbConnection);
      (shortTimeoutExecutor as any).EXECUTION_TIMEOUT = 100; // 100ms timeout

      // Mock the specific method to delay
      jest.spyOn(shortTimeoutExecutor as any, 'executeCommand').mockImplementation(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return { success: true };
        }
      );

      const command = createTestCommand(CommandIntent.ART_PLAN, {
        piId: 'PI-2025-Q1'
      });

      const result = await shortTimeoutExecutor.execute(command);

      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('took too long');
    });

    it('should handle module execution errors', async () => {
      const command = createTestCommand(CommandIntent.STORY_DECOMPOSE, {
        storyId: 'INVALID-ID'
      });

      // Mock the Linear client to throw an error
      mockLinearClient.getIssue.mockRejectedValueOnce(new Error('Story not found'));

      const result = await executor.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should format user-friendly error messages', async () => {
      const command = createTestCommand(CommandIntent.ART_PLAN, {
        piId: 'PI-2025-Q1'
      });

      // Create a new executor with mocked methods that throw errors
      const errorExecutor = new CLIExecutor(mockLinearClient, mockDbConnection);
      
      // Mock the fetchWorkItemsForPI to throw permission error
      jest.spyOn(errorExecutor as any, 'fetchWorkItemsForPI').mockRejectedValueOnce(
        new Error('permission denied')
      );

      const result = await errorExecutor.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('do not have permission');
    });
  });

  describe('Parameter Translation', () => {
    it('should translate parameters for ART planning', async () => {
      const command = createTestCommand(CommandIntent.ART_PLAN, {
        piId: 'PI-2025-Q1',
        teamId: 'LIN'
      });

      const result = await executor.execute(command);

      // Verify the execution was successful
      expect(result.success).toBe(true);
      
      // Check the data returned includes the expected iterations count
      expect(result.data.plan.iterations).toBe(6);
      
      // The original parameters are preserved as passed
      expect(result.parameters.piId).toBe('PI-2025-Q1');
      expect(result.parameters.teamId).toBe('LIN');
    });

    it('should translate targetSize to maxPoints for story decomposition', async () => {
      const command = createTestCommand(CommandIntent.STORY_DECOMPOSE, {
        storyId: 'LIN-123',
        targetSize: 8
      });

      const result = await executor.execute(command);

      // Verify parameter translation
      expect(result.parameters.maxPoints).toBe(8);
    });

    it('should apply defaults for value analysis', async () => {
      const command = createTestCommand(CommandIntent.VALUE_ANALYZE, {});

      const result = await executor.execute(command);

      // Verify defaults
      expect(result.parameters.depth).toBe('summary');
    });
  });

  describe('Response Formatting', () => {
    it('should format response for Linear', async () => {
      const command = createTestCommand(CommandIntent.ART_PLAN, {
        piId: 'PI-2025-Q1',
        teamId: 'LIN'
      });

      const response = await executor.executeAndFormat(command);

      expect(response.success).toBe(true);
      expect(response.message).toContain('ART Planning Complete');
      expect(response.message).toContain('PI-2025-Q1');
      expect(response.message).toContain('Readiness Score');
    });

    it('should format error response', async () => {
      const command = createTestCommand(CommandIntent.UNKNOWN, {});

      const response = await executor.executeAndFormat(command);

      expect(response.success).toBe(false);
      expect(response.message).toContain('Command Execution Failed');
      expect(response.message).toContain('Suggestions');
    });
  });

  describe('Execution Metadata', () => {
    it('should include execution metadata', async () => {
      const command = createTestCommand(CommandIntent.STATUS_CHECK, {});

      const result = await executor.execute(command);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.executionId).toMatch(/^exec_\d+_[a-z0-9]+$/);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThan(1000); // Should be fast
    });

    it('should track module versions', async () => {
      const command = createTestCommand(CommandIntent.ART_PLAN, {
        piId: 'PI-2025-Q1'
      });

      const result = await executor.execute(command);

      expect(result.metadata?.moduleVersion).toBe('art-planner-v1.0');
    });
  });

  describe('All Command Intents', () => {
    const testCases = [
      { intent: CommandIntent.ART_PLAN, params: { piId: 'PI-2025-Q1' } },
      { intent: CommandIntent.ART_OPTIMIZE, params: { teamId: 'LIN' } },
      { intent: CommandIntent.STORY_DECOMPOSE, params: { storyId: 'LIN-123' } },
      { intent: CommandIntent.STORY_SCORE, params: { storyId: 'LIN-123' } },
      { intent: CommandIntent.VALUE_ANALYZE, params: {} },
      { intent: CommandIntent.DEPENDENCY_MAP, params: {} },
      { intent: CommandIntent.STATUS_CHECK, params: {} },
      { intent: CommandIntent.HELP, params: {} }
    ];

    testCases.forEach(({ intent, params }) => {
      it(`should handle ${intent} command`, async () => {
        const command = createTestCommand(intent, params);
        const result = await executor.execute(command);
        
        expect(result).toBeDefined();
        expect(result.command).toBeDefined();
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

// Helper function to create test commands
function createTestCommand(
  intent: CommandIntent,
  parameters: Partial<CommandParameters>
): ParsedCommand {
  const context: IssueContext = {
    issueId: 'issue-123',
    issueIdentifier: 'LIN-123',
    issueTitle: 'Test Issue',
    teamId: 'team-123',
    teamName: 'Test Team',
    labels: [],
    currentPI: 'PI-2025-Q1'
  };

  // Ensure explicit property is always present
  const fullParameters: CommandParameters = {
    ...parameters,
    explicit: parameters.explicit || {}
  };

  // Auto-fill explicit for provided parameters
  Object.keys(parameters).forEach(key => {
    if (key !== 'explicit' && parameters[key as keyof CommandParameters] !== undefined) {
      fullParameters.explicit[key] = true;
    }
  });

  return {
    intent,
    confidence: 0.95,
    rawText: 'test command',
    normalizedText: 'test command',
    context,
    timestamp: new Date(),
    metadata: {
      processingTime: 10
    },
    parameters: fullParameters
  };
}