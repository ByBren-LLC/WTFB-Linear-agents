/**
 * ART Readiness Optimizer for ART Planning (LIN-49 Phase 2)
 * 
 * Provides intelligent optimization algorithms to improve ART readiness
 * and maximize value delivery potential across iterations.
 */

import {
  ARTPlan,
  IterationPlan,
  ARTReadinessResult,
  OptimizedARTPlan,
  ImprovementPlan,
  ImprovementAction,
  RiskReductionAnalysis,
  AllocatedWorkItem,
  PlanningWorkItem,
  ARTReadinessAssessment
} from '../types/art-planning-types';
import { DependencyGraph } from '../types/dependency-types';
import * as logger from '../utils/logger';

/**
 * Optimization configuration
 */
interface OptimizationConfig {
  targetReadinessScore: number;
  maxIterationChanges: number;
  valueDeliveryWeight: number;
  riskReductionWeight: number;
  dependencyOptimizationEnabled: boolean;
}

/**
 * Default optimization configuration
 */
const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  targetReadinessScore: 0.85,
  maxIterationChanges: 5,
  valueDeliveryWeight: 0.6,
  riskReductionWeight: 0.4,
  dependencyOptimizationEnabled: true
};

/**
 * Optimizes ART readiness through intelligent rebalancing and recommendations
 */
export class ARTReadinessOptimizer {
  private config: OptimizationConfig;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
    logger.debug('ARTReadinessOptimizer initialized', {
      targetReadiness: this.config.targetReadinessScore,
      maxChanges: this.config.maxIterationChanges
    });
  }

  /**
   * Optimize ART readiness for better execution
   */
  async optimizeARTReadiness(currentPlan: ARTPlan): Promise<OptimizedARTPlan> {
    logger.debug('Optimizing ART readiness', {
      currentReadiness: currentPlan.artReadiness.readinessScore,
      iterationCount: currentPlan.iterations.length
    });

    // Analyze current state
    const currentAnalysis = this.analyzeCurrentState(currentPlan);
    
    // Generate optimization strategies
    const strategies = await this.generateOptimizationStrategies(
      currentPlan,
      currentAnalysis
    );
    
    // Apply optimizations
    const optimizedIterations = await this.applyOptimizations(
      currentPlan.iterations,
      strategies,
      currentPlan.dependencies
    );
    
    // Calculate improvements
    const improvements = this.calculateImprovements(
      currentPlan,
      optimizedIterations
    );
    
    // Assess implementation complexity
    const complexity = this.assessImplementationComplexity(strategies);

    const optimizedPlan: OptimizedARTPlan = {
      originalPlan: currentPlan,
      optimizedIterations,
      improvementActions: strategies,
      readinessScoreImprovement: improvements.readinessImprovement,
      valueDeliveryImprovement: improvements.valueImprovement,
      riskReduction: improvements.riskReduction,
      implementationComplexity: complexity
    };

    logger.info('ART readiness optimization completed', {
      originalScore: currentPlan.artReadiness.readinessScore.toFixed(2),
      improvedScore: (currentPlan.artReadiness.readinessScore + improvements.readinessImprovement).toFixed(2),
      actionCount: strategies.length,
      complexity
    });

    return optimizedPlan;
  }

  /**
   * Generate improvement plan for ART readiness
   */
  async generateReadinessImprovementPlan(
    readiness: ARTReadinessResult
  ): Promise<ImprovementPlan> {
    logger.debug('Generating readiness improvement plan', {
      currentScore: readiness.readinessScore,
      categoryCount: readiness.categoryScores.length
    });

    const prioritizedActions = this.prioritizeImprovementActions(readiness);
    const quickWins = this.identifyQuickWins(prioritizedActions);
    const strategicImprovements = this.identifyStrategicImprovements(prioritizedActions);
    
    const estimatedImprovement = this.estimateImprovementPotential(
      prioritizedActions,
      readiness.readinessScore
    );

    const plan: ImprovementPlan = {
      currentReadinessScore: readiness.readinessScore,
      targetReadinessScore: this.config.targetReadinessScore,
      prioritizedActions,
      quickWins,
      strategicImprovements,
      estimatedImprovement,
      implementationTimeline: this.createImplementationTimeline(prioritizedActions),
      resourceRequirements: this.estimateResourceRequirements(prioritizedActions),
      riskMitigation: this.createRiskMitigationPlan(readiness)
    };

    logger.info('Improvement plan generated', {
      actionCount: prioritizedActions.length,
      quickWinCount: quickWins.length,
      estimatedImprovement: estimatedImprovement.toFixed(2)
    });

    return plan;
  }

  /**
   * Rebalance iterations for optimal value delivery
   */
  async rebalanceIterationsForValue(
    iterations: IterationPlan[]
  ): Promise<IterationPlan[]> {
    logger.debug('Rebalancing iterations for value', {
      iterationCount: iterations.length
    });

    const rebalanced: IterationPlan[] = [];
    
    // Analyze value distribution
    const valueAnalysis = this.analyzeValueDistribution(iterations);
    
    // Identify rebalancing opportunities
    const opportunities = this.identifyRebalancingOpportunities(
      iterations,
      valueAnalysis
    );
    
    // Apply rebalancing
    for (let i = 0; i < iterations.length; i++) {
      const iteration = iterations[i];
      const iterationOpportunities = opportunities.filter(
        opp => opp.sourceIterationIndex === i || opp.targetIterationIndex === i
      );
      
      const rebalancedIteration = await this.rebalanceIteration(
        iteration,
        iterationOpportunities,
        iterations
      );
      
      rebalanced.push(rebalancedIteration);
    }

    logger.info('Iteration rebalancing completed', {
      originalValueScore: valueAnalysis.overallValueScore.toFixed(2),
      changesApplied: opportunities.length
    });

    return rebalanced;
  }

  /**
   * Optimize dependency flow across iterations
   */
  async optimizeDependencyFlow(plan: ARTPlan): Promise<ARTPlan> {
    logger.debug('Optimizing dependency flow', {
      dependencyCount: plan.dependencies.edges.length,
      criticalPathLength: plan.dependencies.criticalPath.length
    });

    if (!this.config.dependencyOptimizationEnabled) {
      logger.info('Dependency optimization disabled');
      return plan;
    }

    // Analyze dependency bottlenecks
    const bottlenecks = this.identifyDependencyBottlenecks(
      plan.iterations,
      plan.dependencies
    );
    
    // Generate reordering suggestions
    const reorderingSuggestions = this.generateReorderingSuggestions(
      bottlenecks,
      plan.iterations,
      plan.dependencies
    );
    
    // Apply dependency optimizations
    const optimizedIterations = await this.applyDependencyOptimizations(
      plan.iterations,
      reorderingSuggestions,
      plan.dependencies
    );
    
    // Update critical path
    const optimizedDependencies = this.updateCriticalPath(
      plan.dependencies,
      optimizedIterations
    );

    const optimizedPlan: ARTPlan = {
      ...plan,
      iterations: optimizedIterations,
      dependencies: optimizedDependencies
    };

    logger.info('Dependency flow optimization completed', {
      bottlenecksResolved: bottlenecks.length - this.identifyDependencyBottlenecks(optimizedIterations, optimizedDependencies).length,
      criticalPathReduction: plan.dependencies.criticalPath.length - optimizedDependencies.criticalPath.length
    });

    return optimizedPlan;
  }

  // Private helper methods

  private analyzeCurrentState(plan: ARTPlan): {
    weakestCategories: string[];
    valueDistribution: number[];
    capacityUtilization: number[];
    dependencyComplexity: number;
  } {
    // Find weakest readiness categories
    const weakestCategories = plan.artReadiness.categoryScores
      .filter(cs => cs.score < 0.7)
      .map(cs => cs.category);
    
    // Analyze value distribution
    const valueDistribution = plan.iterations.map(iteration =>
      iteration.deliverableValue.valueConfidence
    );
    
    // Analyze capacity utilization
    const capacityUtilization = plan.iterations.map(iteration => {
      const avgUtilization = iteration.capacityUtilization.reduce(
        (sum, cu) => sum + cu.utilizationRate, 0
      ) / Math.max(iteration.capacityUtilization.length, 1);
      return avgUtilization;
    });
    
    // Calculate dependency complexity
    const totalDependencies = plan.iterations.reduce(
      (sum, iteration) => sum + iteration.allocatedWork.reduce(
        (depSum, work) => depSum + work.blockedBy.length, 0
      ), 0
    );
    const totalWorkItems = plan.workItems.length;
    const dependencyComplexity = totalWorkItems > 0 ? totalDependencies / totalWorkItems : 0;

    return {
      weakestCategories,
      valueDistribution,
      capacityUtilization,
      dependencyComplexity
    };
  }

  private async generateOptimizationStrategies(
    plan: ARTPlan,
    analysis: any
  ): Promise<ImprovementAction[]> {
    const strategies: ImprovementAction[] = [];

    // Strategy: Address weak categories
    for (const category of analysis.weakestCategories) {
      strategies.push(...this.createCategoryImprovementActions(category, plan));
    }

    // Strategy: Improve value distribution
    if (Math.min(...analysis.valueDistribution) < 0.6) {
      strategies.push({
        id: 'improve-value-distribution',
        category: 'value-delivery',
        action: 'Rebalance iterations to ensure consistent value delivery',
        priority: 'high',
        estimatedImpact: 0.15,
        effortRequired: 'medium',
        dependencies: [],
        risks: ['May require story resequencing']
      });
    }

    // Strategy: Optimize capacity utilization
    const overUtilized = analysis.capacityUtilization.filter(u => u > 0.85).length;
    if (overUtilized > 0) {
      strategies.push({
        id: 'optimize-capacity',
        category: 'capacity-allocation',
        action: `Reduce over-allocation in ${overUtilized} iterations`,
        priority: 'high',
        estimatedImpact: 0.1,
        effortRequired: 'medium',
        dependencies: [],
        risks: ['May need to defer some work items']
      });
    }

    // Strategy: Simplify dependencies
    if (analysis.dependencyComplexity > 2) {
      strategies.push({
        id: 'simplify-dependencies',
        category: 'dependency-resolution',
        action: 'Reduce dependency complexity through better sequencing',
        priority: 'medium',
        estimatedImpact: 0.08,
        effortRequired: 'high',
        dependencies: [],
        risks: ['Requires coordination across teams']
      });
    }

    return strategies;
  }

  private createCategoryImprovementActions(
    category: string,
    plan: ARTPlan
  ): ImprovementAction[] {
    const actions: ImprovementAction[] = [];

    switch (category) {
      case 'story-readiness':
        actions.push({
          id: 'improve-story-readiness',
          category: 'story-readiness',
          action: 'Add acceptance criteria to incomplete stories',
          priority: 'high',
          estimatedImpact: 0.12,
          effortRequired: 'low',
          dependencies: [],
          risks: ['Requires Product Owner availability']
        });
        break;
      
      case 'dependency-resolution':
        actions.push({
          id: 'resolve-dependencies',
          category: 'dependency-resolution',
          action: 'Create dependency resolution sprint',
          priority: 'high',
          estimatedImpact: 0.15,
          effortRequired: 'medium',
          dependencies: [],
          risks: ['May impact current sprint velocity']
        });
        break;
      
      case 'capacity-allocation':
        actions.push({
          id: 'balance-capacity',
          category: 'capacity-allocation',
          action: 'Redistribute work across available teams',
          priority: 'medium',
          estimatedImpact: 0.1,
          effortRequired: 'medium',
          dependencies: [],
          risks: ['Teams may need cross-training']
        });
        break;
      
      case 'value-delivery':
        actions.push({
          id: 'increase-value-focus',
          category: 'value-delivery',
          action: 'Prioritize user-facing stories over technical work',
          priority: 'medium',
          estimatedImpact: 0.08,
          effortRequired: 'low',
          dependencies: [],
          risks: ['Technical debt may accumulate']
        });
        break;
    }

    return actions;
  }

  private async applyOptimizations(
    iterations: IterationPlan[],
    strategies: ImprovementAction[],
    dependencies: DependencyGraph
  ): Promise<IterationPlan[]> {
    let optimized = [...iterations];

    for (const strategy of strategies) {
      switch (strategy.id) {
        case 'improve-value-distribution':
          optimized = await this.rebalanceForValue(optimized);
          break;
        
        case 'optimize-capacity':
          optimized = await this.optimizeCapacityAllocation(optimized);
          break;
        
        case 'simplify-dependencies':
          optimized = await this.simplifyDependencyChains(optimized, dependencies);
          break;
        
        case 'improve-story-readiness':
          // This would be handled by updating story data
          break;
      }
    }

    return optimized;
  }

  private async rebalanceForValue(iterations: IterationPlan[]): Promise<IterationPlan[]> {
    // Find iterations with low value delivery
    const lowValueIterations = iterations.filter(
      it => it.deliverableValue.valueConfidence < 0.6
    );

    // Find iterations with high value delivery
    const highValueIterations = iterations.filter(
      it => it.deliverableValue.valueConfidence > 0.8
    );

    if (lowValueIterations.length === 0 || highValueIterations.length === 0) {
      return iterations;
    }

    // Move some high-value items to low-value iterations
    const rebalanced = [...iterations];
    
    for (const lowValueIteration of lowValueIterations) {
      const targetIndex = rebalanced.indexOf(lowValueIteration);
      
      // Find a high-value item that could be moved
      for (const highValueIteration of highValueIterations) {
        const movableItem = highValueIteration.allocatedWork.find(item => {
          // Check if item can be moved (no blocking dependencies in future iterations)
          return item.blockedBy.length === 0 && this.canMoveToIteration(item, targetIndex, rebalanced);
        });
        
        if (movableItem) {
          // Move the item
          const sourceIndex = rebalanced.indexOf(highValueIteration);
          rebalanced[sourceIndex].allocatedWork = rebalanced[sourceIndex].allocatedWork.filter(
            item => item !== movableItem
          );
          rebalanced[targetIndex].allocatedWork.push(movableItem);
          
          break; // Only move one item per iteration
        }
      }
    }

    return rebalanced;
  }

  private canMoveToIteration(
    item: AllocatedWorkItem,
    targetIndex: number,
    iterations: IterationPlan[]
  ): boolean {
    // Check if all dependencies are satisfied by target iteration
    for (const dep of item.blockedBy) {
      let depFound = false;
      
      for (let i = 0; i <= targetIndex; i++) {
        if (iterations[i].allocatedWork.some(work => work.workItem.id === dep)) {
          depFound = true;
          break;
        }
      }
      
      if (!depFound) return false;
    }
    
    return true;
  }

  private async optimizeCapacityAllocation(
    iterations: IterationPlan[]
  ): Promise<IterationPlan[]> {
    const optimized = [...iterations];

    for (let i = 0; i < optimized.length; i++) {
      const iteration = optimized[i];
      const overAllocatedTeams = iteration.capacityUtilization.filter(cu => cu.isOverAllocated);
      
      if (overAllocatedTeams.length > 0) {
        // Find work items that could be deferred
        const deferrableItems = iteration.allocatedWork
          .filter(item => {
            // Defer low-priority items with no enables
            return item.enables.length === 0 && 
                   'priority' in item.workItem && 
                   item.workItem.priority > 3;
          })
          .slice(0, Math.min(2, this.config.maxIterationChanges));
        
        // Move to next iteration if possible
        if (i < optimized.length - 1 && deferrableItems.length > 0) {
          optimized[i].allocatedWork = optimized[i].allocatedWork.filter(
            item => !deferrableItems.includes(item)
          );
          optimized[i + 1].allocatedWork.push(...deferrableItems);
        }
      }
    }

    return optimized;
  }

  private async simplifyDependencyChains(
    iterations: IterationPlan[],
    dependencies: DependencyGraph
  ): Promise<IterationPlan[]> {
    // For now, return as-is - full implementation would reorder to minimize cross-iteration dependencies
    return iterations;
  }

  private calculateImprovements(
    originalPlan: ARTPlan,
    optimizedIterations: IterationPlan[]
  ): {
    readinessImprovement: number;
    valueImprovement: number;
    riskReduction: RiskReductionAnalysis;
  } {
    // Estimate readiness improvement
    const readinessImprovement = this.estimateReadinessImprovement(
      originalPlan,
      optimizedIterations
    );
    
    // Calculate value improvement
    const originalValue = originalPlan.iterations.reduce(
      (sum, it) => sum + it.deliverableValue.valueConfidence, 0
    );
    const optimizedValue = optimizedIterations.reduce(
      (sum, it) => sum + it.deliverableValue.valueConfidence, 0
    );
    const valueImprovement = (optimizedValue - originalValue) / Math.max(originalValue, 1);
    
    // Assess risk reduction
    const riskReduction = this.assessRiskReduction(originalPlan, optimizedIterations);

    return {
      readinessImprovement,
      valueImprovement,
      riskReduction
    };
  }

  private estimateReadinessImprovement(
    originalPlan: ARTPlan,
    optimizedIterations: IterationPlan[]
  ): number {
    // Simple estimation based on changes made
    let improvement = 0;
    
    // Check capacity improvements
    const originalOverAllocated = originalPlan.iterations.reduce(
      (sum, it) => sum + it.capacityUtilization.filter(cu => cu.isOverAllocated).length, 0
    );
    const optimizedOverAllocated = optimizedIterations.reduce(
      (sum, it) => sum + it.capacityUtilization.filter(cu => cu.isOverAllocated).length, 0
    );
    
    if (optimizedOverAllocated < originalOverAllocated) {
      improvement += 0.05 * (originalOverAllocated - optimizedOverAllocated);
    }
    
    // Check value distribution improvements
    const originalMinValue = Math.min(...originalPlan.iterations.map(it => it.deliverableValue.valueConfidence));
    const optimizedMinValue = Math.min(...optimizedIterations.map(it => it.deliverableValue.valueConfidence));
    
    if (optimizedMinValue > originalMinValue) {
      improvement += (optimizedMinValue - originalMinValue) * 0.3;
    }
    
    return Math.min(0.2, improvement); // Cap at 20% improvement
  }

  private assessRiskReduction(
    originalPlan: ARTPlan,
    optimizedIterations: IterationPlan[]
  ): RiskReductionAnalysis {
    const originalRisks = this.countRisks(originalPlan.iterations);
    const optimizedRisks = this.countRisks(optimizedIterations);
    
    const risksEliminated = Math.max(0, originalRisks.total - optimizedRisks.total);
    const riskReductionPercentage = originalRisks.total > 0 
      ? risksEliminated / originalRisks.total 
      : 0;

    return {
      risksEliminated,
      riskReductionPercentage,
      remainingHighRisks: optimizedRisks.high,
      mitigationStrategies: this.generateMitigationStrategies(optimizedRisks)
    };
  }

  private countRisks(iterations: IterationPlan[]): {
    total: number;
    high: number;
    medium: number;
    low: number;
  } {
    let total = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const iteration of iterations) {
      const risks = iteration.deliverableValue.valueRisks;
      total += risks.length;
      
      for (const risk of risks) {
        switch (risk.severity) {
          case 'critical':
          case 'high':
            high++;
            break;
          case 'medium':
            medium++;
            break;
          case 'low':
            low++;
            break;
        }
      }
    }

    return { total, high, medium, low };
  }

  private generateMitigationStrategies(riskCounts: any): string[] {
    const strategies: string[] = [];

    if (riskCounts.high > 0) {
      strategies.push('Address high-severity risks through dedicated risk reduction sprint');
    }
    
    if (riskCounts.total > 5) {
      strategies.push('Implement risk monitoring dashboard for proactive management');
    }
    
    strategies.push('Regular risk review meetings during iteration planning');

    return strategies;
  }

  private assessImplementationComplexity(
    strategies: ImprovementAction[]
  ): 'low' | 'medium' | 'high' {
    const highEffortCount = strategies.filter(s => s.effortRequired === 'high').length;
    const totalCount = strategies.length;
    
    if (highEffortCount > totalCount * 0.5) return 'high';
    if (highEffortCount > totalCount * 0.2) return 'medium';
    return 'low';
  }

  private prioritizeImprovementActions(
    readiness: ARTReadinessResult
  ): ImprovementAction[] {
    const actions: ImprovementAction[] = [];

    // Create actions for each low-scoring category
    for (const categoryScore of readiness.categoryScores) {
      if (categoryScore.score < this.config.targetReadinessScore) {
        const categoryActions = this.createCategoryActions(categoryScore);
        actions.push(...categoryActions);
      }
    }

    // Sort by priority and impact
    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.estimatedImpact - a.estimatedImpact;
    });
  }

  private createCategoryActions(categoryScore: {
    category: string;
    score: number;
    assessment: ARTReadinessAssessment;
  }): ImprovementAction[] {
    const actions: ImprovementAction[] = [];
    const gap = this.config.targetReadinessScore - categoryScore.score;

    // Create specific actions based on category and gap size
    if (gap > 0.3) {
      // Major improvement needed
      actions.push({
        id: `major-${categoryScore.category}`,
        category: categoryScore.category,
        action: `Major improvement required for ${categoryScore.category}`,
        priority: 'high',
        estimatedImpact: gap * 0.6,
        effortRequired: 'high',
        dependencies: [],
        risks: ['Significant resource commitment required']
      });
    } else if (gap > 0.1) {
      // Moderate improvement needed
      actions.push({
        id: `moderate-${categoryScore.category}`,
        category: categoryScore.category,
        action: `Moderate improvement for ${categoryScore.category}`,
        priority: 'medium',
        estimatedImpact: gap * 0.7,
        effortRequired: 'medium',
        dependencies: [],
        risks: ['May impact current iteration velocity']
      });
    }

    // Add specific recommendations from assessment
    for (const recommendation of categoryScore.assessment.recommendations) {
      actions.push({
        id: `rec-${categoryScore.category}-${actions.length}`,
        category: categoryScore.category,
        action: recommendation,
        priority: gap > 0.2 ? 'high' : 'medium',
        estimatedImpact: 0.05,
        effortRequired: 'low',
        dependencies: [],
        risks: []
      });
    }

    return actions;
  }

  private identifyQuickWins(actions: ImprovementAction[]): ImprovementAction[] {
    return actions.filter(action => 
      action.effortRequired === 'low' && 
      action.estimatedImpact >= 0.05
    );
  }

  private identifyStrategicImprovements(actions: ImprovementAction[]): ImprovementAction[] {
    return actions.filter(action => 
      action.estimatedImpact >= 0.1 && 
      action.priority === 'high'
    );
  }

  private estimateImprovementPotential(
    actions: ImprovementAction[],
    currentScore: number
  ): number {
    const totalImpact = actions.reduce((sum, action) => sum + action.estimatedImpact, 0);
    
    // Apply diminishing returns
    const effectiveImpact = totalImpact * 0.8;
    
    return Math.min(1.0, currentScore + effectiveImpact);
  }

  private createImplementationTimeline(actions: ImprovementAction[]): {
    phase: string;
    duration: number;
    actions: string[];
  }[] {
    const quickWins = actions.filter(a => a.effortRequired === 'low');
    const mediumEffort = actions.filter(a => a.effortRequired === 'medium');
    const highEffort = actions.filter(a => a.effortRequired === 'high');

    const timeline: any[] = [];

    if (quickWins.length > 0) {
      timeline.push({
        phase: 'Quick Wins',
        duration: 1, // 1 sprint
        actions: quickWins.map(a => a.action)
      });
    }

    if (mediumEffort.length > 0) {
      timeline.push({
        phase: 'Core Improvements',
        duration: 2, // 2 sprints
        actions: mediumEffort.map(a => a.action)
      });
    }

    if (highEffort.length > 0) {
      timeline.push({
        phase: 'Strategic Initiatives',
        duration: 3, // 3 sprints
        actions: highEffort.map(a => a.action)
      });
    }

    return timeline;
  }

  private estimateResourceRequirements(actions: ImprovementAction[]): {
    developers: number;
    productOwners: number;
    scrumMasters: number;
    totalEffortDays: number;
  } {
    let totalEffortDays = 0;
    
    for (const action of actions) {
      switch (action.effortRequired) {
        case 'low':
          totalEffortDays += 2;
          break;
        case 'medium':
          totalEffortDays += 5;
          break;
        case 'high':
          totalEffortDays += 10;
          break;
      }
    }

    // Estimate team requirements
    const developers = Math.ceil(totalEffortDays / 20); // Assuming 20 days per developer
    const productOwners = actions.some(a => a.category === 'story-readiness') ? 1 : 0;
    const scrumMasters = actions.some(a => a.category === 'capacity-allocation') ? 1 : 0;

    return {
      developers,
      productOwners,
      scrumMasters,
      totalEffortDays
    };
  }

  private createRiskMitigationPlan(readiness: ARTReadinessResult): string[] {
    const mitigations: string[] = [];

    if (readiness.readinessScore < 0.6) {
      mitigations.push('Consider reducing PI scope to improve execution confidence');
    }

    const criticalCategories = readiness.categoryScores.filter(cs => cs.score < 0.5);
    if (criticalCategories.length > 0) {
      mitigations.push('Address critical readiness gaps before PI execution');
    }

    mitigations.push('Establish regular readiness checkpoints during PI');
    mitigations.push('Create contingency plans for high-risk areas');

    return mitigations;
  }

  private analyzeValueDistribution(iterations: IterationPlan[]): {
    overallValueScore: number;
    distribution: number[];
    imbalanced: boolean;
  } {
    const distribution = iterations.map(it => it.deliverableValue.valueConfidence);
    const overallValueScore = distribution.reduce((sum, v) => sum + v, 0) / Math.max(distribution.length, 1);
    
    const min = Math.min(...distribution);
    const max = Math.max(...distribution);
    const imbalanced = (max - min) > 0.3;

    return {
      overallValueScore,
      distribution,
      imbalanced
    };
  }

  private identifyRebalancingOpportunities(
    iterations: IterationPlan[],
    valueAnalysis: any
  ): any[] {
    const opportunities: any[] = [];

    if (!valueAnalysis.imbalanced) return opportunities;

    // Find source iterations (high value) and target iterations (low value)
    for (let i = 0; i < iterations.length; i++) {
      const value = valueAnalysis.distribution[i];
      
      if (value < valueAnalysis.overallValueScore - 0.1) {
        // This iteration needs more value
        for (let j = 0; j < iterations.length; j++) {
          if (i !== j && valueAnalysis.distribution[j] > valueAnalysis.overallValueScore + 0.1) {
            opportunities.push({
              sourceIterationIndex: j,
              targetIterationIndex: i,
              reason: 'Balance value distribution'
            });
          }
        }
      }
    }

    return opportunities.slice(0, this.config.maxIterationChanges);
  }

  private async rebalanceIteration(
    iteration: IterationPlan,
    opportunities: any[],
    allIterations: IterationPlan[]
  ): Promise<IterationPlan> {
    // For now, return as-is - full implementation would move work items
    return iteration;
  }

  private identifyDependencyBottlenecks(
    iterations: IterationPlan[],
    dependencies: DependencyGraph
  ): any[] {
    const bottlenecks: any[] = [];

    // Find work items with many dependents
    const dependentCounts = new Map<string, number>();
    
    for (const edge of dependencies.edges) {
      dependentCounts.set(edge.targetId, (dependentCounts.get(edge.targetId) || 0) + 1);
    }

    // Items with 3+ dependents are bottlenecks
    for (const [itemId, count] of dependentCounts) {
      if (count >= 3) {
        bottlenecks.push({
          itemId,
          dependentCount: count,
          location: this.findItemLocation(itemId, iterations)
        });
      }
    }

    return bottlenecks;
  }

  private findItemLocation(itemId: string, iterations: IterationPlan[]): {
    iterationIndex: number;
    iterationName: string;
  } | null {
    for (let i = 0; i < iterations.length; i++) {
      const hasItem = iterations[i].allocatedWork.some(
        work => work.workItem.id === itemId
      );
      
      if (hasItem) {
        return {
          iterationIndex: i,
          iterationName: iterations[i].iteration.name
        };
      }
    }
    
    return null;
  }

  private generateReorderingSuggestions(
    bottlenecks: any[],
    iterations: IterationPlan[],
    dependencies: DependencyGraph
  ): any[] {
    const suggestions: any[] = [];

    for (const bottleneck of bottlenecks) {
      if (bottleneck.location && bottleneck.location.iterationIndex > 0) {
        // Suggest moving bottleneck to earlier iteration
        suggestions.push({
          itemId: bottleneck.itemId,
          currentIteration: bottleneck.location.iterationIndex,
          targetIteration: Math.max(0, bottleneck.location.iterationIndex - 1),
          reason: `Reduce dependency bottleneck (${bottleneck.dependentCount} dependents)`
        });
      }
    }

    return suggestions;
  }

  private async applyDependencyOptimizations(
    iterations: IterationPlan[],
    suggestions: any[],
    dependencies: DependencyGraph
  ): Promise<IterationPlan[]> {
    // For now, return as-is - full implementation would reorder items
    return iterations;
  }

  private updateCriticalPath(
    dependencies: DependencyGraph,
    iterations: IterationPlan[]
  ): DependencyGraph {
    // For now, return as-is - full implementation would recalculate critical path
    return dependencies;
  }
}