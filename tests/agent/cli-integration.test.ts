/**
 * CLI Integration Tests
 * 
 * Tests integration between CLI executor and actual SAFe modules.
 */

import { CLIExecutor } from '../../src/agent/cli-executor';
import { LinearClientWrapper } from '../../src/linear/client';
import { ParsedCommand, CommandIntent, IssueContext } from '../../src/agent/types/command-types';
import { CommandParameters } from '../../src/agent/types/parameter-types';

// Mock external dependencies
jest.mock('../../src/linear/client');
jest.mock('../../src/db/connection');
jest.mock('../../src/utils/logger');

// For integration tests, we'll mock SAFe modules with simplified implementations
// This allows us to test the integration flow without complex module dependencies
jest.mock('../../src/safe/art-planner', () => ({
  ARTPlanner: jest.fn().mockImplementation(() => ({
    planART: jest.fn().mockResolvedValue({
      programIncrement: { id: 'PI-2025-Q1' },
      iterations: [
        { id: 'iter-1', name: 'Iteration 1' },
        { id: 'iter-2', name: 'Iteration 2' },
        { id: 'iter-3', name: 'Iteration 3' },
        { id: 'iter-4', name: 'Iteration 4' },
        { id: 'iter-5', name: 'Iteration 5' },
        { id: 'iter-6', name: 'Iteration 6' }
      ],
      workItems: [],
      dependencies: { edges: [] },
      artReadiness: { 
        readinessScore: 0.85,
        criticalBlockers: [],
        recommendations: ['Continue monitoring team velocity', 'Review dependency management']
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
      parentStory: { id: 'LIN-123', title: 'Original Story' },
      subStories: [
        { id: 'sub-1', title: 'Sub-story 1', storyPoints: 3, type: 'story', acceptanceCriteria: ['AC1'] },
        { id: 'sub-2', title: 'Sub-story 2', storyPoints: 2, type: 'story', acceptanceCriteria: ['AC2'] }
      ],
      decompositionRationale: 'Story decomposed based on functional boundaries',
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
      primaryValueStreams: [{ id: 'vs-1', name: 'Customer Features', type: 'customer-facing' }],
      workingSoftwareComponents: [{ id: 'ws-1', name: 'User Dashboard', type: 'feature' }],
      valueDeliveryScore: 0.87,
      userImpactAssessment: {
        impactedUserCount: 1000,
        estimatedAdoptionRate: 0.75,
        impactTypes: ['new-feature'],
        userSegments: ['enterprise'],
        valuePerUser: 50
      },
      businessValueRealization: {
        estimatedRevenue: 50000,
        costSavings: 20000,
        timeToValue: 30,
        confidenceLevel: 0.8,
        valueDrivers: ['efficiency'],
        assumptions: []
      },
      deliveryRisks: [],
      improvementRecommendations: ['Focus on user onboarding'],
      confidenceScore: 0.85
    })
  }))
}));

jest.mock('../../src/safe/dependency-mapper', () => ({
  DependencyMapper: jest.fn().mockImplementation(() => ({
    mapDependencies: jest.fn().mockResolvedValue({
      graph: {
        nodes: [{ id: 'node-1', data: {} }],
        edges: [],
        criticalPath: [],
        circularDependencies: [],
        validation: { warnings: [], errors: [] }
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
      improvementActions: [
        {
          id: 'action-1',
          category: 'capacity',
          action: 'Balance team workload',
          priority: 'high',
          estimatedImpact: 0.15,
          effortRequired: 'medium',
          dependencies: [],
          risks: []
        }
      ],
      readinessScoreImprovement: 0.1,
      valueDeliveryImprovement: 0.15,
      riskReduction: {
        riskReductionPercentage: 0.2,
        risksEliminated: 2,
        remainingHighRisks: 1,
        mitigationStrategies: ['Increase buffer capacity']
      },
      implementationComplexity: 'medium'
    })
  }))
}));

describe('CLI Executor Integration', () => {
  let executor: CLIExecutor;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;
  let mockDbConnection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a properly mocked LinearClientWrapper with all required methods
    mockLinearClient = {
      getIssue: jest.fn().mockResolvedValue({
        id: 'issue-123',
        identifier: 'LIN-123',
        title: 'Test Story',
        description: 'Test description with acceptance criteria',
        estimate: 8,
        state: { name: 'Todo' },
        team: { id: 'LIN', name: 'Linear Team' },
        labels: { nodes: [{ name: 'story' }] }
      }),
      getIssues: jest.fn().mockResolvedValue({
        nodes: [{
          id: 'issue-123',
          identifier: 'LIN-123',
          title: 'Test Story',
          estimate: 5,
          state: { name: 'Todo' },
          team: { id: 'LIN', name: 'Linear Team' },
          labels: { nodes: [{ name: 'story' }, { name: 'PI-2025-Q1' }] }
        }]
      }),
      getTeam: jest.fn().mockResolvedValue({
        id: 'LIN',
        key: 'LIN',
        name: 'Linear Team'
      }),
      getTeams: jest.fn().mockResolvedValue({
        nodes: [{
          id: 'LIN',
          key: 'LIN',
          name: 'Linear Team'
        }]
      }),
      getIssueRelations: jest.fn().mockResolvedValue({
        nodes: []
      })
    } as any;
    
    mockDbConnection = {}; // Mock database connection
    
    executor = new CLIExecutor(mockLinearClient, mockDbConnection);
  });

  describe('SAFe Module Integration', () => {
    it('should integrate with ARTPlanner module', async () => {
      const command = createTestCommand(CommandIntent.ART_PLAN, {
        piId: 'PI-2025-Q1',
        teamId: 'LIN',
        iterations: 6,
        bufferCapacity: 0.2
      });

      const result = await executor.execute(command);
      
      // Log the result for debugging
      if (!result.success) {
        console.log('ART Planning failed:', result.error);
      }

      // Verify module was called
      expect(result.success).toBe(true);
      expect(result.metadata?.moduleVersion).toBe('art-planner-v1.0');
      
      // Verify response structure
      expect(result.data).toBeDefined();
      expect(result.data.plan).toBeDefined();
    });

    it('should integrate with StoryDecompositionEngine module', async () => {
      const command = createTestCommand(CommandIntent.STORY_DECOMPOSE, {
        storyId: 'LIN-123',
        targetSize: 5,
        explicit: { storyId: true, targetSize: true }
      });

      const result = await executor.execute(command);

      // Verify module was called
      expect(result.success).toBe(true);
      expect(result.metadata?.moduleVersion).toBe('story-decomposition-v1.0');
      
      // Verify response structure
      expect(result.data.decomposition).toBeDefined();
      expect(result.data.decomposition.originalStoryId).toBe('LIN-123');
      expect(result.data.decomposition.targetSize).toBe(5);
    });

    it('should integrate with ValueDeliveryAnalyzer module', async () => {
      const command = createTestCommand(CommandIntent.VALUE_ANALYZE, {
        scope: { type: 'team', id: 'LIN', explicit: true },
        timeframe: { type: 'current', period: 'pi' },
        depth: 'detailed'
      });

      const result = await executor.execute(command);

      // Verify module was called
      expect(result.success).toBe(true);
      expect(result.metadata?.moduleVersion).toBe('value-analyzer-v1.0');
      
      // Verify response structure
      expect(result.data.analysis).toBeDefined();
      expect(result.data.analysis.valueScore).toBeDefined();
    });

    it('should integrate with DependencyMapper module', async () => {
      const command = createTestCommand(CommandIntent.DEPENDENCY_MAP, {
        fromId: 'LIN-123',
        direction: 'both',
        maxDepth: 3
      });

      const result = await executor.execute(command);

      // Verify module was called
      expect(result.success).toBe(true);
      expect(result.metadata?.moduleVersion).toBe('dependency-mapper-v1.0');
      
      // Verify response structure
      expect(result.data.mapping).toBeDefined();
      expect(result.data.mapping.direction).toBe('both');
    });
  });

  describe('End-to-End Command Flow', () => {
    it('should execute complete command flow with parameter translation', async () => {
      const command = createTestCommand(CommandIntent.ART_PLAN, {
        piId: 'PI-2025-Q1',
        teamId: 'LIN',
        // Test parameter translation
        timeframe: { 
          type: 'current', 
          period: 'pi' 
        }
      });

      const result = await executor.execute(command);

      // Verify complete flow
      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      
      // Verify parameter translation worked
      expect(result.parameters.iterations).toBe(6); // Default applied
      expect(result.parameters.bufferCapacity).toBe(0.2); // Default applied
      expect(result.parameters.enableValueOptimization).toBe(true); // Default applied
    });

    it('should handle complex parameter structures', async () => {
      const command = createTestCommand(CommandIntent.VALUE_ANALYZE, {
        scope: {
          type: 'project',
          id: 'proj-123',
          name: 'Test Project',
          explicit: true
        },
        timeframe: {
          type: 'relative',
          value: 'last 30 days'
        },
        depth: 'full',
        format: 'table'
      });

      const result = await executor.execute(command);

      expect(result.success).toBe(true);
      // The parameters should be preserved from the command
      expect(command.parameters?.depth).toBe('full');
      expect(command.parameters?.format).toBe('table');
      // Verify they were used in execution
      expect(result.data.analysis.scope).toBeDefined();
    });
  });

  describe('Response Formatting Integration', () => {
    it('should format ART planning response with rich markdown', async () => {
      const command = createTestCommand(CommandIntent.ART_PLAN, {
        piId: 'PI-2025-Q1',
        teamId: 'LIN'
      });

      const response = await executor.executeAndFormat(command);

      // Verify formatted response
      expect(response.success).toBe(true);
      expect(response.message).toContain('## 📅 ART Planning Complete');
      expect(response.message).toContain('**Program Increment**: PI-2025-Q1');
      expect(response.message).toContain('**Team**: LIN');
      expect(response.message).toContain('### 🎯 Next Steps');
    });

    it('should format story decomposition response', async () => {
      const command = createTestCommand(CommandIntent.STORY_DECOMPOSE, {
        storyId: 'LIN-123',
        targetSize: 5
      });

      const response = await executor.executeAndFormat(command);

      expect(response.success).toBe(true);
      expect(response.message).toContain('## 📝 Story Decomposition Complete');
      expect(response.message).toContain('**Original Story**: LIN-123');
      expect(response.message).toContain('**Target Size**: 5 points');
    });

    it('should include execution metadata in response', async () => {
      const command = createTestCommand(CommandIntent.STATUS_CHECK, {
        format: 'markdown'
      });

      const response = await executor.executeAndFormat(command);

      expect(response.success).toBe(true);
      expect(response.message).toMatch(/_Execution time: \d+ms/);
      expect(response.message).toMatch(/ID: exec_\d+_[a-z0-9]+/);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing required parameters gracefully', async () => {
      const command = createTestCommand(CommandIntent.STORY_DECOMPOSE, {
        // Missing required storyId
        targetSize: 5
      });

      const result = await executor.execute(command);

      // Should still return a result (not throw)
      expect(result).toBeDefined();
      expect(result.metadata?.executionId).toBeDefined();
    });

    it('should handle invalid parameter values', async () => {
      const command = createTestCommand(CommandIntent.DEPENDENCY_MAP, {
        direction: 'invalid' as any,
        maxDepth: 999
      });

      const result = await executor.execute(command);

      // Should handle gracefully
      expect(result).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance', () => {
    it('should execute commands within reasonable time', async () => {
      const command = createTestCommand(CommandIntent.HELP, {});

      const startTime = Date.now();
      const result = await executor.execute(command);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Help should be fast
      expect(result.executionTime).toBeLessThan(100);
    });

    it('should track execution time accurately', async () => {
      const command = createTestCommand(CommandIntent.STATUS_CHECK, {});

      const result = await executor.execute(command);

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThan(5000); // Reasonable upper bound
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
    teamId: 'LIN',
    teamName: 'Linear Team',
    projectId: 'proj-123',
    projectName: 'Test Project',
    labels: ['pi-2025-q1', 'safe'],
    currentPI: 'PI-2025-Q1',
    currentIteration: 'IT-2025-01'
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
    rawText: `test ${intent} command`,
    normalizedText: `test ${intent} command`,
    context,
    timestamp: new Date(),
    metadata: {
      processingTime: 10
    },
    parameters: fullParameters
  };
}