/**
 * Integration tests for webhook handler with processors
 */

import { Request, Response } from 'express';
import { handleWebhook } from '../../src/webhooks/handler';
import { verifyWebhookSignature } from '../../src/webhooks/verification';
import { LinearClientWrapper } from '../../src/linear/client';
import { OperationalNotificationCoordinator } from '../../src/utils/operational-notification-coordinator';
import * as logger from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/webhooks/verification');
jest.mock('../../src/linear/client');
jest.mock('../../src/utils/operational-notification-coordinator');
jest.mock('../../src/utils/logger');

// Mock environment variables
process.env.LINEAR_ACCESS_TOKEN = 'test-token';
process.env.LINEAR_ORGANIZATION_ID = 'test-org';
process.env.NODE_ENV = 'test';

describe('Webhook Handler Integration', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;
  let mockNotificationCoordinator: jest.Mocked<OperationalNotificationCoordinator>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock verification to always return true
    (verifyWebhookSignature as jest.Mock).mockReturnValue(true);

    // Setup mock Linear client
    mockLinearClient = {
      createComment: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Mock LinearClientWrapper constructor
    (LinearClientWrapper as jest.MockedClass<typeof LinearClientWrapper>).mockImplementation(
      () => mockLinearClient
    );

    // Setup mock notification coordinator
    mockNotificationCoordinator = {
      notifyAgentUpdate: jest.fn().mockResolvedValue(undefined),
      notifyWorkflowUpdate: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Mock OperationalNotificationCoordinator
    (OperationalNotificationCoordinator.createDefaultConfig as jest.Mock).mockReturnValue({});
    (OperationalNotificationCoordinator.getInstance as jest.Mock).mockReturnValue(
      mockNotificationCoordinator
    );

    // Setup request and response mocks
    mockReq = {
      headers: {
        'linear-signature': 'test-signature'
      },
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('Issue Mention Processing', () => {
    it('should process issue mention webhook with new processor', async () => {
      mockReq.body = {
        type: 'AppUserNotification',
        action: 'issueMention',
        notification: {
          id: 'notif-123',
          type: 'issueMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-123',
            name: 'Test User'
          },
          issue: {
            id: 'issue-123',
            identifier: 'LIN-123',
            title: 'Test Issue',
            description: 'Testing @saafepulse integration',
            url: 'https://linear.app/team/issue/LIN-123',
            state: {
              id: 'state-123',
              name: 'Todo',
              color: '#000000',
              type: 'unstarted'
            }
          }
        }
      };

      await handleWebhook(mockReq as Request, mockRes as Response);

      // Verify webhook was processed successfully
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });

      // Verify Linear comment was created
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-123',
        expect.stringContaining('Hello @Test User!')
      );

      // Verify Slack notification was sent
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'Issue Mention: LIN-123',
        '@saafepulse mentioned in "Test Issue" by Test User',
        'https://linear.app/team/issue/LIN-123',
        'Test User'
      );
    });

    it('should handle missing Linear credentials', async () => {
      // Remove credentials
      delete process.env.LINEAR_ACCESS_TOKEN;

      mockReq.body = {
        type: 'AppUserNotification',
        action: 'issueMention',
        notification: {
          id: 'notif-123',
          type: 'issueMention',
          createdAt: '2024-01-01T00:00:00Z',
          issue: {
            id: 'issue-123',
            identifier: 'LIN-123',
            title: 'Test Issue',
            description: '@saafepulse test',
            url: 'https://linear.app/team/issue/LIN-123'
          }
        }
      };

      await handleWebhook(mockReq as Request, mockRes as Response);

      // Verify error response
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });

      // Restore credentials
      process.env.LINEAR_ACCESS_TOKEN = 'test-token';
    });

    it('should handle invalid webhook signature', async () => {
      // Mock verification to return false
      (verifyWebhookSignature as jest.Mock).mockReturnValue(false);

      mockReq.body = {
        type: 'AppUserNotification',
        action: 'issueMention'
      };

      await handleWebhook(mockReq as Request, mockRes as Response);

      // Verify unauthorized response
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid signature' });

      // Verify no processing occurred
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
    });
  });

  describe('Legacy Webhook Processing', () => {
    it('should still handle comment mentions with old processor', async () => {
      mockReq.body = {
        type: 'AppUserNotification',
        action: 'issueCommentMention',
        notification: {
          id: 'notif-456',
          type: 'issueCommentMention',
          createdAt: '2024-01-01T00:00:00Z',
          actor: {
            id: 'user-456',
            name: 'Comment User'
          },
          issue: {
            id: 'issue-456',
            identifier: 'LIN-456',
            title: 'Comment Issue',
            url: 'https://linear.app/team/issue/LIN-456'
          },
          comment: {
            id: 'comment-123',
            body: '@saafepulse check this out',
            createdAt: '2024-01-01T00:00:00Z'
          }
        }
      };

      await handleWebhook(mockReq as Request, mockRes as Response);

      // Verify webhook was processed successfully
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });

      // Verify Slack notification was sent (using old handler)
      expect(mockNotificationCoordinator.notifyAgentUpdate).toHaveBeenCalledWith(
        'linear-agent',
        'remote',
        'assigned',
        'Comment Mention: Comment Issue',
        'Agent mentioned in comment by Comment User',
        'https://linear.app/team/issue/LIN-456',
        'Comment User'
      );

      // No Linear comment should be created (old handler doesn't do this)
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
    });
  });
});