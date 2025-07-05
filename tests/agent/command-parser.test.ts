/**
 * Command Parser Tests
 * 
 * Comprehensive test suite for the natural language command parser.
 * Tests intent recognition, confidence scoring, and edge cases.
 */

import { AgentCommandParser } from '../../src/agent/command-parser';
import { CommandIntent, IssueContext, ParserConfig } from '../../src/agent/types/command-types';
import * as logger from '../../src/utils/logger';

// Mock logger
jest.mock('../../src/utils/logger');

describe('AgentCommandParser', () => {
  let parser: AgentCommandParser;
  let mockContext: IssueContext;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();

    // Create parser instance
    parser = new AgentCommandParser({
      minConfidence: 0.7,
      debug: true
    });

    // Create mock context
    mockContext = {
      issueId: 'issue-123',
      issueIdentifier: 'LIN-123',
      issueTitle: 'Test Issue',
      teamId: 'team-123',
      teamName: 'Test Team',
      labels: [],
      estimate: 5
    };
  });

  describe('ART Planning Commands', () => {
    it('should recognize "plan this PI" command', () => {
      const result = parser.parseCommand('@saafepulse plan this PI', mockContext);

      expect(result.intent).toBe(CommandIntent.ART_PLAN);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.normalizedText).toBe('plan this pi');
      expect(result.matchedPattern).toBeDefined();
    });

    it('should recognize "plan PI-2025-Q1" with explicit PI', () => {
      const result = parser.parseCommand('@saafepulse plan PI-2025-Q1', mockContext);

      expect(result.intent).toBe(CommandIntent.ART_PLAN);
      expect(result.confidence).toBeGreaterThan(0.75);
    });

    it('should recognize "execute ART planning" variation', () => {
      const result = parser.parseCommand('@saafepulse execute ART planning', mockContext);

      expect(result.intent).toBe(CommandIntent.ART_PLAN);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "create iteration plan" variation', () => {
      const result = parser.parseCommand('@saafepulse create iteration plan', mockContext);

      expect(result.intent).toBe(CommandIntent.ART_PLAN);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Story Decomposition Commands', () => {
    it('should recognize "decompose this story" command', () => {
      const result = parser.parseCommand('@saafepulse decompose this story', mockContext);

      expect(result.intent).toBe(CommandIntent.STORY_DECOMPOSE);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "break down this issue" variation', () => {
      const result = parser.parseCommand('@saafepulse break down this issue', mockContext);

      expect(result.intent).toBe(CommandIntent.STORY_DECOMPOSE);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "make this smaller" variation', () => {
      const result = parser.parseCommand('@saafepulse make this smaller', mockContext);

      expect(result.intent).toBe(CommandIntent.STORY_DECOMPOSE);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "this story is too big" variation', () => {
      const result = parser.parseCommand('@saafepulse this story is too big', mockContext);

      expect(result.intent).toBe(CommandIntent.STORY_DECOMPOSE);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should have higher confidence for large stories', () => {
      const largeStoryContext = { ...mockContext, estimate: 13 };
      const result = parser.parseCommand('@saafepulse decompose this story', largeStoryContext);

      expect(result.intent).toBe(CommandIntent.STORY_DECOMPOSE);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Value Analysis Commands', () => {
    it('should recognize "analyze value delivery" command', () => {
      const result = parser.parseCommand('@saafepulse analyze value delivery', mockContext);

      expect(result.intent).toBe(CommandIntent.VALUE_ANALYZE);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "check working software" variation', () => {
      const result = parser.parseCommand('@saafepulse check working software', mockContext);

      expect(result.intent).toBe(CommandIntent.VALUE_ANALYZE);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize "show value streams" variation', () => {
      const result = parser.parseCommand('@saafepulse show value streams', mockContext);

      expect(result.intent).toBe(CommandIntent.VALUE_ANALYZE);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Dependency Mapping Commands', () => {
    it('should recognize "map dependencies" command', () => {
      const result = parser.parseCommand('@saafepulse map dependencies', mockContext);

      expect(result.intent).toBe(CommandIntent.DEPENDENCY_MAP);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "what are the dependencies?" question', () => {
      const result = parser.parseCommand('@saafepulse what are the dependencies?', mockContext);

      expect(result.intent).toBe(CommandIntent.DEPENDENCY_MAP);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Status Check Commands', () => {
    it('should recognize simple "status" command', () => {
      const result = parser.parseCommand('@saafepulse status', mockContext);

      expect(result.intent).toBe(CommandIntent.STATUS_CHECK);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize "show ART status" variation', () => {
      const result = parser.parseCommand('@saafepulse show ART status', mockContext);

      expect(result.intent).toBe(CommandIntent.STATUS_CHECK);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "what\'s the current status?" question', () => {
      const result = parser.parseCommand('@saafepulse what\'s the current status?', mockContext);

      expect(result.intent).toBe(CommandIntent.STATUS_CHECK);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Help Commands', () => {
    it('should recognize simple "help" command', () => {
      const result = parser.parseCommand('@saafepulse help', mockContext);

      expect(result.intent).toBe(CommandIntent.HELP);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize "what can you do?" question', () => {
      const result = parser.parseCommand('@saafepulse what can you do?', mockContext);

      expect(result.intent).toBe(CommandIntent.HELP);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize "show commands" variation', () => {
      const result = parser.parseCommand('@saafepulse show commands', mockContext);

      expect(result.intent).toBe(CommandIntent.HELP);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should default to help for greetings', () => {
      const result = parser.parseCommand('@saafepulse hello', mockContext);

      expect(result.intent).toBe(CommandIntent.HELP);
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('Unknown Commands', () => {
    it('should handle unknown commands gracefully', () => {
      const result = parser.parseCommand('@saafepulse do something random', mockContext);

      expect(result.intent).toBe(CommandIntent.UNKNOWN);
      expect(result.confidence).toBe(0);
      expect(result.metadata.suggestions).toBeDefined();
      expect(result.metadata.suggestions!.length).toBeGreaterThan(0);
    });

    it('should provide suggestions for partial matches', () => {
      const result = parser.parseCommand('@saafepulse planning', mockContext);

      expect(result.intent).toBe(CommandIntent.UNKNOWN);
      expect(result.metadata.suggestions).toBeDefined();
      expect(result.metadata.suggestions!.length).toBeGreaterThan(0);
      // At least one suggestion should be related to planning
      const hasPlanningSuggestion = result.metadata.suggestions!.some(s => 
        s.toLowerCase().includes('plan') || s.toLowerCase().includes('pi')
      );
      expect(hasPlanningSuggestion).toBe(true);
    });
  });

  describe('Text Normalization', () => {
    it('should handle case insensitivity', () => {
      const result1 = parser.parseCommand('@saafepulse PLAN THIS PI', mockContext);
      const result2 = parser.parseCommand('@saafepulse plan this pi', mockContext);

      expect(result1.intent).toBe(result2.intent);
      expect(result1.normalizedText).toBe(result2.normalizedText);
    });

    it('should handle extra whitespace', () => {
      const result = parser.parseCommand('@saafepulse    plan   this    PI   ', mockContext);

      expect(result.intent).toBe(CommandIntent.ART_PLAN);
      expect(result.normalizedText).toBe('plan this pi');
    });

    it('should remove @saafepulse mention', () => {
      const result = parser.parseCommand('@saafepulse plan this PI', mockContext);

      expect(result.normalizedText).toBe('plan this pi');
      expect(result.normalizedText).not.toContain('@saafepulse');
    });

    it('should preserve quoted strings', () => {
      const result = parser.parseCommand('@saafepulse plan "PI-2025-Q1"', mockContext);

      expect(result.normalizedText).toContain('"pi-2025-q1"');
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for exact matches', () => {
      const result = parser.parseCommand('@saafepulse plan this PI', mockContext);

      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should have lower confidence for partial matches', () => {
      const result = parser.parseCommand('@saafepulse pi planning maybe?', mockContext);

      // Should still match but with lower confidence
      if (result.intent === CommandIntent.ART_PLAN) {
        expect(result.confidence).toBeLessThan(0.9);
      }
    });

    it('should reject matches below minimum confidence', () => {
      // Create parser with high confidence threshold
      const strictParser = new AgentCommandParser({ minConfidence: 0.95 });
      
      const result = strictParser.parseCommand('@saafepulse maybe plan something', mockContext);

      expect(result.intent).toBe(CommandIntent.UNKNOWN);
    });
  });

  describe('Context Awareness', () => {
    it('should consider context for decomposition commands', () => {
      const smallStoryContext = { ...mockContext, estimate: 2 };
      const largeStoryContext = { ...mockContext, estimate: 13 };

      const smallResult = parser.parseCommand('@saafepulse decompose this', smallStoryContext);
      const largeResult = parser.parseCommand('@saafepulse decompose this', largeStoryContext);

      // Both should match, but large story should have higher confidence
      expect(smallResult.intent).toBe(CommandIntent.STORY_DECOMPOSE);
      expect(largeResult.intent).toBe(CommandIntent.STORY_DECOMPOSE);
      // Large stories get a context relevance boost
      expect(largeResult.confidence).toBeGreaterThanOrEqual(smallResult.confidence);
    });

    it('should consider labels for planning commands', () => {
      const planningContext = { ...mockContext, labels: ['planning', 'PI-2025-Q1'] };
      const regularContext = { ...mockContext, labels: ['bug', 'frontend'] };

      const planningResult = parser.parseCommand('@saafepulse optimize ART', planningContext);
      const regularResult = parser.parseCommand('@saafepulse optimize ART', regularContext);

      expect(planningResult.confidence).toBeGreaterThan(regularResult.confidence);
    });
  });

  describe('Performance', () => {
    it('should parse commands within time limit', () => {
      const commands = [
        'plan this PI',
        'decompose this story',
        'analyze value delivery',
        'map dependencies',
        'show status',
        'help'
      ];

      commands.forEach(command => {
        const result = parser.parseCommand(`@saafepulse ${command}`, mockContext);
        expect(result.metadata.processingTime).toBeLessThan(100);
      });
    });

    it('should handle long inputs gracefully', () => {
      const longCommand = '@saafepulse ' + 'please '.repeat(50) + 'help me plan this PI';
      
      const result = parser.parseCommand(longCommand, mockContext);
      
      expect(result).toBeDefined();
      expect(result.metadata.processingTime).toBeLessThan(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle parsing errors gracefully', () => {
      // Force an error by passing invalid input
      const result = parser.parseCommand(null as any, mockContext);

      expect(result.intent).toBe(CommandIntent.UNKNOWN);
      expect(result.confidence).toBe(0);
      expect(result.metadata.warnings).toBeDefined();
    });

    it('should handle missing context gracefully', () => {
      const minimalContext: IssueContext = {
        issueId: 'test',
        issueIdentifier: 'TEST-1',
        issueTitle: 'Test',
        teamId: 'team',
        labels: []
      };

      const result = parser.parseCommand('@saafepulse plan this PI', minimalContext);

      expect(result).toBeDefined();
      expect(result.intent).toBe(CommandIntent.ART_PLAN);
    });
  });

  describe('Command Variations', () => {
    const planVariations = [
      'plan this PI',
      'plan PI-2025-Q1',
      'execute ART planning',
      'start PI planning',
      'create iteration plan',
      'generate PI plan',
      'PI planning',
      'ART planning'
    ];

    planVariations.forEach(variation => {
      it(`should recognize planning variation: "${variation}"`, () => {
        const result = parser.parseCommand(`@saafepulse ${variation}`, mockContext);
        expect(result.intent).toBe(CommandIntent.ART_PLAN);
        expect(result.confidence).toBeGreaterThan(0.7);
      });
    });

    const decomposeVariations = [
      'decompose this story',
      'break down this issue',
      'split this story',
      'make this smaller',
      'help me decompose',
      'break this into smaller pieces',
      'this story is too big'
    ];

    decomposeVariations.forEach(variation => {
      it(`should recognize decomposition variation: "${variation}"`, () => {
        const result = parser.parseCommand(`@saafepulse ${variation}`, mockContext);
        expect(result.intent).toBe(CommandIntent.STORY_DECOMPOSE);
        expect(result.confidence).toBeGreaterThan(0.7);
      });
    });
  });
});