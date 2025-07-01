/**
 * Issue Status Change Processor
 * 
 * Handles webhook events when the status changes on issues assigned to @saafepulse.
 * Provides intelligent status tracking and proactive notifications.
 */

import { BaseWebhookProcessor, AppUserNotification } from './base-processor';
import * as logger from '../../utils/logger';

/**
 * Processor for handling issue status change events
 */
export class IssueStatusChangeProcessor extends BaseWebhookProcessor {
  /**
   * Process an issue status change notification
   * 
   * @param notification The notification payload from Linear
   */
  async process(notification: AppUserNotification): Promise<void> {
    const { issue, actor } = notification.notification;

    if (!issue) {
      logger.warn('Status change notification missing issue data');
      return;
    }

    // Only process if the agent is assigned to the issue
    if (issue.assignee?.id !== process.env.LINEAR_AGENT_ID) {
      logger.info('Ignoring status change for unassigned issue', {
        issueId: issue.id,
        issueIdentifier: issue.identifier
      });
      return;
    }

    logger.info('Processing issue status change', {
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      issueTitle: issue.title,
      newState: issue.state?.name,
      actorName: actor?.name
    });

    try {
      // Analyze the status change context
      const analysis = this.analyzeStatusChange(issue);

      // Generate appropriate response based on status transition
      const response = this.generateStatusChangeResponse(
        actor?.name || 'there',
        issue,
        analysis
      );

      // Send response to Linear as a comment
      await this.createLinearComment(issue.id, response);

      // Send notification to Slack
      await this.notifySlack(
        'issue_status_changed',
        `Status Changed: ${issue.identifier}`,
        `${issue.title} moved to ${issue.state?.name} by ${actor?.name || 'Unknown User'}`,
        issue.url,
        actor?.name
      );

      logger.info('Successfully processed issue status change', {
        issueId: issue.id,
        responseLength: response.length
      });
    } catch (error) {
      logger.error('Failed to process issue status change', {
        error: (error as Error).message,
        issueId: issue.id
      });

      // Try to send error notification to Slack
      await this.notifySlack(
        'issue_status_change_error',
        `Error Processing Status Change: ${issue.identifier}`,
        `Failed to process status change: ${(error as Error).message}`,
        issue.url,
        'System'
      );

      throw error;
    }
  }

  /**
   * Analyzes the status change to provide context
   * 
   * @param issue The Linear issue object
   * @returns Analysis of the status change
   */
  private analyzeStatusChange(issue: any): {
    transitionType: 'progress' | 'completion' | 'blocking' | 'restart' | 'other';
    isPositive: boolean;
    requiresAction: boolean;
    suggestedActions: string[];
  } {
    const analysis = {
      transitionType: 'other' as 'progress' | 'completion' | 'blocking' | 'restart' | 'other',
      isPositive: false,
      requiresAction: false,
      suggestedActions: [] as string[]
    };

    const stateType = issue.state?.type;
    const stateName = issue.state?.name?.toLowerCase() || '';

    // Determine transition type
    if (stateType === 'completed') {
      analysis.transitionType = 'completion';
      analysis.isPositive = true;
    } else if (stateType === 'canceled' || stateName.includes('blocked')) {
      analysis.transitionType = 'blocking';
      analysis.isPositive = false;
      analysis.requiresAction = true;
      analysis.suggestedActions.push('Review blockers', 'Consider alternative approaches');
    } else if (stateType === 'started') {
      analysis.transitionType = 'progress';
      analysis.isPositive = true;
    } else if (stateType === 'unstarted' || stateType === 'backlog') {
      analysis.transitionType = 'restart';
      analysis.requiresAction = true;
      analysis.suggestedActions.push('Review requirements', 'Clarify scope');
    }

    // Additional analysis based on issue properties
    if (issue.priority?.value === 1 && analysis.transitionType !== 'progress' && analysis.transitionType !== 'completion') {
      analysis.requiresAction = true;
      analysis.suggestedActions.push('Urgent issue needs attention');
    }

    if (issue.estimate?.value && issue.estimate.value > 8 && analysis.transitionType === 'progress') {
      analysis.suggestedActions.push('Consider breaking down this large story');
    }

    return analysis;
  }

  /**
   * Generates a response for the status change
   * 
   * @param username The username of the person who changed the status
   * @param issue The Linear issue object
   * @param analysis The status change analysis
   * @returns The response message
   */
  private generateStatusChangeResponse(
    username: string,
    issue: {
      id: string;
      identifier: string;
      title: string;
      state?: {
        name: string;
        type: string;
      };
      priority?: {
        value: number;
        name: string;
      };
      estimate?: {
        value: number;
      };
    },
    analysis: {
      transitionType: string;
      isPositive: boolean;
      requiresAction: boolean;
      suggestedActions: string[];
    }
  ): string {
    let response = '';

    // Opening based on transition type
    switch (analysis.transitionType) {
      case 'completion':
        response += `🎉 Great news @${username}!\n\n`;
        response += `**${issue.identifier}: ${issue.title}** has been marked as **${issue.state?.name}**. `;
        response += `Excellent work on completing this task!\n\n`;
        break;

      case 'blocking':
        response += `🚨 Attention @${username},\n\n`;
        response += `**${issue.identifier}: ${issue.title}** has been moved to **${issue.state?.name}**. `;
        response += `This appears to be blocked or canceled.\n\n`;
        break;

      case 'progress':
        response += `📈 Progress update from @${username}:\n\n`;
        response += `**${issue.identifier}: ${issue.title}** is now **${issue.state?.name}**. `;
        response += `Good to see this moving forward!\n\n`;
        
        // For progress transitions, check if this is a large story
        if (issue.estimate?.value && issue.estimate.value > 8) {
          response += `⚠️ **Note**: This story has ${issue.estimate.value} story points, which is quite large. `;
          response += `Consider breaking down this large story into smaller, more manageable pieces `;
          response += `to improve flow and reduce risk.\n\n`;
        }
        break;

      case 'restart':
        response += `🔄 Status update from @${username}:\n\n`;
        response += `**${issue.identifier}: ${issue.title}** has been moved back to **${issue.state?.name}**. `;
        response += `This work has been deferred or needs re-evaluation.\n\n`;
        break;

      default:
        response += `📋 Status update from @${username}:\n\n`;
        response += `**${issue.identifier}: ${issue.title}** is now **${issue.state?.name}**.\n\n`;
    }

    // Add context and suggestions
    if (analysis.requiresAction) {
      response += `**🎯 Suggested Actions**\n`;
      analysis.suggestedActions.forEach(action => {
        response += `• ${action}\n`;
      });
      response += `\n`;
    }

    // Add work summary for completed issues
    if (analysis.transitionType === 'completion') {
      response += `**📊 Work Summary**\n`;
      if (issue.estimate?.value) {
        response += `• Story Points: ${issue.estimate.value}\n`;
      }
      response += `• Final Status: ${issue.state?.name}\n`;
      
      if (issue.priority?.value === 1) {
        response += `• Priority: ${issue.priority.name} - Great job on the urgent work!\n`;
      }
      response += `\n`;
    }

    // Add encouragement or next steps
    if (analysis.isPositive) {
      response += `Keep up the great work! Let me know if you need assistance with the next steps.\n`;
    } else if (analysis.requiresAction) {
      response += `I'm here to help if you need assistance resolving any blockers or planning next steps.\n`;
    }

    // Professional closing
    response += `\n---\n`;
    response += `_SAFe PULSE Agent • Status Tracking • @${username}_`;

    return response;
  }
}