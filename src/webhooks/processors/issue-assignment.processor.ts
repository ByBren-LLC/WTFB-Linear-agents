/**
 * Issue Assignment Processor
 * 
 * Handles webhook events when issues are assigned to or unassigned from @saafepulse.
 * Provides acknowledgment and automatic status updates.
 */

import { BaseWebhookProcessor, AppUserNotification } from './base-processor';
import * as logger from '../../utils/logger';

/**
 * Processor for handling issue assignment events
 */
export class IssueAssignmentProcessor extends BaseWebhookProcessor {
  /**
   * Process an issue assignment notification
   * 
   * @param notification The notification payload from Linear
   */
  async process(notification: AppUserNotification): Promise<void> {
    const { issue, actor } = notification.notification;
    const isAssignment = notification.action === 'issueAssignedToYou';

    if (!issue) {
      logger.warn(`${isAssignment ? 'Assignment' : 'Unassignment'} notification missing issue data`);
      return;
    }

    logger.info(`Processing issue ${isAssignment ? 'assignment' : 'unassignment'}`, {
      issueId: issue.id,
      issueIdentifier: issue.identifier,
      issueTitle: issue.title,
      actorName: actor?.name,
      currentState: issue.state?.name
    });

    try {
      // Generate appropriate response based on assignment type
      const response = isAssignment
        ? this.generateAssignmentResponse(
            actor?.name || 'there',
            issue,
            await this.shouldUpdateStatus(issue)
          )
        : this.generateUnassignmentResponse(
            actor?.name || 'there',
            issue
          );

      // Send response to Linear as a comment
      await this.createLinearComment(issue.id, response);

      // Update issue status if needed (only for assignments)
      if (isAssignment && await this.shouldUpdateStatus(issue)) {
        await this.updateIssueStatus(issue);
      }

      // Send notification to Slack
      await this.notifySlack(
        isAssignment ? 'issue_assigned' : 'issue_unassigned',
        `Issue ${isAssignment ? 'Assigned' : 'Unassigned'}: ${issue.identifier}`,
        `${issue.title} ${isAssignment ? 'assigned to' : 'unassigned from'} SAFe PULSE by ${actor?.name || 'Unknown User'}`,
        issue.url,
        actor?.name
      );

      logger.info(`Successfully processed issue ${isAssignment ? 'assignment' : 'unassignment'}`, {
        issueId: issue.id,
        responseLength: response.length
      });
    } catch (error) {
      logger.error(`Failed to process issue ${isAssignment ? 'assignment' : 'unassignment'}`, {
        error: (error as Error).message,
        issueId: issue.id
      });

      // Try to send error notification to Slack
      await this.notifySlack(
        `issue_${isAssignment ? 'assignment' : 'unassignment'}_error`,
        `Error Processing ${isAssignment ? 'Assignment' : 'Unassignment'}: ${issue.identifier}`,
        `Failed to process ${isAssignment ? 'assignment' : 'unassignment'}: ${(error as Error).message}`,
        issue.url,
        'System'
      );

      throw error;
    }
  }

  /**
   * Determines if the issue status should be updated on assignment
   * 
   * @param issue The Linear issue object
   * @returns Whether to update the status
   */
  private async shouldUpdateStatus(issue: any): Promise<boolean> {
    // Only update status if issue is in backlog or todo state
    const updateableStates = ['backlog', 'unstarted'];
    return updateableStates.includes(issue.state?.type || '');
  }

  /**
   * Updates the issue status to "In Progress" or appropriate started state
   * 
   * @param issue The Linear issue object
   */
  private async updateIssueStatus(issue: any): Promise<void> {
    // Validate team information exists
    if (!issue.team?.id) {
      logger.warn('Cannot update status: issue missing team information', { 
        issueId: issue.id,
        issueIdentifier: issue.identifier 
      });
      return;
    }
    
    try {
      // Get team's workflow states to find "In Progress" state
      const team = await this.linearClient.getTeam(issue.team.id);
      if (!team) {
        logger.warn('Team not found', { teamId: issue.team.id, issueId: issue.id });
        return;
      }
      
      const workflowStates = await team.states();
      
      // Find the appropriate "started" state using robust strategy
      const inProgressState = await this.findInProgressState(workflowStates);

      if (inProgressState) {
        await this.linearClient.updateIssue({
          id: issue.id,
          stateId: inProgressState.id
        });

        logger.info('Updated issue status to In Progress', {
          issueId: issue.id,
          newStateId: inProgressState.id,
          newStateName: inProgressState.name
        });
      } else {
        logger.warn('Could not find In Progress state for team', {
          teamId: issue.team.id,
          availableStates: workflowStates.nodes.map((s: any) => ({ 
            name: s.name, 
            type: s.type 
          }))
        });
      }
    } catch (error) {
      logger.error('Failed to update issue status', {
        error: (error as Error).message,
        issueId: issue.id,
        teamId: issue.team?.id
      });
      
      // Notify user of status update failure
      try {
        await this.createLinearComment(issue.id, 
          `⚠️ **Auto-Status Update Failed**\n\n` +
          `I couldn't automatically update the status to "In Progress". ` +
          `Please update the status manually if needed.\n\n` +
          `_Error: ${(error as Error).message}_`
        );
      } catch (commentError) {
        logger.error('Failed to notify user of status update failure', {
          originalError: (error as Error).message,
          commentError: (commentError as Error).message,
          issueId: issue.id
        });
      }
    }
  }

  /**
   * Finds an appropriate "started" state using multiple strategies
   * 
   * @param workflowStates The workflow states from the team
   * @returns The in-progress state or null if not found
   */
  private async findInProgressState(workflowStates: any): Promise<any> {
    // Try multiple strategies for finding "started" state
    const strategies = [
      (state: any) => state.type === 'started' && state.name.toLowerCase().includes('progress'),
      (state: any) => state.type === 'started' && state.name.toLowerCase().includes('doing'),
      (state: any) => state.type === 'started' && state.name.toLowerCase().includes('active'),
      (state: any) => state.type === 'started' && state.name.toLowerCase().includes('work'),
      (state: any) => state.type === 'started' && state.name.toLowerCase().includes('development'),
      (state: any) => state.type === 'started' && state.name.toLowerCase().includes('implementation'),
      (state: any) => state.type === 'started' // Fallback to any started state
    ];
    
    for (const strategy of strategies) {
      const state = workflowStates.nodes.find(strategy);
      if (state) {
        logger.info('Found in-progress state using strategy', { 
          stateName: state.name, 
          stateId: state.id,
          stateType: state.type
        });
        return state;
      }
    }
    
    logger.warn('No suitable in-progress state found', { 
      availableStates: workflowStates.nodes.map((s: any) => ({ 
        name: s.name, 
        type: s.type,
        id: s.id
      }))
    });
    return null;
  }

  /**
   * Generates a response for issue assignment
   * 
   * @param username The username of the person who assigned the issue
   * @param issue The Linear issue object
   * @param willUpdateStatus Whether the status will be updated
   * @returns The response message
   */
  private generateAssignmentResponse(
    username: string,
    issue: {
      id: string;
      identifier: string;
      title: string;
      description?: string;
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
    willUpdateStatus: boolean
  ): string {
    // Professional greeting
    let response = `🤖 Hello @${username}!\n\n`;
    response += `I've been assigned to **${issue.identifier}: ${issue.title}**. `;
    response += `Thank you for trusting me with this ${issue.priority?.value === 1 ? 'urgent ' : ''}work.\n\n`;

    // Initial analysis
    response += `**📋 Initial Analysis**\n`;
    response += `• **Current State**: ${issue.state?.name || 'Unknown'}\n`;
    response += `• **Priority**: ${issue.priority?.name || 'Not set'}\n`;
    response += `• **Estimate**: ${issue.estimate?.value ? `${issue.estimate.value} points` : 'Not estimated'}\n`;
    response += `• **Team**: ${issue.team?.name || 'Not assigned'}\n\n`;

    // Status update notification
    if (willUpdateStatus) {
      response += `**🔄 Status Update**\n`;
      response += `I'm moving this issue to **In Progress** since it was in ${issue.state?.name}. `;
      response += `This helps track active work assignments.\n\n`;
    }

    // Next steps based on issue type
    response += `**🎯 Next Steps**\n`;
    
    if (!issue.estimate?.value) {
      response += `• This issue needs estimation - I'll analyze complexity soon\n`;
    }
    
    if (issue.estimate?.value && issue.estimate.value > 5) {
      response += `• This is a large story (${issue.estimate.value} points) - consider decomposition\n`;
    }

    if (issue.priority?.value === 1) {
      response += `• This is marked as **${issue.priority.name}** - I'll prioritize accordingly\n`;
    }

    if (!issue.description || issue.description.length < 50) {
      response += `• The description seems brief - more details would help\n`;
    }

    response += `\nI'll begin analyzing this issue and will provide updates as I work. `;
    response += `Feel free to @mention me with any specific instructions or questions!\n\n`;

    // Professional closing
    response += `---\n`;
    response += `_SAFe PULSE Agent • Assigned by @${username} • Auto-status: ${willUpdateStatus ? 'Enabled' : 'Disabled'}_`;

    return response;
  }

  /**
   * Generates a response for issue unassignment
   * 
   * @param username The username of the person who unassigned the issue
   * @param issue The Linear issue object
   * @returns The response message
   */
  private generateUnassignmentResponse(
    username: string,
    issue: {
      id: string;
      identifier: string;
      title: string;
      state?: {
        name: string;
        type: string;
      };
    }
  ): string {
    let response = `👋 Hi @${username},\n\n`;
    response += `I've been unassigned from **${issue.identifier}: ${issue.title}**.\n\n`;

    // Summary of work status
    if (issue.state?.type === 'started') {
      response += `**📊 Work Status at Handoff**\n`;
      response += `• Issue is currently **${issue.state.name}**\n`;
      response += `• Work was in progress when unassigned\n`;
      response += `• Consider assigning to another team member to continue\n\n`;
    } else if (issue.state?.type === 'completed') {
      response += `**✅ Work Completed**\n`;
      response += `• This issue was completed while assigned to me\n`;
      response += `• Current status: **${issue.state.name}**\n\n`;
    } else {
      response += `**📋 Status**\n`;
      response += `• Issue remains in **${issue.state?.name || 'Unknown'}** state\n`;
      response += `• No active work was started\n\n`;
    }

    response += `If you need me again, just assign the issue back to me or @mention me. `;
    response += `I'm always here to help!\n\n`;

    // Professional closing
    response += `---\n`;
    response += `_SAFe PULSE Agent • Unassigned by @${username}_`;

    return response;
  }
}