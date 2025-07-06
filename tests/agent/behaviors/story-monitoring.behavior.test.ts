/**
 * Tests for Story Monitoring Behavior (LIN-59)
 */

import { StoryMonitoringBehavior } from '../../../src/agent/behaviors/story-monitoring.behavior';
import { BehaviorContext } from '../../../src/agent/types/autonomous-types';
import { LinearClientWrapper } from '../../../src/linear/client';
import * as logger from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/linear/client');
jest.mock('../../../src/utils/logger');

describe('StoryMonitoringBehavior', () => {
  let behavior: StoryMonitoringBehavior;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLinearClient = {
      getViewer: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Test User' }),
      getComments: jest.fn().mockResolvedValue({ nodes: [] }),
      createComment: jest.fn().mockResolvedValue({ id: 'comment-1' })
    } as any;

    behavior = new StoryMonitoringBehavior(mockLinearClient);
  });

  describe('shouldTrigger', () => {
    it('should trigger for new issue with high story points', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-1',
          identifier: 'LIN-123',
          title: 'Large Story',
          estimate: 8,
          state: { name: 'Backlog' },
          createdAt: new Date().toISOString(),
          labels: { nodes: [] }
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger for issue without context', async () => {
      const context: BehaviorContext = {
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
    });

    it('should not trigger for small stories', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-2',
          estimate: 3,
          state: { name: 'Backlog' },
          createdAt: new Date().toISOString()
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
    });

    it('should not trigger for stories with ignored labels', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-3',
          estimate: 8,
          state: { name: 'Backlog' },
          createdAt: new Date().toISOString(),
          labels: { nodes: [{ name: 'decomposed' }] }
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
    });

    it('should not trigger for stories in non-monitored states', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-4',
          estimate: 8,
          state: { name: 'Done' },
          createdAt: new Date().toISOString()
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
    });

    it('should not trigger if story already has children', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-5',
          estimate: 8,
          state: { name: 'Backlog' },
          createdAt: new Date().toISOString(),
          children: [{ id: 'child-1' }]
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
    });

    it('should not trigger if decomposition already suggested', async () => {
      mockLinearClient.getComments.mockResolvedValueOnce({
        nodes: [{
          id: 'comment-1',
          body: 'decomposition suggestion',
          user: { name: 'SAFe PULSE Bot' }
        }]
      });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-6',
          estimate: 8,
          state: { name: 'Backlog' },
          createdAt: new Date().toISOString()
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
      expect(mockLinearClient.getComments).toHaveBeenCalledWith('issue-6');
    });
  });

  describe('execute', () => {
    it('should post decomposition suggestion for large story', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-7',
          identifier: 'LIN-789',
          title: 'Implement Feature X',
          estimate: 13,
          state: { name: 'Backlog' },
          assignee: { id: 'user-2' },
          creator: { id: 'user-1' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toMatchObject({
        type: 'comment',
        target: 'issue-7',
        result: 'success'
      });
      expect(result.shouldNotify).toBe(true); // 13 points > 10 (2x threshold)
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-7',
        expect.stringContaining('13 story points')
      );
    });

    it('should handle comment creation failure', async () => {
      mockLinearClient.createComment.mockRejectedValueOnce(new Error('API error'));

      const context: BehaviorContext = {
        issue: {
          id: 'issue-8',
          identifier: 'LIN-890',
          estimate: 8
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(false);
      expect(result.actions[0].result).toBe('failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should not notify for moderately large stories', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-9',
          identifier: 'LIN-901',
          estimate: 6, // Just above threshold but not 2x
          assignee: { id: 'user-2' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      expect(result.shouldNotify).toBe(false);
    });

    it('should handle missing issue context gracefully', async () => {
      const context: BehaviorContext = {
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
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
        maxStoryPoints: 8,
        ignoreLabels: ['spike', 'research']
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Story monitoring configuration updated',
        expect.any(Object)
      );
    });

    it('should use custom configuration', async () => {
      const customBehavior = new StoryMonitoringBehavior(mockLinearClient, {
        maxStoryPoints: 3,
        monitorStates: ['todo', 'in-progress']
      });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-10',
          estimate: 4, // Above custom threshold of 3
          state: { name: 'Todo' },
          createdAt: new Date().toISOString()
        },
        timestamp: new Date()
      };

      const shouldTrigger = await customBehavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(true);
    });
  });

  describe('decomposition suggestion generation', () => {
    it('should generate appropriate suggestion message', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-11',
          identifier: 'LIN-1111',
          title: 'Complex Integration Task',
          estimate: 10
        },
        timestamp: new Date()
      };

      await behavior.execute(context);

      const commentCall = mockLinearClient.createComment.mock.calls[0];
      const comment = commentCall[1];

      expect(comment).toContain('10 story points');
      expect(comment).toContain('Complex Integration Task');
      expect(comment).toContain('@saafepulse decompose this story');
      expect(comment).toContain('Functional boundaries');
      expect(comment).toContain('User journeys');
      expect(comment).toContain('Technical layers');
    });
  });
});