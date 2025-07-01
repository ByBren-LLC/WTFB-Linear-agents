/**
 * Parameter Validator Tests
 * 
 * Tests for parameter validation against Linear data and business rules.
 */

import { ParameterValidator } from '../../src/agent/parameter-validator';
import { LinearClientWrapper } from '../../src/linear/client';
import { CommandIntent } from '../../src/agent/types/command-types';
import { 
  CommandParameters, 
  ValidationErrorCode 
} from '../../src/agent/types/parameter-types';
import * as logger from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/linear/client');
jest.mock('../../src/utils/logger');

describe('ParameterValidator', () => {
  let validator: ParameterValidator;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLinearClient = {
      getTeams: jest.fn(),
      getIssue: jest.fn()
    } as any;
    
    validator = new ParameterValidator(mockLinearClient);
  });

  describe('Required Parameters', () => {
    it('should validate required parameters for STORY_DECOMPOSE', async () => {
      const params: CommandParameters = {
        // No storyId provided at all
        explicit: {}
      };

      const result = await validator.validate(params, CommandIntent.STORY_DECOMPOSE);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        parameter: 'storyId',
        code: ValidationErrorCode.MISSING_REQUIRED
      });
    });

    it('should accept contextually inferred required parameters', async () => {
      const params: CommandParameters = {
        storyId: 'issue-123',
        explicit: { storyId: false }
      };

      mockLinearClient.getIssue.mockResolvedValue({ id: 'issue-123' });

      const result = await validator.validate(params, CommandIntent.STORY_DECOMPOSE);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate no required parameters for ART_PLAN', async () => {
      const params: CommandParameters = {
        explicit: {}
      };

      const result = await validator.validate(params, CommandIntent.ART_PLAN);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Team Validation', () => {
    const mockTeams = [
      { id: 'team-1', key: 'ALPHA', name: 'Team Alpha' },
      { id: 'team-2', key: 'BETA', name: 'Team Beta' },
      { id: 'team-3', key: 'GAMMA', name: 'Team Gamma' }
    ];

    beforeEach(() => {
      mockLinearClient.getTeams.mockResolvedValue(mockTeams);
    });

    it('should validate team by ID', async () => {
      const params: CommandParameters = {
        teamId: 'team-1',
        explicit: { teamId: true }
      };

      const result = await validator.validate(params, CommandIntent.ART_PLAN);

      expect(result.valid).toBe(true);
      expect(mockLinearClient.getTeams).toHaveBeenCalled();
    });

    it('should validate team by key', async () => {
      const params: CommandParameters = {
        teamId: 'BETA',
        explicit: { teamId: true }
      };

      const result = await validator.validate(params, CommandIntent.ART_PLAN);

      expect(result.valid).toBe(true);
    });

    it('should validate team by name (case insensitive)', async () => {
      const params: CommandParameters = {
        teamId: 'team gamma',
        explicit: { teamId: true }
      };

      const result = await validator.validate(params, CommandIntent.ART_PLAN);

      expect(result.valid).toBe(true);
    });

    it('should provide suggestions for invalid team', async () => {
      const params: CommandParameters = {
        teamId: 'alp',
        explicit: { teamId: true }
      };

      const result = await validator.validate(params, CommandIntent.ART_PLAN);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatchObject({
        parameter: 'teamId',
        code: ValidationErrorCode.NOT_FOUND
      });
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions![0]).toMatchObject({
        parameter: 'teamId',
        suggestions: ['Team Alpha']
      });
    });
  });

  describe('Story Validation', () => {
    it('should validate existing story ID', async () => {
      const params: CommandParameters = {
        storyId: 'LIN-123',
        explicit: { storyId: true }
      };

      mockLinearClient.getIssue.mockResolvedValue({ 
        id: 'issue-123',
        identifier: 'LIN-123' 
      });

      const result = await validator.validate(params, CommandIntent.STORY_DECOMPOSE);

      expect(result.valid).toBe(true);
      expect(mockLinearClient.getIssue).toHaveBeenCalledWith('LIN-123');
    });

    it('should handle story not found', async () => {
      const params: CommandParameters = {
        storyId: 'LIN-999',
        explicit: { storyId: true }
      };

      mockLinearClient.getIssue.mockResolvedValue(null);

      const result = await validator.validate(params, CommandIntent.STORY_DECOMPOSE);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatchObject({
        parameter: 'storyId',
        code: ValidationErrorCode.NOT_FOUND
      });
    });

    it('should handle permission errors', async () => {
      const params: CommandParameters = {
        storyId: 'LIN-123',
        explicit: { storyId: true }
      };

      mockLinearClient.getIssue.mockRejectedValue(
        new Error('No permission to access issue')
      );

      const result = await validator.validate(params, CommandIntent.STORY_DECOMPOSE);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatchObject({
        parameter: 'storyId',
        code: ValidationErrorCode.PERMISSION_DENIED
      });
    });
  });

  describe('Format Validation', () => {
    it('should validate correct PI format', async () => {
      const params: CommandParameters = {
        piId: 'PI-2025-Q1',
        explicit: { piId: true }
      };

      const result = await validator.validate(params, CommandIntent.ART_PLAN);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid PI format', async () => {
      const params: CommandParameters = {
        piId: 'PI-2025-Q5',
        explicit: { piId: true }
      };

      const result = await validator.validate(params, CommandIntent.ART_PLAN);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatchObject({
        parameter: 'piId',
        code: ValidationErrorCode.INVALID_FORMAT,
        context: {
          expected: 'PI-YYYY-QN',
          example: 'PI-2025-Q1'
        }
      });
    });

    it('should validate story points using Fibonacci', async () => {
      const validPoints = [1, 2, 3, 5, 8, 13, 21];
      
      for (const points of validPoints) {
        const params: CommandParameters = {
          storyId: 'LIN-123',
          storyPoints: points,
          explicit: { storyId: true, storyPoints: true }
        };
        
        mockLinearClient.getIssue.mockResolvedValue({ id: 'issue-123' });
        
        const result = await validator.validate(params, CommandIntent.STORY_DECOMPOSE);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject non-Fibonacci story points', async () => {
      const params: CommandParameters = {
        storyId: 'LIN-123',
        storyPoints: 4,
        explicit: { storyId: true, storyPoints: true }
      };

      mockLinearClient.getIssue.mockResolvedValue({ id: 'issue-123' });

      const result = await validator.validate(params, CommandIntent.STORY_DECOMPOSE);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatchObject({
        parameter: 'storyPoints',
        code: ValidationErrorCode.INVALID_FORMAT
      });
    });
  });

  describe('Range Validation', () => {
    it('should validate target size range', async () => {
      const params: CommandParameters = {
        storyId: 'LIN-123',
        targetSize: 5,
        explicit: { storyId: true, targetSize: true }
      };

      mockLinearClient.getIssue.mockResolvedValue({ id: 'issue-123' });

      const result = await validator.validate(params, CommandIntent.STORY_DECOMPOSE);

      expect(result.valid).toBe(true);
    });

    it('should reject target size out of range', async () => {
      const params: CommandParameters = {
        storyId: 'LIN-123',
        targetSize: 15,
        explicit: { storyId: true, targetSize: true }
      };

      mockLinearClient.getIssue.mockResolvedValue({ id: 'issue-123' });

      const result = await validator.validate(params, CommandIntent.STORY_DECOMPOSE);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatchObject({
        parameter: 'targetSize',
        code: ValidationErrorCode.OUT_OF_RANGE,
        context: { min: 1, max: 8 }
      });
    });

    it('should validate max depth range', async () => {
      const params: CommandParameters = {
        maxDepth: 5,
        explicit: { maxDepth: true }
      };

      const result = await validator.validate(params, CommandIntent.DEPENDENCY_MAP);

      expect(result.valid).toBe(true);
    });
  });

  describe('Mutually Exclusive Parameters', () => {
    it('should reject both piId and timeframe for ART_PLAN', async () => {
      const params: CommandParameters = {
        piId: 'PI-2025-Q1',
        timeframe: { type: 'current', period: 'pi' },
        explicit: { piId: true, timeframe: true }
      };

      const result = await validator.validate(params, CommandIntent.ART_PLAN);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatchObject({
        parameter: 'piId,timeframe',
        code: ValidationErrorCode.INCOMPATIBLE_PARAMS
      });
    });

    it('should allow either piId or timeframe', async () => {
      const params1: CommandParameters = {
        piId: 'PI-2025-Q1',
        explicit: { piId: true }
      };

      const result1 = await validator.validate(params1, CommandIntent.ART_PLAN);
      expect(result1.valid).toBe(true);

      const params2: CommandParameters = {
        timeframe: { type: 'current', period: 'pi' },
        explicit: { timeframe: true }
      };

      const result2 = await validator.validate(params2, CommandIntent.ART_PLAN);
      expect(result2.valid).toBe(true);
    });
  });

  describe('Warnings', () => {
    it('should warn about inferred parameters', async () => {
      const params: CommandParameters = {
        teamId: 'team-1',
        piId: 'PI-2025-Q1',
        explicit: { 
          teamId: false,
          piId: false 
        }
      };

      mockLinearClient.getTeams.mockResolvedValue([
        { id: 'team-1', key: 'ALPHA', name: 'Team Alpha' }
      ]);

      const result = await validator.validate(params, CommandIntent.ART_PLAN);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('inferred values');
    });

    it('should warn about default values', async () => {
      const params: CommandParameters = {
        storyId: 'LIN-123',
        targetSize: 5,
        explicit: { 
          storyId: true,
          targetSize: false 
        }
      };

      mockLinearClient.getIssue.mockResolvedValue({ id: 'issue-123' });

      const result = await validator.validate(params, CommandIntent.STORY_DECOMPOSE);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toHaveLength(2);
      // Specific warning should come first
      expect(result.warnings![0]).toContain('default target size');
      expect(result.warnings![1]).toContain('inferred values');
    });
  });

  describe('Error Handling', () => {
    it('should handle Linear API errors gracefully', async () => {
      const params: CommandParameters = {
        teamId: 'team-1',
        explicit: { teamId: true }
      };

      mockLinearClient.getTeams.mockRejectedValue(
        new Error('Network error')
      );

      const result = await validator.validate(params, CommandIntent.ART_PLAN);

      // Should log warning but not fail validation
      expect(logger.warn).toHaveBeenCalled();
      expect(result.valid).toBe(true);
    });

    it('should handle validation exceptions gracefully', async () => {
      const params: CommandParameters = {
        teamId: 'team-1',
        explicit: { teamId: true }
      };

      // Force an error by making validator method throw
      mockLinearClient.getTeams.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await validator.validate(params, CommandIntent.ART_PLAN);

      // Should still be valid - we don't fail validation on network errors
      expect(result.valid).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        'Unable to validate team ID',
        expect.objectContaining({ teamId: 'team-1' })
      );
    });
  });
});