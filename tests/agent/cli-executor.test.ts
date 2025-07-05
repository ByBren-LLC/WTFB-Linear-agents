/**
 * CLI Executor Tests
 * 
 * Tests for the CLI executor bridge that connects command intelligence to SAFe modules.
 */

import { CLIExecutor, ExecutionResult } from '../../src/agent/cli-executor';
import { LinearClientWrapper } from '../../src/linear/client';
import { DatabaseConnection } from '../../src/db/connection';
import { ParsedCommand, CommandIntent, IssueContext } from '../../src/agent/types/command-types';
import { CommandParameters } from '../../src/agent/types/parameter-types';
import * as logger from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/linear/client');
jest.mock('../../src/db/connection');
jest.mock('../../src/utils/logger');
jest.mock('../../src/safe/art-planner');
jest.mock('../../src/safe/story-decomposition-engine');
jest.mock('../../src/safe/value-delivery-analyzer');
jest.mock('../../src/safe/dependency-mapper');
jest.mock('../../src/safe/art-readiness-optimizer');

describe('CLIExecutor', () => {
  let executor: CLIExecutor;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;
  let mockDbConnection: jest.Mocked<DatabaseConnection>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLinearClient = new LinearClientWrapper('test-key') as jest.Mocked<LinearClientWrapper>;
    mockDbConnection = {} as jest.Mocked<DatabaseConnection>;
    
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
      // Mock a long-running operation
      const command = createTestCommand(CommandIntent.ART_PLAN, {
        piId: 'PI-2025-Q1'
      });

      // Override timeout for testing
      (executor as any).EXECUTION_TIMEOUT = 100; // 100ms timeout

      // Mock ART planner to delay
      jest.doMock('../../src/safe/art-planner', () => ({
        ARTPlanner: class {
          async planART() {
            await new Promise(resolve => setTimeout(resolve, 200));
            return {};
          }
        }
      }));

      const result = await executor.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should handle module execution errors', async () => {
      const command = createTestCommand(CommandIntent.STORY_DECOMPOSE, {
        storyId: 'INVALID-ID'
      });

      // Mock story decomposition to throw
      jest.doMock('../../src/safe/story-decomposition-engine', () => ({
        StoryDecompositionEngine: class {
          async decompose() {
            throw new Error('Story not found');
          }
        }
      }));

      const result = await executor.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Story not found');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should format user-friendly error messages', async () => {
      const command = createTestCommand(CommandIntent.ART_PLAN, {});

      // Mock to throw permission error
      jest.doMock('../../src/safe/art-planner', () => ({
        ARTPlanner: class {
          async planART() {
            throw new Error('permission denied');
          }
        }
      }));

      const result = await executor.execute(command);

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

      // Verify defaults were applied
      expect(result.parameters.iterations).toBe(6);
      expect(result.parameters.bufferCapacity).toBe(0.2);
      expect(result.parameters.enableValueOptimization).toBe(true);
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
      expect(result.executionTime).toBeGreaterThan(0);
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
        expect(result.executionTime).toBeGreaterThan(0);
      });
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
    teamId: 'team-123',
    teamName: 'Test Team',
    labels: [],
    currentPI: 'PI-2025-Q1'
  };

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
    parameters
  };
}