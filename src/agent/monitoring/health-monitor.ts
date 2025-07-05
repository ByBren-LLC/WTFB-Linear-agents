/**
 * Health Monitor for Autonomous Behaviors (LIN-59)
 * 
 * Tracks behavior execution health and provides metrics.
 */

import { 
  BehaviorHealthStatus, 
  BehaviorMetrics 
} from '../types/autonomous-types';
import * as logger from '../../utils/logger';

interface ExecutionRecord {
  behaviorId: string;
  success: boolean;
  executionTime: number;
  timestamp: Date;
  error?: string;
}

/**
 * Monitors health of autonomous behaviors
 */
export class HealthMonitor {
  private executionHistory: ExecutionRecord[] = [];
  private behaviorStats: Map<string, {
    totalExecutions: number;
    successCount: number;
    totalTime: number;
    lastSuccess?: Date;
    lastFailure?: Date;
    recentErrors: string[];
  }> = new Map();
  
  private monitoringInterval?: NodeJS.Timeout;
  private readonly MAX_HISTORY_SIZE = 10000;
  private readonly RECENT_ERROR_LIMIT = 10;

  /**
   * Start monitoring
   */
  async startMonitoring(): Promise<void> {
    logger.info('Starting behavior health monitoring');
    
    // Clean up old records every hour
    this.monitoringInterval = setInterval(() => {
      this.cleanupOldRecords();
    }, 3600000); // 1 hour
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    logger.info('Stopping behavior health monitoring');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Record a behavior execution
   */
  recordExecution(
    behaviorId: string, 
    success: boolean, 
    executionTime: number,
    error?: string
  ): void {
    const record: ExecutionRecord = {
      behaviorId,
      success,
      executionTime,
      timestamp: new Date(),
      error
    };

    this.executionHistory.push(record);
    this.updateStats(record);

    // Trim history if too large
    if (this.executionHistory.length > this.MAX_HISTORY_SIZE) {
      this.executionHistory = this.executionHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  /**
   * Update behavior statistics
   */
  private updateStats(record: ExecutionRecord): void {
    let stats = this.behaviorStats.get(record.behaviorId);
    
    if (!stats) {
      stats = {
        totalExecutions: 0,
        successCount: 0,
        totalTime: 0,
        recentErrors: []
      };
      this.behaviorStats.set(record.behaviorId, stats);
    }

    stats.totalExecutions++;
    stats.totalTime += record.executionTime;
    
    if (record.success) {
      stats.successCount++;
      stats.lastSuccess = record.timestamp;
    } else {
      stats.lastFailure = record.timestamp;
      if (record.error) {
        stats.recentErrors.push(record.error);
        // Keep only recent errors
        if (stats.recentErrors.length > this.RECENT_ERROR_LIMIT) {
          stats.recentErrors = stats.recentErrors.slice(-this.RECENT_ERROR_LIMIT);
        }
      }
    }
  }

  /**
   * Get health status for a behavior
   */
  async getBehaviorHealth(behaviorId: string): Promise<BehaviorHealthStatus> {
    const stats = this.behaviorStats.get(behaviorId);
    
    if (!stats || stats.totalExecutions === 0) {
      return {
        behaviorId,
        healthy: true, // No executions yet, assume healthy
        successRate: 1.0,
        avgExecutionTime: 0,
        totalExecutions: 0,
        issues: []
      };
    }

    const successRate = stats.successCount / stats.totalExecutions;
    const avgExecutionTime = stats.totalTime / stats.totalExecutions;
    const issues: string[] = [];

    // Check for health issues
    if (successRate < 0.8) {
      issues.push(`Low success rate: ${(successRate * 100).toFixed(1)}%`);
    }

    if (stats.lastFailure && (!stats.lastSuccess || stats.lastFailure > stats.lastSuccess)) {
      issues.push('Last execution failed');
    }

    if (avgExecutionTime > 5000) {
      issues.push(`Slow execution: ${avgExecutionTime.toFixed(0)}ms average`);
    }

    // Check for recent repeated errors
    if (stats.recentErrors.length > 5) {
      const errorCounts = stats.recentErrors.reduce((acc, error) => {
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(errorCounts).forEach(([error, count]) => {
        if (count >= 3) {
          issues.push(`Repeated error: "${error}" (${count} times)`);
        }
      });
    }

    return {
      behaviorId,
      healthy: issues.length === 0,
      lastSuccess: stats.lastSuccess,
      lastFailure: stats.lastFailure,
      successRate,
      avgExecutionTime,
      totalExecutions: stats.totalExecutions,
      issues
    };
  }

  /**
   * Get overall metrics
   */
  getMetrics(startDate?: Date, endDate?: Date): BehaviorMetrics {
    const start = startDate || new Date(Date.now() - 24 * 3600000); // Default: last 24 hours
    const end = endDate || new Date();

    // Filter executions within time range
    const relevantExecutions = this.executionHistory.filter(
      record => record.timestamp >= start && record.timestamp <= end
    );

    // Calculate metrics
    const totalExecutions = relevantExecutions.length;
    const successfulExecutions = relevantExecutions.filter(r => r.success).length;
    const failedExecutions = totalExecutions - successfulExecutions;
    
    const avgExecutionTime = totalExecutions > 0
      ? relevantExecutions.reduce((sum, r) => sum + r.executionTime, 0) / totalExecutions
      : 0;

    // Count by behavior type
    const byType: Record<string, number> = {};
    relevantExecutions.forEach(record => {
      byType[record.behaviorId] = (byType[record.behaviorId] || 0) + 1;
    });

    // Count actions (simplified - in real implementation, would parse from execution results)
    const actionsTaken: Record<string, number> = {
      comment: 0,
      status_change: 0,
      notification: 0,
      analysis: 0,
      suggestion: 0
    };

    // Count notifications (simplified)
    const notificationsSent = relevantExecutions.filter(r => 
      r.behaviorId.includes('monitoring') || r.behaviorId.includes('alert')
    ).length;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      avgExecutionTime,
      byType,
      actionsTaken,
      notificationsSent,
      period: { start, end }
    };
  }

  /**
   * Clean up old execution records
   */
  private cleanupOldRecords(): void {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 3600000); // 7 days
    const oldCount = this.executionHistory.length;
    
    this.executionHistory = this.executionHistory.filter(
      record => record.timestamp > cutoffDate
    );

    const removed = oldCount - this.executionHistory.length;
    if (removed > 0) {
      logger.info('Cleaned up old execution records', { removed });
    }
  }

  /**
   * Get recent executions for a behavior
   */
  getRecentExecutions(behaviorId: string, limit: number = 10): ExecutionRecord[] {
    return this.executionHistory
      .filter(record => record.behaviorId === behaviorId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Check if behavior is healthy
   */
  async isBehaviorHealthy(behaviorId: string): Promise<boolean> {
    const health = await this.getBehaviorHealth(behaviorId);
    return health.healthy;
  }

  /**
   * Get all behavior health statuses
   */
  async getAllBehaviorHealth(): Promise<BehaviorHealthStatus[]> {
    const statuses: BehaviorHealthStatus[] = [];
    
    for (const behaviorId of this.behaviorStats.keys()) {
      const status = await this.getBehaviorHealth(behaviorId);
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Reset statistics for a behavior
   */
  resetBehaviorStats(behaviorId: string): void {
    this.behaviorStats.delete(behaviorId);
    this.executionHistory = this.executionHistory.filter(
      record => record.behaviorId !== behaviorId
    );
    
    logger.info('Reset behavior statistics', { behaviorId });
  }
}