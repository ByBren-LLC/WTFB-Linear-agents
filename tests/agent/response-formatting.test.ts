/**
 * Response Formatting Tests
 * 
 * Tests for Linear comment response formatting.
 */

import { ResponseFormatter } from '../../src/agent/response-formatter';
import { ExecutionResult } from '../../src/agent/cli-executor';
import { ParsedCommand, CommandIntent, IssueContext } from '../../src/agent/types/command-types';

describe('ResponseFormatter', () => {
  let formatter: ResponseFormatter;

  beforeEach(() => {
    formatter = new ResponseFormatter();
  });

  describe('ART Planning Responses', () => {
    it('should format successful ART planning response', () => {
      const result: ExecutionResult = {
        success: true,
        data: {
          plan: {
            piId: 'PI-2025-Q1',
            teamId: 'LIN',
            iterations: 6,
            readinessScore: 0.85
          }
        },
        executionTime: 1234,
        command: 'art-plan',
        parameters: { piId: 'PI-2025-Q1', teamId: 'LIN' },
        metadata: { executionId: 'exec_123' }
      };

      const command = createTestCommand(CommandIntent.ART_PLAN);
      const response = formatter.formatForLinear(result, command);

      expect(response.success).toBe(true);
      expect(response.message).toContain('## 📅 ART Planning Complete');
      expect(response.message).toContain('**Program Increment**: PI-2025-Q1');
      expect(response.message).toContain('**Team**: LIN');
      expect(response.message).toContain('**Readiness Score**: 🟡 85%');
      expect(response.message).toContain('### 🎯 Next Steps');
      expect(response.message).toContain('_Execution time: 1234ms');
    });

    it('should format readiness scores with appropriate indicators', () => {
      const testCases = [
        { score: 0.95, expected: '🟢 95%' },
        { score: 0.85, expected: '🟡 85%' },
        { score: 0.65, expected: '🟠 65%' },
        { score: 0.45, expected: '🔴 45%' }
      ];

      testCases.forEach(({ score, expected }) => {
        const result: ExecutionResult = {
          success: true,
          data: { plan: { readinessScore: score } },
          executionTime: 100,
          command: 'art-plan',
          parameters: {}
        };

        const command = createTestCommand(CommandIntent.ART_PLAN);
        const response = formatter.formatForLinear(result, command);

        expect(response.message).toContain(`**Readiness Score**: ${expected}`);
      });
    });
  });

  describe('Story Decomposition Responses', () => {
    it('should format story decomposition response', () => {
      const result: ExecutionResult = {
        success: true,
        data: {
          decomposition: {
            originalStoryId: 'LIN-123',
            targetSize: 5,
            subStories: [
              { title: 'Sub-story 1' },
              { title: 'Sub-story 2' },
              { title: 'Sub-story 3' }
            ]
          }
        },
        executionTime: 500,
        command: 'story-decompose',
        parameters: { storyId: 'LIN-123' }
      };

      const command = createTestCommand(CommandIntent.STORY_DECOMPOSE);
      const response = formatter.formatForLinear(result, command);

      expect(response.success).toBe(true);
      expect(response.message).toContain('## 📝 Story Decomposition Complete');
      expect(response.message).toContain('**Original Story**: LIN-123');
      expect(response.message).toContain('**Target Size**: 5 points');
      expect(response.message).toContain('**Sub-stories Created**: 3');
      expect(response.message).toContain('### 📋 Decomposed Stories');
    });
  });

  describe('Value Analysis Responses', () => {
    it('should format value analysis response', () => {
      const result: ExecutionResult = {
        success: true,
        data: {
          analysis: {
            scope: { type: 'team', name: 'Linear Team' },
            timeframe: { type: 'current', period: 'pi' },
            valueScore: 0.92,
            breakdown: {
              businessValue: 0.90,
              technicalValue: 0.88,
              riskReduction: 0.95
            }
          }
        },
        executionTime: 750,
        command: 'value-analyze',
        parameters: {}
      };

      const command = createTestCommand(CommandIntent.VALUE_ANALYZE);
      const response = formatter.formatForLinear(result, command);

      expect(response.success).toBe(true);
      expect(response.message).toContain('## 💎 Value Delivery Analysis');
      expect(response.message).toContain('**Scope**: team: Linear Team');
      expect(response.message).toContain('**Timeframe**: current pi');
      expect(response.message).toContain('**Value Score**: 🟢 92%');
    });
  });

  describe('Error Responses', () => {
    it('should format error response with suggestions', () => {
      const result: ExecutionResult = {
        success: false,
        error: 'Story not found',
        executionTime: 100,
        command: 'story-decompose',
        parameters: { storyId: 'INVALID-123' },
        metadata: { 
          executionId: 'exec_123',
          warnings: ['Invalid story format']
        }
      };

      const command = createTestCommand(CommandIntent.STORY_DECOMPOSE);
      const response = formatter.formatForLinear(result, command);

      expect(response.success).toBe(false);
      expect(response.message).toContain('## ❌ Command Execution Failed');
      expect(response.message).toContain('**Error**: Story not found');
      expect(response.message).toContain('### ⚠️ Warnings');
      expect(response.message).toContain('Invalid story format');
      expect(response.message).toContain('### 💡 Suggestions');
      expect(response.message).toContain('Verify the ID is correct');
    });

    it('should provide context-specific error suggestions', () => {
      const errorCases = [
        {
          error: 'timeout after 30000ms',
          expectedSuggestion: 'Try with a smaller scope'
        },
        {
          error: 'permission denied',
          expectedSuggestion: 'Ensure you have the required permissions'
        },
        {
          error: 'Team not found',
          expectedSuggestion: 'Check if you have access to this resource'
        }
      ];

      errorCases.forEach(({ error, expectedSuggestion }) => {
        const result: ExecutionResult = {
          success: false,
          error,
          executionTime: 100,
          command: 'art-plan',
          parameters: {}
        };

        const command = createTestCommand(CommandIntent.ART_PLAN);
        const response = formatter.formatForLinear(result, command);

        expect(response.message).toContain(expectedSuggestion);
      });
    });
  });

  describe('Help Response', () => {
    it('should format help response with examples', () => {
      const result: ExecutionResult = {
        success: true,
        data: {
          commands: [
            'plan [PI] - Create ART plan for a Program Increment',
            'decompose [story] - Break down large stories',
            'analyze value - Analyze value delivery'
          ]
        },
        executionTime: 50,
        command: 'help',
        parameters: {}
      };

      const command = createTestCommand(CommandIntent.HELP);
      const response = formatter.formatForLinear(result, command);

      expect(response.success).toBe(true);
      expect(response.message).toContain('## 🤖 SAFe PULSE Commands');
      expect(response.message).toContain('### 📝 Examples');
      expect(response.message).toContain('@saafepulse plan PI-2025-Q1');
      expect(response.message).toContain('### 💡 Tips');
    });
  });

  describe('Message Truncation', () => {
    it('should truncate long messages to fit Linear comment limit', () => {
      // Create a very long response
      const longData = {
        iterations: Array(100).fill(null).map((_, i) => ({
          id: `iteration-${i}`,
          name: `Iteration ${i}`,
          description: 'A'.repeat(1000)
        }))
      };

      const result: ExecutionResult = {
        success: true,
        data: longData,
        executionTime: 1000,
        command: 'status-check',
        parameters: {}
      };

      const command = createTestCommand(CommandIntent.STATUS_CHECK);
      const response = formatter.formatForLinear(result, command);

      // Default max length is 65536
      expect(response.message.length).toBeLessThanOrEqual(65536);
      expect(response.message).toContain('[Response truncated due to length]');
    });
  });

  describe('Formatting Options', () => {
    it('should respect custom formatting options', () => {
      const customFormatter = new ResponseFormatter({
        includeMetadata: false,
        includeNextSteps: false,
        style: 'compact'
      });

      const result: ExecutionResult = {
        success: true,
        data: { plan: { piId: 'PI-2025-Q1' } },
        executionTime: 100,
        command: 'art-plan',
        parameters: {},
        metadata: { executionId: 'exec_123' }
      };

      const command = createTestCommand(CommandIntent.ART_PLAN);
      const response = customFormatter.formatForLinear(result, command);

      // Should not include metadata or next steps
      expect(response.message).not.toContain('_Execution time:');
      expect(response.message).not.toContain('### 🎯 Next Steps');
    });
  });

  describe('Special Formatting', () => {
    it('should format dependency mapping with graph visualization', () => {
      const result: ExecutionResult = {
        success: true,
        data: {
          mapping: {
            fromId: 'LIN-123',
            direction: 'upstream',
            dependencies: [
              { from: 'LIN-123', to: 'LIN-122', type: 'blocks' },
              { from: 'LIN-122', to: 'LIN-121', type: 'blocks' }
            ],
            criticalPath: ['LIN-121', 'LIN-122', 'LIN-123']
          }
        },
        executionTime: 200,
        command: 'dependency-map',
        parameters: {}
      };

      const command = createTestCommand(CommandIntent.DEPENDENCY_MAP);
      const response = formatter.formatForLinear(result, command);

      expect(response.message).toContain('## 🔗 Dependency Mapping');
      expect(response.message).toContain('**Starting Point**: LIN-123');
      expect(response.message).toContain('**Direction**: upstream');
      expect(response.message).toContain('### 🚨 Critical Path');
    });

    it('should format status check with health indicators', () => {
      const result: ExecutionResult = {
        success: true,
        data: {
          status: {
            scope: { type: 'team', name: 'LIN' },
            health: 'good',
            metrics: {
              'Velocity': '42 points/sprint',
              'Completion Rate': '95%',
              'Bug Count': '3'
            }
          }
        },
        executionTime: 150,
        command: 'status-check',
        parameters: {}
      };

      const command = createTestCommand(CommandIntent.STATUS_CHECK);
      const response = formatter.formatForLinear(result, command);

      expect(response.message).toContain('## 📊 Status Report');
      expect(response.message).toContain('**Health**: 🟢 Good');
      expect(response.message).toContain('### 📈 Key Metrics');
      expect(response.message).toContain('**Velocity**: 42 points/sprint');
    });
  });
});

// Helper function to create test commands
function createTestCommand(intent: CommandIntent): ParsedCommand {
  const context: IssueContext = {
    issueId: 'issue-123',
    issueIdentifier: 'LIN-123',
    issueTitle: 'Test Issue',
    teamId: 'LIN',
    teamName: 'Linear Team',
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
    }
  };
}