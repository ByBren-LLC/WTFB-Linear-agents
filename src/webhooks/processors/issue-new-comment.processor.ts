/**
 * Issue New Comment Processor
 * 
 * Handles webhook events when new comments are added to issues the agent is involved with.
 * Provides contextual awareness and proactive assistance.
 */

import { BaseWebhookProcessor, AppUserNotification } from './base-processor';
import * as logger from '../../utils/logger';

/**
 * Processor for handling new comment events on issues
 */
export class IssueNewCommentProcessor extends BaseWebhookProcessor {
  /**
   * Process a new comment notification
   * 
   * @param notification The notification payload from Linear
   */
  async process(notification: AppUserNotification): Promise<void> {
    const { issue, comment, actor } = notification.notification;

    if (!issue || !comment) {
      logger.warn('New comment notification missing issue or comment data');
      return;
    }

    // Skip if the comment is from the agent itself
    if (actor?.id === process.env.LINEAR_AGENT_ID) {
      logger.info('Skipping own comment', {
        issueId: issue.id,
        commentId: comment.id
      });
      return;
    }

    logger.info('Processing new comment', {
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      commentId: comment.id,
      actorName: actor?.name,
      commentLength: comment.body?.length
    });

    try {
      // Determine if we should respond to this comment
      const shouldRespond = await this.shouldRespondToComment(
        issue,
        comment,
        actor
      );

      if (!shouldRespond) {
        logger.info('Not responding to comment', {
          issueId: issue.id,
          reason: 'Not relevant to agent'
        });
        
        // Still send notification to Slack for awareness
        await this.notifySlack(
          'new_comment',
          `New Comment: ${issue.identifier}`,
          `${actor?.name || 'Someone'} commented on "${issue.title}"`,
          comment.url || issue.url,
          actor?.name
        );
        
        return;
      }

      // Analyze the comment context
      const analysis = this.analyzeComment(comment, issue);

      // Generate appropriate response if needed
      const response = this.generateCommentResponse(
        actor?.name || 'there',
        issue,
        comment,
        analysis
      );

      // Send response if meaningful
      if (response) {
        await this.createLinearComment(issue.id, response);
      }

      // Send notification to Slack
      await this.notifySlack(
        'new_comment_handled',
        `Comment Handled: ${issue.identifier}`,
        `Responded to ${actor?.name || 'Someone'}'s comment on "${issue.title}"`,
        comment.url || issue.url,
        actor?.name
      );

      logger.info('Successfully processed new comment', {
        issueId: issue.id,
        responded: !!response
      });
    } catch (error) {
      logger.error('Failed to process new comment', {
        error: (error as Error).message,
        issueId: issue.id,
        commentId: comment.id
      });

      // Try to send error notification to Slack
      await this.notifySlack(
        'comment_error',
        `Error Processing Comment: ${issue.identifier}`,
        `Failed to process comment: ${(error as Error).message}`,
        issue.url,
        'System'
      );

      throw error;
    }
  }

  /**
   * Determines if the agent should respond to this comment
   * 
   * @param issue The Linear issue
   * @param comment The new comment
   * @param actor The person who made the comment
   * @returns Whether to respond
   */
  private async shouldRespondToComment(
    issue: any,
    comment: any,
    actor: any
  ): Promise<boolean> {
    // Always respond if agent is assigned to the issue
    if (issue.assignee?.id === process.env.LINEAR_AGENT_ID) {
      return true;
    }

    // Respond if agent is mentioned in the comment
    if (comment.body?.toLowerCase().includes('@saafepulse')) {
      return true;
    }

    // Respond if agent was mentioned in the issue description
    if (issue.description?.toLowerCase().includes('@saafepulse')) {
      // But only if the comment contains a question or request
      return this.containsQuestionOrRequest(comment.body);
    }

    // Skip if this is just informational
    return false;
  }

  /**
   * Analyzes the comment to understand its context
   * 
   * @param comment The comment object
   * @param issue The issue object
   * @returns Analysis of the comment
   */
  private analyzeComment(comment: any, issue: any): {
    hasQuestion: boolean;
    hasRequest: boolean;
    sentiment: 'positive' | 'negative' | 'neutral';
    topics: string[];
  } {
    const analysis = {
      hasQuestion: false,
      hasRequest: false,
      sentiment: 'neutral' as 'positive' | 'negative' | 'neutral',
      topics: [] as string[]
    };

    const text = comment.body?.toLowerCase() || '';

    // Check for questions
    analysis.hasQuestion = this.containsQuestionOrRequest(text);

    // Check for requests
    const requestPatterns = [
      /\b(please|could you|can you|would you|help|assist|need)\b/i,
      /\b(implement|create|add|update|fix|resolve)\b/i
    ];
    analysis.hasRequest = requestPatterns.some(pattern => pattern.test(text));

    // Simple sentiment analysis
    const positiveWords = ['great', 'thanks', 'good', 'excellent', 'perfect', 'awesome'];
    const negativeWords = ['issue', 'problem', 'error', 'bug', 'broken', 'wrong', 'blocked'];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      analysis.sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      analysis.sentiment = 'negative';
    }

    // Identify topics
    if (text.includes('test')) analysis.topics.push('testing');
    if (text.includes('deploy') || text.includes('release')) analysis.topics.push('deployment');
    if (text.includes('review')) analysis.topics.push('review');
    if (text.includes('estimate') || text.includes('points')) analysis.topics.push('estimation');
    if (text.includes('blocker') || text.includes('blocked')) analysis.topics.push('blockers');

    return analysis;
  }

  /**
   * Generates a response for the comment
   * 
   * @param username The username of the commenter
   * @param issue The Linear issue object
   * @param comment The comment object
   * @param analysis The comment analysis
   * @returns The response message or null if no response needed
   */
  private generateCommentResponse(
    username: string,
    issue: any,
    comment: any,
    analysis: {
      hasQuestion: boolean;
      hasRequest: boolean;
      sentiment: string;
      topics: string[];
    }
  ): string | null {
    // Only respond if there's a question, request, or direct mention
    const directMention = comment.body?.toLowerCase().includes('@saafepulse');
    
    if (!directMention && !analysis.hasQuestion && !analysis.hasRequest) {
      return null;
    }

    let response = `Hi @${username},\n\n`;

    // Handle direct mentions first
    if (directMention) {
      response += `Thanks for reaching out! `;
      
      // If the comment mentions blockers, acknowledge immediately
      if (analysis.topics.includes('blockers')) {
        response += `I see you're dealing with blockers. `;
      }
    }

    // Handle questions
    if (analysis.hasQuestion) {
      response += `I see you have a question about **${issue.identifier}: ${issue.title}**.\n\n`;
      
      // Provide context-specific help based on topics
      if (analysis.topics.includes('estimation')) {
        response += `For estimation questions, I can help analyze the scope and suggest story point values based on SAFe guidelines.\n`;
      } else if (analysis.topics.includes('blockers')) {
        response += `For blockers, I can help identify dependencies and suggest resolution strategies.\n`;
      } else if (analysis.topics.includes('testing')) {
        response += `For testing concerns, I can help review test coverage and suggest testing strategies.\n`;
      } else {
        response += `I'm here to help with planning, estimation, and process guidance.\n`;
        
        // If the comment mentions breaking down work
        if (comment.body?.toLowerCase().includes('breaking') || comment.body?.toLowerCase().includes('smaller')) {
          response += `\nFor Breaking down the work, I can help with:\n`;
          response += `• Identifying logical boundaries\n`;
          response += `• Estimating smaller pieces\n`;
          response += `• Creating sub-tasks\n`;
        }
      }
    }

    // Handle requests
    if (analysis.hasRequest && !analysis.hasQuestion) {
      response += `I understand you need assistance with this issue. `;
      
      if (issue.state?.type === 'unstarted' || issue.state?.type === 'backlog') {
        response += `Since this is still in planning, I can help with:\n`;
        response += `• Breaking down the work into smaller tasks\n`;
        response += `• Estimating story points\n`;
        response += `• Identifying dependencies\n`;
      } else if (issue.state?.type === 'started') {
        response += `Since this is in progress, I can help with:\n`;
        response += `• Tracking progress and blockers\n`;
        response += `• Suggesting implementation approaches\n`;
        response += `• Coordinating with team members\n`;
      }
    }

    // Add sentiment-based encouragement
    if (analysis.sentiment === 'negative' && analysis.topics.includes('blockers')) {
      response += `\nI understand you're facing challenges. Let's work together to resolve them.\n`;
    } else if (analysis.sentiment === 'positive') {
      response += `\nGlad to see things are progressing well!\n`;
    }

    // Professional closing
    response += `\n---\n`;
    response += `_SAFe PULSE Agent • Collaborative Planning_`;

    return response;
  }

  /**
   * Checks if text contains a question or request
   * 
   * @param text The text to check
   * @returns Whether it contains a question or request
   */
  private containsQuestionOrRequest(text: string): boolean {
    const patterns = [
      /\?/,
      /\b(what|when|where|why|how|who|which|could|should|would|can|will)\b/i,
      /\b(help|assist|clarify|explain|suggest|recommend)\b/i
    ];

    return patterns.some(pattern => pattern.test(text));
  }
}