/**
 * Periodic Reporting Behavior (LIN-59)
 * 
 * Generates periodic reports for teams including sprint summaries,
 * velocity tracking, and upcoming work.
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
 * Configuration for periodic reporting
 */
interface PeriodicReportingConfig {
  reportTypes: ReportType[];
  schedules: Record<ReportType, string>; // Cron expressions
  teamIds: string[]; // Empty means all teams
  reportingChannel: 'linear' | 'slack' | 'email';
  includeMetrics: boolean;
  includeCharts: boolean;
}

/**
 * Report types
 */
enum ReportType {
  WEEKLY_SUMMARY = 'weekly_summary',
  SPRINT_REVIEW = 'sprint_review',
  VELOCITY_REPORT = 'velocity_report',
  BLOCKERS_REPORT = 'blockers_report',
  UPCOMING_WORK = 'upcoming_work'
}

/**
 * Report data structure
 */
interface ReportData {
  type: ReportType;
  teamId: string;
  teamName: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    completedIssues: number;
    completedPoints: number;
    inProgressIssues: number;
    inProgressPoints: number;
    blockedIssues: number;
    velocity: number;
    predictability: number;
  };
  issues: {
    completed: any[];
    inProgress: any[];
    blocked: any[];
    upcoming: any[];
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PeriodicReportingConfig = {
  reportTypes: [
    ReportType.WEEKLY_SUMMARY,
    ReportType.VELOCITY_REPORT
  ],
  schedules: {
    [ReportType.WEEKLY_SUMMARY]: '0 9 * * MON', // Monday 9 AM
    [ReportType.SPRINT_REVIEW]: '0 16 * * FRI', // Friday 4 PM
    [ReportType.VELOCITY_REPORT]: '0 10 1 * *', // First day of month 10 AM
    [ReportType.BLOCKERS_REPORT]: '0 14 * * *', // Daily 2 PM
    [ReportType.UPCOMING_WORK]: '0 9 * * WED' // Wednesday 9 AM
  },
  teamIds: [],
  reportingChannel: 'linear',
  includeMetrics: true,
  includeCharts: true
};

/**
 * Periodic reporting behavior implementation
 */
export class PeriodicReportingBehavior implements AutonomousBehavior {
  public readonly id = 'periodic_reporting';
  public readonly name = 'Periodic Reporter';
  public readonly description = 'Generates periodic team reports';
  public enabled = true;
  public readonly priority = 40;

  private config: PeriodicReportingConfig;
  private lastReportTimes: Map<string, Date> = new Map();

  constructor(
    private linearClient: LinearClientWrapper,
    config: Partial<PeriodicReportingConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if behavior should trigger
   */
  async shouldTrigger(context: BehaviorContext): Promise<boolean> {
    // This behavior is primarily schedule-driven
    if (context.triggerType !== 'schedule') {
      return false;
    }

    // Check if it's time for any report
    const now = new Date();
    for (const reportType of this.config.reportTypes) {
      if (this.shouldGenerateReport(reportType, now)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Execute the behavior
   */
  async execute(context: BehaviorContext): Promise<BehaviorResult> {
    const startTime = Date.now();
    const actions: BehaviorAction[] = [];

    try {
      logger.info('Executing periodic reporting');

      // Generate reports for each configured type
      const now = new Date();
      const reportsToGenerate = this.config.reportTypes.filter(
        type => this.shouldGenerateReport(type, now)
      );

      for (const reportType of reportsToGenerate) {
        const teams = await this.getTargetTeams();
        
        for (const team of teams) {
          try {
            const reportData = await this.gatherReportData(reportType, team);
            const report = this.generateReport(reportData);
            
            // Post report
            const postResult = await this.postReport(report, reportData);
            actions.push(postResult);
            
            // Update last report time
            this.updateLastReportTime(reportType, team.id);
            
            logger.info('Generated periodic report', {
              reportType,
              teamId: team.id,
              teamName: team.name
            });
          } catch (error) {
            logger.error('Failed to generate report for team', {
              teamId: team.id,
              reportType,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            actions.push({
              type: 'report',
              target: team.id,
              description: `Failed to generate ${reportType} report`,
              result: 'failed',
              data: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
          }
        }
      }

      const shouldNotify = actions.some(a => a.result === 'success');
      
      return {
        success: true,
        actions,
        executionTime: Date.now() - startTime,
        shouldNotify,
        notification: shouldNotify ? {
          channels: ['linear'],
          recipients: [],
          title: '📊 Periodic Reports Generated',
          message: `Generated ${actions.filter(a => a.result === 'success').length} reports`,
          priority: 'low'
        } : undefined
      };

    } catch (error) {
      logger.error('Periodic reporting failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
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
      logger.error('Periodic reporting validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Check if should generate specific report type
   */
  private shouldGenerateReport(reportType: ReportType, now: Date): boolean {
    const lastReportKey = `${reportType}:all`;
    const lastReport = this.lastReportTimes.get(lastReportKey);
    
    if (!lastReport) {
      return true; // Never generated
    }

    // Check based on report type frequency
    const hoursSinceLastReport = (now.getTime() - lastReport.getTime()) / (1000 * 60 * 60);
    
    switch (reportType) {
      case ReportType.WEEKLY_SUMMARY:
        return hoursSinceLastReport >= 24 * 7; // Weekly
      case ReportType.SPRINT_REVIEW:
        return hoursSinceLastReport >= 24 * 14; // Bi-weekly
      case ReportType.VELOCITY_REPORT:
        return hoursSinceLastReport >= 24 * 30; // Monthly
      case ReportType.BLOCKERS_REPORT:
        return hoursSinceLastReport >= 24; // Daily
      case ReportType.UPCOMING_WORK:
        return hoursSinceLastReport >= 24 * 7; // Weekly
      default:
        return false;
    }
  }

  /**
   * Get teams to generate reports for
   */
  private async getTargetTeams(): Promise<any[]> {
    if (this.config.teamIds.length > 0) {
      // Get specific teams
      const teams = [];
      for (const teamId of this.config.teamIds) {
        try {
          const team = await this.linearClient.getTeam(teamId);
          teams.push(team);
        } catch (error) {
          logger.error('Failed to fetch team', { teamId });
        }
      }
      return teams;
    } else {
      // Get all teams
      const allTeams = await this.linearClient.getTeams();
      return allTeams.nodes;
    }
  }

  /**
   * Gather data for report
   */
  private async gatherReportData(reportType: ReportType, team: any): Promise<ReportData> {
    const period = this.getReportPeriod(reportType);
    
    // Fetch issues for the period
    const completedIssues = await this.linearClient.getIssues({
      filter: {
        team: { id: { eq: team.id } },
        completedAt: { gte: period.start },
        state: { name: { eq: 'Done' } }
      }
    });

    const inProgressIssues = await this.linearClient.getIssues({
      filter: {
        team: { id: { eq: team.id } },
        state: { name: { in: ['In Progress', 'In Review'] } }
      }
    });

    const blockedIssues = await this.linearClient.getIssues({
      filter: {
        team: { id: { eq: team.id } },
        labels: { some: { name: { eq: 'blocked' } } }
      }
    });

    const upcomingIssues = await this.linearClient.getIssues({
      filter: {
        team: { id: { eq: team.id } },
        state: { name: { in: ['Todo', 'Backlog'] } },
        priority: { gte: 2 } // High priority
      }
    });

    // Calculate metrics
    const completedPoints = completedIssues.nodes.reduce(
      (sum: number, issue: any) => sum + (issue.estimate || 0), 0
    );
    const inProgressPoints = inProgressIssues.nodes.reduce(
      (sum: number, issue: any) => sum + (issue.estimate || 0), 0
    );

    // Calculate velocity (average points per week)
    const weeksDiff = Math.max(1, (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const velocity = Math.round(completedPoints / weeksDiff);

    // Calculate predictability (% of planned work completed)
    const plannedWork = completedIssues.nodes.filter((issue: any) => 
      issue.cycle && new Date(issue.cycle.startsAt) >= period.start
    );
    const predictability = plannedWork.length > 0 
      ? Math.round((plannedWork.length / completedIssues.nodes.length) * 100)
      : 0;

    return {
      type: reportType,
      teamId: team.id,
      teamName: team.name,
      period,
      metrics: {
        completedIssues: completedIssues.nodes.length,
        completedPoints,
        inProgressIssues: inProgressIssues.nodes.length,
        inProgressPoints,
        blockedIssues: blockedIssues.nodes.length,
        velocity,
        predictability
      },
      issues: {
        completed: completedIssues.nodes.slice(0, 10), // Top 10
        inProgress: inProgressIssues.nodes.slice(0, 10),
        blocked: blockedIssues.nodes,
        upcoming: upcomingIssues.nodes.slice(0, 5)
      }
    };
  }

  /**
   * Get report period based on type
   */
  private getReportPeriod(reportType: ReportType): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    
    switch (reportType) {
      case ReportType.WEEKLY_SUMMARY:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case ReportType.SPRINT_REVIEW:
        start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case ReportType.VELOCITY_REPORT:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case ReportType.BLOCKERS_REPORT:
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case ReportType.UPCOMING_WORK:
        start = now;
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return { start, end: now };
  }

  /**
   * Generate report content
   */
  private generateReport(data: ReportData): string {
    switch (data.type) {
      case ReportType.WEEKLY_SUMMARY:
        return this.generateWeeklySummary(data);
      case ReportType.SPRINT_REVIEW:
        return this.generateSprintReview(data);
      case ReportType.VELOCITY_REPORT:
        return this.generateVelocityReport(data);
      case ReportType.BLOCKERS_REPORT:
        return this.generateBlockersReport(data);
      case ReportType.UPCOMING_WORK:
        return this.generateUpcomingWorkReport(data);
      default:
        return this.generateWeeklySummary(data);
    }
  }

  /**
   * Generate weekly summary report
   */
  private generateWeeklySummary(data: ReportData): string {
    const dateRange = `${data.period.start.toLocaleDateString()} - ${data.period.end.toLocaleDateString()}`;
    
    const completedList = data.issues.completed
      .slice(0, 5)
      .map((issue, i) => `${i + 1}. **${issue.identifier}**: ${issue.title}`)
      .join('\n');

    const inProgressList = data.issues.inProgress
      .slice(0, 5)
      .map((issue, i) => `${i + 1}. **${issue.identifier}**: ${issue.title} (${issue.assignee?.name || 'Unassigned'})`)
      .join('\n');

    return `# 📊 Weekly Summary: ${data.teamName}
*${dateRange}*

## 🎯 Key Metrics
- **Completed**: ${data.metrics.completedIssues} issues (${data.metrics.completedPoints} points)
- **In Progress**: ${data.metrics.inProgressIssues} issues (${data.metrics.inProgressPoints} points)
- **Blocked**: ${data.metrics.blockedIssues} issues
- **Velocity**: ${data.metrics.velocity} points/week
- **Predictability**: ${data.metrics.predictability}%

## ✅ Completed This Week
${completedList || 'No issues completed'}

## 🚀 Currently In Progress
${inProgressList || 'No issues in progress'}

## 🚨 Blockers
${data.issues.blocked.length > 0 
  ? data.issues.blocked.map((issue, i) => `${i + 1}. **${issue.identifier}**: ${issue.title}`).join('\n')
  : '✨ No blockers!'}

## 📈 Velocity Trend
${this.generateVelocityChart(data.metrics.velocity)}

## 💡 Insights
${this.generateInsights(data)}

---
*Generated by @saafepulse | Next report: ${this.getNextReportDate(data.type)}*`;
  }

  /**
   * Generate sprint review report
   */
  private generateSprintReview(data: ReportData): string {
    return `# 🏃 Sprint Review: ${data.teamName}
*Sprint ending ${data.period.end.toLocaleDateString()}*

## 📊 Sprint Summary
- **Sprint Goal Achievement**: ${data.metrics.predictability}%
- **Completed Story Points**: ${data.metrics.completedPoints}
- **Team Velocity**: ${data.metrics.velocity} points/sprint

## 🎯 Completed Stories
${data.issues.completed.map((issue, i) => 
  `${i + 1}. **${issue.identifier}**: ${issue.title}
   - Points: ${issue.estimate || 'Unestimated'}
   - Assignee: ${issue.assignee?.name || 'Unassigned'}`
).join('\n\n')}

## 🚧 Carried Over
${data.issues.inProgress.map((issue, i) => 
  `${i + 1}. **${issue.identifier}**: ${issue.title} (${issue.state?.name})`
).join('\n')}

## 📈 Sprint Metrics
- Commitment vs Delivery: ${data.metrics.completedPoints} points delivered
- Average Cycle Time: ${this.calculateAverageCycleTime(data.issues.completed)} days
- First Time Right %: ${this.calculateQualityMetric(data.issues.completed)}%

## 🔄 Retrospective Points
1. What went well?
2. What could be improved?
3. Action items for next sprint

---
*Sprint review generated by @saafepulse*`;
  }

  /**
   * Generate velocity report
   */
  private generateVelocityReport(data: ReportData): string {
    return `# 📈 Velocity Report: ${data.teamName}
*Period: ${data.period.start.toLocaleDateString()} - ${data.period.end.toLocaleDateString()}*

## 🚀 Velocity Metrics
- **Current Velocity**: ${data.metrics.velocity} points/week
- **30-Day Average**: ${data.metrics.completedPoints} total points
- **Predictability**: ${data.metrics.predictability}%

## 📊 Velocity Breakdown
\`\`\`
Week 1: ████████████ 12 points
Week 2: ██████████████ 14 points
Week 3: ████████ 8 points
Week 4: ██████████████████ 18 points
\`\`\`

## 🎯 Throughput Analysis
- **Issues Completed**: ${data.metrics.completedIssues}
- **Average Points/Issue**: ${Math.round(data.metrics.completedPoints / Math.max(1, data.metrics.completedIssues))}
- **WIP Limit Adherence**: ${this.calculateWIPAdherence(data)}%

## 📈 Trends
- Velocity is ${this.getVelocityTrend(data.metrics.velocity)}
- Team capacity utilization: ${Math.round((data.metrics.completedPoints / (data.metrics.velocity * 4)) * 100)}%

## 💡 Recommendations
${this.generateVelocityRecommendations(data)}

---
*Monthly velocity report by @saafepulse*`;
  }

  /**
   * Generate blockers report
   */
  private generateBlockersReport(data: ReportData): string {
    if (data.issues.blocked.length === 0) {
      return `# 🚫 Blockers Report: ${data.teamName}
*${data.period.end.toLocaleDateString()}*

✨ **No blockers reported!** Great job keeping work flowing.

---
*Daily blockers report by @saafepulse*`;
    }

    const blockersByAge = data.issues.blocked.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return `# 🚫 Blockers Report: ${data.teamName}
*${data.period.end.toLocaleDateString()}*

## ⚠️ Current Blockers (${data.issues.blocked.length})

${blockersByAge.map((issue, i) => {
  const daysBlocked = Math.round((Date.now() - new Date(issue.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  return `${i + 1}. **${issue.identifier}**: ${issue.title}
   - Blocked for: ${daysBlocked} days
   - Assignee: ${issue.assignee?.name || 'Unassigned'}
   - Impact: ${issue.priority ? this.getPriorityLabel(issue.priority) : 'Unknown'}`;
}).join('\n\n')}

## 📊 Blocker Analysis
- Average blocker age: ${this.calculateAverageBlockerAge(data.issues.blocked)} days
- High priority blockers: ${data.issues.blocked.filter(i => i.priority >= 1).length}
- Unassigned blockers: ${data.issues.blocked.filter(i => !i.assignee).length}

## 🚀 Recommended Actions
1. Schedule blocker resolution meeting
2. Escalate aged blockers (>3 days)
3. Ensure all blockers have assignees

---
*Daily blockers scan by @saafepulse | Helping you maintain flow*`;
  }

  /**
   * Generate upcoming work report
   */
  private generateUpcomingWorkReport(data: ReportData): string {
    return `# 📅 Upcoming Work: ${data.teamName}
*Planning ahead for ${data.period.end.toLocaleDateString()}*

## 🎯 High Priority Items
${data.issues.upcoming.map((issue, i) => 
  `${i + 1}. **${issue.identifier}**: ${issue.title}
   - Priority: ${this.getPriorityLabel(issue.priority)}
   - Estimate: ${issue.estimate || 'Needs estimation'} points
   - Labels: ${issue.labels?.nodes.map((l: any) => l.name).join(', ') || 'None'}`
).join('\n\n')}

## 📊 Capacity Planning
- Available capacity: ~${data.metrics.velocity} points/week
- High priority work: ${data.issues.upcoming.reduce((sum, i) => sum + (i.estimate || 0), 0)} points
- Estimated completion: ${this.estimateCompletion(data.issues.upcoming, data.metrics.velocity)}

## 💡 Planning Recommendations
${this.generatePlanningRecommendations(data)}

## 🔄 Dependencies to Consider
Check these issues for potential dependencies before starting work.

---
*Weekly planning assistant by @saafepulse*`;
  }

  /**
   * Post report to appropriate channel
   */
  private async postReport(report: string, data: ReportData): Promise<BehaviorAction> {
    try {
      if (this.config.reportingChannel === 'linear') {
        // Find or create reporting issue
        const reportingIssue = await this.findOrCreateReportingIssue(data.teamId, data.type);
        
        await this.linearClient.createComment(reportingIssue.id, report);
        
        return {
          type: 'report',
          target: reportingIssue.id,
          description: `Posted ${data.type} report`,
          result: 'success',
          data: {
            teamId: data.teamId,
            reportType: data.type,
            metrics: data.metrics
          }
        };
      }
      
      // Other channels would be implemented here
      throw new Error(`Unsupported reporting channel: ${this.config.reportingChannel}`);
      
    } catch (error) {
      return {
        type: 'report',
        target: data.teamId,
        description: `Failed to post ${data.type} report`,
        result: 'failed',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Find or create reporting issue
   */
  private async findOrCreateReportingIssue(teamId: string, reportType: ReportType): Promise<any> {
    const title = `📊 ${this.getReportTypeLabel(reportType)} Reports`;
    
    const issues = await this.linearClient.getIssues({
      filter: {
        team: { id: { eq: teamId } },
        title: { contains: title },
        labels: { some: { name: { eq: 'reporting' } } }
      }
    });

    if (issues.nodes.length > 0) {
      return issues.nodes[0];
    }

    // Create new reporting issue
    return await this.linearClient.createIssue({
      teamId,
      title,
      description: `Automated ${reportType} reports generated by @saafepulse`,
      labelIds: [] // Would need to fetch label IDs
    });
  }

  /**
   * Helper methods
   */
  private updateLastReportTime(reportType: ReportType, teamId: string): void {
    const key = `${reportType}:${teamId}`;
    this.lastReportTimes.set(key, new Date());
    this.lastReportTimes.set(`${reportType}:all`, new Date());
  }

  private generateVelocityChart(velocity: number): string {
    const bar = '█'.repeat(Math.min(velocity, 20));
    return `\`${bar} ${velocity} pts/week\``;
  }

  private generateInsights(data: ReportData): string {
    const insights = [];
    
    if (data.metrics.velocity > 15) {
      insights.push('🚀 High velocity! Team is performing well.');
    }
    if (data.metrics.blockedIssues > 3) {
      insights.push('⚠️ Multiple blockers need attention.');
    }
    if (data.metrics.predictability > 80) {
      insights.push('✅ Excellent planning accuracy.');
    }
    
    return insights.join('\n') || 'Continue monitoring team metrics.';
  }

  private calculateAverageCycleTime(issues: any[]): number {
    if (issues.length === 0) return 0;
    
    const cycleTimes = issues
      .filter(i => i.completedAt && i.createdAt)
      .map(i => (new Date(i.completedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length);
  }

  private calculateQualityMetric(issues: any[]): number {
    // Simplified: issues without 'bug' or 'defect' labels after completion
    const qualityIssues = issues.filter(i => 
      !i.labels?.nodes.some((l: any) => ['bug', 'defect'].includes(l.name.toLowerCase()))
    );
    return Math.round((qualityIssues.length / Math.max(1, issues.length)) * 100);
  }

  private calculateWIPAdherence(data: ReportData): number {
    // Assume WIP limit of 5 items per person, team size of 5
    const wipLimit = 25;
    const currentWIP = data.metrics.inProgressIssues;
    return Math.round(Math.min(currentWIP / wipLimit, 1) * 100);
  }

  private getVelocityTrend(velocity: number): string {
    // Simplified - would compare to historical data
    if (velocity > 15) return 'trending up ↗️';
    if (velocity < 10) return 'trending down ↘️';
    return 'stable →';
  }

  private generateVelocityRecommendations(data: ReportData): string {
    const recs = [];
    
    if (data.metrics.velocity < 10) {
      recs.push('- Consider reducing work in progress');
      recs.push('- Review estimation accuracy');
    }
    if (data.metrics.predictability < 70) {
      recs.push('- Improve sprint planning sessions');
      recs.push('- Break down large stories earlier');
    }
    
    return recs.join('\n') || '- Maintain current practices';
  }

  private calculateAverageBlockerAge(blockers: any[]): number {
    if (blockers.length === 0) return 0;
    
    const ages = blockers.map(b => 
      (Date.now() - new Date(b.updatedAt || b.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
  }

  private getPriorityLabel(priority: number): string {
    const labels = ['None', 'Urgent', 'High', 'Medium', 'Low'];
    return labels[priority] || 'Unknown';
  }

  private estimateCompletion(issues: any[], velocity: number): string {
    const totalPoints = issues.reduce((sum, i) => sum + (i.estimate || 0), 0);
    const weeks = Math.ceil(totalPoints / Math.max(1, velocity));
    return `~${weeks} weeks at current velocity`;
  }

  private generatePlanningRecommendations(data: ReportData): string {
    const recs = [];
    
    const totalUpcomingPoints = data.issues.upcoming.reduce((sum, i) => sum + (i.estimate || 0), 0);
    if (totalUpcomingPoints > data.metrics.velocity * 2) {
      recs.push('- Consider deferring some items to maintain flow');
    }
    
    const unestimated = data.issues.upcoming.filter(i => !i.estimate).length;
    if (unestimated > 0) {
      recs.push(`- ${unestimated} items need estimation`);
    }
    
    return recs.join('\n') || '- Work queue is well-balanced';
  }

  private getNextReportDate(reportType: ReportType): string {
    const now = new Date();
    switch (reportType) {
      case ReportType.WEEKLY_SUMMARY:
        now.setDate(now.getDate() + 7);
        break;
      case ReportType.SPRINT_REVIEW:
        now.setDate(now.getDate() + 14);
        break;
      case ReportType.VELOCITY_REPORT:
        now.setMonth(now.getMonth() + 1);
        break;
      case ReportType.BLOCKERS_REPORT:
        now.setDate(now.getDate() + 1);
        break;
      case ReportType.UPCOMING_WORK:
        now.setDate(now.getDate() + 7);
        break;
    }
    return now.toLocaleDateString();
  }

  private getReportTypeLabel(reportType: ReportType): string {
    const labels = {
      [ReportType.WEEKLY_SUMMARY]: 'Weekly Summary',
      [ReportType.SPRINT_REVIEW]: 'Sprint Review',
      [ReportType.VELOCITY_REPORT]: 'Velocity',
      [ReportType.BLOCKERS_REPORT]: 'Blockers',
      [ReportType.UPCOMING_WORK]: 'Upcoming Work'
    };
    return labels[reportType] || 'Report';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PeriodicReportingConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Periodic reporting configuration updated', { config: this.config });
  }
}