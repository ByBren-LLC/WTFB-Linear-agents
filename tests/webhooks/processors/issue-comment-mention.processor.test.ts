/**
 * Tests for IssueCommentMentionProcessor
 */

import { IssueCommentMentionProcessor } from '../../../src/webhooks/processors/issue-comment-mention.processor';
import { LinearClientWrapper } from '../../../src/linear/client';
import { OperationalNotificationCoordinator } from '../../../src/utils/operational-notification-coordinator';
import { AppUserNotification } from '../../../src/webhooks/processors/base-processor';
import * as logger from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/linear/client');
jest.mock('../../../src/utils/operational-notification-coordinator');
jest.mock('../../../src/utils/logger');

describe('IssueCommentMentionProcessor', () => {
  let processor: IssueCommentMentionProcessor;
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
    processor = new IssueCommentMentionProcessor(
      mockLinearClient,
      mockNotificationCoordinator
    );
  });

  describe('process', () => {
    it('should process comment mention successfully', async () => {
      const notification: AppUserNotification = {
        action: 'issueCommentMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueCommentMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Jane Doe'
          },
          issue: {
            id: 'issue-123',
            identifier: 'LIN-123',
            title: 'Test Issue',
            url: 'https://linear.app/team/issue/LIN-123',
            state: {
              id: 'state-123',
              name: 'In Progress',
              color: '#000000',
              type: 'started'
            }
          },
          comment: {
            id: 'comment-123',
            body: 'Hey @saafepulse, can you help with this?',
            createdAt: '2024-01-01T12:00:00Z',
            url: 'https://linear.app/team/issue/LIN-123#comment-123'
          }
        }
      };

      await processor.process(notification);

      // Verify Linear comment was created
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('Hi @Jane Doe!')
      );

      // Verify the response includes thread context
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('responding to your comment in **LIN-123')
      );

      // Verify Slack notification was sent
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'Comment Mention: LIN-123',
        '@saafepulse mentioned in comment on "Test Issue" by Jane Doe',
        'https://linear.app/team/issue/LIN-123#comment-123',
        'Jane Doe'
      );
    });

    it('should handle missing comment data gracefully', async () => {
      const notification: AppUserNotification = {
        action: 'issueCommentMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueCommentMention',
          createdAt: '2024-01-01T00:00:00Z',
          issue: {
            id: 'issue-123',
            identifier: 'LIN-123',
            title: 'Test Issue',
            url: 'https://linear.app/team/issue/LIN-123'
          }
        }
      };

      await processor.process(notification);

      // Should not create comment or send notification
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
      expect(mockNotificationCoordinator.notifyAgentUpdate).not.toHaveBeenCalled();
    });

    it('should handle help command in comment', async () => {
      const notification: AppUserNotification = {
        action: 'issueCommentMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueCommentMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Help User'
          },
          issue: {
            id: 'issue-456',
            identifier: 'LIN-456',
            title: 'Need Help',
            url: 'https://linear.app/team/issue/LIN-456'
          },
          comment: {
            id: 'comment-456',
            body: '@saafepulse help',
            createdAt: '2024-01-01T12:00:00Z'
          }
        }
      };

      await processor.process(notification);

      // Verify help text was included
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-456',
        expect.stringContaining('Comment Commands Available')
      );
    });

    it('should handle status command in comment', async () => {
      const notification: AppUserNotification = {
        action: 'issueCommentMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueCommentMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Status User'
          },
          issue: {
            id: 'issue-789',
            identifier: 'LIN-789',
            title: 'Status Check',
            url: 'https://linear.app/team/issue/LIN-789',
            state: {
              id: 'state-done',
              name: 'Done',
              color: '#00FF00',
              type: 'completed'
            },
            priority: {
              value: 2,
              name: 'High'
            },
            estimate: {
              value: 5,
              name: '5 Points'
            },
            team: {
              id: 'team-123',
              key: 'TEAM',
              name: 'Test Team'
            }
          },
          comment: {
            id: 'comment-789',
            body: '@saafepulse what is the status?',
            createdAt: '2024-01-01T12:00:00Z'
          }
        }
      };

      await processor.process(notification);

      // Verify status response was included
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-789',
        expect.stringContaining('Current Issue Status')
      );

      // Verify status details
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-789',
        expect.stringContaining('State**: Done')
      );
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-789',
        expect.stringContaining('Priority**: High')
      );
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-789',
        expect.stringContaining('Estimate**: 5 points')
      );
    });

    it('should handle urgent context with high priority response', async () => {
      const notification: AppUserNotification = {
        action: 'issueCommentMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueCommentMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Urgent User'
          },
          issue: {
            id: 'issue-urgent',
            identifier: 'LIN-URGENT',
            title: 'Urgent Issue',
            url: 'https://linear.app/team/issue/LIN-URGENT',
            priority: {
              value: 1,
              name: 'Urgent'
            }
          },
          comment: {
            id: 'comment-urgent',
            body: '@saafepulse this is critical and needs immediate attention!',
            createdAt: '2024-01-01T12:00:00Z'
          }
        }
      };

      await processor.process(notification);

      // Verify urgent response was generated
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-urgent',
        expect.stringContaining('🚨 Hi @Urgent User, I see this is urgent')
      );

      // Verify priority response footer
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-urgent',
        expect.stringContaining('Priority Response')
      );
    });

    it('should handle decompose command in comment', async () => {
      const notification: AppUserNotification = {
        action: 'issueCommentMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueCommentMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Decompose User'
          },
          issue: {
            id: 'issue-big',
            identifier: 'LIN-BIG',
            title: 'Large Story',
            url: 'https://linear.app/team/issue/LIN-BIG',
            estimate: {
              value: 13,
              name: '13 Points'
            }
          },
          comment: {
            id: 'comment-decompose',
            body: '@saafepulse can you split this story?',
            createdAt: '2024-01-01T12:00:00Z'
          }
        }
      };

      await processor.process(notification);

      // Verify decomposition response was included
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-big',
        expect.stringContaining('Story Decomposition')
      );

      // Verify current points mentioned
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-big',
        expect.stringContaining('currently 13 points')
      );
    });

    it('should handle errors and send error notification', async () => {
      const notification: AppUserNotification = {
        action: 'issueCommentMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueCommentMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Error User'
          },
          issue: {
            id: 'issue-error',
            identifier: 'LIN-ERROR',
            title: 'Error Issue',
            url: 'https://linear.app/team/issue/LIN-ERROR'
          },
          comment: {
            id: 'comment-error',
            body: '@saafepulse test error',
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
        'Error Processing Comment Mention: LIN-ERROR',
        'Failed to process comment mention: API Error',
        'https://linear.app/team/issue/LIN-ERROR',
        'System'
      );
    });

    it('should provide contextual help for backlog issues', async () => {
      const notification: AppUserNotification = {
        action: 'issueCommentMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueCommentMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Backlog User'
          },
          issue: {
            id: 'issue-backlog',
            identifier: 'LIN-BACKLOG',
            title: 'Backlog Item',
            url: 'https://linear.app/team/issue/LIN-BACKLOG',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              color: '#888888',
              type: 'backlog'
            }
          },
          comment: {
            id: 'comment-backlog',
            body: '@saafepulse',
            createdAt: '2024-01-01T12:00:00Z'
          }
        }
      };

      await processor.process(notification);

      // Verify backlog-specific help was provided
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-backlog',
        expect.stringContaining('issue is in the **backlog**')
      );

      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-backlog',
        expect.stringContaining('Planning and estimation')
      );
    });
  });
});