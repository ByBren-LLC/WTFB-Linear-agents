/**
 * CLI Integration Tests
 * 
 * Tests integration between CLI executor and actual SAFe modules.
 */

import { CLIExecutor } from '../../src/agent/cli-executor';
import { LinearClientWrapper } from '../../src/linear/client';
import { DatabaseConnection } from '../../src/db/connection';
import { ParsedCommand, CommandIntent, IssueContext } from '../../src/agent/types/command-types';
import { CommandParameters } from '../../src/agent/types/parameter-types';

// Mock only external dependencies, not SAFe modules
jest.mock('../../src/linear/client');
jest.mock('../../src/db/connection');
jest.mock('../../src/utils/logger');

describe('CLI Executor Integration', () => {
  let executor: CLIExecutor;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;
  let mockDbConnection: jest.Mocked<DatabaseConnection>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLinearClient = new LinearClientWrapper('test-key') as jest.Mocked<LinearClientWrapper>;
    mockDbConnection = {} as jest.Mocked<DatabaseConnection>;
    
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
      expect(result.executionTime).toBeGreaterThan(0);
      
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
      expect(result.parameters.depth).toBe('full');
      expect(result.parameters.format).toBe('table');
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
      expect(response.message).toMatch(/_ID: exec_\d+_[a-z0-9]+_/);
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
      expect(result.executionTime).toBeGreaterThan(0);
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

      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(5000); // Reasonable upper bound
    });
  });
});

// Helper function to create test commands
function createTestCommand(
  intent: CommandIntent,
  parameters: CommandParameters
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
    parameters
  };
}