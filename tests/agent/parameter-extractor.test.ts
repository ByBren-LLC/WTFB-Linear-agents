/**
 * Parameter Extractor Tests
 * 
 * Comprehensive test suite for parameter extraction and context inference.
 */

import { ParameterExtractor } from '../../src/agent/parameter-extractor';
import { CommandIntent, IssueContext } from '../../src/agent/types/command-types';
import { CommandParameters } from '../../src/agent/types/parameter-types';
import * as logger from '../../src/utils/logger';

// Mock logger
jest.mock('../../src/utils/logger');

describe('ParameterExtractor', () => {
  let extractor: ParameterExtractor;
  let mockContext: IssueContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    extractor = new ParameterExtractor({
      strict: false,
      fuzzyMatch: true
    });

    mockContext = {
      issueId: 'issue-123',
      issueIdentifier: 'LIN-123',
      issueTitle: 'Test Issue',
      teamId: 'team-alpha',
      teamName: 'Team Alpha',
      projectId: 'project-123',
      projectName: 'Test Project',
      labels: ['PI-2025-Q1', 'frontend'],
      estimate: 8
    };
  });

  describe('PI Extraction', () => {
    it('should extract explicit PI ID in standard format', () => {
      const result = extractor.extractParameters(
        'plan PI-2025-Q1',
        CommandIntent.ART_PLAN,
        mockContext
      );

      expect(result.piId).toBe('PI-2025-Q1');
      expect(result.explicit.piId).toBe(true);
    });

    it('should extract PI ID without prefix', () => {
      const result = extractor.extractParameters(
        'plan 2025-Q2',
        CommandIntent.ART_PLAN,
        mockContext
      );

      expect(result.piId).toBe('PI-2025-Q2');
      expect(result.explicit.piId).toBe(true);
    });

    it('should extract PI ID with space variations', () => {
      const result = extractor.extractParameters(
        'plan PI 2025 Q3',
        CommandIntent.ART_PLAN,
        mockContext
      );

      expect(result.piId).toBe('PI-2025-Q3');
      expect(result.explicit.piId).toBe(true);
    });

    it('should infer PI from context labels', () => {
      const result = extractor.extractParameters(
        'plan this PI',
        CommandIntent.ART_PLAN,
        mockContext
      );

      expect(result.piId).toBe('PI-2025-Q1');
      expect(result.explicit.piId).toBe(false);
    });
  });

  describe('Team Extraction', () => {
    it('should extract team with "team" prefix', () => {
      const result = extractor.extractParameters(
        'plan for team bravo',
        CommandIntent.ART_PLAN,
        mockContext
      );

      expect(result.teamId).toBe('bravo');
      expect(result.explicit.teamId).toBe(true);
    });

    it('should extract team with @ mention', () => {
      // Create fresh context without team
      const contextNoTeam = { ...mockContext, teamId: 'different-team' };
      
      const result = extractor.extractParameters(
        'status for @charlie',
        CommandIntent.STATUS_CHECK,
        contextNoTeam
      );

      expect(result.teamId).toBe('charlie');
      expect(result.explicit.teamId).toBe(true);
    });

    it('should infer team from context', () => {
      const result = extractor.extractParameters(
        'show status',
        CommandIntent.STATUS_CHECK,
        mockContext
      );

      expect(result.teamId).toBe('team-alpha');
      expect(result.explicit.teamId).toBe(false);
    });
  });

  describe('Time Reference Extraction', () => {
    it('should extract "this PI" reference', () => {
      const result = extractor.extractParameters(
        'analyze value for this PI',
        CommandIntent.VALUE_ANALYZE,
        mockContext
      );

      expect(result.timeframe).toEqual({
        type: 'current',
        period: 'pi',
        value: 'this PI'
      });
      expect(result.explicit.timeframe).toBe(true);
    });

    it('should extract "next sprint" reference', () => {
      const result = extractor.extractParameters(
        'plan next sprint',
        CommandIntent.ART_PLAN,
        mockContext
      );

      expect(result.timeframe).toEqual({
        type: 'next',
        period: 'sprint',
        value: 'next sprint'
      });
    });

    it('should extract specific time reference', () => {
      const result = extractor.extractParameters(
        'analyze for Q2',
        CommandIntent.VALUE_ANALYZE,
        mockContext
      );

      expect(result.timeframe).toEqual({
        type: 'specific',
        value: 'Q2'
      });
    });
  });

  describe('Story Parameters', () => {
    it('should extract story ID with LIN prefix', () => {
      const result = extractor.extractParameters(
        'decompose LIN-456',
        CommandIntent.STORY_DECOMPOSE,
        mockContext
      );

      expect(result.storyId).toBe('456');
      expect(result.explicit.storyId).toBe(true);
    });

    it('should extract story points', () => {
      const result = extractor.extractParameters(
        'decompose into 5 point stories',
        CommandIntent.STORY_DECOMPOSE,
        mockContext
      );

      expect(result.storyPoints).toBe(5);
      expect(result.explicit.storyPoints).toBe(true);
    });

    it('should extract target size', () => {
      const result = extractor.extractParameters(
        'break down max 3 points',
        CommandIntent.STORY_DECOMPOSE,
        mockContext
      );

      expect(result.targetSize).toBe(3);
      expect(result.explicit.targetSize).toBe(true);
    });

    it('should infer story ID from context', () => {
      const result = extractor.extractParameters(
        'decompose this',
        CommandIntent.STORY_DECOMPOSE,
        mockContext
      );

      expect(result.storyId).toBe('issue-123');
      expect(result.explicit.storyId).toBe(false);
      expect(result.storyPoints).toBe(8); // From context estimate
    });
  });

  describe('Analysis Parameters', () => {
    it('should extract depth parameter', () => {
      const result = extractor.extractParameters(
        'detailed analysis',
        CommandIntent.VALUE_ANALYZE,
        mockContext
      );

      expect(result.depth).toBe('detailed');
      expect(result.explicit.depth).toBe(true);
    });

    it('should normalize depth variations', () => {
      const testCases = [
        { input: 'brief summary', expected: 'summary' },
        { input: 'comprehensive report', expected: 'full' },
        { input: 'detailed view', expected: 'detailed' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = extractor.extractParameters(
          input,
          CommandIntent.VALUE_ANALYZE,
          mockContext
        );
        expect(result.depth).toBe(expected);
      });
    });

    it('should extract direction for dependencies', () => {
      const result = extractor.extractParameters(
        'show upstream dependencies',
        CommandIntent.DEPENDENCY_MAP,
        mockContext
      );

      expect(result.direction).toBe('upstream');
      expect(result.explicit.direction).toBe(true);
    });

    it('should extract format preference', () => {
      const result = extractor.extractParameters(
        'status as table',
        CommandIntent.STATUS_CHECK,
        mockContext
      );

      expect(result.format).toBe('table');
      expect(result.explicit.format).toBe(true);
    });
  });

  describe('Multiple Parameters', () => {
    it('should extract multiple parameters from complex command', () => {
      const result = extractor.extractParameters(
        'plan PI-2025-Q2 for team delta detailed analysis',
        CommandIntent.ART_PLAN,
        mockContext
      );

      expect(result.piId).toBe('PI-2025-Q2');
      expect(result.teamId).toBe('delta');
      expect(result.depth).toBe('detailed');
      expect(result.explicit.piId).toBe(true);
      expect(result.explicit.teamId).toBe(true);
      expect(result.explicit.depth).toBe(true);
    });

    it('should handle overlapping patterns correctly', () => {
      const result = extractor.extractParameters(
        'decompose story-123 into 3 point stories max 5 points',
        CommandIntent.STORY_DECOMPOSE,
        mockContext
      );

      expect(result.storyId).toBe('123');
      expect(result.targetSize).toBe(5); // "max 5" should win over "into 3"
      expect(result.storyPoints).toBe(3); // From "3 point stories"
    });
  });

  describe('Intent-Specific Defaults', () => {
    it('should apply ART_PLAN defaults', () => {
      // Use context without PI labels
      const contextNoPI = { ...mockContext, labels: ['frontend'] };
      
      const result = extractor.extractParameters(
        'plan',
        CommandIntent.ART_PLAN,
        contextNoPI
      );

      expect(result.timeframe).toEqual({
        type: 'current',
        period: 'pi'
      });
    });

    it('should apply STORY_DECOMPOSE defaults', () => {
      const result = extractor.extractParameters(
        'decompose this',
        CommandIntent.STORY_DECOMPOSE,
        mockContext
      );

      expect(result.targetSize).toBe(5);
      expect(result.storyId).toBe('issue-123');
    });

    it('should apply DEPENDENCY_MAP defaults', () => {
      const result = extractor.extractParameters(
        'map dependencies',
        CommandIntent.DEPENDENCY_MAP,
        mockContext
      );

      expect(result.direction).toBe('both');
      expect(result.maxDepth).toBe(3);
    });

    it('should apply STATUS_CHECK defaults', () => {
      const result = extractor.extractParameters(
        'status',
        CommandIntent.STATUS_CHECK,
        mockContext
      );

      expect(result.format).toBe('table');
    });
  });

  describe('Context Inference', () => {
    it('should infer scope from project context', () => {
      const result = extractor.extractParameters(
        'analyze value',
        CommandIntent.VALUE_ANALYZE,
        mockContext
      );

      expect(result.scope).toEqual({
        type: 'project',
        id: 'project-123',
        name: 'Test Project',
        explicit: false
      });
    });

    it('should fall back to team scope without project', () => {
      const contextNoProject = { ...mockContext, projectId: undefined };
      
      const result = extractor.extractParameters(
        'analyze value',
        CommandIntent.VALUE_ANALYZE,
        contextNoProject
      );

      expect(result.scope).toEqual({
        type: 'team',
        id: 'team-alpha',
        name: 'Team Alpha',
        explicit: false
      });
    });
  });

  describe('Raw Parameter Tracking', () => {
    it('should track raw parameter strings', () => {
      const result = extractor.extractParameters(
        'plan PI 2025 Q1 for team Alpha',
        CommandIntent.ART_PLAN,
        mockContext
      );

      expect(result.raw).toBeDefined();
      expect(result.raw!.piId).toContain('PI 2025 Q1');
      expect(result.raw!.teamId).toContain('team Alpha');
    });
  });

  describe('Error Handling', () => {
    it('should handle extraction errors gracefully', () => {
      // Force an error by passing null
      const result = extractor.extractParameters(
        null as any,
        CommandIntent.ART_PLAN,
        mockContext
      );

      expect(result.explicit).toEqual({});
      expect(result.raw).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty command text', () => {
      const result = extractor.extractParameters(
        '',
        CommandIntent.ART_PLAN,
        mockContext
      );

      // Should still apply defaults and context
      expect(result.teamId).toBe('team-alpha');
      expect(result.piId).toBe('PI-2025-Q1');
    });

    it('should handle commands with no extractable parameters', () => {
      const result = extractor.extractParameters(
        'do something random',
        CommandIntent.ART_PLAN,
        mockContext
      );

      // Should still have context parameters
      expect(result.teamId).toBe('team-alpha');
      expect(result.explicit.teamId).toBe(false);
    });

    it('should handle special characters in parameters', () => {
      const result = extractor.extractParameters(
        'plan for team team-with-dashes',
        CommandIntent.ART_PLAN,
        mockContext
      );

      expect(result.teamId).toBe('team-with-dashes');
    });
  });
});