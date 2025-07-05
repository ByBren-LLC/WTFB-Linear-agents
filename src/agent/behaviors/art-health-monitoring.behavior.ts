/**
 * ART Health Monitoring Behavior (LIN-59)
 * 
 * Monitors ART health and alerts when readiness drops below threshold.
 */

import {
  AutonomousBehavior,
  BehaviorContext,
  BehaviorResult,
  BehaviorAction
} from '../types/autonomous-types';
import { LinearClientWrapper } from '../../linear/client';
import { ARTPlanner } from '../../safe/art-planner';
import { ARTReadinessResult } from '../../types/art-planning-types';
import * as logger from '../../utils/logger';

/**
 * Configuration for ART health monitoring
 */
interface ARTHealthConfig {
  minReadinessScore: number;
  checkFrequencyHours: number;
  monitoredTeams: string[];
  stakeholders: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ARTHealthConfig = {
  minReadinessScore: 0.85,
  checkFrequencyHours: 24, // Daily check
  monitoredTeams: [], // Empty means all teams
  stakeholders: [] // Will notify issue assignees/creators by default
};

/**
 * ART health monitoring behavior implementation
 */
export class ARTHealthMonitoringBehavior implements AutonomousBehavior {
  public readonly id = 'art_health_monitoring';
  public readonly name = 'ART Health Monitor';
  public readonly description = 'Monitors ART readiness and alerts on issues';
  public enabled = true;
  public readonly priority = 90; // High priority

  private config: ARTHealthConfig;
  private artPlanner: ARTPlanner;
  private lastCheckTimes: Map<string, Date> = new Map();

  constructor(
    private linearClient: LinearClientWrapper,
    config: Partial<ARTHealthConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.artPlanner = new ARTPlanner();
  }

  /**
   * Check if behavior should trigger
   */
  async shouldTrigger(context: BehaviorContext): Promise<boolean> {
    // Can be triggered by schedule or when planning changes occur
    const teamId = context.team?.id;
    
    if (!teamId) {
      return false;
    }

    // Check if team is monitored
    if (this.config.monitoredTeams.length > 0 && 
        !this.config.monitoredTeams.includes(teamId)) {
      return false;
    }

    // Check if enough time has passed since last check
    const lastCheck = this.lastCheckTimes.get(teamId);
    if (lastCheck) {
      const hoursSinceLastCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastCheck < this.config.checkFrequencyHours) {
        return false;
      }
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
      const teamId = context.team?.id;
      if (!teamId) {
        throw new Error('Team ID is required for ART health monitoring');
      }

      logger.info('Executing ART health monitoring', {
        teamId,
        teamName: context.team?.name
      });

      // Update last check time
      this.lastCheckTimes.set(teamId, new Date());

      // Fetch current PI and work items
      const piId = context.currentPI || await this.getCurrentPI(teamId);
      const workItems = await this.fetchPIWorkItems(teamId, piId);
      const dependencies = await this.fetchDependencies(workItems);
      const teams = await this.getARTTeams(teamId);

      // Create program increment structure
      const programIncrement = this.createProgramIncrement(piId);

      // Assess ART health using existing planner
      const artPlan = await this.artPlanner.planART(
        programIncrement,
        workItems,
        dependencies,
        teams
      );

      const readiness = artPlan.artReadiness;

      logger.info('ART health assessment complete', {
        teamId,
        readinessScore: readiness.readinessScore,
        isHealthy: readiness.readinessScore >= this.config.minReadinessScore
      });

      // Check if readiness is below threshold
      if (readiness.readinessScore < this.config.minReadinessScore) {
        // Generate health report
        const report = this.generateHealthReport(teamId, readiness, artPlan);
        
        // Find or create PI planning issue
        const piIssue = await this.findOrCreatePIPlanningIssue(teamId, piId);
        
        // Post health report as comment
        try {
          await this.linearClient.createComment(piIssue.id, report);
          
          actions.push({
            type: 'comment',
            target: piIssue.id,
            description: 'Posted ART health alert',
            result: 'success',
            data: { 
              readinessScore: readiness.readinessScore,
              criticalBlockers: readiness.criticalBlockers.length
            }
          });

          logger.info('Posted ART health alert', {
            teamId,
            issueId: piIssue.id,
            readinessScore: readiness.readinessScore
          });
        } catch (error) {
          logger.error('Failed to post health report', {
            teamId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          actions.push({
            type: 'comment',
            target: piIssue.id,
            description: 'Failed to post health report',
            result: 'failed',
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }

        // Determine notification priority
        const priority = readiness.readinessScore < 0.7 ? 'high' : 'medium';

        return {
          success: true,
          actions,
          executionTime: Date.now() - startTime,
          shouldNotify: true,
          notification: {
            channels: ['linear', 'slack'],
            recipients: this.getNotificationRecipients(piIssue, context),
            title: `⚠️ ART Health Alert: ${context.team?.name}`,
            message: `ART readiness has dropped to ${Math.round(readiness.readinessScore * 100)}%. ${readiness.criticalBlockers.length} critical blockers identified.`,
            priority,
            data: {
              teamId,
              readinessScore: readiness.readinessScore,
              criticalBlockers: readiness.criticalBlockers,
              issueId: piIssue.id
            }
          }
        };
      } else {
        // Health is good, just log
        actions.push({
          type: 'analysis',
          target: teamId,
          description: 'ART health check passed',
          result: 'success',
          data: { readinessScore: readiness.readinessScore }
        });

        return {
          success: true,
          actions,
          executionTime: Date.now() - startTime,
          shouldNotify: false
        };
      }

    } catch (error) {
      logger.error('ART health monitoring failed', {
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
      // Check ART planner is available
      // (already validated in constructor)
      return true;
    } catch (error) {
      logger.error('ART health monitoring validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get current PI for team
   */
  private async getCurrentPI(teamId: string): Promise<string> {
    // In a real implementation, would fetch from team settings or active cycles
    // For now, return a default based on current date
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `PI-${now.getFullYear()}-Q${quarter}`;
  }

  /**
   * Fetch work items for PI
   */
  private async fetchPIWorkItems(teamId: string, piId: string): Promise<any[]> {
    const issues = await this.linearClient.getIssues({
      filter: {
        team: { id: { eq: teamId } },
        labels: { some: { name: { eq: piId } } }
      }
    });

    return issues.nodes;
  }

  /**
   * Fetch dependencies
   */
  private async fetchDependencies(workItems: any[]): Promise<any> {
    const dependencies: any[] = [];
    
    for (const item of workItems) {
      const relations = await this.linearClient.getIssueRelations({
        filter: { issue: { id: { eq: item.id } } }
      });

      relations.nodes.forEach((relation: any) => {
        dependencies.push({
          from: relation.issue.id,
          to: relation.relatedIssue.id,
          type: relation.type
        });
      });
    }

    return {
      nodes: workItems.map(item => ({ id: item.id, data: item })),
      edges: dependencies,
      criticalPath: [] // Simplified
    };
  }

  /**
   * Get ART teams
   */
  private async getARTTeams(teamId: string): Promise<any[]> {
    const team = await this.linearClient.getTeam(teamId);
    return [{
      id: team.id,
      key: team.key,
      name: team.name
    }];
  }

  /**
   * Create program increment structure
   */
  private createProgramIncrement(piId: string): any {
    const match = piId.match(/PI-(\d{4})-Q(\d)/);
    if (!match) {
      return {
        id: piId,
        name: piId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      };
    }

    const year = parseInt(match[1]);
    const quarter = parseInt(match[2]);
    const startMonth = (quarter - 1) * 3;
    
    return {
      id: piId,
      name: piId,
      year,
      quarter,
      startDate: new Date(year, startMonth, 1),
      endDate: new Date(year, startMonth + 3, 0)
    };
  }

  /**
   * Find or create PI planning issue
   */
  private async findOrCreatePIPlanningIssue(teamId: string, piId: string): Promise<any> {
    // Search for existing PI planning issue
    const issues = await this.linearClient.getIssues({
      filter: {
        team: { id: { eq: teamId } },
        title: { contains: piId },
        labels: { some: { name: { in: ['pi-planning', 'planning'] } } }
      }
    });

    if (issues.nodes.length > 0) {
      return issues.nodes[0];
    }

    // Create new PI planning issue
    return await this.linearClient.createIssue({
      teamId,
      title: `${piId} Planning`,
      description: `Planning and tracking for ${piId}`,
      labelIds: [] // Would need to fetch label IDs
    });
  }

  /**
   * Generate health report
   */
  private generateHealthReport(teamId: string, readiness: ARTReadinessResult, artPlan: any): string {
    const score = Math.round(readiness.readinessScore * 100);
    const blockers = readiness.criticalBlockers;
    const recommendations = readiness.recommendations;

    return `## ⚠️ ART Health Alert

The ART readiness score has dropped below the acceptable threshold.

### 📊 Current Status
- **Readiness Score**: ${score}% (Threshold: ${Math.round(this.config.minReadinessScore * 100)}%)
- **Critical Blockers**: ${blockers.length}
- **Status**: ${score < 70 ? '🔴 Critical' : '🟡 Warning'}

### 🚨 Critical Issues
${blockers.length > 0 ? blockers.map((blocker, i) => `${i + 1}. ${blocker}`).join('\n') : 'No critical blockers identified.'}

### 📈 Readiness Breakdown
${readiness.assessments.map(assessment => 
  `- **${this.formatCategory(assessment.category)}**: ${Math.round(assessment.score * 100)}% ${assessment.isReady ? '✅' : '❌'}`
).join('\n')}

### 💡 Recommendations
${recommendations.length > 0 ? recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n') : 'No specific recommendations.'}

### 📊 Key Metrics
- **Total Work Items**: ${artPlan.workItems.length}
- **Total Story Points**: ${artPlan.summary.totalStoryPoints}
- **Capacity Utilization**: ${Math.round(artPlan.summary.averageCapacityUtilization * 100)}%
- **Value Delivery Confidence**: ${Math.round(artPlan.summary.valueDeliveryConfidence * 100)}%

### 🚀 Next Steps
1. Review and address critical blockers immediately
2. Schedule ART sync meeting if needed
3. Update planning to improve readiness
4. Run \`@saafepulse optimize art\` for detailed recommendations

---
*Automated health check by @saafepulse | Next check: ${new Date(Date.now() + this.config.checkFrequencyHours * 60 * 60 * 1000).toLocaleString()}*`;
  }

  /**
   * Format category name
   */
  private formatCategory(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get notification recipients
   */
  private getNotificationRecipients(piIssue: any, context: BehaviorContext): string[] {
    const recipients = new Set<string>();

    // Add configured stakeholders
    this.config.stakeholders.forEach(s => recipients.add(s));

    // Add issue assignee and creator
    if (piIssue.assignee?.id) recipients.add(piIssue.assignee.id);
    if (piIssue.creator?.id) recipients.add(piIssue.creator.id);

    // Add team lead (if available in context)
    if (context.metadata?.teamLead) {
      recipients.add(context.metadata.teamLead);
    }

    return Array.from(recipients);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ARTHealthConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('ART health monitoring configuration updated', { config: this.config });
  }
}