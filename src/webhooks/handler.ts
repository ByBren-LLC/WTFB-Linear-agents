import { Request, Response } from 'express';
import { verifyWebhookSignature } from './verification';
import { OperationalNotificationCoordinator } from '../utils/operational-notification-coordinator';
import { LinearClientWrapper } from '../linear/client';
import { 
  IssueMentionProcessor, 
  IssueCommentMentionProcessor,
  IssueAssignmentProcessor,
  IssueStatusChangeProcessor,
  IssueReactionProcessor,
  IssueNewCommentProcessor
} from './processors';
import * as logger from '../utils/logger';
import { getGlobalRegistry } from '../agent/behavior-registry';
import { processBehaviorWebhook } from '../agent/webhook-integration';

/**
 * Handles incoming webhook events from Linear
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    // Initialize operational notification coordinator
    const coordinatorConfig = OperationalNotificationCoordinator.createDefaultConfig(
      (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development'
    );
    const notificationCoordinator = OperationalNotificationCoordinator.getInstance(coordinatorConfig);

    // Verify the webhook signature
    const isValid = verifyWebhookSignature(
      req.headers['linear-signature'] as string,
      req.body
    );

    if (!isValid) {
      logger.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process the webhook event
    const { type, action, data } = req.body;

    logger.info(`Received webhook: ${type} - ${action}`, { type, action });

    // Handle different event types
    switch (type) {
      case 'AppUserNotification':
        // Process app user notifications
        await processAppUserNotification(req.body, notificationCoordinator);
        break;

      case 'Issue':
      case 'Comment':
      case 'IssueLabel':
        // Check if behavior registry is initialized
        const registry = getGlobalRegistry();
        if (registry) {
          try {
            // Process through behavior system
            await processBehaviorWebhook(req, res);
            return; // processBehaviorWebhook handles the response
          } catch (error) {
            logger.error('Error processing behavior webhook:', error);
            // Fall through to default response
          }
        } else {
          logger.debug(`Behavior system not initialized, skipping ${type} event`);
        }
        break;

      default:
        logger.info(`Unhandled webhook type: ${type}`, { type, action });
    }

    // Respond with success
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling webhook:', error);

    // Try to send workflow notification for webhook processing error
    try {
      const coordinatorConfig = OperationalNotificationCoordinator.createDefaultConfig(
        (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development'
      );
      const notificationCoordinator = OperationalNotificationCoordinator.getInstance(coordinatorConfig);

      await notificationCoordinator.notifyWorkflowUpdate(
        'build',
        'Webhook Processing Error',
        `Error processing webhook: ${(error as Error).message}`,
        'failure',
        undefined,
        'system'
      );
    } catch (notificationError) {
      logger.error('Failed to send webhook error notification:', notificationError);
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Process AppUserNotification events
 */
const processAppUserNotification = async (payload: any, notificationCoordinator: OperationalNotificationCoordinator) => {
  const { action, notification } = payload;

  logger.info(`Processing notification: ${action}`, { action, notification });

  // Get Linear client from environment
  const accessToken = process.env.LINEAR_ACCESS_TOKEN;
  const organizationId = process.env.LINEAR_ORGANIZATION_ID;

  if (!accessToken || !organizationId) {
    logger.error('Missing Linear credentials in environment');
    throw new Error('Linear credentials not configured');
  }

  // Create Linear client wrapper
  const linearClient = new LinearClientWrapper(accessToken, organizationId);

  // Handle different notification types with processors
  try {
    switch (action) {
      case 'issueMention':
        // Use the IssueMentionProcessor for issue mentions
        const issueMentionProcessor = new IssueMentionProcessor(
          linearClient,
          notificationCoordinator
        );
        await issueMentionProcessor.process(payload);
        break;

      case 'issueCommentMention':
        // Use the IssueCommentMentionProcessor for comment mentions
        const commentMentionProcessor = new IssueCommentMentionProcessor(
          linearClient,
          notificationCoordinator
        );
        await commentMentionProcessor.process(payload);
        break;

      case 'issueAssignedToYou':
      case 'issueUnassignedFromYou':
        // Use the IssueAssignmentProcessor for both assignment types
        const assignmentProcessor = new IssueAssignmentProcessor(
          linearClient,
          notificationCoordinator
        );
        await assignmentProcessor.process(payload);
        break;

      case 'issueStatusChanged':
        // Use the IssueStatusChangeProcessor for status changes
        const statusProcessor = new IssueStatusChangeProcessor(
          linearClient,
          notificationCoordinator
        );
        await statusProcessor.process(payload);
        break;

      case 'issueEmojiReaction':
      case 'issueCommentReaction':
        // Use the IssueReactionProcessor for both reaction types
        const reactionProcessor = new IssueReactionProcessor(
          linearClient,
          notificationCoordinator
        );
        await reactionProcessor.process(payload);
        break;

      case 'issueNewComment':
        // Use the IssueNewCommentProcessor for new comments
        const newCommentProcessor = new IssueNewCommentProcessor(
          linearClient,
          notificationCoordinator
        );
        await newCommentProcessor.process(payload);
        break;

      default:
        logger.info(`Unhandled notification action: ${action}`, { action });
    }
  } catch (error) {
    logger.error('Error processing notification with processor', {
      error: (error as Error).message,
      action,
      issueId: notification?.issue?.id
    });
    throw error;
  }
};
