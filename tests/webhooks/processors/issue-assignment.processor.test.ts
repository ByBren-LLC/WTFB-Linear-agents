/**
 * Tests for IssueAssignmentProcessor
 */

import { IssueAssignmentProcessor } from '../../../src/webhooks/processors/issue-assignment.processor';
import { LinearClientWrapper } from '../../../src/linear/client';
import { OperationalNotificationCoordinator } from '../../../src/utils/operational-notification-coordinator';
import { AppUserNotification } from '../../../src/webhooks/processors/base-processor';
import * as logger from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/linear/client');
jest.mock('../../../src/utils/operational-notification-coordinator');
jest.mock('../../../src/utils/logger');

describe('IssueAssignmentProcessor', () => {
  let processor: IssueAssignmentProcessor;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;
  let mockNotificationCoordinator: jest.Mocked<OperationalNotificationCoordinator>;
  let mockTeam: any;
  let mockStates: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock workflow states
    mockStates = {
      nodes: [
        { id: 'state-backlog', name: 'Backlog', type: 'backlog' },
        { id: 'state-todo', name: 'Todo', type: 'unstarted' },
        { id: 'state-progress', name: 'In Progress', type: 'started' },
        { id: 'state-done', name: 'Done', type: 'completed' },
        { id: 'state-canceled', name: 'Canceled', type: 'canceled' }
      ]
    };

    // Create mock team
    mockTeam = {
      states: jest.fn().mockResolvedValue(mockStates)
    };

    // Create mock instances
    mockLinearClient = {
      createComment: jest.fn().mockResolvedValue(undefined),
      getTeam: jest.fn().mockResolvedValue(mockTeam),
      updateIssue: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockNotificationCoordinator = {
      notifyAgentUpdate: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Create processor instance
    processor = new IssueAssignmentProcessor(
      mockLinearClient,
      mockNotificationCoordinator
    );
  });

  describe('process - assignment', () => {
    it('should process issue assignment successfully with status update', async () => {
      const notification: AppUserNotification = {
        action: 'issueAssignedToYou',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueAssignedToYou',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'John Manager'
          },
          issue: {
            id: 'issue-123',
            identifier: 'LIN-123',
            title: 'Implement new feature',
            url: 'https://linear.app/team/issue/LIN-123',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              color: '#000000',
              type: 'backlog'
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
          }
        }
      };

      await processor.process(notification);

      // Verify Linear comment was created
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('Hello @John Manager!')
      );

      // Verify response includes assignment acknowledgment
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining("I've been assigned to **LIN-123")
      );

      // Verify status update was attempted
      expect(mockLinearClient.getTeam).toHaveBeenCalledWith('team-123');
      expect(mockLinearClient.updateIssue).toHaveBeenCalledWith({
        id: 'issue-123',
        stateId: 'state-progress'
      });

      // Verify Slack notification was sent
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'Issue Assigned: LIN-123',
        'Implement new feature assigned to SAFe PULSE by John Manager',
        'https://linear.app/team/issue/LIN-123',
        'John Manager'
      );
    });

    it('should handle urgent priority assignment', async () => {
      const notification: AppUserNotification = {
        action: 'issueAssignedToYou',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-urgent',
          type: 'issueAssignedToYou',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Urgent User'
          },
          issue: {
            id: 'issue-urgent',
            identifier: 'LIN-URGENT',
            title: 'Critical bug fix',
            url: 'https://linear.app/team/issue/LIN-URGENT',
            state: {
              id: 'state-todo',
              name: 'Todo',
              color: '#000000',
              type: 'unstarted'
            },
            priority: {
              value: 1,
              name: 'Urgent'
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

      // Verify urgent work acknowledgment
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-urgent',
        expect.stringContaining('urgent work')
      );

      // Verify urgent priority mentioned in next steps
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-urgent',
        expect.stringContaining('marked as **Urgent**')
      );
    });

    it('should not update status for in-progress issues', async () => {
      const notification: AppUserNotification = {
        action: 'issueAssignedToYou',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueAssignedToYou',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Re-assigner'
          },
          issue: {
            id: 'issue-started',
            identifier: 'LIN-STARTED',
            title: 'Already started task',
            url: 'https://linear.app/team/issue/LIN-STARTED',
            state: {
              id: 'state-progress',
              name: 'In Progress',
              color: '#00FF00',
              type: 'started'
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

      // Verify comment was created
      expect(mockLinearClient.createComment).toHaveBeenCalled();

      // Verify status update was NOT attempted
      expect(mockLinearClient.getTeam).not.toHaveBeenCalled();
      expect(mockLinearClient.updateIssue).not.toHaveBeenCalled();

      // Verify auto-status disabled mentioned
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-started',
        expect.stringContaining('Auto-status: Disabled')
      );
    });

    it('should suggest decomposition for large stories', async () => {
      const notification: AppUserNotification = {
        action: 'issueAssignedToYou',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueAssignedToYou',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'PM User'
          },
          issue: {
            id: 'issue-large',
            identifier: 'LIN-LARGE',
            title: 'Large feature implementation',
            url: 'https://linear.app/team/issue/LIN-LARGE',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              color: '#000000',
              type: 'backlog'
            },
            estimate: {
              value: 13,
              name: '13 Points'
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

      // Verify decomposition suggestion
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-large',
        expect.stringContaining('large story (13 points)')
      );
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-large',
        expect.stringContaining('consider decomposition')
      );
    });

    it('should handle missing issue data gracefully', async () => {
      const notification: AppUserNotification = {
        action: 'issueAssignedToYou',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueAssignedToYou',
          createdAt: '2024-01-01T00:00:00Z'
        }
      };

      await processor.process(notification);

      // Should not create comment or send notification
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
      expect(mockNotificationCoordinator.notifyAgentUpdate).not.toHaveBeenCalled();
    });

    it('should handle missing team gracefully', async () => {
      const notification: AppUserNotification = {
        action: 'issueAssignedToYou',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-no-team',
          type: 'issueAssignedToYou',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'No Team User'
          },
          issue: {
            id: 'issue-no-team',
            identifier: 'LIN-NOTEAM',
            title: 'Issue without team',
            url: 'https://linear.app/team/issue/LIN-NOTEAM',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              color: '#000000',
              type: 'backlog'
            }
            // Note: no team property
          }
        }
      };

      await processor.process(notification);

      // Verify comment was created but no status update attempted
      expect(mockLinearClient.createComment).toHaveBeenCalled();
      expect(mockLinearClient.getTeam).not.toHaveBeenCalled();
      expect(mockLinearClient.updateIssue).not.toHaveBeenCalled();
    });

    it('should notify user when status update fails', async () => {
      const notification: AppUserNotification = {
        action: 'issueAssignedToYou',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-status-fail',
          type: 'issueAssignedToYou',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Status Fail User'
          },
          issue: {
            id: 'issue-status-fail',
            identifier: 'LIN-STATUSFAIL',
            title: 'Status update will fail',
            url: 'https://linear.app/team/issue/LIN-STATUSFAIL',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              color: '#000000',
              type: 'backlog'
            },
            team: {
              id: 'team-123',
              key: 'TEAM',
              name: 'Test Team'
            }
          }
        }
      };

      // Mock updateIssue to fail
      mockLinearClient.updateIssue.mockRejectedValue(new Error('Status update failed'));

      await processor.process(notification);

      // Verify initial comment was created
      expect(mockLinearClient.createComment).toHaveBeenCalledTimes(2);
      
      // Verify error notification comment was created
      expect(mockLinearClient.createComment).toHaveBeenLastCalledWith(
        'issue-status-fail',
        expect.stringContaining('Auto-Status Update Failed')
      );
    });

    it('should handle errors and send error notification', async () => {
      const notification: AppUserNotification = {
        action: 'issueAssignedToYou',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-123',
          type: 'issueAssignedToYou',
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
              id: 'state-backlog',
              name: 'Backlog',
              color: '#000000',
              type: 'backlog'
            },
            team: {
              id: 'team-123',
              key: 'TEAM',
              name: 'Test Team'
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
        'Error Processing Assignment: LIN-ERROR',
        'Failed to process assignment: API Error',
        'https://linear.app/team/issue/LIN-ERROR',
        'System'
      );
    });
  });

  describe('process - unassignment', () => {
    it('should process issue unassignment successfully', async () => {
      const notification: AppUserNotification = {
        action: 'issueUnassignedFromYou',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-456',
          type: 'issueUnassignedFromYou',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-456',
            name: 'Jane Manager'
          },
          issue: {
            id: 'issue-456',
            identifier: 'LIN-456',
            title: 'Reassigned task',
            url: 'https://linear.app/team/issue/LIN-456',
            state: {
              id: 'state-progress',
              name: 'In Progress',
              color: '#00FF00',
              type: 'started'
            }
          }
        }
      };

      await processor.process(notification);

      // Verify Linear comment was created
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-456',
        expect.stringContaining('Hi @Jane Manager')
      );

      // Verify unassignment acknowledgment
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-456',
        expect.stringContaining("I've been unassigned from **LIN-456")
      );

      // Verify work status mentioned
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-456',
        expect.stringContaining('Work was in progress when unassigned')
      );

      // Verify no status update attempted
      expect(mockLinearClient.updateIssue).not.toHaveBeenCalled();

      // Verify Slack notification was sent
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'Issue Unassigned: LIN-456',
        'Reassigned task unassigned from SAFe PULSE by Jane Manager',
        'https://linear.app/team/issue/LIN-456',
        'Jane Manager'
      );
    });

    it('should handle completed issue unassignment', async () => {
      const notification: AppUserNotification = {
        action: 'issueUnassignedFromYou',
        type: 'AppUserNotification',
        notification: {
          id: 'notif-done',
          type: 'issueUnassignedFromYou',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-456',
            name: 'Cleanup User'
          },
          issue: {
            id: 'issue-done',
            identifier: 'LIN-DONE',
            title: 'Completed task',
            url: 'https://linear.app/team/issue/LIN-DONE',
            state: {
              id: 'state-done',
              name: 'Done',
              color: '#00FF00',
              type: 'completed'
            }
          }
        }
      };

      await processor.process(notification);

      // Verify completed work mentioned
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-done',
        expect.stringContaining('issue was completed while assigned to me')
      );
    });
  });
});