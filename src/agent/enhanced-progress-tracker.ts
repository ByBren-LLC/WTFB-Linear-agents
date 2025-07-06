/**
 * Enhanced Progress Tracker (LIN-64)
 * 
 * Extended version of Progress Tracker with robust edge case handling,
 * configurable business rules, and improved error handling.
 */

import { ProgressTracker } from './progress-tracker';
import { ProgressTrackerConfig, createDefaultConfig, validateConfig } from './progress-config';
import { LinearClientWrapper } from '../linear/client';
import { ResponseTemplateEngine } from './response-template-engine';
import * as logger from '../utils/logger';

/**
 * Work item interface for progress calculation
 */
export interface WorkItem {
  id: string;
  title: string;
  storyPoints: number;
  state: 'Todo' | 'In Progress' | 'Done' | 'Canceled';
  type: 'Story' | 'Enabler' | 'Epic' | 'Feature';
  parentEpicId?: string;
  dependencies?: string[];
  movedFromIteration?: boolean;
  subtasks?: WorkItem[];
}

/**
 * Progress calculation result
 */
export interface ProgressResult {
  percentage: number;
  weightedPercentage: number;
  completedPoints: number;
  totalPoints: number;
  readinessLevel: 'critical' | 'warning' | 'good' | 'excellent';
  alerts: ProgressAlert[];
  businessRulesApplied: string[];
  edgeCasesHandled: string[];
}

/**
 * Progress alert
 */
export interface ProgressAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  threshold?: number;
  actual?: number;
  recommendation?: string;
}

/**
 * Enhanced Progress Tracker with business logic refinements
 */
export class EnhancedProgressTracker extends ProgressTracker {
  private config: ProgressTrackerConfig;
  private appliedRules: Set<string> = new Set();
  private handledEdgeCases: Set<string> = new Set();
  
  constructor(
    linearClient: LinearClientWrapper,
    templateEngine: ResponseTemplateEngine,
    config?: Partial<ProgressTrackerConfig>
  ) {
    super(linearClient, templateEngine);
    
    // Merge with defaults and validate
    this.config = { ...createDefaultConfig(process.env.NODE_ENV), ...config };
    const validation = validateConfig(this.config);
    
    if (!validation.valid) {
      logger.error('Invalid Progress Tracker configuration', { errors: validation.errors });
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
  }
  
  /**
   * Calculate progress with edge case handling
   */
  async calculateProgressWithEdgeCases(workItems: WorkItem[]): Promise<ProgressResult> {
    this.resetTracking();
    
    // Handle empty work items
    if (workItems.length === 0) {
      this.handledEdgeCases.add('empty-work-items');
      return this.createEmptyProgressResult();
    }
    
    // Pre-process work items for edge cases
    const processedItems = this.preprocessWorkItems(workItems);
    
    // Calculate base progress
    const baseProgress = this.calculateBaseProgress(processedItems);
    
    // Apply business rules
    const adjustedProgress = this.applyBusinessRules(baseProgress, processedItems);
    
    // Generate alerts based on thresholds
    const alerts = this.generateAlerts(adjustedProgress, processedItems);
    
    // Determine readiness level
    const readinessLevel = this.determineReadinessLevel(adjustedProgress.percentage);
    
    const result: ProgressResult = {
      ...adjustedProgress,
      readinessLevel,
      alerts,
      businessRulesApplied: Array.from(this.appliedRules),
      edgeCasesHandled: Array.from(this.handledEdgeCases)
    };

    // Log business decisions if enabled
    if (this.config.monitoring.logBusinessRuleDecisions) {
      this.logBusinessDecisions(result);
    }
    
    return result;
  }
  
  /**
   * Pre-process work items to handle edge cases
   */
  private preprocessWorkItems(items: WorkItem[]): WorkItem[] {
    return items.map(item => {
      const processed = { ...item };
      
      // Handle 0-point stories
      if (item.storyPoints === 0) {
        this.handledEdgeCases.add('zero-point-story');
        processed.storyPoints = this.config.progressCalculation.zeroPointStoryWeight;
        logger.debug('Applied zero-point story weight', { 
          itemId: item.id, 
          weight: processed.storyPoints 
        });
      }
      
      // Apply enabler multiplier
      if (item.type === 'Enabler') {
        this.appliedRules.add('enabler-multiplier');
        processed.storyPoints *= this.config.progressCalculation.enablerStoryMultiplier;
      }
      
      // Handle moved stories
      if (item.movedFromIteration && !this.config.progressCalculation.includeMovedStories) {
        this.handledEdgeCases.add('moved-story-excluded');
        processed.storyPoints = 0; // Exclude from calculation
      }
      
      return processed;
    });
  }
  
  /**
   * Calculate base progress
   */
  private calculateBaseProgress(items: WorkItem[]): Omit<ProgressResult, 'readinessLevel' | 'alerts' | 'businessRulesApplied' | 'edgeCasesHandled'> {
    const totalPoints = items.reduce((sum, item) => sum + item.storyPoints, 0);
    const completedPoints = items
      .filter(item => item.state === 'Done')
      .reduce((sum, item) => sum + item.storyPoints, 0);
    
    // Handle division by zero
    if (totalPoints === 0) {
      this.handledEdgeCases.add('zero-total-points');
      return {
        percentage: 0,
        weightedPercentage: 0,
        completedPoints: 0,
        totalPoints: 0
      };
    }
    
    const percentage = Math.round((completedPoints / totalPoints) * 100);
    
    // Calculate weighted percentage based on epic progress strategy
    const weightedPercentage = this.calculateWeightedProgress(items, completedPoints, totalPoints);
    
    return {
      percentage,
      weightedPercentage,
      completedPoints,
      totalPoints
    };
  }
  
  /**
   * Calculate weighted progress based on strategy
   */
  private calculateWeightedProgress(items: WorkItem[], completedPoints: number, totalPoints: number): number {
    const strategy = this.config.progressCalculation.parentEpicProgressStrategy;
    
    switch (strategy) {
      case 'simple':
        return Math.round((completedPoints / totalPoints) * 100);
        
      case 'weighted':
        // Weight by story size (larger stories have more impact)
        this.appliedRules.add('weighted-progress-calculation');
        const weightedComplete = items
          .filter(item => item.state === 'Done')
          .reduce((sum, item) => sum + (item.storyPoints * item.storyPoints), 0);
        const weightedTotal = items
          .reduce((sum, item) => sum + (item.storyPoints * item.storyPoints), 0);
        return weightedTotal > 0 ? Math.round((weightedComplete / weightedTotal) * 100) : 0;
        
      case 'milestone':
        // Progress based on epic/feature completion
        this.appliedRules.add('milestone-progress-calculation');
        const epics = items.filter(item => item.type === 'Epic' || item.type === 'Feature');
        const completedEpics = epics.filter(item => item.state === 'Done');
        return epics.length > 0 ? Math.round((completedEpics.length / epics.length) * 100) : 0;
        
      default:
        return Math.round((completedPoints / totalPoints) * 100);
    }
  }
  
  /**
   * Apply business rules to progress calculation
   */
  private applyBusinessRules(
    progress: Omit<ProgressResult, 'readinessLevel' | 'alerts' | 'businessRulesApplied' | 'edgeCasesHandled'>,
    items: WorkItem[]
  ): Omit<ProgressResult, 'readinessLevel' | 'alerts' | 'businessRulesApplied' | 'edgeCasesHandled'> {
    let adjustedProgress = { ...progress };
    
    // Check for incomplete dependencies
    if (this.config.stateTransition.requireDependencyCompletion) {
      const incompleteDependencies = this.checkIncompleteDependencies(items);
      if (incompleteDependencies.length > 0) {
        this.appliedRules.add('dependency-completion-required');
        this.handledEdgeCases.add('incomplete-dependencies');
        // Cap progress at 90% if dependencies are incomplete
        adjustedProgress.percentage = Math.min(adjustedProgress.percentage, 90);
        adjustedProgress.weightedPercentage = Math.min(adjustedProgress.weightedPercentage, 90);
      }
    }
    
    // Check for partial epic completion
    if (!this.config.stateTransition.allowPartialEpicCompletion) {
      const partialEpics = this.checkPartialEpicCompletion(items);
      if (partialEpics.length > 0) {
        this.appliedRules.add('partial-epic-completion-blocked');
        this.handledEdgeCases.add('partial-epic-completion');
        // Adjust progress based on incomplete epics
        const epicPenalty = partialEpics.length * 5; // 5% penalty per partial epic
        adjustedProgress.percentage = Math.max(0, adjustedProgress.percentage - epicPenalty);
        adjustedProgress.weightedPercentage = Math.max(0, adjustedProgress.weightedPercentage - epicPenalty);
      }
    }
    
    return adjustedProgress;
  }
  
  /**
   * Check for incomplete dependencies
   */
  private checkIncompleteDependencies(items: WorkItem[]): WorkItem[] {
    const itemMap = new Map(items.map(item => [item.id, item]));
    const incomplete: WorkItem[] = [];
    
    for (const item of items) {
      if (item.state === 'Done' && item.dependencies) {
        for (const depId of item.dependencies) {
          const dep = itemMap.get(depId);
          if (dep && dep.state !== 'Done') {
            incomplete.push(item);
            break;
          }
        }
      }
    }
    
    return incomplete;
  }
  
  /**
   * Check for partial epic completion
   */
  private checkPartialEpicCompletion(items: WorkItem[]): WorkItem[] {
    const epics = items.filter(item => item.type === 'Epic');
    const partialEpics: WorkItem[] = [];
    
    for (const epic of epics) {
      if (epic.state === 'Done') {
        const children = items.filter(item => item.parentEpicId === epic.id);
        const incompleteChildren = children.filter(item => item.state !== 'Done' && item.state !== 'Canceled');
        
        if (incompleteChildren.length > 0) {
          partialEpics.push(epic);
        }
      }
    }
    
    return partialEpics;
  }
  
  /**
   * Generate alerts based on thresholds
   */
  private generateAlerts(progress: Omit<ProgressResult, 'readinessLevel' | 'alerts' | 'businessRulesApplied' | 'edgeCasesHandled'>, items: WorkItem[]): ProgressAlert[] {
    const alerts: ProgressAlert[] = [];
    
    // ART readiness alerts
    if (progress.percentage < this.config.thresholds.artReadinessCritical) {
      alerts.push({
        type: 'critical',
        message: 'ART readiness is critically low',
        threshold: this.config.thresholds.artReadinessCritical,
        actual: progress.percentage,
        recommendation: 'Immediate action required to improve PI planning readiness'
      });
    } else if (progress.percentage < this.config.thresholds.artReadinessWarning) {
      alerts.push({
        type: 'warning',
        message: 'ART readiness is below target',
        threshold: this.config.thresholds.artReadinessWarning,
        actual: progress.percentage,
        recommendation: 'Review and prioritize remaining work items'
      });
    }
    
    // Capacity utilization alerts
    const utilizationRate = this.calculateCapacityUtilization(items);
    if (utilizationRate > this.config.thresholds.capacityUtilizationMax) {
      alerts.push({
        type: 'warning',
        message: 'Team capacity is over-utilized',
        threshold: this.config.thresholds.capacityUtilizationMax,
        actual: utilizationRate,
        recommendation: 'Consider redistributing work or adjusting commitments'
      });
    } else if (utilizationRate < this.config.thresholds.capacityUtilizationMin) {
      alerts.push({
        type: 'info',
        message: 'Team capacity is under-utilized',
        threshold: this.config.thresholds.capacityUtilizationMin,
        actual: utilizationRate,
        recommendation: 'Consider taking on additional work items'
      });
    }
    
    // Progress variance alert
    const variance = Math.abs(progress.percentage - progress.weightedPercentage);
    if (variance > this.config.thresholds.progressVarianceThreshold) {
      alerts.push({
        type: 'warning',
        message: 'High variance between simple and weighted progress',
        threshold: this.config.thresholds.progressVarianceThreshold,
        actual: variance,
        recommendation: 'Review story point estimates and work distribution'
      });
    }
    
    return alerts;
  }
  
  /**
   * Calculate capacity utilization
   */
  private calculateCapacityUtilization(items: WorkItem[]): number {
    const inProgressPoints = items
      .filter(item => item.state === 'In Progress')
      .reduce((sum, item) => sum + item.storyPoints, 0);
    
    const totalActivePoints = items
      .filter(item => item.state !== 'Canceled')
      .reduce((sum, item) => sum + item.storyPoints, 0);
    
    return totalActivePoints > 0 ? Math.round((inProgressPoints / totalActivePoints) * 100) : 0;
  }
  
  /**
   * Determine readiness level based on percentage
   */
  private determineReadinessLevel(percentage: number): ProgressResult['readinessLevel'] {
    if (percentage >= 95) return 'excellent';
    if (percentage >= this.config.thresholds.artReadinessWarning) return 'good';
    if (percentage >= this.config.thresholds.artReadinessCritical) return 'warning';
    return 'critical';
  }
  
  /**
   * Create empty progress result
   */
  private createEmptyProgressResult(): ProgressResult {
    return {
      percentage: 0,
      weightedPercentage: 0,
      completedPoints: 0,
      totalPoints: 0,
      readinessLevel: 'critical',
      alerts: [{
        type: 'info',
        message: 'No work items to track',
        recommendation: 'Add work items to begin tracking progress'
      }],
      businessRulesApplied: Array.from(this.appliedRules),
      edgeCasesHandled: Array.from(this.handledEdgeCases)
    };
  }
  
  /**
   * Log business decisions
   */
  private logBusinessDecisions(progress: ProgressResult): void {
    logger.info('Progress calculation completed', {
      percentage: progress.percentage,
      weightedPercentage: progress.weightedPercentage,
      readinessLevel: progress.readinessLevel,
      rulesApplied: progress.businessRulesApplied,
      edgeCasesHandled: progress.edgeCasesHandled,
      alertCount: progress.alerts.length
    });
  }
  
  /**
   * Reset tracking for new calculation
   */
  private resetTracking(): void {
    this.appliedRules.clear();
    this.handledEdgeCases.clear();
  }
  
  /**
   * Get current configuration
   */
  getConfig(): Readonly<ProgressTrackerConfig> {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ProgressTrackerConfig>): void {
    const newConfig = { ...this.config, ...updates };
    const validation = validateConfig(newConfig);
    
    if (!validation.valid) {
      throw new Error(`Invalid configuration update: ${validation.errors.join(', ')}`);
    }
    
    this.config = newConfig;
    logger.info('Progress Tracker configuration updated', { updates });
  }
}