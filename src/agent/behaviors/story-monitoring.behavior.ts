/**
 * Story Monitoring Behavior (LIN-59)
 * 
 * Monitors stories for size and suggests decomposition when they exceed threshold.
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
 * Configuration for story monitoring
 */
interface StoryMonitoringConfig {
  maxStoryPoints: number;
  ignoreLabels: string[];
  monitorStates: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: StoryMonitoringConfig = {
  maxStoryPoints: 5,
  ignoreLabels: ['decomposed', 'epic', 'feature'],
  monitorStates: ['backlog', 'unstarted', 'started']
};

/**
 * Story monitoring behavior implementation
 */
export class StoryMonitoringBehavior implements AutonomousBehavior {
  public readonly id = 'story_monitoring';
  public readonly name = 'Story Size Monitor';
  public readonly description = 'Monitors stories and suggests decomposition for large stories';
  public enabled = true;
  public readonly priority = 80;

  private config: StoryMonitoringConfig;

  constructor(
    private linearClient: LinearClientWrapper,
    config: Partial<StoryMonitoringConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if behavior should trigger
   */
  async shouldTrigger(context: BehaviorContext): Promise<boolean> {
    // Only trigger for issue-related events
    if (!context.issue) {
      return false;
    }

    const issue = context.issue;

    // Check if it's a new issue or story points were updated
    const isNewIssue = this.isNewIssue(issue);
    const isPointsUpdated = this.isPointsUpdated(issue);
    
    if (!isNewIssue && !isPointsUpdated) {
      return false;
    }

    // Check if issue has story points above threshold
    if (!issue.estimate || issue.estimate <= this.config.maxStoryPoints) {
      return false;
    }

    // Check if issue is in a monitored state
    if (!this.isInMonitoredState(issue)) {
      return false;
    }

    // Check if issue has ignored labels
    if (this.hasIgnoredLabels(issue)) {
      return false;
    }

    // Check if issue already has child issues
    if (issue.children && issue.children.length > 0) {
      logger.debug('Story already has children, skipping', { 
        issueId: issue.id,
        childCount: issue.children.length 
      });
      return false;
    }

    // Check if we've already suggested decomposition
    if (await this.hasExistingDecompositionSuggestion(issue.id)) {
      logger.debug('Decomposition already suggested for this story', { 
        issueId: issue.id 
      });
      return false;
    }

    return true;
  }

  /**
   * Execute the behavior
   */
  async execute(context: BehaviorContext): Promise<BehaviorResult> {
    const startTime = Date.now();
    const actions: BehaviorAction[] = [];

    try {
      const issue = context.issue!;
      
      logger.info('Executing story monitoring behavior', {
        issueId: issue.id,
        issueIdentifier: issue.identifier,
        storyPoints: issue.estimate
      });

      // Generate decomposition suggestion
      const suggestionComment = this.generateDecompositionSuggestion(issue);
      
      // Post comment to Linear
      try {
        await this.linearClient.createComment(issue.id, suggestionComment);
        
        actions.push({
          type: 'comment',
          target: issue.id,
          description: 'Posted decomposition suggestion',
          result: 'success',
          data: { storyPoints: issue.estimate }
        });

        logger.info('Posted decomposition suggestion', {
          issueId: issue.id,
          storyPoints: issue.estimate
        });
      } catch (error) {
        logger.error('Failed to post comment', {
          issueId: issue.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        actions.push({
          type: 'comment',
          target: issue.id,
          description: 'Failed to post decomposition suggestion',
          result: 'failed',
          data: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }

      // Determine if we should notify
      const shouldNotify = issue.estimate > this.config.maxStoryPoints * 2; // Extra large stories

      return {
        success: actions.some(a => a.result === 'success'),
        actions,
        executionTime: Date.now() - startTime,
        shouldNotify,
        notification: shouldNotify ? {
          channels: ['linear'],
          recipients: [issue.assignee?.id || issue.creator?.id].filter(Boolean),
          title: 'Large Story Detected',
          message: `Story ${issue.identifier} has ${issue.estimate} points. Consider decomposition.`,
          priority: 'medium',
          data: {
            issueId: issue.id,
            issueIdentifier: issue.identifier,
            storyPoints: issue.estimate
          }
        } : undefined
      };

    } catch (error) {
      logger.error('Story monitoring behavior failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context
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
      // Check Linear client is available
      await this.linearClient.getViewer();
      return true;
    } catch (error) {
      logger.error('Story monitoring validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Check if issue is new
   */
  private isNewIssue(issue: any): boolean {
    // Check if created within last 5 minutes
    const createdAt = new Date(issue.createdAt);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return createdAt > fiveMinutesAgo;
  }

  /**
   * Check if story points were updated
   */
  private isPointsUpdated(issue: any): boolean {
    // In webhook context, we'd check the diff
    // For now, we'll assume it's updated if we're processing it
    return issue.updatedAt && new Date(issue.updatedAt) > new Date(Date.now() - 5 * 60 * 1000);
  }

  /**
   * Check if issue is in a monitored state
   */
  private isInMonitoredState(issue: any): boolean {
    const stateName = issue.state?.name?.toLowerCase() || '';
    return this.config.monitorStates.some(state => 
      stateName.includes(state.toLowerCase())
    );
  }

  /**
   * Check if issue has ignored labels
   */
  private hasIgnoredLabels(issue: any): boolean {
    const labels = issue.labels?.nodes || [];
    return labels.some((label: any) => 
      this.config.ignoreLabels.includes(label.name.toLowerCase())
    );
  }

  /**
   * Check if we've already suggested decomposition
   */
  private async hasExistingDecompositionSuggestion(issueId: string): Promise<boolean> {
    try {
      const comments = await this.linearClient.getComments(issueId);
      return comments.nodes.some((comment: any) => 
        comment.body.includes('decomposition suggestion') &&
        comment.user?.name?.includes('SAFe PULSE')
      );
    } catch (error) {
      logger.error('Failed to check existing comments', {
        issueId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Generate decomposition suggestion comment
   */
  private generateDecompositionSuggestion(issue: any): string {
    const storyPoints = issue.estimate;
    const identifier = issue.identifier;
    const title = issue.title;

    return `## 🤖 Proactive Suggestion: Story Decomposition

Hi team! I noticed this story has **${storyPoints} story points**, which is above our recommended maximum of ${this.config.maxStoryPoints} points for optimal delivery.

### 📊 Analysis
- **Current Size**: ${storyPoints} points (Large)
- **Recommended**: Break into 2-3 smaller stories
- **Benefits**: Better tracking, reduced risk, faster delivery

### 💡 Decomposition Suggestions

Based on the story "${title}", consider breaking it down by:

1. **Functional boundaries** - Separate core functionality from advanced features
2. **User journeys** - Split by different user flows or personas  
3. **Technical layers** - Frontend, backend, and integration as separate stories

### 🚀 Next Steps
- **Auto-decompose**: \`@saafepulse decompose this story\`
- **Manual planning**: Use the suggestions above to create sub-stories
- **Need help?**: \`@saafepulse help with story decomposition\`

*This is a proactive suggestion to help optimize your workflow. Feel free to ignore if the current size works for your team!*

---
*Proactive suggestion by @saafepulse | Disable: \`@saafepulse config disable story-monitoring\`*`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StoryMonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Story monitoring configuration updated', { config: this.config });
  }
}