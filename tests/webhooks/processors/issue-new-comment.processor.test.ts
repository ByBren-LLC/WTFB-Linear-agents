/**
 * Tests for IssueNewCommentProcessor
 */

import { IssueNewCommentProcessor } from '../../../src/webhooks/processors/issue-new-comment.processor';
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

describe('IssueNewCommentProcessor', () => {
  let processor: IssueNewCommentProcessor;
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
    processor = new IssueNewCommentProcessor(
      mockLinearClient,
      mockNotificationCoordinator
    );
  });

  describe('process', () => {
    it('should process new comment with direct mention', async () => {
      const notification: AppUserNotification = {
        action: 'issueNewComment',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueNewComment',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Comment User'
          },
          issue: {
            id: 'issue-123',
            identifier: 'LIN-123',
            title: 'Feature implementation',
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
            }
          },
          comment: {
            id: 'comment-123',
            body: 'Hey @saafepulse, can you help estimate this work?',
            createdAt: '2024-01-01T12:00:00Z',
            url: 'https://linear.app/team/issue/LIN-123#comment-123'
          }
        }
      };

      await processor.process(notification);

      // Verify response was created
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('Hi @Comment User')
      );

      // Verify estimation help mentioned
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('estimation')
      );

      // Verify Slack notification was sent
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'Comment Handled: LIN-123',
        'Responded to Comment User\'s comment on "Feature implementation"',
        'https://linear.app/team/issue/LIN-123#comment-123',
        'Comment User'
      );
    });

    it('should skip comments from the agent itself', async () => {
      const notification: AppUserNotification = {
        action: 'issueNewComment',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-self',
          type: 'issueNewComment',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'agent-123',
            name: 'SAFe PULSE'
          },
          issue: {
            id: 'issue-self',
            identifier: 'LIN-SELF',
            title: 'Self comment',
            url: 'https://linear.app/team/issue/LIN-SELF'
          },
          comment: {
            id: 'comment-self',
            body: 'This is my own comment',
            createdAt: '2024-01-01T12:00:00Z'
          }
        }
      };

      await processor.process(notification);

      // Should not create comment or send notification
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
      expect(mockNotificationCoordinator.notifyAgentUpdate).not.toHaveBeenCalled();
    });

    it('should respond to questions on assigned issues', async () => {
      const notification: AppUserNotification = {
        action: 'issueNewComment',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-question',
          type: 'issueNewComment',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Asking User'
          },
          issue: {
            id: 'issue-question',
            identifier: 'LIN-Q',
            title: 'Question issue',
            url: 'https://linear.app/team/issue/LIN-Q',
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
          },
          comment: {
            id: 'comment-question',
            body: 'What do you think about breaking this down into smaller tasks?',
            createdAt: '2024-01-01T12:00:00Z',
            url: 'https://linear.app/team/issue/LIN-Q#comment-question'
          }
        }
      };

      await processor.process(notification);

      // Verify response addresses the question
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-question',
        expect.stringContaining('I see you have a question')
      );

      // Verify planning context since it's in backlog
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-question',
        expect.stringContaining('Breaking down the work')
      );
    });

    it('should handle blocker-related comments with negative sentiment', async () => {
      const notification: AppUserNotification = {
        action: 'issueNewComment',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-blocker',
          type: 'issueNewComment',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Blocked User'
          },
          issue: {
            id: 'issue-blocker',
            identifier: 'LIN-BLOCK',
            title: 'Blocked work',
            url: 'https://linear.app/team/issue/LIN-BLOCK',
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
            id: 'comment-blocker',
            body: '@saafepulse We have a blocker - the API is broken and returning errors',
            createdAt: '2024-01-01T12:00:00Z',
            url: 'https://linear.app/team/issue/LIN-BLOCK#comment-blocker'
          }
        }
      };

      await processor.process(notification);

      // Verify blocker acknowledgment
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-blocker',
        expect.stringContaining('blockers')
      );

      // Verify empathetic response
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-blocker',
        expect.stringContaining('challenges')
      );
    });

    it('should skip non-relevant comments on unassigned issues', async () => {
      const notification: AppUserNotification = {
        action: 'issueNewComment',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-skip',
          type: 'issueNewComment',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Random User'
          },
          issue: {
            id: 'issue-skip',
            identifier: 'LIN-SKIP',
            title: 'Unrelated issue',
            url: 'https://linear.app/team/issue/LIN-SKIP',
            state: {
              id: 'state-progress',
              name: 'In Progress',
              color: '#0000FF',
              type: 'started'
            }
          },
          comment: {
            id: 'comment-skip',
            body: 'Just a status update - things are going well',
            createdAt: '2024-01-01T12:00:00Z',
            url: 'https://linear.app/team/issue/LIN-SKIP#comment-skip'
          }
        }
      };

      await processor.process(notification);

      // Should not create comment but should notify Slack
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'New Comment: LIN-SKIP',
        'Random User commented on "Unrelated issue"',
        'https://linear.app/team/issue/LIN-SKIP#comment-skip',
        'Random User'
      );
    });

    it('should handle missing data gracefully', async () => {
      const notification: AppUserNotification = {
        action: 'issueNewComment',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-missing',
          type: 'issueNewComment',
          createdAt: '2024-01-01T00:00:00Z'
        }
      };

      await processor.process(notification);

      // Should not create comment or send notification
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
      expect(mockNotificationCoordinator.notifyAgentUpdate).not.toHaveBeenCalled();
    });

    it('should handle errors and send error notification', async () => {
      const notification: AppUserNotification = {
        action: 'issueNewComment',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-error',
          type: 'issueNewComment',
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
          },
          comment: {
            id: 'comment-error',
            body: '@saafepulse help',
            createdAt: '2024-01-01T12:00:00Z'
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
        'Error Processing Comment: LIN-ERROR',
        'Failed to process comment: API Error',
        'https://linear.app/team/issue/LIN-ERROR',
        'System'
      );
    });
  });
});