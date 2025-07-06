/**
 * Workflow Automation Behavior (LIN-59)
 * 
 * Automates common workflow tasks like status updates, label management,
 * and team handoffs based on issue state changes.
 */

import {
  AutonomousBehavior,
  BehaviorContext,
  BehaviorResult,
  BehaviorAction
} from '../types/autonomous-types';
import { LinearClientWrapper } from '../../linear/client';
import * as logger from '../../utils/logger';

/**
 * Configuration for workflow automation
 */
interface WorkflowAutomationConfig {
  autoAssignOnMove: boolean;
  autoLabelOnState: boolean;
  autoNotifyOnBlocked: boolean;
  autoMoveSubtasks: boolean;
  stateTransitions: Record<string, WorkflowRule[]>;
}

/**
 * Workflow rule definition
 */
interface WorkflowRule {
  trigger: 'state_change' | 'label_added' | 'assignee_changed' | 'priority_changed';
  condition?: (issue: any) => boolean;
  actions: WorkflowAction[];
}

/**
 * Workflow action definition
 */
interface WorkflowAction {
  type: 'add_label' | 'remove_label' | 'assign' | 'move_state' | 'notify' | 'update_priority';
  value?: string;
  target?: string;
}

/**
 * Default configuration with SAFe-aligned workflows
 */
const DEFAULT_CONFIG: WorkflowAutomationConfig = {
  autoAssignOnMove: true,
  autoLabelOnState: true,
  autoNotifyOnBlocked: true,
  autoMoveSubtasks: true,
  stateTransitions: {
    'In Progress': [
      {
        trigger: 'state_change',
        actions: [
          { type: 'add_label', value: 'in-development' },
          { type: 'remove_label', value: 'ready-for-dev' }
        ]
      }
    ],
    'In Review': [
      {
        trigger: 'state_change',
        actions: [
          { type: 'add_label', value: 'needs-review' },
          { type: 'remove_label', value: 'in-development' }
        ]
      }
    ],
    'Done': [
      {
        trigger: 'state_change',
        actions: [
          { type: 'remove_label', value: 'in-development' },
          { type: 'remove_label', value: 'needs-review' },
          { type: 'remove_label', value: 'blocked' },
          { type: 'add_label', value: 'completed' }
        ]
      }
    ]
  }
};

/**
 * Workflow automation behavior implementation
 */
export class WorkflowAutomationBehavior implements AutonomousBehavior {
  public readonly id = 'workflow_automation';
  public readonly name = 'Workflow Automator';
  public readonly description = 'Automates common workflow tasks';
  public enabled = true;
  public readonly priority = 60;

  private config: WorkflowAutomationConfig;

  constructor(
    private linearClient: LinearClientWrapper,
    config: Partial<WorkflowAutomationConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if behavior should trigger
   */
  async shouldTrigger(context: BehaviorContext): Promise<boolean> {
    // Only trigger on issue updates with state changes
    if (!context.issue || !context.previousState) {
      return false;
    }

    // Check if state actually changed
    const stateChanged = context.issue.state?.name !== context.previousState.state?.name;
    const labelsChanged = this.hasLabelsChanged(context.issue, context.previousState);
    const assigneeChanged = context.issue.assignee?.id !== context.previousState.assignee?.id;
    const priorityChanged = context.issue.priority !== context.previousState.priority;

    return stateChanged || labelsChanged || assigneeChanged || priorityChanged;
  }

  /**
   * Execute the behavior
   */
  async execute(context: BehaviorContext): Promise<BehaviorResult> {
    const startTime = Date.now();
    const actions: BehaviorAction[] = [];

    try {
      if (!context.issue) {
        throw new Error('Issue context is required for workflow automation');
      }

      logger.info('Executing workflow automation', {
        issueId: context.issue.id,
        issueIdentifier: context.issue.identifier,
        currentState: context.issue.state?.name,
        previousState: context.previousState?.state?.name
      });

      // Handle state change workflows
      if (context.issue.state?.name !== context.previousState?.state?.name) {
        const stateActions = await this.handleStateChange(context);
        actions.push(...stateActions);
      }

      // Handle blocked state
      if (await this.isBlocked(context.issue)) {
        const blockedActions = await this.handleBlockedState(context);
        actions.push(...blockedActions);
      }

      // Handle parent-child synchronization
      if (this.config.autoMoveSubtasks && context.issue.children?.length > 0) {
        const syncActions = await this.synchronizeSubtasks(context);
        actions.push(...syncActions);
      }

      // Handle team handoffs
      const handoffActions = await this.handleTeamHandoffs(context);
      actions.push(...handoffActions);

      // Check for stale issues
      const staleActions = await this.checkStaleIssues(context);
      actions.push(...staleActions);

      return {
        success: true,
        actions,
        executionTime: Date.now() - startTime,
        shouldNotify: actions.some(a => a.type === 'notify')
      };

    } catch (error) {
      logger.error('Workflow automation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueId: context.issue?.id
      });

      return {
        success: false,
        actions,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        shouldNotify: false
      };
    }
  }

  /**
   * Validate behavior can execute
   */
  async validate(): Promise<boolean> {
    try {
      await this.linearClient.getViewer();
      return true;
    } catch (error) {
      logger.error('Workflow automation validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Handle state change workflows
   */
  private async handleStateChange(context: BehaviorContext): Promise<BehaviorAction[]> {
    const actions: BehaviorAction[] = [];
    const currentState = context.issue?.state?.name;

    if (!currentState || !this.config.stateTransitions[currentState]) {
      return actions;
    }

    const rules = this.config.stateTransitions[currentState];
    
    for (const rule of rules) {
      if (rule.trigger !== 'state_change') continue;
      
      // Check condition if specified
      if (rule.condition && !rule.condition(context.issue)) continue;

      for (const action of rule.actions) {
        try {
          const result = await this.executeWorkflowAction(context.issue!, action);
          actions.push(result);
        } catch (error) {
          logger.error('Failed to execute workflow action', {
            action,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          actions.push({
            type: 'update',
            target: context.issue!.id,
            description: `Failed to execute ${action.type}: ${action.value}`,
            result: 'failed',
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }
      }
    }

    // Add state transition comment
    if (actions.length > 0 && this.shouldAddTransitionComment(context)) {
      try {
        const comment = this.generateStateTransitionComment(context, actions);
        await this.linearClient.createComment(context.issue!.id, comment);
        
        actions.push({
          type: 'comment',
          target: context.issue!.id,
          description: 'Added state transition summary',
          result: 'success'
        });
      } catch (error) {
        logger.error('Failed to add transition comment', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return actions;
  }

  /**
   * Execute a single workflow action
   */
  private async executeWorkflowAction(issue: any, action: WorkflowAction): Promise<BehaviorAction> {
    switch (action.type) {
      case 'add_label':
        return await this.addLabel(issue, action.value!);
      
      case 'remove_label':
        return await this.removeLabel(issue, action.value!);
      
      case 'assign':
        return await this.assignIssue(issue, action.value!);
      
      case 'move_state':
        return await this.moveToState(issue, action.value!);
      
      case 'update_priority':
        return await this.updatePriority(issue, parseInt(action.value!));
      
      case 'notify':
        return {
          type: 'notify',
          target: action.target || issue.id,
          description: `Notification: ${action.value}`,
          result: 'success'
        };
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Add label to issue
   */
  private async addLabel(issue: any, labelName: string): Promise<BehaviorAction> {
    try {
      // Get team labels
      const labels = await this.linearClient.getLabels({ teamId: issue.team?.id });
      const label = labels.nodes.find((l: any) => l.name === labelName);
      
      if (!label) {
        // Create label if it doesn't exist
        const newLabel = await this.linearClient.createLabel({
          name: labelName,
          teamId: issue.team.id
        });
        
        // Add to issue
        const currentLabelIds = issue.labels?.nodes.map((l: any) => l.id) || [];
        await this.linearClient.updateIssue({
          id: issue.id,
          labelIds: [...currentLabelIds, newLabel.id]
        });
      } else {
        // Add existing label
        const currentLabelIds = issue.labels?.nodes.map((l: any) => l.id) || [];
        if (!currentLabelIds.includes(label.id)) {
          await this.linearClient.updateIssue({
            id: issue.id,
            labelIds: [...currentLabelIds, label.id]
          });
        }
      }

      return {
        type: 'update',
        target: issue.id,
        description: `Added label: ${labelName}`,
        result: 'success'
      };
    } catch (error) {
      return {
        type: 'update',
        target: issue.id,
        description: `Failed to add label: ${labelName}`,
        result: 'failed',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Remove label from issue
   */
  private async removeLabel(issue: any, labelName: string): Promise<BehaviorAction> {
    try {
      const currentLabels = issue.labels?.nodes || [];
      const newLabelIds = currentLabels
        .filter((l: any) => l.name !== labelName)
        .map((l: any) => l.id);
      
      if (newLabelIds.length < currentLabels.length) {
        await this.linearClient.updateIssue({
          id: issue.id,
          labelIds: newLabelIds
        });
      }

      return {
        type: 'update',
        target: issue.id,
        description: `Removed label: ${labelName}`,
        result: 'success'
      };
    } catch (error) {
      return {
        type: 'update',
        target: issue.id,
        description: `Failed to remove label: ${labelName}`,
        result: 'failed',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Assign issue to user
   */
  private async assignIssue(issue: any, userId: string): Promise<BehaviorAction> {
    try {
      await this.linearClient.updateIssue({
        id: issue.id,
        assigneeId: userId
      });

      return {
        type: 'update',
        target: issue.id,
        description: `Assigned to user: ${userId}`,
        result: 'success'
      };
    } catch (error) {
      return {
        type: 'update',
        target: issue.id,
        description: `Failed to assign to user: ${userId}`,
        result: 'failed',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Move issue to state
   */
  private async moveToState(issue: any, stateName: string): Promise<BehaviorAction> {
    try {
      // Get team workflow states
      const team = await this.linearClient.getTeam(issue.team.id);
      const state = team.states.nodes.find((s: any) => s.name === stateName);
      
      if (state) {
        await this.linearClient.updateIssue({
          id: issue.id,
          stateId: state.id
        });
      }

      return {
        type: 'update',
        target: issue.id,
        description: `Moved to state: ${stateName}`,
        result: 'success'
      };
    } catch (error) {
      return {
        type: 'update',
        target: issue.id,
        description: `Failed to move to state: ${stateName}`,
        result: 'failed',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Update issue priority
   */
  private async updatePriority(issue: any, priority: number): Promise<BehaviorAction> {
    try {
      await this.linearClient.updateIssue({
        id: issue.id,
        priority
      });

      return {
        type: 'update',
        target: issue.id,
        description: `Updated priority to: ${priority}`,
        result: 'success'
      };
    } catch (error) {
      return {
        type: 'update',
        target: issue.id,
        description: `Failed to update priority`,
        result: 'failed',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Handle blocked state
   */
  private async handleBlockedState(context: BehaviorContext): Promise<BehaviorAction[]> {
    const actions: BehaviorAction[] = [];
    
    if (!this.config.autoNotifyOnBlocked) return actions;

    try {
      // Add blocked label
      const labelAction = await this.addLabel(context.issue!, 'blocked');
      actions.push(labelAction);

      // Create notification
      const blockingIssues = await this.findBlockingIssues(context.issue!);
      if (blockingIssues.length > 0) {
        const comment = this.generateBlockedNotification(context.issue!, blockingIssues);
        await this.linearClient.createComment(context.issue!.id, comment);
        
        actions.push({
          type: 'comment',
          target: context.issue!.id,
          description: 'Added blocked notification',
          result: 'success'
        });

        // Notify stakeholders
        actions.push({
          type: 'notify',
          target: context.issue!.id,
          description: 'Issue blocked notification',
          result: 'success',
          data: {
            recipients: this.getStakeholders(context.issue!),
            priority: 'high'
          }
        });
      }
    } catch (error) {
      logger.error('Failed to handle blocked state', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return actions;
  }

  /**
   * Synchronize subtask states
   */
  private async synchronizeSubtasks(context: BehaviorContext): Promise<BehaviorAction[]> {
    const actions: BehaviorAction[] = [];
    
    if (!context.issue?.children || context.issue.children.length === 0) {
      return actions;
    }

    const parentState = context.issue.state?.name;
    
    for (const child of context.issue.children) {
      try {
        // Move subtasks to appropriate state based on parent
        if (parentState === 'Done' && child.state?.name !== 'Done') {
          await this.linearClient.updateIssue({
            id: child.id,
            stateId: context.issue.state.id
          });
          
          actions.push({
            type: 'update',
            target: child.id,
            description: `Synchronized subtask state to: ${parentState}`,
            result: 'success'
          });
        }
      } catch (error) {
        logger.error('Failed to sync subtask', {
          childId: child.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return actions;
  }

  /**
   * Handle team handoffs
   */
  private async handleTeamHandoffs(context: BehaviorContext): Promise<BehaviorAction[]> {
    const actions: BehaviorAction[] = [];
    
    // Check if issue moved to a handoff state
    if (!['In Review', 'Ready for QA', 'Ready for Deploy'].includes(context.issue?.state?.name || '')) {
      return actions;
    }

    try {
      // Add handoff label
      const labelAction = await this.addLabel(context.issue!, 'handoff-needed');
      actions.push(labelAction);

      // Create handoff checklist
      const checklist = this.generateHandoffChecklist(context.issue!);
      await this.linearClient.createComment(context.issue!.id, checklist);
      
      actions.push({
        type: 'comment',
        target: context.issue!.id,
        description: 'Added handoff checklist',
        result: 'success'
      });
    } catch (error) {
      logger.error('Failed to handle team handoff', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return actions;
  }

  /**
   * Check for stale issues
   */
  private async checkStaleIssues(context: BehaviorContext): Promise<BehaviorAction[]> {
    const actions: BehaviorAction[] = [];
    
    if (!context.issue?.updatedAt) return actions;

    const daysSinceUpdate = (Date.now() - new Date(context.issue.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    
    // Mark as stale if no updates for 14 days
    if (daysSinceUpdate > 14 && context.issue.state?.name === 'In Progress') {
      try {
        const labelAction = await this.addLabel(context.issue, 'stale');
        actions.push(labelAction);

        const comment = `## ⏰ This issue has been marked as stale

This issue has been in progress for ${Math.round(daysSinceUpdate)} days without updates.

### Recommended Actions:
- Update the issue with current status
- Move to blocked if waiting on dependencies
- Break down into smaller tasks if too complex
- Close if no longer relevant

---
*Automated by @saafepulse workflow automation*`;

        await this.linearClient.createComment(context.issue.id, comment);
        
        actions.push({
          type: 'comment',
          target: context.issue.id,
          description: 'Marked issue as stale',
          result: 'success'
        });
      } catch (error) {
        logger.error('Failed to mark issue as stale', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return actions;
  }

  /**
   * Check if issue is blocked
   */
  private async isBlocked(issue: any): Promise<boolean> {
    // Check for blocked label
    const hasBlockedLabel = issue.labels?.nodes.some((l: any) => 
      l.name.toLowerCase().includes('blocked')
    );
    
    // Check for blocking dependencies
    const relations = await this.linearClient.getIssueRelations({
      filter: { issue: { id: { eq: issue.id } } }
    });
    
    const hasBlockingDeps = relations.nodes.some((r: any) => 
      r.type === 'blocks' && r.relatedIssue.state?.name !== 'Done'
    );
    
    return hasBlockedLabel || hasBlockingDeps;
  }

  /**
   * Find blocking issues
   */
  private async findBlockingIssues(issue: any): Promise<any[]> {
    const relations = await this.linearClient.getIssueRelations({
      filter: { 
        issue: { id: { eq: issue.id } },
        type: { eq: 'blocks' }
      }
    });
    
    return relations.nodes
      .filter((r: any) => r.relatedIssue.state?.name !== 'Done')
      .map((r: any) => r.relatedIssue);
  }

  /**
   * Check if labels changed
   */
  private hasLabelsChanged(current: any, previous: any): boolean {
    const currentLabels = new Set((current.labels?.nodes || []).map((l: any) => l.id));
    const previousLabels = new Set((previous.labels?.nodes || []).map((l: any) => l.id));
    
    return currentLabels.size !== previousLabels.size ||
           [...currentLabels].some(id => !previousLabels.has(id));
  }

  /**
   * Check if should add transition comment
   */
  private shouldAddTransitionComment(context: BehaviorContext): boolean {
    const significantStates = ['In Progress', 'In Review', 'Done', 'Blocked'];
    return significantStates.includes(context.issue?.state?.name || '');
  }

  /**
   * Get stakeholders for an issue
   */
  private getStakeholders(issue: any): string[] {
    const stakeholders = new Set<string>();
    
    if (issue.assignee?.id) stakeholders.add(issue.assignee.id);
    if (issue.creator?.id) stakeholders.add(issue.creator.id);
    if (issue.parent?.assignee?.id) stakeholders.add(issue.parent.assignee.id);
    
    return Array.from(stakeholders);
  }

  /**
   * Generate state transition comment
   */
  private generateStateTransitionComment(context: BehaviorContext, actions: BehaviorAction[]): string {
    const fromState = context.previousState?.state?.name || 'Unknown';
    const toState = context.issue?.state?.name || 'Unknown';
    
    const actionSummary = actions
      .filter(a => a.result === 'success')
      .map(a => `- ${a.description}`)
      .join('\n');

    return `## 🔄 Workflow Update: ${fromState} → ${toState}

### Automated Actions Completed:
${actionSummary || 'No automated actions required'}

### Workflow Tips:
${this.getWorkflowTips(toState)}

---
*Automated by @saafepulse workflow automation*`;
  }

  /**
   * Get workflow tips for state
   */
  private getWorkflowTips(state: string): string {
    const tips: Record<string, string> = {
      'In Progress': '- Remember to update progress daily\n- Break down into subtasks if needed\n- Flag blockers early',
      'In Review': '- Ensure all acceptance criteria are met\n- Add reviewers to the issue\n- Link to relevant PRs or documents',
      'Done': '- Verify all subtasks are complete\n- Update documentation if needed\n- Consider creating follow-up issues',
      'Blocked': '- Clearly document the blocker\n- Tag responsible parties\n- Set expected resolution date'
    };
    
    return tips[state] || 'Keep the issue updated with latest progress';
  }

  /**
   * Generate blocked notification
   */
  private generateBlockedNotification(issue: any, blockingIssues: any[]): string {
    const blockerList = blockingIssues.map((blocker, i) => 
      `${i + 1}. **${blocker.identifier}**: ${blocker.title}
   - Status: ${blocker.state?.name}
   - Assignee: ${blocker.assignee?.name || 'Unassigned'}`
    ).join('\n\n');

    return `## 🚫 Issue Blocked

This issue is currently blocked and cannot proceed.

### Blocking Issues:
${blockerList}

### Impact:
- Delivery timeline at risk
- Team productivity affected
- Potential cascade delays

### Recommended Actions:
1. Contact assignees of blocking issues
2. Escalate if critical path
3. Find alternative approach if possible

---
*Automated blocked detection by @saafepulse*`;
  }

  /**
   * Generate handoff checklist
   */
  private generateHandoffChecklist(issue: any): string {
    return `## 🤝 Handoff Checklist

Please ensure the following before handoff:

### Development Complete:
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Tests written and passing
- [ ] Documentation updated

### Ready for Next Phase:
- [ ] Build artifacts created
- [ ] Deployment notes added
- [ ] Known issues documented
- [ ] Rollback plan defined

### Communication:
- [ ] Next team notified
- [ ] Context provided in comments
- [ ] Dependencies identified
- [ ] Timeline communicated

---
*Use \`@saafepulse complete handoff\` when ready*`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WorkflowAutomationConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Workflow automation configuration updated', { config: this.config });
  }
}