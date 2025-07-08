/**
 * Enhanced Story Monitoring Behavior (LIN-60)
 * 
 * Story monitoring behavior that uses the enhanced response system
 * for rich, formatted suggestions.
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
 * Configuration for enhanced story monitoring
 */
interface EnhancedStoryMonitoringConfig {
  maxStoryPoints: number;
  ignoreLabels: string[];
  monitorStates: string[];
  enableRichFormatting: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: EnhancedStoryMonitoringConfig = {
  maxStoryPoints: 5,
  ignoreLabels: ['decomposed', 'epic', 'feature'],
  monitorStates: ['backlog', 'unstarted', 'started'],
  enableRichFormatting: true
};

/**
 * Enhanced story monitoring behavior
 */
export class EnhancedStoryMonitoringBehavior implements AutonomousBehavior {
  public readonly id = 'enhanced_story_monitoring';
  public readonly name = 'Enhanced Story Size Monitor';
  public readonly description = 'Monitors stories and provides rich, formatted decomposition suggestions';
  public enabled = true;
  public readonly priority = 85; // Higher priority than basic story monitoring

  private config: EnhancedStoryMonitoringConfig;

  constructor(
    private linearClient: LinearClientWrapper,
    config: Partial<EnhancedStoryMonitoringConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if behavior should trigger
   */
  async shouldTrigger(context: BehaviorContext): Promise<boolean> {
    if (!context.issue) {
      return false;
    }

    const issue = context.issue;

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

    // Check if we've already suggested decomposition recently
    if (await this.hasRecentDecompositionSuggestion(issue.id)) {
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
      
      logger.info('Executing enhanced story monitoring', {
        issueId: issue.id,
        storyPoints: issue.estimate,
        threshold: this.config.maxStoryPoints
      });

      // Analyze the story for decomposition
      const analysis = await this.analyzeStoryForDecomposition(issue);

      // Create suggestion action with rich data
      const suggestionAction: BehaviorAction = {
        type: 'suggestion',
        target: issue.id,
        description: `Suggested decomposition for ${issue.estimate} point story`,
        result: 'success',
        data: {
          templateId: 'suggestion_story_decomposition',
          templateData: {
            teamName: context.team?.name || 'Team',
            storyPoints: issue.estimate,
            maxPoints: this.config.maxStoryPoints,
            sizeLabel: this.getSizeLabel(issue.estimate),
            recommendedParts: analysis.recommendedParts,
            benefits: analysis.benefits.join(', '),
            riskLevel: analysis.riskLevel,
            decompositionSuggestions: this.formatDecompositionSuggestions(analysis.suggestions),
            expectedImprovements: this.formatExpectedImprovements(analysis.improvements)
          }
        }
      };

      actions.push(suggestionAction);

      // Record that we've made a suggestion
      await this.recordSuggestion(issue.id);

      return {
        success: true,
        actions,
        data: analysis,
        executionTime: Date.now() - startTime,
        shouldNotify: true
      };

    } catch (error) {
      logger.error('Enhanced story monitoring failed', {
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
   * Analyze story for decomposition
   */
  private async analyzeStoryForDecomposition(issue: any): Promise<any> {
    const storyPoints = issue.estimate || 0;
    
    // Calculate recommended parts
    const recommendedParts = Math.ceil(storyPoints / this.config.maxStoryPoints);
    
    // Determine risk level
    const riskLevel = storyPoints > 13 ? 'High' : 
                      storyPoints > 8 ? 'Medium' : 'Low';

    // Generate decomposition suggestions based on story content
    const suggestions = await this.generateDecompositionSuggestions(issue);

    // Calculate expected improvements
    const improvements = [
      `Reduce delivery risk by ${Math.round((1 - this.config.maxStoryPoints / storyPoints) * 100)}%`,
      `Increase predictability with smaller, more manageable pieces`,
      `Enable parallel development across team members`,
      `Improve testing coverage with focused acceptance criteria`
    ];

    // Benefits of decomposition
    const benefits = [
      'Faster feedback cycles',
      'Reduced WIP',
      'Better estimation accuracy',
      'Increased team velocity'
    ];

    return {
      recommendedParts: `${recommendedParts} stories`,
      riskLevel,
      suggestions,
      improvements,
      benefits,
      originalSize: storyPoints,
      targetSize: this.config.maxStoryPoints
    };
  }

  /**
   * Generate decomposition suggestions
   */
  private async generateDecompositionSuggestions(issue: any): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Analyze story title and description
    const hasMultipleFeatures = /and|&|,/.test(issue.title);
    const hasUI = /UI|interface|screen|page|form/i.test(issue.title + ' ' + (issue.description || ''));
    const hasAPI = /API|endpoint|service|backend/i.test(issue.title + ' ' + (issue.description || ''));
    const hasData = /database|data|migration|schema/i.test(issue.title + ' ' + (issue.description || ''));

    if (hasMultipleFeatures) {
      suggestions.push('Split by feature: Each major feature becomes its own story');
    }

    if (hasUI && hasAPI) {
      suggestions.push('Split by layer: Separate UI and API stories');
    }

    if (hasData) {
      suggestions.push('Split by data operations: CRUD operations as individual stories');
    }

    // Default suggestions if none found
    if (suggestions.length === 0) {
      suggestions.push(
        'Split by user journey: Each user flow as a story',
        'Split by acceptance criteria: Group related criteria',
        'Split by technical component: Frontend, backend, database'
      );
    }

    return suggestions;
  }

  /**
   * Format decomposition suggestions for display
   */
  private formatDecompositionSuggestions(suggestions: string[]): string {
    return suggestions.map((s, i) => `${i + 1}. **${s}**`).join('\n');
  }

  /**
   * Format expected improvements
   */
  private formatExpectedImprovements(improvements: string[]): string {
    return improvements.map(i => `- ${i}`).join('\n');
  }

  /**
   * Get size label for story points
   */
  private getSizeLabel(points: number): string {
    if (points > 13) return 'Extra Large (XL)';
    if (points > 8) return 'Large (L)';
    if (points > 5) return 'Medium (M)';
    return 'Small (S)';
  }

  /**
   * Check if issue is in monitored state
   */
  private isInMonitoredState(issue: any): boolean {
    const state = issue.state?.name?.toLowerCase() || '';
    return this.config.monitorStates.some(s => state.includes(s.toLowerCase()));
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
   * Check if we've made a recent suggestion
   */
  private async hasRecentDecompositionSuggestion(issueId: string): Promise<boolean> {
    // In a real implementation, this would check a database or cache
    // For now, return false to allow suggestions
    return false;
  }

  /**
   * Record that we've made a suggestion
   */
  private async recordSuggestion(issueId: string): Promise<void> {
    // In a real implementation, this would record to a database
    logger.info('Recorded decomposition suggestion', { issueId });
  }

  /**
   * Validate behavior can execute
   */
  async validate(): Promise<boolean> {
    try {
      // Test Linear API connection
      await this.linearClient.getUser();
      return true;
    } catch (error) {
      logger.error('Enhanced story monitoring validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}