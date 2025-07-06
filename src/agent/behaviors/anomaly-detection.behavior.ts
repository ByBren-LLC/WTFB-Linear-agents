/**
 * Anomaly Detection Behavior (LIN-59)
 * 
 * Detects unusual patterns in team performance, issue lifecycle,
 * and workflow metrics to identify potential problems early.
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
 * Configuration for anomaly detection
 */
interface AnomalyDetectionConfig {
  sensitivityLevel: 'low' | 'medium' | 'high';
  anomalyTypes: AnomalyType[];
  lookbackDays: number;
  thresholds: {
    velocityDeviation: number; // % deviation from average
    cycleTimeIncrease: number; // % increase in cycle time
    blockageRate: number; // % of issues blocked
    estimationAccuracy: number; // % deviation from estimates
    wipExcess: number; // % over WIP limit
  };
}

/**
 * Types of anomalies to detect
 */
enum AnomalyType {
  VELOCITY_DROP = 'velocity_drop',
  CYCLE_TIME_SPIKE = 'cycle_time_spike',
  ESTIMATION_DRIFT = 'estimation_drift',
  BLOCKAGE_INCREASE = 'blockage_increase',
  WIP_VIOLATION = 'wip_violation',
  STALE_ISSUES = 'stale_issues',
  ASSIGNMENT_IMBALANCE = 'assignment_imbalance',
  PRIORITY_NEGLECT = 'priority_neglect'
}

/**
 * Anomaly data structure
 */
interface Anomaly {
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  metrics: Record<string, any>;
  recommendations: string[];
  affectedItems: any[];
}

/**
 * Historical metrics for comparison
 */
interface HistoricalMetrics {
  averageVelocity: number;
  averageCycleTime: number;
  averageBlockageRate: number;
  averageWIP: number;
  estimationAccuracy: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AnomalyDetectionConfig = {
  sensitivityLevel: 'medium',
  anomalyTypes: Object.values(AnomalyType),
  lookbackDays: 30,
  thresholds: {
    velocityDeviation: 30, // 30% drop
    cycleTimeIncrease: 50, // 50% increase
    blockageRate: 20, // 20% blocked
    estimationAccuracy: 40, // 40% deviation
    wipExcess: 50 // 50% over limit
  }
};

/**
 * Anomaly detection behavior implementation
 */
export class AnomalyDetectionBehavior implements AutonomousBehavior {
  public readonly id = 'anomaly_detection';
  public readonly name = 'Anomaly Detector';
  public readonly description = 'Detects unusual patterns in team metrics';
  public enabled = true;
  public readonly priority = 50;

  private config: AnomalyDetectionConfig;
  private historicalData: Map<string, HistoricalMetrics> = new Map();

  constructor(
    private linearClient: LinearClientWrapper,
    config: Partial<AnomalyDetectionConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.adjustThresholdsForSensitivity();
  }

  /**
   * Check if behavior should trigger
   */
  async shouldTrigger(context: BehaviorContext): Promise<boolean> {
    // Run anomaly detection on schedule or significant events
    if (context.triggerType === 'schedule') {
      return true;
    }

    // Also trigger on significant state changes
    if (context.issue && context.previousState) {
      const significantChange = 
        context.issue.state?.name === 'Blocked' ||
        (context.issue.priority || 0) >= 1 || // High/Urgent priority
        (context.issue.estimate || 0) > 8; // Large story

      return significantChange;
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
      logger.info('Executing anomaly detection');

      // Get teams to analyze
      const teams = context.team ? [context.team] : await this.getAllTeams();
      
      for (const team of teams) {
        try {
          // Gather current and historical metrics
          const currentMetrics = await this.gatherCurrentMetrics(team.id);
          const historicalMetrics = await this.getHistoricalMetrics(team.id);
          
          // Detect anomalies
          const anomalies = await this.detectAnomalies(
            team,
            currentMetrics,
            historicalMetrics
          );

          if (anomalies.length > 0) {
            // Generate anomaly report
            const report = this.generateAnomalyReport(team, anomalies);
            
            // Post report
            const reportAction = await this.postAnomalyReport(team.id, report, anomalies);
            actions.push(reportAction);
            
            // Take automated corrective actions for critical anomalies
            const correctiveActions = await this.takeCorrectiveActions(team, anomalies);
            actions.push(...correctiveActions);
            
            logger.info('Detected anomalies', {
              teamId: team.id,
              teamName: team.name,
              anomalyCount: anomalies.length,
              criticalCount: anomalies.filter(a => a.severity === 'high').length
            });
          }
          
          // Update historical data
          this.updateHistoricalData(team.id, currentMetrics);
          
        } catch (error) {
          logger.error('Failed to analyze team', {
            teamId: team.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          actions.push({
            type: 'analysis',
            target: team.id,
            description: 'Failed to analyze team metrics',
            result: 'failed',
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }
      }

      const hasHighSeverity = actions.some(a => 
        a.data?.anomalies?.some((anomaly: Anomaly) => anomaly.severity === 'high')
      );

      return {
        success: true,
        actions,
        executionTime: Date.now() - startTime,
        shouldNotify: hasHighSeverity,
        notification: hasHighSeverity ? {
          channels: ['linear', 'slack'],
          recipients: [],
          title: '🚨 Critical Anomalies Detected',
          message: 'High severity anomalies require immediate attention',
          priority: 'high'
        } : undefined
      };

    } catch (error) {
      logger.error('Anomaly detection failed', {
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
      logger.error('Anomaly detection validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Gather current metrics for a team
   */
  private async gatherCurrentMetrics(teamId: string): Promise<any> {
    const now = new Date();
    const lookbackDate = new Date(now.getTime() - this.config.lookbackDays * 24 * 60 * 60 * 1000);

    // Fetch recent issues
    const recentIssues = await this.linearClient.getIssues({
      filter: {
        team: { id: { eq: teamId } },
        updatedAt: { gte: lookbackDate }
      }
    });

    // Calculate current metrics
    const completedIssues = recentIssues.nodes.filter(
      (i: any) => i.completedAt && new Date(i.completedAt) >= lookbackDate
    );
    
    const blockedIssues = recentIssues.nodes.filter(
      (i: any) => i.labels?.nodes.some((l: any) => l.name === 'blocked')
    );
    
    const inProgressIssues = recentIssues.nodes.filter(
      (i: any) => ['In Progress', 'In Review'].includes(i.state?.name)
    );

    // Calculate velocity (points per week)
    const weeksSinceStart = Math.max(1, (now.getTime() - lookbackDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const completedPoints = completedIssues.reduce((sum: number, i: any) => sum + (i.estimate || 0), 0);
    const velocity = completedPoints / weeksSinceStart;

    // Calculate average cycle time
    const cycleTimes = completedIssues
      .filter((i: any) => i.createdAt && i.completedAt)
      .map((i: any) => (new Date(i.completedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const avgCycleTime = cycleTimes.length > 0 
      ? cycleTimes.reduce((a: number, b: number) => a + b, 0) / cycleTimes.length 
      : 0;

    // Calculate blockage rate
    const blockageRate = recentIssues.nodes.length > 0
      ? (blockedIssues.length / recentIssues.nodes.length) * 100
      : 0;

    // Calculate estimation accuracy
    const estimatedIssues = completedIssues.filter((i: any) => i.estimate);
    const estimationVariances = estimatedIssues.map((i: any) => {
      const actualTime = (new Date(i.completedAt).getTime() - new Date(i.startedAt || i.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const estimatedTime = i.estimate * 1; // Assuming 1 point = 1 day
      return Math.abs(actualTime - estimatedTime) / estimatedTime;
    });
    const avgEstimationVariance = estimationVariances.length > 0
      ? estimationVariances.reduce((a: number, b: number) => a + b, 0) / estimationVariances.length
      : 0;

    // Get team member workloads
    const memberWorkloads = await this.calculateMemberWorkloads(inProgressIssues);

    return {
      velocity,
      avgCycleTime,
      blockageRate,
      wipCount: inProgressIssues.length,
      completedCount: completedIssues.length,
      avgEstimationVariance: avgEstimationVariance * 100,
      memberWorkloads,
      issues: {
        completed: completedIssues,
        blocked: blockedIssues,
        inProgress: inProgressIssues,
        all: recentIssues.nodes
      }
    };
  }

  /**
   * Get historical metrics for comparison
   */
  private async getHistoricalMetrics(teamId: string): Promise<HistoricalMetrics> {
    // Check cache first
    if (this.historicalData.has(teamId)) {
      return this.historicalData.get(teamId)!;
    }

    // Calculate from longer history (90 days)
    const historicalDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const historicalIssues = await this.linearClient.getIssues({
      filter: {
        team: { id: { eq: teamId } },
        completedAt: { gte: historicalDate }
      }
    });

    const completedPoints = historicalIssues.nodes.reduce(
      (sum: number, i: any) => sum + (i.estimate || 0), 0
    );
    const weeks = 90 / 7;
    const averageVelocity = completedPoints / weeks;

    // Calculate other historical metrics
    const cycleTimes = historicalIssues.nodes
      .filter((i: any) => i.createdAt && i.completedAt)
      .map((i: any) => (new Date(i.completedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    const averageCycleTime = cycleTimes.length > 0
      ? cycleTimes.reduce((a: number, b: number) => a + b, 0) / cycleTimes.length
      : 7; // Default to 7 days

    const metrics: HistoricalMetrics = {
      averageVelocity,
      averageCycleTime,
      averageBlockageRate: 10, // Default 10%
      averageWIP: 15, // Default team WIP
      estimationAccuracy: 80 // Default 80% accurate
    };

    this.historicalData.set(teamId, metrics);
    return metrics;
  }

  /**
   * Detect anomalies by comparing current to historical metrics
   */
  private async detectAnomalies(
    team: any,
    current: any,
    historical: HistoricalMetrics
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Velocity anomaly
    if (this.config.anomalyTypes.includes(AnomalyType.VELOCITY_DROP)) {
      const velocityDrop = ((historical.averageVelocity - current.velocity) / historical.averageVelocity) * 100;
      if (velocityDrop > this.config.thresholds.velocityDeviation) {
        anomalies.push({
          type: AnomalyType.VELOCITY_DROP,
          severity: velocityDrop > 50 ? 'high' : 'medium',
          description: `Team velocity dropped ${Math.round(velocityDrop)}% below average`,
          metrics: {
            currentVelocity: current.velocity,
            historicalAverage: historical.averageVelocity,
            dropPercentage: velocityDrop
          },
          recommendations: [
            'Review recent blockers and impediments',
            'Check team capacity and availability',
            'Analyze if stories are properly sized',
            'Consider team morale and burnout factors'
          ],
          affectedItems: []
        });
      }
    }

    // Cycle time anomaly
    if (this.config.anomalyTypes.includes(AnomalyType.CYCLE_TIME_SPIKE)) {
      const cycleTimeIncrease = ((current.avgCycleTime - historical.averageCycleTime) / historical.averageCycleTime) * 100;
      if (cycleTimeIncrease > this.config.thresholds.cycleTimeIncrease) {
        anomalies.push({
          type: AnomalyType.CYCLE_TIME_SPIKE,
          severity: cycleTimeIncrease > 100 ? 'high' : 'medium',
          description: `Average cycle time increased ${Math.round(cycleTimeIncrease)}%`,
          metrics: {
            currentCycleTime: current.avgCycleTime,
            historicalAverage: historical.averageCycleTime,
            increasePercentage: cycleTimeIncrease
          },
          recommendations: [
            'Identify bottlenecks in the workflow',
            'Review handoff processes between stages',
            'Check for increased complexity in recent work',
            'Ensure proper prioritization is happening'
          ],
          affectedItems: this.findSlowMovingIssues(current.issues.inProgress)
        });
      }
    }

    // Blockage anomaly
    if (this.config.anomalyTypes.includes(AnomalyType.BLOCKAGE_INCREASE)) {
      if (current.blockageRate > this.config.thresholds.blockageRate) {
        anomalies.push({
          type: AnomalyType.BLOCKAGE_INCREASE,
          severity: current.blockageRate > 30 ? 'high' : 'medium',
          description: `${Math.round(current.blockageRate)}% of issues are blocked`,
          metrics: {
            blockageRate: current.blockageRate,
            blockedCount: current.issues.blocked.length,
            threshold: this.config.thresholds.blockageRate
          },
          recommendations: [
            'Schedule dependency resolution meeting',
            'Escalate external blockers',
            'Review team communication practices',
            'Consider re-prioritizing blocked work'
          ],
          affectedItems: current.issues.blocked
        });
      }
    }

    // WIP violation
    if (this.config.anomalyTypes.includes(AnomalyType.WIP_VIOLATION)) {
      const teamSize = await this.getTeamSize(team.id);
      const wipLimit = teamSize * 3; // Assume 3 items per person
      const wipExcess = ((current.wipCount - wipLimit) / wipLimit) * 100;
      
      if (wipExcess > this.config.thresholds.wipExcess) {
        anomalies.push({
          type: AnomalyType.WIP_VIOLATION,
          severity: 'medium',
          description: `WIP is ${Math.round(wipExcess)}% over recommended limit`,
          metrics: {
            currentWIP: current.wipCount,
            wipLimit,
            excessPercentage: wipExcess
          },
          recommendations: [
            'Focus on completing in-progress work',
            'Stop starting new work until WIP reduces',
            'Review if all items are actively being worked',
            'Consider if some items should be put on hold'
          ],
          affectedItems: current.issues.inProgress
        });
      }
    }

    // Stale issues
    if (this.config.anomalyTypes.includes(AnomalyType.STALE_ISSUES)) {
      const staleIssues = this.findStaleIssues(current.issues.all);
      if (staleIssues.length > 0) {
        anomalies.push({
          type: AnomalyType.STALE_ISSUES,
          severity: 'low',
          description: `${staleIssues.length} issues have been stale for >14 days`,
          metrics: {
            staleCount: staleIssues.length,
            oldestStaleDays: this.getOldestStaleDays(staleIssues)
          },
          recommendations: [
            'Review and close outdated issues',
            'Re-prioritize or reassign stale work',
            'Update issue statuses to reflect reality',
            'Consider if work is still relevant'
          ],
          affectedItems: staleIssues
        });
      }
    }

    // Assignment imbalance
    if (this.config.anomalyTypes.includes(AnomalyType.ASSIGNMENT_IMBALANCE)) {
      const imbalance = this.detectAssignmentImbalance(current.memberWorkloads);
      if (imbalance) {
        anomalies.push({
          type: AnomalyType.ASSIGNMENT_IMBALANCE,
          severity: imbalance.severity,
          description: imbalance.description,
          metrics: imbalance.metrics,
          recommendations: [
            'Redistribute work more evenly',
            'Check team member availability',
            'Review skill matching for assignments',
            'Consider pairing for knowledge sharing'
          ],
          affectedItems: []
        });
      }
    }

    // Priority neglect
    if (this.config.anomalyTypes.includes(AnomalyType.PRIORITY_NEGLECT)) {
      const neglectedPriorities = this.findNeglectedPriorities(current.issues.all);
      if (neglectedPriorities.length > 0) {
        anomalies.push({
          type: AnomalyType.PRIORITY_NEGLECT,
          severity: 'medium',
          description: `${neglectedPriorities.length} high priority issues are not in progress`,
          metrics: {
            neglectedCount: neglectedPriorities.length,
            oldestDays: this.getOldestDays(neglectedPriorities)
          },
          recommendations: [
            'Review and start high priority work',
            'Ensure priority labels are accurate',
            'Consider stopping lower priority work',
            'Communicate priority changes to team'
          ],
          affectedItems: neglectedPriorities
        });
      }
    }

    // Estimation drift
    if (this.config.anomalyTypes.includes(AnomalyType.ESTIMATION_DRIFT)) {
      if (current.avgEstimationVariance > this.config.thresholds.estimationAccuracy) {
        anomalies.push({
          type: AnomalyType.ESTIMATION_DRIFT,
          severity: current.avgEstimationVariance > 60 ? 'medium' : 'low',
          description: `Estimation accuracy is off by ${Math.round(current.avgEstimationVariance)}%`,
          metrics: {
            variancePercentage: current.avgEstimationVariance,
            threshold: this.config.thresholds.estimationAccuracy
          },
          recommendations: [
            'Review estimation practices',
            'Consider story point recalibration',
            'Break down large stories earlier',
            'Track actual vs estimated regularly'
          ],
          affectedItems: []
        });
      }
    }

    return anomalies;
  }

  /**
   * Generate anomaly report
   */
  private generateAnomalyReport(team: any, anomalies: Anomaly[]): string {
    const criticalCount = anomalies.filter(a => a.severity === 'high').length;
    const title = criticalCount > 0 
      ? `🚨 Critical Anomalies Detected` 
      : `⚠️ Anomalies Detected`;

    const anomalyDetails = anomalies
      .sort((a, b) => this.getSeverityScore(b.severity) - this.getSeverityScore(a.severity))
      .map((anomaly, i) => this.formatAnomaly(anomaly, i + 1))
      .join('\n\n');

    return `# ${title}: ${team.name}
*Analysis Date: ${new Date().toLocaleDateString()}*

## 📊 Summary
- **Total Anomalies**: ${anomalies.length}
- **Critical**: ${anomalies.filter(a => a.severity === 'high').length}
- **Warning**: ${anomalies.filter(a => a.severity === 'medium').length}
- **Info**: ${anomalies.filter(a => a.severity === 'low').length}

## 🔍 Detected Anomalies

${anomalyDetails}

## 🎯 Recommended Actions

### Immediate (Critical)
${this.getImmediateActions(anomalies)}

### Short-term (This Week)
${this.getShortTermActions(anomalies)}

### Process Improvements
${this.getProcessImprovements(anomalies)}

## 📈 Trend Analysis
${this.generateTrendAnalysis(anomalies)}

---
*Automated anomaly detection by @saafepulse | Sensitivity: ${this.config.sensitivityLevel}*`;
  }

  /**
   * Format individual anomaly
   */
  private formatAnomaly(anomaly: Anomaly, index: number): string {
    const severityIcon = {
      high: '🔴',
      medium: '🟡',
      low: '🔵'
    }[anomaly.severity];

    const typeLabel = this.getAnomalyTypeLabel(anomaly.type);
    
    return `### ${index}. ${severityIcon} ${typeLabel}
**Description**: ${anomaly.description}

**Metrics**:
${Object.entries(anomaly.metrics).map(([key, value]) => 
  `- ${this.formatMetricKey(key)}: ${this.formatMetricValue(value)}`
).join('\n')}

**Recommendations**:
${anomaly.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

**Affected Items**: ${anomaly.affectedItems.length} issues`;
  }

  /**
   * Post anomaly report
   */
  private async postAnomalyReport(
    teamId: string,
    report: string,
    anomalies: Anomaly[]
  ): Promise<BehaviorAction> {
    try {
      // Find or create anomaly tracking issue
      const trackingIssue = await this.findOrCreateAnomalyIssue(teamId);
      
      await this.linearClient.createComment(trackingIssue.id, report);
      
      return {
        type: 'analysis',
        target: trackingIssue.id,
        description: `Posted anomaly report with ${anomalies.length} findings`,
        result: 'success',
        data: { 
          anomalies,
          criticalCount: anomalies.filter(a => a.severity === 'high').length
        }
      };
    } catch (error) {
      return {
        type: 'analysis',
        target: teamId,
        description: 'Failed to post anomaly report',
        result: 'failed',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Take corrective actions for critical anomalies
   */
  private async takeCorrectiveActions(team: any, anomalies: Anomaly[]): Promise<BehaviorAction[]> {
    const actions: BehaviorAction[] = [];
    const criticalAnomalies = anomalies.filter(a => a.severity === 'high');

    for (const anomaly of criticalAnomalies) {
      switch (anomaly.type) {
        case AnomalyType.BLOCKAGE_INCREASE:
          // Auto-escalate blockers
          for (const blockedIssue of anomaly.affectedItems.slice(0, 3)) {
            try {
              await this.linearClient.updateIssue({
                id: blockedIssue.id,
                priority: Math.max(1, (blockedIssue.priority || 3) - 1) // Increase priority
              });
              
              actions.push({
                type: 'update',
                target: blockedIssue.id,
                description: 'Escalated blocked issue priority',
                result: 'success'
              });
            } catch (error) {
              logger.error('Failed to escalate blocked issue', { issueId: blockedIssue.id });
            }
          }
          break;

        case AnomalyType.WIP_VIOLATION:
          // Add WIP limit warning
          try {
            const message = `⚠️ **WIP Limit Exceeded**\n\nThe team currently has ${anomaly.metrics.currentWIP} items in progress, exceeding the recommended limit of ${anomaly.metrics.wipLimit}.\n\nPlease focus on completing existing work before starting new items.`;
            
            // Post to team channel or issue
            const teamIssue = await this.findOrCreateTeamIssue(team.id, 'team-updates');
            await this.linearClient.createComment(teamIssue.id, message);
            
            actions.push({
              type: 'notify',
              target: team.id,
              description: 'Posted WIP limit warning',
              result: 'success'
            });
          } catch (error) {
            logger.error('Failed to post WIP warning', { teamId: team.id });
          }
          break;
      }
    }

    return actions;
  }

  /**
   * Helper methods
   */
  private adjustThresholdsForSensitivity(): void {
    const multiplier = {
      low: 1.5,
      medium: 1.0,
      high: 0.7
    }[this.config.sensitivityLevel];

    Object.keys(this.config.thresholds).forEach(key => {
      this.config.thresholds[key as keyof typeof this.config.thresholds] *= multiplier;
    });
  }

  private async getAllTeams(): Promise<any[]> {
    const teams = await this.linearClient.getTeams();
    return teams.nodes;
  }

  private async calculateMemberWorkloads(issues: any[]): Promise<Map<string, number>> {
    const workloads = new Map<string, number>();
    
    for (const issue of issues) {
      const assigneeId = issue.assignee?.id;
      if (assigneeId) {
        const current = workloads.get(assigneeId) || 0;
        workloads.set(assigneeId, current + (issue.estimate || 1));
      }
    }
    
    return workloads;
  }

  private findSlowMovingIssues(issues: any[]): any[] {
    return issues.filter(issue => {
      if (!issue.startedAt) return false;
      const daysInProgress = (Date.now() - new Date(issue.startedAt).getTime()) / (1000 * 60 * 60 * 24);
      const expectedDays = issue.estimate || 3;
      return daysInProgress > expectedDays * 2; // 2x expected time
    });
  }

  private findStaleIssues(issues: any[]): any[] {
    const staleDays = 14;
    return issues.filter(issue => {
      const lastUpdate = new Date(issue.updatedAt);
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > staleDays && 
             !['Done', 'Canceled'].includes(issue.state?.name);
    });
  }

  private getOldestStaleDays(issues: any[]): number {
    if (issues.length === 0) return 0;
    
    const oldestUpdate = Math.min(...issues.map(i => 
      new Date(i.updatedAt).getTime()
    ));
    
    return Math.round((Date.now() - oldestUpdate) / (1000 * 60 * 60 * 24));
  }

  private detectAssignmentImbalance(workloads: Map<string, number>): any | null {
    if (workloads.size < 2) return null;
    
    const loads = Array.from(workloads.values());
    const avg = loads.reduce((a, b) => a + b, 0) / loads.length;
    const max = Math.max(...loads);
    const min = Math.min(...loads);
    
    const imbalanceRatio = max / Math.max(1, min);
    
    if (imbalanceRatio > 3) {
      return {
        severity: imbalanceRatio > 5 ? 'high' : 'medium',
        description: `Work distribution is uneven (${Math.round(imbalanceRatio)}:1 ratio)`,
        metrics: {
          highestLoad: max,
          lowestLoad: min,
          average: avg,
          imbalanceRatio
        }
      };
    }
    
    return null;
  }

  private findNeglectedPriorities(issues: any[]): any[] {
    return issues.filter(issue => 
      issue.priority <= 2 && // High or Urgent
      !['In Progress', 'In Review', 'Done'].includes(issue.state?.name) &&
      this.getDaysSinceCreated(issue) > 3
    );
  }

  private getDaysSinceCreated(issue: any): number {
    return (Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  }

  private getOldestDays(issues: any[]): number {
    if (issues.length === 0) return 0;
    
    const oldest = Math.min(...issues.map(i => 
      new Date(i.createdAt).getTime()
    ));
    
    return Math.round((Date.now() - oldest) / (1000 * 60 * 60 * 24));
  }

  private async getTeamSize(teamId: string): Promise<number> {
    // Simplified - would need to get actual team members
    return 5; // Default team size
  }

  private updateHistoricalData(teamId: string, currentMetrics: any): void {
    // Update rolling averages
    const existing = this.historicalData.get(teamId);
    if (existing) {
      // Simple exponential moving average
      const alpha = 0.1; // Smoothing factor
      existing.averageVelocity = alpha * currentMetrics.velocity + (1 - alpha) * existing.averageVelocity;
      existing.averageCycleTime = alpha * currentMetrics.avgCycleTime + (1 - alpha) * existing.averageCycleTime;
      existing.averageBlockageRate = alpha * currentMetrics.blockageRate + (1 - alpha) * existing.averageBlockageRate;
    }
  }

  private async findOrCreateAnomalyIssue(teamId: string): Promise<any> {
    const title = '🔍 Anomaly Detection Reports';
    
    const issues = await this.linearClient.getIssues({
      filter: {
        team: { id: { eq: teamId } },
        title: { contains: title },
        labels: { some: { name: { eq: 'anomaly-detection' } } }
      }
    });

    if (issues.nodes.length > 0) {
      return issues.nodes[0];
    }

    return await this.linearClient.createIssue({
      teamId,
      title,
      description: 'Automated anomaly detection reports and alerts',
      labelIds: [] // Would need to fetch label IDs
    });
  }

  private async findOrCreateTeamIssue(teamId: string, type: string): Promise<any> {
    // Simplified - would implement proper team issue lookup
    return await this.linearClient.createIssue({
      teamId,
      title: `Team ${type}`,
      description: `Team ${type} and notifications`
    });
  }

  private getSeverityScore(severity: string): number {
    return { high: 3, medium: 2, low: 1 }[severity] || 0;
  }

  private getAnomalyTypeLabel(type: AnomalyType): string {
    const labels = {
      [AnomalyType.VELOCITY_DROP]: 'Velocity Drop',
      [AnomalyType.CYCLE_TIME_SPIKE]: 'Cycle Time Spike',
      [AnomalyType.ESTIMATION_DRIFT]: 'Estimation Drift',
      [AnomalyType.BLOCKAGE_INCREASE]: 'High Blockage Rate',
      [AnomalyType.WIP_VIOLATION]: 'WIP Limit Violation',
      [AnomalyType.STALE_ISSUES]: 'Stale Issues',
      [AnomalyType.ASSIGNMENT_IMBALANCE]: 'Assignment Imbalance',
      [AnomalyType.PRIORITY_NEGLECT]: 'Priority Neglect'
    };
    return labels[type] || type;
  }

  private formatMetricKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private formatMetricValue(value: any): string {
    if (typeof value === 'number') {
      return value % 1 === 0 ? value.toString() : value.toFixed(2);
    }
    return String(value);
  }

  private getImmediateActions(anomalies: Anomaly[]): string {
    const critical = anomalies.filter(a => a.severity === 'high');
    if (critical.length === 0) return 'No critical actions required';
    
    const actions = new Set<string>();
    critical.forEach(a => {
      if (a.type === AnomalyType.BLOCKAGE_INCREASE) {
        actions.add('- Schedule emergency blocker resolution meeting');
      }
      if (a.type === AnomalyType.VELOCITY_DROP) {
        actions.add('- Review team capacity and impediments');
      }
      if (a.type === AnomalyType.CYCLE_TIME_SPIKE) {
        actions.add('- Identify and address workflow bottlenecks');
      }
    });
    
    return Array.from(actions).join('\n');
  }

  private getShortTermActions(anomalies: Anomaly[]): string {
    const actions = new Set<string>();
    
    anomalies.forEach(a => {
      if (a.type === AnomalyType.STALE_ISSUES) {
        actions.add('- Review and clean up stale issues');
      }
      if (a.type === AnomalyType.ASSIGNMENT_IMBALANCE) {
        actions.add('- Rebalance team workload');
      }
      if (a.type === AnomalyType.PRIORITY_NEGLECT) {
        actions.add('- Reprioritize backlog based on business value');
      }
    });
    
    return Array.from(actions).join('\n') || '- Continue monitoring metrics';
  }

  private getProcessImprovements(anomalies: Anomaly[]): string {
    const improvements = new Set<string>();
    
    anomalies.forEach(a => {
      if (a.type === AnomalyType.ESTIMATION_DRIFT) {
        improvements.add('- Implement estimation refinement sessions');
      }
      if (a.type === AnomalyType.WIP_VIOLATION) {
        improvements.add('- Establish and enforce WIP limits');
      }
      if (a.recommendations.length > 0) {
        improvements.add('- Review and implement behavior recommendations');
      }
    });
    
    return Array.from(improvements).join('\n') || '- Maintain current processes';
  }

  private generateTrendAnalysis(anomalies: Anomaly[]): string {
    const trends = [];
    
    if (anomalies.some(a => a.type === AnomalyType.VELOCITY_DROP)) {
      trends.push('📉 Declining team velocity requires attention');
    }
    if (anomalies.some(a => a.type === AnomalyType.CYCLE_TIME_SPIKE)) {
      trends.push('⏱️ Increasing cycle times indicate process friction');
    }
    if (anomalies.filter(a => a.severity === 'high').length > 2) {
      trends.push('🚨 Multiple critical anomalies suggest systemic issues');
    }
    
    return trends.join('\n') || '📊 Metrics within normal ranges';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnomalyDetectionConfig>): void {
    this.config = { ...this.config, ...config };
    this.adjustThresholdsForSensitivity();
    logger.info('Anomaly detection configuration updated', { config: this.config });
  }
}