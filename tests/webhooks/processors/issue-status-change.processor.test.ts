/**
 * Tests for IssueStatusChangeProcessor
 */

import { IssueStatusChangeProcessor } from '../../../src/webhooks/processors/issue-status-change.processor';
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

describe('IssueStatusChangeProcessor', () => {
  let processor: IssueStatusChangeProcessor;
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
    processor = new IssueStatusChangeProcessor(
      mockLinearClient,
      mockNotificationCoordinator
    );
  });

  describe('process', () => {
    it('should process status change to completed successfully', async () => {
      const notification: AppUserNotification = {
        action: 'issueStatusChanged',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueStatusChanged',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Jane Developer'
          },
          issue: {
            id: 'issue-123',
            identifier: 'LIN-123',
            title: 'Implement feature X',
            url: 'https://linear.app/team/issue/LIN-123',
            state: {
              id: 'state-done',
              name: 'Done',
              color: '#00FF00',
              type: 'completed'
            },
            assignee: {
              id: 'agent-123',
              name: 'SAFe PULSE'
            },
            priority: {
              value: 2,
              name: 'High'
            },
            estimate: {
              value: 5,
              name: '5 Points'
            }
          }
        }
      };

      await processor.process(notification);

      // Verify Linear comment was created
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('Great news @Jane Developer!')
      );

      // Verify completion message
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('has been marked as **Done**')
      );

      // Verify work summary included
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('Story Points: 5')
      );

      // Verify Slack notification was sent
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'Status Changed: LIN-123',
        'Implement feature X moved to Done by Jane Developer',
        'https://linear.app/team/issue/LIN-123',
        'Jane Developer'
      );
    });

    it('should process status change to blocked with action suggestions', async () => {
      const notification: AppUserNotification = {
        action: 'issueStatusChanged',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-blocked',
          type: 'issueStatusChanged',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'PM User'
          },
          issue: {
            id: 'issue-blocked',
            identifier: 'LIN-BLOCKED',
            title: 'Blocked feature',
            url: 'https://linear.app/team/issue/LIN-BLOCKED',
            state: {
              id: 'state-blocked',
              name: 'Blocked',
              color: '#FF0000',
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

      // Verify attention message
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-blocked',
        expect.stringContaining('Attention @PM User')
      );

      // Verify blocked acknowledgment
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-blocked',
        expect.stringContaining('appears to be blocked')
      );

      // Verify suggested actions
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-blocked',
        expect.stringContaining('Review blockers')
      );

      // Verify urgent issue attention
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-blocked',
        expect.stringContaining('Urgent issue needs attention')
      );
    });

    it('should skip unassigned issues', async () => {
      const notification: AppUserNotification = {
        action: 'issueStatusChanged',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-unassigned',
          type: 'issueStatusChanged',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Other User'
          },
          issue: {
            id: 'issue-unassigned',
            identifier: 'LIN-UNASSIGNED',
            title: 'Not assigned to agent',
            url: 'https://linear.app/team/issue/LIN-UNASSIGNED',
            state: {
              id: 'state-progress',
              name: 'In Progress',
              color: '#0000FF',
              type: 'started'
            },
            assignee: {
              id: 'other-user-456',
              name: 'Other User'
            }
          }
        }
      };

      await processor.process(notification);

      // Should not create comment or send notification
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
      expect(mockNotificationCoordinator.notifyAgentUpdate).not.toHaveBeenCalled();
    });

    it('should handle missing issue data gracefully', async () => {
      const notification: AppUserNotification = {
        action: 'issueStatusChanged',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueStatusChanged',
          createdAt: '2024-01-01T00:00:00Z'
        }
      };

      await processor.process(notification);

      // Should not create comment or send notification
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
      expect(mockNotificationCoordinator.notifyAgentUpdate).not.toHaveBeenCalled();
    });

    it('should suggest breaking down large stories when moving to progress', async () => {
      const notification: AppUserNotification = {
        action: 'issueStatusChanged',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-large',
          type: 'issueStatusChanged',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Dev Lead'
          },
          issue: {
            id: 'issue-large',
            identifier: 'LIN-LARGE',
            title: 'Large story',
            url: 'https://linear.app/team/issue/LIN-LARGE',
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
            estimate: {
              value: 13,
              name: '13 Points'
            }
          }
        }
      };

      await processor.process(notification);

      // Verify large story suggestion
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-large',
        expect.stringContaining('Consider breaking down this large story')
      );
    });

    it('should handle restart transitions with re-evaluation message', async () => {
      const notification: AppUserNotification = {
        action: 'issueStatusChanged',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-restart',
          type: 'issueStatusChanged',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Product Owner'
          },
          issue: {
            id: 'issue-restart',
            identifier: 'LIN-RESTART',
            title: 'Moved back to backlog',
            url: 'https://linear.app/team/issue/LIN-RESTART',
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

      // Verify restart message
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-restart',
        expect.stringContaining('moved back to **Backlog**')
      );

      // Verify re-evaluation suggestion
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-restart',
        expect.stringContaining('needs re-evaluation')
      );
    });

    it('should handle errors and send error notification', async () => {
      const notification: AppUserNotification = {
        action: 'issueStatusChanged',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-error',
          type: 'issueStatusChanged',
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
            state: {
              id: 'state-done',
              name: 'Done',
              color: '#00FF00',
              type: 'completed'
            },
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
        'Error Processing Status Change: LIN-ERROR',
        'Failed to process status change: API Error',
        'https://linear.app/team/issue/LIN-ERROR',
        'System'
      );
    });
  });
});