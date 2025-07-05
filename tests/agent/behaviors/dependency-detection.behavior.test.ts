/**
 * Tests for Dependency Detection Behavior (LIN-59)
 */

import { DependencyDetectionBehavior } from '../../../src/agent/behaviors/dependency-detection.behavior';
import { BehaviorContext } from '../../../src/agent/types/autonomous-types';
import { LinearClientWrapper } from '../../../src/linear/client';
import * as logger from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/linear/client');
jest.mock('../../../src/utils/logger');

describe('DependencyDetectionBehavior', () => {
  let behavior: DependencyDetectionBehavior;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLinearClient = {
      getViewer: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Test User' }),
      getComments: jest.fn().mockResolvedValue({ nodes: [] }),
      createComment: jest.fn().mockResolvedValue({ id: 'comment-1' }),
      getIssues: jest.fn().mockResolvedValue({ nodes: [] }),
      getIssueRelations: jest.fn().mockResolvedValue({ nodes: [] })
    } as any;

    behavior = new DependencyDetectionBehavior(mockLinearClient);
  });

  describe('shouldTrigger', () => {
    it('should trigger for issue with dependency keywords', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-1',
          title: 'Feature implementation',
          description: 'This depends on LIN-123 to be completed first',
          state: { name: 'Todo' }
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(true);
    });

    it('should trigger for high-point issues without dependencies', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-2',
          title: 'Large feature',
          estimate: 8,
          state: { name: 'Todo' },
          relations: []
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger for closed issues', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-3',
          title: 'Completed task',
          description: 'This depends on something',
          state: { name: 'Done' }
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
    });

    it('should not trigger without issue context', async () => {
      const context: BehaviorContext = {
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
    });
  });

  describe('execute', () => {
    it('should detect and suggest dependencies', async () => {
      const relatedIssues = [
        {
          id: 'issue-related-1',
          identifier: 'LIN-123',
          title: 'API Implementation',
          state: { name: 'In Progress' },
          assignee: { name: 'Dev 1' }
        },
        {
          id: 'issue-related-2',
          identifier: 'LIN-124',
          title: 'Database Schema',
          state: { name: 'Done' }
        }
      ];

      mockLinearClient.getIssues.mockResolvedValueOnce({ nodes: relatedIssues });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-main',
          identifier: 'LIN-125',
          title: 'Frontend Feature',
          description: 'This feature depends on LIN-123 API endpoints',
          team: { id: 'team-1' },
          state: { name: 'Todo' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('comment');
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-main',
        expect.stringContaining('Potential Dependencies Detected')
      );
    });

    it('should detect circular dependencies', async () => {
      // Create circular dependency scenario
      const circularRelations = [
        {
          id: 'rel-1',
          type: 'blocks',
          relatedIssue: { id: 'issue-b' }
        }
      ];

      const circularRelationsB = [
        {
          id: 'rel-2',
          type: 'blocks',
          relatedIssue: { id: 'issue-c' }
        }
      ];

      const circularRelationsC = [
        {
          id: 'rel-3',
          type: 'blocks',
          relatedIssue: { id: 'issue-a' } // Back to A - circular!
        }
      ];

      mockLinearClient.getIssueRelations
        .mockResolvedValueOnce({ nodes: circularRelations })
        .mockResolvedValueOnce({ nodes: circularRelationsB })
        .mockResolvedValueOnce({ nodes: circularRelationsC });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-a',
          identifier: 'LIN-100',
          title: 'Task A',
          team: { id: 'team-1' },
          relations: circularRelations
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-a',
        expect.stringContaining('Circular Dependencies Detected')
      );
    });

    it('should skip already suggested dependencies', async () => {
      const existingComments = [
        {
          id: 'comment-old',
          body: 'dependency suggestion for LIN-123',
          user: { name: 'SAFe PULSE Bot' }
        }
      ];

      const relatedIssues = [
        {
          id: 'issue-123',
          identifier: 'LIN-123',
          title: 'Already suggested',
          state: { name: 'Todo' }
        },
        {
          id: 'issue-124',
          identifier: 'LIN-124',
          title: 'New suggestion',
          state: { name: 'Todo' }
        }
      ];

      mockLinearClient.getComments.mockResolvedValueOnce({ nodes: existingComments });
      mockLinearClient.getIssues.mockResolvedValueOnce({ nodes: relatedIssues });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-main',
          identifier: 'LIN-125',
          title: 'Task',
          description: 'Depends on LIN-123 and LIN-124',
          team: { id: 'team-1' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      // Should only suggest LIN-124, not LIN-123
      const commentCall = mockLinearClient.createComment.mock.calls[0];
      expect(commentCall[1]).toContain('LIN-124');
      expect(commentCall[1]).not.toContain('LIN-123');
    });

    it('should handle errors gracefully', async () => {
      mockLinearClient.getIssues.mockRejectedValueOnce(new Error('API error'));

      const context: BehaviorContext = {
        issue: {
          id: 'issue-error',
          identifier: 'LIN-999',
          title: 'Error case',
          description: 'This depends on something',
          team: { id: 'team-1' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('dependency scoring', () => {
    it('should score direct identifier mentions highly', async () => {
      const relatedIssues = [
        {
          id: 'issue-ref',
          identifier: 'LIN-200',
          title: 'Referenced task',
          state: { name: 'Todo' }
        }
      ];

      mockLinearClient.getIssues.mockResolvedValueOnce({ nodes: relatedIssues });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-main',
          identifier: 'LIN-201',
          title: 'Main task',
          description: 'This is blocked by LIN-200',
          team: { id: 'team-1' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      expect(result.actions[0].data.dependencies[0].identifier).toBe('LIN-200');
    });

    it('should detect dependencies from shared labels', async () => {
      const relatedIssues = [
        {
          id: 'issue-shared',
          identifier: 'LIN-300',
          title: 'Backend API',
          labels: { nodes: [{ name: 'api' }, { name: 'critical' }] },
          state: { name: 'In Progress' }
        }
      ];

      mockLinearClient.getIssues.mockResolvedValueOnce({ nodes: relatedIssues });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-main',
          identifier: 'LIN-301',
          title: 'Frontend Integration',
          description: 'Integrate with backend services',
          labels: { nodes: [{ name: 'api' }, { name: 'frontend' }] },
          team: { id: 'team-1' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      // Should detect dependency based on shared 'api' label and related titles
    });
  });

  describe('validate', () => {
    it('should validate successfully when Linear client is available', async () => {
      const isValid = await behavior.validate();
      expect(isValid).toBe(true);
      expect(mockLinearClient.getViewer).toHaveBeenCalled();
    });

    it('should fail validation when Linear client is unavailable', async () => {
      mockLinearClient.getViewer.mockRejectedValueOnce(new Error('Not connected'));

      const isValid = await behavior.validate();
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      behavior.updateConfig({
        keywordSimilarityThreshold: 0.8,
        maxSuggestionsPerIssue: 5
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Dependency detection configuration updated',
        expect.any(Object)
      );
    });

    it('should respect custom configuration', async () => {
      const customBehavior = new DependencyDetectionBehavior(mockLinearClient, {
        dependencyKeywords: ['custom-depends', 'special-requires'],
        ignoreClosedIssues: false
      });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-custom',
          title: 'Task',
          description: 'This custom-depends on something',
          state: { name: 'Done' } // Closed but should still trigger
        },
        timestamp: new Date()
      };

      const shouldTrigger = await customBehavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(true); // Should trigger despite being closed
    });
  });
});