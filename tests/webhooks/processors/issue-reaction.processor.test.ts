/**
 * Tests for IssueReactionProcessor
 */

import { IssueReactionProcessor } from '../../../src/webhooks/processors/issue-reaction.processor';
import { LinearClientWrapper } from '../../../src/linear/client';
import { OperationalNotificationCoordinator } from '../../../src/utils/operational-notification-coordinator';
import { AppUserNotification } from '../../../src/webhooks/processors/base-processor';
import * as logger from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/linear/client');
jest.mock('../../../src/utils/operational-notification-coordinator');
jest.mock('../../../src/utils/logger');

// Mock environment variable
process.env.LINEAR_AGENT_ID = 'agent-123';

describe('IssueReactionProcessor', () => {
  let processor: IssueReactionProcessor;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;
  let mockNotificationCoordinator: jest.Mocked<OperationalNotificationCoordinator>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLinearClient = {
      createComment: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockNotificationCoordinator = {
      notifyAgentUpdate: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Create processor instance
    processor = new IssueReactionProcessor(
      mockLinearClient,
      mockNotificationCoordinator
    );
  });

  describe('process - issue reactions', () => {
    it('should process issue reaction on high priority assigned issue', async () => {
      const notification: AppUserNotification = {
        action: 'issueEmojiReaction',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueEmojiReaction',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Reacting User'
          },
          issue: {
            id: 'issue-123',
            identifier: 'LIN-123',
            title: 'High priority feature',
            url: 'https://linear.app/team/issue/LIN-123',
            state: {
              id: 'state-progress',
              name: 'In Progress',
              color: '#0000FF',
              type: 'started'
            },
            assignee: {
              id: 'agent-123',
              name: 'SAFe PULSE'
            },
            priority: {
              value: 1,
              name: 'Urgent'
            }
          }
        }
      };

      await processor.process(notification);

      // Verify response was created for high priority issue
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('Thanks for the reaction, @Reacting User!')
      );

      // Verify issue context mentioned
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('High priority feature')
      );

      // Verify Slack notification was sent
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'Reaction: LIN-123',
        'Reacting User reacted to "High priority feature"',
        'https://linear.app/team/issue/LIN-123',
        'Reacting User'
      );
    });

    it('should skip response for low priority unassigned issues', async () => {
      const notification: AppUserNotification = {
        action: 'issueEmojiReaction',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-skip',
          type: 'issueEmojiReaction',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Random User'
          },
          issue: {
            id: 'issue-skip',
            identifier: 'LIN-SKIP',
            title: 'Low priority task',
            url: 'https://linear.app/team/issue/LIN-SKIP',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              color: '#888888',
              type: 'backlog'
            },
            priority: {
              value: 4,
              name: 'Low'
            }
          }
        }
      };

      await processor.process(notification);

      // Should still track in Slack but not create comment
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalled();
    });

    it('should handle missing issue data gracefully', async () => {
      const notification: AppUserNotification = {
        action: 'issueEmojiReaction',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueEmojiReaction',
          createdAt: '2024-01-01T00:00:00Z'
        }
      };

      await processor.process(notification);

      // Should not create comment or send notification
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
      expect(mockNotificationCoordinator.notifyAgentUpdate).not.toHaveBeenCalled();
    });
  });

  describe('process - comment reactions', () => {
    it('should process comment reaction with question context', async () => {
      const notification: AppUserNotification = {
        action: 'issueCommentReaction',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-comment',
          type: 'issueCommentReaction',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Question User'
          },
          issue: {
            id: 'issue-comment',
            identifier: 'LIN-COMMENT',
            title: 'Discussion thread',
            url: 'https://linear.app/team/issue/LIN-COMMENT',
            state: {
              id: 'state-progress',
              name: 'In Progress',
              color: '#0000FF',
              type: 'started'
            },
            assignee: {
              id: 'agent-123',
              name: 'SAFe PULSE'
            }
          },
          comment: {
            id: 'comment-123',
            body: 'What do you think about this approach?',
            createdAt: '2024-01-01T12:00:00Z',
            url: 'https://linear.app/team/issue/LIN-COMMENT#comment-123'
          }
        }
      };

      await processor.process(notification);

      // Verify response acknowledges comment reaction
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-comment',
        expect.stringContaining("reacted to a comment")
      );

      // Verify question context recognized
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-comment',
        expect.stringContaining('questions or need clarification')
      );

      // Verify Slack notification with comment URL
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'Reaction: LIN-COMMENT',
        'Question User reacted to a comment on "Discussion thread"',
        'https://linear.app/team/issue/LIN-COMMENT#comment-123',
        'Question User'
      );
    });

    it('should respond when agent is mentioned in issue description', async () => {
      const notification: AppUserNotification = {
        action: 'issueCommentReaction',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-mentioned',
          type: 'issueCommentReaction',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Mentioning User'
          },
          issue: {
            id: 'issue-mentioned',
            identifier: 'LIN-MENTIONED',
            title: 'Issue with agent mention',
            description: 'Hey @saafepulse can you help with this?',
            url: 'https://linear.app/team/issue/LIN-MENTIONED',
            state: {
              id: 'state-todo',
              name: 'Todo',
              color: '#0000FF',
              type: 'unstarted'
            }
          },
          comment: {
            id: 'comment-456',
            body: 'Regular comment without question',
            createdAt: '2024-01-01T12:00:00Z'
          }
        }
      };

      await processor.process(notification);

      // Should respond since agent is mentioned in issue
      expect(mockLinearClient.createComment).toHaveBeenCalled();
    });

    it('should provide context-specific help for backlog issues', async () => {
      const notification: AppUserNotification = {
        action: 'issueEmojiReaction',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-backlog',
          type: 'issueEmojiReaction',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Planning User'
          },
          issue: {
            id: 'issue-backlog',
            identifier: 'LIN-BACKLOG',
            title: 'Backlog item',
            url: 'https://linear.app/team/issue/LIN-BACKLOG',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              color: '#888888',
              type: 'backlog'
            },
            assignee: {
              id: 'agent-123',
              name: 'SAFe PULSE'
            }
          }
        }
      };

      await processor.process(notification);

      // Verify planning context mentioned
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-backlog',
        expect.stringContaining('currently in planning')
      );

      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-backlog',
        expect.stringContaining('help with estimation or planning')
      );
    });

    it('should handle errors and send error notification', async () => {
      const notification: AppUserNotification = {
        action: 'issueEmojiReaction',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-error',
          type: 'issueEmojiReaction',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Error User'
          },
          issue: {
            id: 'issue-error',
            identifier: 'LIN-ERROR',
            title: 'Error Issue',
            url: 'https://linear.app/team/issue/LIN-ERROR',
            assignee: {
              id: 'agent-123',
              name: 'SAFe PULSE'
            }
          }
        }
      };

      // Mock Linear client to throw error
      mockLinearClient.createComment.mockRejectedValue(new Error('API Error'));

      await expect(processor.process(notification)).rejects.toThrow('API Error');

      // Verify error notification was sent to Slack
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'Error Processing Reaction: LIN-ERROR',
        'Failed to process reaction: API Error',
        'https://linear.app/team/issue/LIN-ERROR',
        'System'
      );
    });
  });
});