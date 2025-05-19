/**
 * Slack integration for sending notifications
 */
import axios from 'axios';
import * as logger from '../utils/logger';

/**
 * Slack notification service
 */
export class SlackNotifier {
  private webhookUrl: string | null;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || null;
  }

  /**
   * Sends a notification to Slack
   */
  async sendNotification(message: string, channel?: string): Promise<boolean> {
    try {
      if (!this.webhookUrl) {
        logger.warn('Slack webhook URL not configured');
        return false;
      }

      const payload = {
        text: message,
        ...(channel ? { channel } : {})
      };

      await axios.post(this.webhookUrl, payload);
      
      logger.info('Sent Slack notification', { message });
      return true;
    } catch (error) {
      logger.error('Error sending Slack notification', { error, message });
      return false;
    }
  }

  /**
   * Sends a planning completion notification
   */
  async sendPlanningCompleteNotification(
    planningTitle: string,
    epicId: string,
    featureCount: number
  ): Promise<boolean> {
    const message = `Planning completed for "${planningTitle}". Created Epic ${epicId} with ${featureCount} features.`;
    return this.sendNotification(message);
  }

  /**
   * Sends an error notification
   */
  async sendErrorNotification(
    errorMessage: string,
    context: string
  ): Promise<boolean> {
    const message = `Error in Planning Agent: ${errorMessage}\nContext: ${context}`;
    return this.sendNotification(message);
  }
}
