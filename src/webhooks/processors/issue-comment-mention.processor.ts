/**
 * Issue Comment Mention Processor
 * 
 * Handles webhook events when @saafepulse is mentioned in Linear issue comments.
 * Enables conversational interactions within issue threads.
 */

import { BaseWebhookProcessor, AppUserNotification } from './base-processor';
import * as logger from '../../utils/logger';

/**
 * Processor for handling issue comment mention events
 */
export class IssueCommentMentionProcessor extends BaseWebhookProcessor {
  /**
   * Process an issue comment mention notification
   * 
   * @param notification The notification payload from Linear
   */
  async process(notification: AppUserNotification): Promise<void> {
    const { issue, comment, actor } = notification.notification;

    if (!issue || !comment) {
      logger.warn('Comment mention notification missing issue or comment data');
      return;
    }

    logger.info('Processing comment mention', {
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      commentId: comment.id,
      actorName: actor?.name
    });

    try {
      // Extract mention text from comment body
      const mentionText = this.extractMentionText(comment.body);

      // Analyze conversation context
      const context = await this.analyzeConversationContext(issue, comment);

      // Generate appropriate response based on context and mention
      const response = this.generateContextAwareResponse(
        actor?.name || 'there',
        issue,
        comment,
        mentionText,
        context
      );

      // Send response to Linear as a comment
      await this.createLinearComment(issue.id, response);

      // Send notification to Slack
      await this.notifySlack(
        'comment_mention',
        `Comment Mention: ${issue.identifier}`,
        `@saafepulse mentioned in comment on "${issue.title}" by ${actor?.name || 'Unknown User'}`,
        comment.url || issue.url,
        actor?.name
      );

      logger.info('Successfully processed comment mention', {
        issueId: issue.id,
        commentId: comment.id,
        responseLength: response.length
      });
    } catch (error) {
      logger.error('Failed to process comment mention', {
        error: (error as Error).message,
        issueId: issue.id,
        commentId: comment.id
      });

      // Try to send error notification to Slack
      await this.notifySlack(
        'comment_mention_error',
        `Error Processing Comment Mention: ${issue.identifier}`,
        `Failed to process comment mention: ${(error as Error).message}`,
        issue.url,
        'System'
      );

      throw error;
    }
  }

  /**
   * Analyzes the conversation context to provide relevant responses
   * 
   * @param issue The Linear issue object
   * @param comment The current comment
   * @returns Context information for response generation
   */
  private async analyzeConversationContext(
    issue: any,
    comment: any
  ): Promise<{
    isFollowUp: boolean;
    previousMentions: number;
    topicShift: boolean;
    urgency: 'low' | 'normal' | 'high';
  }> {
    // TODO: In future, we could fetch comment history to analyze conversation flow
    // For now, we'll use basic heuristics

    const context = {
      isFollowUp: false,
      previousMentions: 0,
      topicShift: false,
      urgency: 'normal' as 'low' | 'normal' | 'high'
    };

    // Check for urgency indicators
    const urgentKeywords = ['urgent', 'asap', 'critical', 'blocker', 'emergency'];
    const commentLower = comment.body.toLowerCase();
    if (urgentKeywords.some(keyword => commentLower.includes(keyword))) {
      context.urgency = 'high';
    }

    // Check issue priority
    if (issue.priority?.value === 1) {
      context.urgency = 'high';
    }

    return context;
  }

  /**
   * Generates a context-aware response for comment mentions
   * 
   * @param username The username of the person who mentioned the agent
   * @param issue The Linear issue object
   * @param comment The comment containing the mention
   * @param mentionText The text after @saafepulse mention
   * @param context The conversation context
   * @returns The response message
   */
  private generateContextAwareResponse(
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
        name: string;
      };
      team?: {
        key: string;
        name: string;
      };
    },
    comment: {
      id: string;
      body: string;
      createdAt: string;
    },
    mentionText: string | null,
    context: {
      isFollowUp: boolean;
      previousMentions: number;
      topicShift: boolean;
      urgency: 'low' | 'normal' | 'high';
    }
  ): string {
    // Professional greeting based on urgency
    let response = '';
    
    if (context.urgency === 'high') {
      response += `🚨 Hi @${username}, I see this is urgent.\n\n`;
    } else {
      response += `💬 Hi @${username}!\n\n`;
    }

    // Acknowledge comment context
    response += `I'm responding to your comment in **${issue.identifier}: ${issue.title}**.\n\n`;

    // Analyze mention text and provide appropriate response
    if (mentionText) {
      const lowerText = mentionText.toLowerCase();

      // Command detection and responses
      if (lowerText.includes('help')) {
        response += this.getCommentHelpText();
      } else if (lowerText.includes('status')) {
        response += this.getStatusResponse(issue);
      } else if (lowerText.includes('plan') || lowerText.includes('planning')) {
        response += `📋 **Planning Assistance**\n\n`;
        response += `I can help with planning this ${issue.state?.type === 'backlog' ? 'backlog item' : 'active work'}. `;
        response += `Soon I'll be able to:\n`;
        response += `• Create detailed implementation plans\n`;
        response += `• Estimate effort and complexity\n`;
        response += `• Identify dependencies and risks\n`;
        response += `• Generate subtasks automatically\n\n`;
        response += `_Full planning capabilities coming in the next update!_`;
      } else if (lowerText.includes('decompose') || lowerText.includes('split') || lowerText.includes('break')) {
        response += `✂️ **Story Decomposition**\n\n`;
        response += `Breaking down work is crucial for SAFe success. Soon I'll be able to:\n`;
        response += `• Analyze story complexity (currently ${issue.estimate?.value || 'unestimated'} points)\n`;
        response += `• Suggest optimal splits following INVEST principles\n`;
        response += `• Create subtasks with proper relationships\n`;
        response += `• Ensure all pieces are ≤5 points\n\n`;
        response += `_Decomposition engine arriving shortly!_`;
      } else if (lowerText.includes('depend')) {
        response += `🔗 **Dependency Analysis**\n\n`;
        response += `Understanding dependencies is critical. Coming soon:\n`;
        response += `• Automatic dependency detection\n`;
        response += `• Cross-team dependency mapping\n`;
        response += `• Risk assessment and mitigation\n`;
        response += `• Visual dependency graphs\n\n`;
        response += `_Dependency analyzer in development!_`;
      } else if (lowerText.includes('update') || lowerText.includes('progress')) {
        response += `📊 **Progress Update**\n\n`;
        response += this.getProgressUpdate(issue);
      } else {
        // Generic acknowledgment for unrecognized commands
        response += `I see you mentioned: "_${mentionText}_"\n\n`;
        response += `I'm still learning to understand all natural language commands. `;
        response += `For now, I'm acknowledging your mention and ensuring the team is notified.\n\n`;
        response += `💡 **Tip**: Try mentioning me with commands like:\n`;
        response += `• \`@saafepulse help\` - See available commands\n`;
        response += `• \`@saafepulse status\` - Get issue status\n`;
        response += `• \`@saafepulse update\` - Progress information\n`;
      }
    } else {
      // No specific command, provide contextual help
      response += this.getContextualHelp(issue, context);
    }

    // Add urgency-specific closing
    if (context.urgency === 'high') {
      response += `\n⚡ **Priority Response**: This issue has been flagged as urgent. `;
      response += `The team has been notified via Slack for immediate attention.`;
    }

    // Professional closing
    response += `\n\n---\n`;
    response += `_SAFe PULSE Agent • Thread ID: ${comment.id.slice(-6)}_`;

    return response;
  }

  /**
   * Returns help text specific to comment interactions
   */
  private getCommentHelpText(): string {
    let help = `**📚 Comment Commands Available**\n\n`;
    help += `I can respond to these commands in comments:\n\n`;
    help += `**Current Commands:**\n`;
    help += `• \`@saafepulse help\` - Show this help message\n`;
    help += `• \`@saafepulse status\` - Get current issue status\n`;
    help += `• \`@saafepulse update\` - Show progress information\n\n`;
    help += `**Coming Soon:**\n`;
    help += `• \`@saafepulse plan this\` - Create implementation plan\n`;
    help += `• \`@saafepulse decompose\` - Break down into subtasks\n`;
    help += `• \`@saafepulse analyze dependencies\` - Map relationships\n`;
    help += `• \`@saafepulse estimate\` - Provide effort estimates\n\n`;
    
    return help;
  }

  /**
   * Generates a status response for the issue
   */
  private getStatusResponse(issue: {
    state?: { name: string };
    priority?: { name: string };
    estimate?: { value: number };
    team?: { name: string };
    assignee?: { name: string };
  }): string {
    let status = `**📊 Current Issue Status**\n\n`;
    status += `• **State**: ${issue.state?.name || 'Unknown'}\n`;
    status += `• **Priority**: ${issue.priority?.name || 'Not set'}\n`;
    status += `• **Estimate**: ${issue.estimate?.value ? `${issue.estimate.value} points` : 'Not estimated'}\n`;
    status += `• **Team**: ${issue.team?.name || 'Not assigned'}\n`;
    
    if (issue.assignee) {
      status += `• **Assignee**: ${issue.assignee.name}\n`;
    }
    
    status += `\n`;
    return status;
  }

  /**
   * Generates a progress update for the issue
   */
  private getProgressUpdate(issue: any): string {
    let update = `Based on the current issue state (**${issue.state?.name || 'Unknown'}**):\n\n`;
    
    if (issue.state?.type === 'backlog' || issue.state?.type === 'unstarted') {
      update += `• Issue is waiting to be started\n`;
      update += `• No active progress yet\n`;
      update += `• Consider planning and estimation if not done\n`;
    } else if (issue.state?.type === 'started') {
      update += `• Issue is actively being worked on\n`;
      update += `• Check comments for latest updates\n`;
      update += `• Monitor for blockers or dependencies\n`;
    } else if (issue.state?.type === 'completed') {
      update += `• Issue has been completed\n`;
      update += `• Work is done and verified\n`;
      update += `• Consider creating follow-up issues if needed\n`;
    }
    
    update += `\n`;
    return update;
  }

  /**
   * Provides contextual help based on issue state and context
   */
  private getContextualHelp(issue: any, context: any): string {
    let help = '';
    
    if (issue.state?.type === 'backlog') {
      help += `I notice this issue is in the **backlog**. I can help with:\n`;
      help += `• Planning and estimation\n`;
      help += `• Story decomposition\n`;
      help += `• Dependency identification\n\n`;
    } else if (issue.state?.type === 'started') {
      help += `This issue is **in progress**. I can assist with:\n`;
      help += `• Progress tracking\n`;
      help += `• Blocker identification\n`;
      help += `• Scope adjustments\n\n`;
    }
    
    help += `💡 Mention me with specific commands to get targeted assistance.\n`;
    
    return help;
  }
}