import { Request, Response } from 'express';
import { verifyWebhookSignature } from './verification';
import { OperationalNotificationCoordinator } from '../utils/operational-notification-coordinator';
import * as logger from '../utils/logger';

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

  // Handle different notification types
  switch (action) {
    case 'issueMention':
      // Handle when the agent is mentioned in an issue
      logger.info('Agent mentioned in issue:', notification);
      await notificationCoordinator.notifyAgentUpdate(
        'linear-agent',
        'remote',
        'assigned',
        `Issue Mention: ${notification?.issue?.title || 'Unknown Issue'}`,
        `Agent mentioned in issue by ${notification?.actor?.name || 'Unknown User'}`,
        notification?.issue?.url,
        notification?.actor?.name
      );
      break;

    case 'issueCommentMention':
      // Handle when the agent is mentioned in a comment
      logger.info('Agent mentioned in comment:', notification);
      await notificationCoordinator.notifyAgentUpdate(
        'linear-agent',
        'remote',
        'assigned',
        `Comment Mention: ${notification?.issue?.title || 'Unknown Issue'}`,
        `Agent mentioned in comment by ${notification?.actor?.name || 'Unknown User'}`,
        notification?.issue?.url,
        notification?.actor?.name
      );
      break;

    case 'issueAssignedToYou':
      // Handle when an issue is assigned to the agent
      logger.info('Issue assigned to agent:', notification);
      await notificationCoordinator.notifyAgentUpdate(
        'linear-agent',
        'remote',
        'assigned',
        `Issue Assigned: ${notification?.issue?.title || 'Unknown Issue'}`,
        `Issue assigned to agent by ${notification?.actor?.name || 'Unknown User'}`,
        notification?.issue?.url,
        notification?.actor?.name
      );
      break;

    default:
      logger.info(`Unhandled notification action: ${action}`, { action });
  }
};
