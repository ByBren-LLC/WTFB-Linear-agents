/**
 * Issue Reaction Processor
 * 
 * Handles webhook events for emoji reactions on issues and comments.
 * Provides engagement tracking and acknowledgment.
 */

import { BaseWebhookProcessor, AppUserNotification } from './base-processor';
import * as logger from '../../utils/logger';

/**
 * Processor for handling issue and comment reaction events
 */
export class IssueReactionProcessor extends BaseWebhookProcessor {
  /**
   * Process a reaction notification
   * 
   * @param notification The notification payload from Linear
   */
  async process(notification: AppUserNotification): Promise<void> {
    const { issue, comment, actor } = notification.notification;
    const isCommentReaction = notification.action === 'issueCommentReaction';

    if (!issue) {
      logger.warn('Reaction notification missing issue data');
      return;
    }

    logger.info(`Processing ${isCommentReaction ? 'comment' : 'issue'} reaction`, {
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      commentId: comment?.id,
      actorName: actor?.name,
      action: notification.action
    });

    try {
      // Determine if we should respond to this reaction
      const shouldRespond = await this.shouldRespondToReaction(
        issue, 
        comment, 
        isCommentReaction
      );

      if (!shouldRespond) {
        logger.info('Skipping reaction response', {
          issueId: issue.id,
          reason: 'Not relevant to agent'
        });
        
        // Still send notification to Slack for tracking
        await this.notifySlack(
          isCommentReaction ? 'comment_reaction' : 'issue_reaction',
          `Reaction: ${issue.identifier}`,
          `${actor?.name || 'Someone'} reacted to${isCommentReaction ? ' a comment on' : ''} "${issue.title}"`,
          comment?.url || issue.url,
          actor?.name
        );
        
        return;
      }

      // Generate appropriate response
      const response = this.generateReactionResponse(
        actor?.name || 'there',
        issue,
        comment,
        isCommentReaction
      );

      // Send response if meaningful
      if (response) {
        await this.createLinearComment(issue.id, response);
      }

      // Send notification to Slack for tracking
      await this.notifySlack(
        isCommentReaction ? 'comment_reaction' : 'issue_reaction',
        `Reaction: ${issue.identifier}`,
        `${actor?.name || 'Someone'} reacted to${isCommentReaction ? ' a comment on' : ''} "${issue.title}"`,
        comment?.url || issue.url,
        actor?.name
      );

      logger.info('Successfully processed reaction', {
        issueId: issue.id,
        responded: !!response
      });
    } catch (error) {
      logger.error('Failed to process reaction', {
        error: (error as Error).message,
        issueId: issue.id,
        commentId: comment?.id
      });

      // Try to send error notification to Slack
      await this.notifySlack(
        'reaction_error',
        `Error Processing Reaction: ${issue.identifier}`,
        `Failed to process reaction: ${(error as Error).message}`,
        issue.url,
        'System'
      );

      throw error;
    }
  }

  /**
   * Determines if the agent should respond to this reaction
   * 
   * @param issue The Linear issue
   * @param comment The comment (if reaction on comment)
   * @param isCommentReaction Whether this is a comment reaction
   * @returns Whether to respond
   */
  private async shouldRespondToReaction(
    issue: any,
    comment: any,
    isCommentReaction: boolean
  ): Promise<boolean> {
    // Always respond if agent is assigned to the issue
    if (issue.assignee?.id === process.env.LINEAR_AGENT_ID) {
      return true;
    }

    // Respond if the reaction is on a comment made by the agent
    if (isCommentReaction && comment) {
      // TODO: In future, we could check if the comment was made by the agent
      // For now, we'll skip responding to comment reactions unless agent is involved
      // This is checked via the other conditions
    }

    // Check if agent was mentioned in the issue
    if (issue.description?.toLowerCase().includes('@saafepulse')) {
      return true;
    }

    // For comment reactions, check if the issue has state (meaning full issue data)
    // If no state, we likely don't have enough context
    if (isCommentReaction && !issue.state) {
      return false;
    }

    return false;
  }

  /**
   * Generates a response for the reaction
   * 
   * @param username The username of the person who reacted
   * @param issue The Linear issue object
   * @param comment The comment object (if applicable)
   * @param isCommentReaction Whether this is a comment reaction
   * @returns The response message or null if no response needed
   */
  private generateReactionResponse(
    username: string,
    issue: {
      id: string;
      identifier: string;
      title: string;
      state?: {
        name: string;
        type: string;
      };
    },
    comment: {
      id: string;
      body: string;
    } | undefined,
    isCommentReaction: boolean
  ): string | null {
    // Only respond to reactions in certain contexts to avoid noise
    const contextRequiresResponse = this.shouldGenerateResponse(issue, comment);
    
    if (!contextRequiresResponse) {
      return null;
    }

    let response = `👋 Thanks for the reaction, @${username}!\n\n`;

    if (isCommentReaction && comment) {
      response += `I see you've reacted to a comment in **${issue.identifier}: ${issue.title}**.\n\n`;
      
      // If the comment contains a question or request, acknowledge it
      if (this.containsQuestion(comment.body)) {
        response += `If you have any questions or need clarification on the discussion, `;
        response += `feel free to @mention me directly and I'll be happy to help!\n`;
      } else {
        response += `Your engagement helps track important discussions. `;
        response += `If you need any assistance with this issue, just let me know!\n`;
      }
    } else {
      response += `I appreciate your engagement with **${issue.identifier}: ${issue.title}**.\n\n`;
      
      // Provide context-specific assistance based on issue state
      if (issue.state?.type === 'backlog' || issue.state?.type === 'unstarted') {
        response += `This issue is currently in planning. `;
        response += `If you'd like me to help with estimation or planning, just @mention me!\n`;
      } else if (issue.state?.type === 'started') {
        response += `This issue is in progress. `;
        response += `Let me know if you need any assistance or have questions!\n`;
      } else if (issue.state?.type === 'completed') {
        response += `Great to see continued interest in completed work! `;
        response += `If you need follow-up tasks or have feedback, I'm here to help.\n`;
      }
    }

    // Professional closing
    response += `\n---\n`;
    response += `_SAFe PULSE Agent • Engagement Tracking_`;

    return response;
  }

  /**
   * Determines if we should generate a response based on context
   * 
   * @param issue The issue object
   * @param comment The comment object
   * @returns Whether to generate a response
   */
  private shouldGenerateResponse(issue: any, comment: any): boolean {
    // Don't respond to every reaction to avoid noise
    // Only respond in meaningful contexts:
    
    // 1. If the issue is high priority
    if (issue.priority?.value === 1) {
      return true;
    }

    // 2. If the comment contains a question
    if (comment && this.containsQuestion(comment.body)) {
      return true;
    }

    // 3. If the issue is assigned to the agent
    if (issue.assignee?.id === process.env.LINEAR_AGENT_ID) {
      return true;
    }

    // 4. If the agent is mentioned in the issue
    if (issue.description?.toLowerCase().includes('@saafepulse')) {
      return true;
    }

    // Otherwise, skip response to avoid cluttering the issue
    return false;
  }

  /**
   * Checks if text contains a question
   * 
   * @param text The text to check
   * @returns Whether it contains a question
   */
  private containsQuestion(text: string): boolean {
    const questionPatterns = [
      /\?/,
      /\b(what|when|where|why|how|who|which|could|should|would|can|will)\b/i,
      /\b(help|assist|clarify|explain)\b/i
    ];

    return questionPatterns.some(pattern => pattern.test(text));
  }
}