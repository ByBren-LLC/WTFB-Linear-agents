/**
 * Base Webhook Processor
 * 
 * Abstract base class for all webhook event processors.
 * Provides common functionality for processing Linear webhook events.
 */

import { LinearClientWrapper } from '../../linear/client';
import { OperationalNotificationCoordinator } from '../../utils/operational-notification-coordinator';
import * as logger from '../../utils/logger';

/**
 * AppUserNotification payload structure from Linear webhook
 */
export interface AppUserNotification {
  action: string;
  type: string;
  notification: {
    id: string;
    type: string;
    createdAt: string;
    readAt?: string;
    emailedAt?: string;
    archivedAt?: string;
    snoozedUntilAt?: string;
    actor?: {
      id: string;
      name: string;
      email?: string;
      avatarUrl?: string;
    };
    issue?: {
      id: string;
      identifier: string;
      title: string;
      description?: string;
      url: string;
      state?: {
        id: string;
        name: string;
        color: string;
        type: string;
      };
      assignee?: {
        id: string;
        name: string;
      };
      team?: {
        id: string;
        key: string;
        name: string;
      };
    };
    comment?: {
      id: string;
      body: string;
      createdAt: string;
      updatedAt?: string;
      url?: string;
    };
  };
}

/**
 * Abstract base class for webhook event processors
 */
export abstract class BaseWebhookProcessor {
  protected linearClient: LinearClientWrapper;
  protected notificationCoordinator: OperationalNotificationCoordinator;

  constructor(
    linearClient: LinearClientWrapper,
    notificationCoordinator: OperationalNotificationCoordinator
  ) {
    this.linearClient = linearClient;
    this.notificationCoordinator = notificationCoordinator;
  }

  /**
   * Process the webhook notification
   * 
   * @param notification The notification payload from Linear
   */
  abstract process(notification: AppUserNotification): Promise<void>;

  /**
   * Creates a Linear comment on an issue
   * 
   * @param issueId The Linear issue ID
   * @param body The comment body (supports markdown)
   */
  protected async createLinearComment(issueId: string, body: string): Promise<void> {
    try {
      await this.linearClient.createComment(issueId, body);
      
      logger.info('Created Linear comment', { issueId, bodyLength: body.length });
    } catch (error) {
      logger.error('Failed to create Linear comment', { 
        error: (error as Error).message, 
        issueId 
      });
      throw error;
    }
  }

  /**
   * Sends a notification to Slack via the operational notification coordinator
   * 
   * @param event The event type
   * @param title The notification title
   * @param message The notification message
   * @param url Optional URL to include
   * @param actor Optional actor name
   */
  protected async notifySlack(
    event: string,
    title: string,
    message: string,
    url?: string,
    actor?: string
  ): Promise<void> {
    try {
      await this.notificationCoordinator.notifyAgentUpdate(
        'linear-agent',
        'remote',
        'assigned',
        title,
        message,
        url,
        actor
      );
      
      logger.info('Sent Slack notification', { event, title });
    } catch (error) {
      logger.error('Failed to send Slack notification', { 
        error: (error as Error).message, 
        event,
        title 
      });
    }
  }

  /**
   * Extracts mention text from issue description or comment body
   * 
   * @param text The text containing the mention
   * @returns The text after @saafepulse mention, or null if not found
   */
  protected extractMentionText(text: string): string | null {
    const mentionPattern = /@saafepulse\s+(.+?)(?:\n|$)/i;
    const match = text.match(mentionPattern);
    return match ? match[1].trim() : null;
  }

}