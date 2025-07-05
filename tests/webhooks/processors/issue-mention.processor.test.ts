/**
 * Tests for IssueMentionProcessor
 */

import { IssueMentionProcessor } from '../../../src/webhooks/processors/issue-mention.processor';
import { LinearClientWrapper } from '../../../src/linear/client';
import { OperationalNotificationCoordinator } from '../../../src/utils/operational-notification-coordinator';
import { AppUserNotification } from '../../../src/webhooks/processors/base-processor';
import * as logger from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/linear/client');
jest.mock('../../../src/utils/operational-notification-coordinator');
jest.mock('../../../src/utils/logger');

describe('IssueMentionProcessor', () => {
  let processor: IssueMentionProcessor;
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
    processor = new IssueMentionProcessor(
      mockLinearClient,
      mockNotificationCoordinator
    );
  });

  describe('process', () => {
    it('should process issue mention successfully', async () => {
      const notification: AppUserNotification = {
        action: 'issueMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'John Doe'
          },
          issue: {
            id: 'issue-123',
            identifier: 'LIN-123',
            title: 'Test Issue',
            description: 'Testing @saafepulse help',
            url: 'https://linear.app/team/issue/LIN-123',
            state: {
              id: 'state-123',
              name: 'Todo',
              color: '#000000',
              type: 'unstarted'
            },
            team: {
              id: 'team-123',
              key: 'TEAM',
              name: 'Test Team'
            }
          }
        }
      };

      await processor.process(notification);

      // Verify Linear comment was created
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('Hello @John Doe!')
      );

      // Verify the response includes help text since user mentioned "help"
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('How can I help you?')
      );

      // Verify Slack notification was sent
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'Issue Mention: LIN-123',
        '@saafepulse mentioned in "Test Issue" by John Doe',
        'https://linear.app/team/issue/LIN-123',
        'John Doe'
      );
    });

    it('should handle missing issue data gracefully', async () => {
      const notification: AppUserNotification = {
        action: 'issueMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueMention',
          createdAt: '2024-01-01T00:00:00Z'
        }
      };

      await processor.process(notification);

      // Should not create comment or send notification
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
      expect(mockNotificationCoordinator.notifyAgentUpdate).not.toHaveBeenCalled();
    });

    it('should handle plan command in mention text', async () => {
      const notification: AppUserNotification = {
        action: 'issueMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Jane Smith'
          },
          issue: {
            id: 'issue-456',
            identifier: 'LIN-456',
            title: 'Feature Planning',
            description: '@saafepulse plan this feature',
            url: 'https://linear.app/team/issue/LIN-456'
          }
        }
      };

      await processor.process(notification);

      // Verify planning response was included
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-456',
        expect.stringContaining("I'll help you plan this work!")
      );
    });

    it('should handle decompose command in mention text', async () => {
      const notification: AppUserNotification = {
        action: 'issueMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Bob Builder'
          },
          issue: {
            id: 'issue-789',
            identifier: 'LIN-789',
            title: 'Large Story',
            description: 'This is a big story. @saafepulse decompose this please',
            url: 'https://linear.app/team/issue/LIN-789'
          }
        }
      };

      await processor.process(notification);

      // Verify decomposition response was included
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-789',
        expect.stringContaining('Story decomposition is one of my specialties!')
      );
    });

    it('should handle errors and send error notification', async () => {
      const notification: AppUserNotification = {
        action: 'issueMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Error User'
          },
          issue: {
            id: 'issue-error',
            identifier: 'LIN-ERROR',
            title: 'Error Issue',
            description: '@saafepulse test error',
            url: 'https://linear.app/team/issue/LIN-ERROR'
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
        'Error Processing Issue Mention: LIN-ERROR',
        'Failed to process mention: API Error',
        'https://linear.app/team/issue/LIN-ERROR',
        'System'
      );
    });

    it('should handle missing actor name', async () => {
      const notification: AppUserNotification = {
        action: 'issueMention',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueMention',
          createdAt: '2024-01-01T00:00:00Z',
          issue: {
            id: 'issue-123',
            identifier: 'LIN-123',
            title: 'Test Issue',
            description: '@saafepulse hello',
            url: 'https://linear.app/team/issue/LIN-123'
          }
        }
      };

      await processor.process(notification);

      // Should use 'there' as fallback username
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('Hello @there!')
      );
    });
  });
});