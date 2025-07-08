/**
 * Dependency Detection Behavior (LIN-59)
 * 
 * Detects potential dependencies between issues based on content analysis
 * and suggests creating explicit relationships.
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
 * Configuration for dependency detection
 */
interface DependencyDetectionConfig {
  keywordSimilarityThreshold: number;
  titleSimilarityThreshold: number;
  scanRelatedIssues: boolean;
  maxSuggestionsPerIssue: number;
  ignoreClosedIssues: boolean;
  dependencyKeywords: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: DependencyDetectionConfig = {
  keywordSimilarityThreshold: 0.6,
  titleSimilarityThreshold: 0.7,
  scanRelatedIssues: true,
  maxSuggestionsPerIssue: 3,
  ignoreClosedIssues: true,
  dependencyKeywords: [
    'depends on', 'blocked by', 'requires', 'needs', 'waiting for',
    'after', 'prerequisite', 'must have', 'relies on', 'based on'
  ]
};

/**
 * Dependency detection behavior implementation
 */
export class DependencyDetectionBehavior implements AutonomousBehavior {
  public readonly id = 'dependency_detection';
  public readonly name = 'Dependency Detector';
  public readonly description = 'Detects and suggests issue dependencies';
  public enabled = true;
  public readonly priority = 70;

  private config: DependencyDetectionConfig;

  constructor(
    private linearClient: LinearClientWrapper,
    config: Partial<DependencyDetectionConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if behavior should trigger
   */
  async shouldTrigger(context: BehaviorContext): Promise<boolean> {
    // Only trigger for new or recently updated issues
    if (!context.issue) {
      return false;
    }

    // Skip if issue is closed
    if (this.config.ignoreClosedIssues && 
        ['Done', 'Canceled', 'Duplicate'].includes(context.issue.state?.name || '')) {
      return false;
    }

    // Check if issue mentions dependency keywords
    const content = `${context.issue.title || ''} ${context.issue.description || ''}`.toLowerCase();
    const hasDependencyKeywords = this.config.dependencyKeywords.some(
      keyword => content.includes(keyword)
    );

    // Also trigger for issues without explicit dependencies but with high story points
    const hasHighPoints = (context.issue.estimate || 0) >= 5;
    const hasNoDependencies = !context.issue.relations || context.issue.relations.length === 0;

    return hasDependencyKeywords || (hasHighPoints && hasNoDependencies);
  }

  /**
   * Execute the behavior
   */
  async execute(context: BehaviorContext): Promise<BehaviorResult> {
    const startTime = Date.now();
    const actions: BehaviorAction[] = [];

    try {
      if (!context.issue) {
        throw new Error('Issue context is required for dependency detection');
      }

      logger.info('Executing dependency detection', {
        issueId: context.issue.id,
        issueIdentifier: context.issue.identifier
      });

      // Analyze issue content for dependencies
      const potentialDependencies = await this.detectPotentialDependencies(context.issue);

      if (potentialDependencies.length > 0) {
        // Check if we've already suggested these
        const alreadySuggested = await this.checkAlreadySuggested(context.issue.id);
        
        // Filter out already suggested dependencies
        const newSuggestions = potentialDependencies.filter(
          dep => !alreadySuggested.includes(dep.identifier)
        );

        if (newSuggestions.length > 0) {
          // Create suggestion comment
          const suggestion = this.generateDependencySuggestion(
            context.issue,
            newSuggestions
          );

          try {
            await this.linearClient.createComment(context.issue.id, suggestion);
            
            actions.push({
              type: 'comment',
              target: context.issue.id,
              description: `Suggested ${newSuggestions.length} potential dependencies`,
              result: 'success',
              data: {
                suggestedCount: newSuggestions.length,
                dependencies: newSuggestions.map(d => ({
                  id: d.id,
                  identifier: d.identifier,
                  title: d.title
                }))
              }
            });

            logger.info('Posted dependency suggestions', {
              issueId: context.issue.id,
              suggestionsCount: newSuggestions.length
            });
          } catch (error) {
            logger.error('Failed to post dependency suggestions', {
              issueId: context.issue.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            actions.push({
              type: 'comment',
              target: context.issue.id,
              description: 'Failed to post dependency suggestions',
              result: 'failed',
              data: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
          }
        }
      }

      // Also check for circular dependencies if issue has existing relations
      if (context.issue.relations && context.issue.relations.length > 0) {
        const circularDeps = await this.detectCircularDependencies(context.issue);
        if (circularDeps.length > 0) {
          const warningMessage = this.generateCircularDependencyWarning(circularDeps);
          
          try {
            await this.linearClient.createComment(context.issue.id, warningMessage);
            
            actions.push({
              type: 'comment',
              target: context.issue.id,
              description: 'Warned about circular dependencies',
              result: 'success',
              data: { circularPaths: circularDeps }
            });
          } catch (error) {
            logger.error('Failed to post circular dependency warning', {
              issueId: context.issue.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      return {
        success: true,
        actions,
        executionTime: Date.now() - startTime,
        shouldNotify: actions.some(a => a.result === 'success')
      };

    } catch (error) {
      logger.error('Dependency detection failed', {
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
      logger.error('Dependency detection validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Detect potential dependencies based on content analysis
   */
  private async detectPotentialDependencies(issue: any): Promise<any[]> {
    const potentialDeps: any[] = [];
    
    // Get related issues from the same team
    const teamIssues = await this.linearClient.getIssues({
      filter: {
        team: { id: { eq: issue.team?.id } },
        id: { neq: issue.id }, // Exclude current issue
        state: this.config.ignoreClosedIssues ? {
          name: { nin: ['Done', 'Canceled', 'Duplicate'] }
        } : undefined
      }
    });

    // Analyze each issue for potential dependency
    for (const candidateIssue of teamIssues.nodes) {
      const score = this.calculateDependencyScore(issue, candidateIssue);
      
      if (score > this.config.keywordSimilarityThreshold) {
        potentialDeps.push({
          ...candidateIssue,
          dependencyScore: score,
          suggestedRelationType: this.suggestRelationType(issue, candidateIssue)
        });
      }
    }

    // Sort by score and limit results
    return potentialDeps
      .sort((a, b) => b.dependencyScore - a.dependencyScore)
      .slice(0, this.config.maxSuggestionsPerIssue);
  }

  /**
   * Calculate dependency score between two issues
   */
  private calculateDependencyScore(issue1: any, issue2: any): number {
    let score = 0;
    
    // Check for explicit dependency mentions
    const issue1Content = `${issue1.title || ''} ${issue1.description || ''}`.toLowerCase();
    const issue2Identifier = issue2.identifier?.toLowerCase() || '';
    const issue2Title = issue2.title?.toLowerCase() || '';
    
    // Direct mention of issue identifier
    if (issue1Content.includes(issue2Identifier)) {
      score += 0.8;
    }
    
    // Dependency keywords near issue reference
    for (const keyword of this.config.dependencyKeywords) {
      if (issue1Content.includes(keyword) && 
          (issue1Content.includes(issue2Identifier) || 
           this.hasSignificantOverlap(issue1Content, issue2Title))) {
        score += 0.3;
      }
    }
    
    // Title similarity
    const titleSimilarity = this.calculateTextSimilarity(
      issue1.title || '',
      issue2.title || ''
    );
    if (titleSimilarity > this.config.titleSimilarityThreshold) {
      score += titleSimilarity * 0.4;
    }
    
    // Shared labels indicate potential relationship
    const sharedLabels = this.getSharedLabels(issue1, issue2);
    if (sharedLabels.length > 0) {
      score += 0.2 * Math.min(sharedLabels.length / 3, 1);
    }
    
    // Same epic/project indicates potential relationship
    if (issue1.project?.id === issue2.project?.id && issue1.project?.id) {
      score += 0.2;
    }
    
    return Math.min(score, 1);
  }

  /**
   * Calculate text similarity using simple token overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/).filter(t => t.length > 3));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/).filter(t => t.length > 3));
    
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }

  /**
   * Check for significant text overlap
   */
  private hasSignificantOverlap(text1: string, text2: string): boolean {
    const words2 = text2.split(/\s+/).filter(w => w.length > 3);
    const significantWords = words2.filter(word => text1.includes(word));
    return significantWords.length >= words2.length * 0.5;
  }

  /**
   * Get shared labels between issues
   */
  private getSharedLabels(issue1: any, issue2: any): string[] {
    const labels1 = new Set<string>((issue1.labels?.nodes || []).map((l: any) => l.name));
    const labels2 = new Set<string>((issue2.labels?.nodes || []).map((l: any) => l.name));
    
    return [...labels1].filter(label => labels2.has(label));
  }

  /**
   * Suggest relation type based on content
   */
  private suggestRelationType(fromIssue: any, toIssue: any): string {
    const content = `${fromIssue.title || ''} ${fromIssue.description || ''}`.toLowerCase();
    
    if (content.includes('blocked by') || content.includes('waiting for')) {
      return 'blocks';
    } else if (content.includes('depends on') || content.includes('requires')) {
      return 'depends';
    } else if (content.includes('related to') || content.includes('see also')) {
      return 'relates';
    }
    
    // Default based on issue states
    const fromState = fromIssue.state?.name || '';
    const toState = toIssue.state?.name || '';
    
    if (['Todo', 'Backlog'].includes(fromState) && ['In Progress', 'Done'].includes(toState)) {
      return 'depends';
    }
    
    return 'relates';
  }

  /**
   * Check if dependencies have already been suggested
   */
  private async checkAlreadySuggested(issueId: string): Promise<string[]> {
    try {
      const comments = await this.linearClient.getComments(issueId);
      const suggestedIds: string[] = [];
      
      for (const comment of comments.nodes) {
        if (comment.body?.includes('dependency suggestion') && 
            comment.user?.name?.includes('Bot')) {
          // Extract issue IDs from comment
          const matches = comment.body.match(/\b[A-Z]+-\d+\b/g) || [];
          suggestedIds.push(...matches);
        }
      }
      
      // Return unique IDs
      return [...new Set(suggestedIds)];
    } catch (error) {
      logger.error('Failed to check existing suggestions', {
        issueId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Detect circular dependencies
   */
  private async detectCircularDependencies(issue: any): Promise<string[][]> {
    const visited = new Set<string>();
    const paths: string[][] = [];
    
    const traverse = async (currentId: string, path: string[]): Promise<void> => {
      if (path.includes(currentId)) {
        // Found circular dependency
        const cycleStart = path.indexOf(currentId);
        paths.push([...path.slice(cycleStart), currentId]);
        return;
      }
      
      if (visited.has(currentId)) return;
      visited.add(currentId);
      
      try {
        const relations = await this.linearClient.getIssueRelations({
          filter: { issue: { id: { eq: currentId } } }
        });
        
        for (const relation of relations.nodes) {
          if (relation.type === 'blocks' || relation.type === 'depends') {
            await traverse(relation.relatedIssue.id, [...path, currentId]);
          }
        }
      } catch (error) {
        logger.error('Failed to traverse dependencies', {
          issueId: currentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
    
    await traverse(issue.id, []);
    return paths;
  }

  /**
   * Generate dependency suggestion comment
   */
  private generateDependencySuggestion(issue: any, dependencies: any[]): string {
    const depList = dependencies.map((dep, i) => 
      `${i + 1}. **${dep.identifier}**: ${dep.title}
   - Suggested relation: \`${dep.suggestedRelationType}\`
   - Confidence: ${Math.round(dep.dependencyScore * 100)}%
   - ${dep.state?.name || 'Unknown'} | ${dep.assignee?.name || 'Unassigned'}`
    ).join('\n\n');

    return `## 🔗 Potential Dependencies Detected

I've analyzed this issue and identified potential dependencies based on content similarity, shared context, and explicit references.

### Suggested Dependencies:
${depList}

### Quick Actions:
- To create a dependency, use: \`@saafepulse link [issue-id] as [blocks|depends|relates]\`
- To dismiss this suggestion, add the label \`dependencies-reviewed\`

### Why these suggestions?
- Content analysis found related keywords and references
- Issues share similar context or labels
- Potential workflow dependencies detected

---
*Automated dependency detection by @saafepulse | Confidence threshold: ${Math.round(this.config.keywordSimilarityThreshold * 100)}%*`;
  }

  /**
   * Generate circular dependency warning
   */
  private generateCircularDependencyWarning(circularPaths: string[][]): string {
    const pathDescriptions = circularPaths.map((path, i) => 
      `${i + 1}. ${path.join(' → ')}`
    ).join('\n');

    return `## ⚠️ Circular Dependencies Detected

Circular dependencies can block progress and create deadlocks in your workflow.

### Circular Paths Found:
${pathDescriptions}

### Recommended Actions:
1. Review the dependency chain and identify which can be removed
2. Consider breaking large issues into smaller, independent pieces
3. Re-evaluate if all dependencies are truly blocking

### Impact:
- Teams may be blocked waiting for each other
- Progress tracking becomes unreliable
- Delivery timelines are at risk

---
*Automated circular dependency detection by @saafepulse*`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DependencyDetectionConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Dependency detection configuration updated', { config: this.config });
  }
}