/**
 * ART Planner for SAFe Iteration Planning (LIN-49)
 * 
 * Core engine for Agile Release Train iteration planning that ensures
 * each sprint delivers working software with proper dependency sequencing.
 */

import {
  ARTPlan,
  IterationPlan,
  Iteration,
  PlanningWorkItem,
  ARTReadinessResult,
  ARTPlanSummary,
  ARTPlanMetadata,
  ARTPlanningConfig,
  ARTTeam,
  AllocationResult,
  ARTPlanningError,
  ARTReadinessCategory,
  ARTReadinessAssessment
} from '../types/art-planning-types';
import { DependencyGraph, DependencyRelationship } from '../types/dependency-types';
import { ProgramIncrement } from './pi-model';
import { IterationAllocator } from './iteration-allocator';
import { CapacityManager } from './capacity-manager';
import { ARTValidator } from './art-validator';
import { ValueDeliveryAnalyzer } from './value-delivery-analyzer';
import { WorkingSoftwareValidator } from './working-software-validator';
import { ARTReadinessOptimizer } from './art-readiness-optimizer';
import * as logger from '../utils/logger';

/**
 * Default configuration for ART planning
 */
const DEFAULT_ART_CONFIG: ARTPlanningConfig = {
  defaultIterationLength: 14, // 2 weeks
  bufferCapacity: 0.2, // 20% buffer
  minValueDeliveryThreshold: 0.8, // 80% confidence
  maxCapacityUtilization: 0.85, // 85% max utilization
  enableDependencyOptimization: true,
  enableValueOptimization: true,
  planningHorizon: 6 // 6 iterations
};

/**
 * Core ART planning engine
 */
export class ARTPlanner {
  private config: ARTPlanningConfig;
  private iterationAllocator: IterationAllocator;
  private capacityManager: CapacityManager;
  private artValidator: ARTValidator;
  private valueDeliveryAnalyzer: ValueDeliveryAnalyzer;
  private workingSoftwareValidator: WorkingSoftwareValidator;
  private artReadinessOptimizer: ARTReadinessOptimizer;

  constructor(config: Partial<ARTPlanningConfig> = {}) {
    this.config = { ...DEFAULT_ART_CONFIG, ...config };
    this.iterationAllocator = new IterationAllocator(this.config);
    this.capacityManager = new CapacityManager(this.config);
    this.artValidator = new ARTValidator(this.config);
    this.valueDeliveryAnalyzer = new ValueDeliveryAnalyzer();
    this.workingSoftwareValidator = new WorkingSoftwareValidator();
    this.artReadinessOptimizer = new ARTReadinessOptimizer();
    
    logger.info('ARTPlanner initialized', {
      iterationLength: this.config.defaultIterationLength,
      bufferCapacity: this.config.bufferCapacity,
      dependencyOptimization: this.config.enableDependencyOptimization
    });
  }

  /**
   * Main entry point: create complete ART plan for a Program Increment
   */
  async planART(
    programIncrement: ProgramIncrement,
    workItems: PlanningWorkItem[],
    dependencies: DependencyGraph,
    teams: ARTTeam[]
  ): Promise<ARTPlan> {
    const startTime = Date.now();
    logger.info('Starting ART planning', {
      piId: programIncrement.id,
      workItemCount: workItems.length,
      dependencyCount: dependencies.edges.length,
      teamCount: teams.length
    });

    try {
      // Phase 1: Create iteration structure
      const iterations = this.createIterationStructure(programIncrement, teams);
      
      // Phase 2: Plan individual iterations
      const iterationPlans = await this.planIterations(
        iterations,
        workItems,
        dependencies,
        teams
      );
      
      // Phase 3: Validate ART readiness
      const artReadiness = await this.validateARTReadiness(iterationPlans, dependencies);
      
      // Phase 3.5: Optimize ART plan if enabled
      let optimizedIterationPlans = iterationPlans;
      if (this.config.enableValueOptimization && artReadiness.readinessScore < 0.85) {
        logger.info('Optimizing ART plan for improved readiness', {
          currentReadiness: artReadiness.readinessScore
        });
        
        // Create temporary ART plan for optimization
        const tempPlan: ARTPlan = {
          programIncrement,
          iterations: iterationPlans,
          workItems,
          dependencies,
          artReadiness,
          summary: {} as ARTPlanSummary,
          metadata: {} as ARTPlanMetadata
        };
        
        const optimizedPlan = await this.artReadinessOptimizer.optimizeARTReadiness(tempPlan);
        optimizedIterationPlans = optimizedPlan.optimizedIterations;
        
        logger.info('ART optimization completed', {
          readinessImprovement: optimizedPlan.readinessScoreImprovement,
          valueImprovement: optimizedPlan.valueDeliveryImprovement
        });
      }
      
      // Phase 4: Generate summary and metadata
      const summary = this.generatePlanSummary(optimizedIterationPlans, workItems, dependencies);
      const metadata = this.generatePlanMetadata();

      const artPlan: ARTPlan = {
        programIncrement,
        iterations: optimizedIterationPlans,
        workItems,
        dependencies,
        artReadiness,
        summary,
        metadata
      };

      const processingTime = Date.now() - startTime;
      logger.info('ART planning completed', {
        iterations: optimizedIterationPlans.length,
        readinessScore: artReadiness.readinessScore,
        processingTime: `${processingTime}ms`
      });

      return artPlan;

    } catch (error) {
      logger.error('ART planning failed', { error, piId: programIncrement.id });
      throw new ARTPlanningError(
        `Failed to create ART plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ART_PLANNING_FAILED'
      );
    }
  }

  /**
   * Plan individual iterations with work allocation
   */
  async planIterations(
    iterations: Iteration[],
    workItems: PlanningWorkItem[],
    dependencies: DependencyGraph,
    teams: ARTTeam[]
  ): Promise<IterationPlan[]> {
    logger.debug('Planning iterations', {
      iterationCount: iterations.length,
      workItemCount: workItems.length
    });

    const iterationPlans: IterationPlan[] = [];

    // Sort work items by dependencies (topological sort)
    const sortedWorkItems = this.sortWorkItemsByDependencies(workItems, dependencies);

    // Allocate work items to iterations
    const allocationResult = await this.iterationAllocator.allocateWorkItems(
      sortedWorkItems,
      iterations,
      dependencies,
      teams
    );

    // Create iteration plans from allocation results
    for (const iteration of iterations) {
      const allocatedWork = allocationResult.allocated.filter(
        alloc => this.isAllocatedToIteration(alloc, iteration)
      );

      const iterationPlan = await this.createIterationPlan(
        iteration,
        allocatedWork,
        dependencies,
        teams
      );

      iterationPlans.push(iterationPlan);
    }

    // Handle unallocated work items
    if (allocationResult.unallocated.length > 0) {
      logger.warn('Some work items could not be allocated', {
        unallocatedCount: allocationResult.unallocated.length,
        reasons: allocationResult.unallocated.map(u => u.reason)
      });
    }

    return iterationPlans;
  }

  /**
   * Validate ART readiness for execution
   */
  async validateARTReadiness(
    iterationPlans: IterationPlan[],
    dependencies: DependencyGraph
  ): Promise<ARTReadinessResult> {
    logger.debug('Validating ART readiness', {
      iterationCount: iterationPlans.length
    });

    const assessments: ARTReadinessAssessment[] = [];
    const criticalBlockers: string[] = [];
    const recommendations: string[] = [];

    // Story Readiness Assessment
    const storyReadiness = await this.artValidator.validateStoryReadiness(iterationPlans);
    assessments.push(storyReadiness);
    if (!storyReadiness.isReady) {
      criticalBlockers.push(...storyReadiness.issues);
    }

    // Dependency Resolution Assessment
    const dependencyReadiness = await this.artValidator.validateDependencyResolution(
      iterationPlans,
      dependencies
    );
    assessments.push(dependencyReadiness);
    if (!dependencyReadiness.isReady) {
      criticalBlockers.push(...dependencyReadiness.issues);
    }

    // Capacity Allocation Assessment
    const capacityReadiness = await this.artValidator.validateCapacityAllocation(iterationPlans);
    assessments.push(capacityReadiness);
    if (!capacityReadiness.isReady) {
      criticalBlockers.push(...capacityReadiness.issues);
    }

    // Value Delivery Assessment
    const valueReadiness = await this.artValidator.validateValueDelivery(iterationPlans);
    assessments.push(valueReadiness);
    if (!valueReadiness.isReady) {
      criticalBlockers.push(...valueReadiness.issues);
    }

    // Calculate overall readiness score
    const readinessScore = assessments.reduce((sum, assessment) => sum + assessment.score, 0) / assessments.length;
    const isReady = criticalBlockers.length === 0 && readinessScore >= 0.8;

    // Generate recommendations
    recommendations.push(...assessments.flatMap(a => a.recommendations));

    const artReadiness: ARTReadinessResult = {
      isReady,
      readinessScore,
      assessments,
      categoryScores: assessments.map(assessment => ({
        category: assessment.category.toString(),
        score: assessment.score,
        assessment
      })),
      criticalBlockers,
      recommendations,
      validatedAt: new Date()
    };

    logger.info('ART readiness validation completed', {
      isReady,
      readinessScore: readinessScore.toFixed(2),
      criticalBlockers: criticalBlockers.length
    });

    return artReadiness;
  }

  /**
   * Create iteration structure for the Program Increment
   */
  private createIterationStructure(
    programIncrement: ProgramIncrement,
    teams: ARTTeam[]
  ): Iteration[] {
    const iterations: Iteration[] = [];
    const piDuration = this.calculatePIDuration(programIncrement);
    const iterationCount = Math.floor(piDuration / this.config.defaultIterationLength);

    let currentStart = new Date(programIncrement.startDate);

    for (let i = 0; i < iterationCount; i++) {
      const iterationEnd = new Date(currentStart);
      iterationEnd.setDate(currentStart.getDate() + this.config.defaultIterationLength);

      // Don't exceed PI end date
      if (iterationEnd > programIncrement.endDate) {
        iterationEnd.setTime(programIncrement.endDate.getTime());
      }

      const iteration: Iteration = {
        id: `${programIncrement.id}-iteration-${i + 1}`,
        name: `Iteration ${i + 1}`,
        startDate: new Date(currentStart),
        endDate: iterationEnd,
        duration: this.config.defaultIterationLength,
        teams: teams.map(team => team.id),
        goals: [],
        capacity: []
      };

      iterations.push(iteration);
      currentStart = new Date(iterationEnd);
      currentStart.setDate(currentStart.getDate() + 1); // Start next day
    }

    logger.debug('Created iteration structure', {
      iterationCount: iterations.length,
      piDuration,
      iterationLength: this.config.defaultIterationLength
    });

    return iterations;
  }

  /**
   * Sort work items by dependencies using topological sort
   */
  private sortWorkItemsByDependencies(
    workItems: PlanningWorkItem[],
    dependencies: DependencyGraph
  ): PlanningWorkItem[] {
    // Build adjacency list for topological sort
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    for (const item of workItems) {
      graph.set(item.id, []);
      inDegree.set(item.id, 0);
    }

    // Build graph from dependencies
    for (const dep of dependencies.edges) {
      if (dep.type === 'requires' || dep.type === 'blocked_by') {
        const predecessors = graph.get(dep.sourceId) || [];
        predecessors.push(dep.targetId);
        graph.set(dep.sourceId, predecessors);
        
        inDegree.set(dep.targetId, (inDegree.get(dep.targetId) || 0) + 1);
      }
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    const result: PlanningWorkItem[] = [];

    // Find items with no dependencies
    for (const [itemId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(itemId);
      }
    }

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const workItem = workItems.find(item => item.id === currentId);
      
      if (workItem) {
        result.push(workItem);
      }

      // Process dependencies
      const dependents = graph.get(currentId) || [];
      for (const dependentId of dependents) {
        const newDegree = (inDegree.get(dependentId) || 0) - 1;
        inDegree.set(dependentId, newDegree);
        
        if (newDegree === 0) {
          queue.push(dependentId);
        }
      }
    }

    // Add any remaining items (shouldn't happen if no cycles)
    for (const item of workItems) {
      if (!result.find(r => r.id === item.id)) {
        result.push(item);
      }
    }

    logger.debug('Sorted work items by dependencies', {
      originalCount: workItems.length,
      sortedCount: result.length
    });

    return result;
  }

  /**
   * Create iteration plan for a single iteration
   */
  private async createIterationPlan(
    iteration: Iteration,
    allocatedWork: any[],
    dependencies: DependencyGraph,
    teams: ARTTeam[]
  ): Promise<IterationPlan> {
    // Calculate capacity for this iteration
    const capacityCalculation = await this.capacityManager.calculateIterationCapacity(
      iteration,
      teams
    );

    // Calculate capacity utilization
    const capacityUtilization = await this.capacityManager.calculateCapacityUtilization(
      allocatedWork,
      capacityCalculation.teamCapacities
    );

    // Phase 2: Enhanced value delivery analysis
    const deliverableValue = await this.artValidator.validateDeliverableValue(
      allocatedWork,
      dependencies
    );

    // Create initial iteration plan for value analysis
    const preliminaryPlan: IterationPlan = {
      iteration,
      allocatedWork,
      totalPoints: allocatedWork.reduce((sum, work) => sum + work.allocatedPoints, 0),
      totalCapacity: capacityCalculation.totalCapacity,
      capacityUtilization: await this.capacityManager.calculateCapacityUtilization(
        allocatedWork,
        capacityCalculation.teamCapacities
      ),
      deliverableValue,
      prerequisites: [],
      enables: [],
      validation: { isValid: true, errors: [], warnings: [], info: [], validationScore: 1.0 },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        algorithmVersion: '1.0.0',
        planningConfidence: 0.8
      }
    };

    // Phase 2: Value delivery analysis
    const valueAnalysis = await this.valueDeliveryAnalyzer.analyzeIterationValue(preliminaryPlan);

    // Determine prerequisites and enables
    const prerequisites = this.calculatePrerequisites(allocatedWork, dependencies);
    const enables = this.calculateEnables(allocatedWork, dependencies);

    // Validate iteration
    const validation = await this.artValidator.validateIteration(
      iteration,
      allocatedWork,
      capacityUtilization,
      deliverableValue
    );

    // Calculate total points
    const totalPoints = allocatedWork.reduce((sum, work) => sum + work.allocatedPoints, 0);

    // Enhanced iteration plan with Phase 2 value analysis
    const iterationPlan: IterationPlan = {
      iteration,
      allocatedWork,
      totalPoints,
      totalCapacity: capacityCalculation.totalCapacity,
      capacityUtilization,
      deliverableValue: {
        ...deliverableValue,
        // Enhance with Phase 2 analysis
        valueConfidence: valueAnalysis.confidenceScore,
        valueDeliveryStories: valueAnalysis.workingSoftwareComponents.map(comp => comp.name),
        valueRisks: valueAnalysis.deliveryRisks
      },
      prerequisites,
      enables,
      validation,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        algorithmVersion: '1.0.0-phase2',
        planningConfidence: Math.min(validation.validationScore, valueAnalysis.confidenceScore),
        valueAnalysis: {
          valueDeliveryScore: valueAnalysis.valueDeliveryScore,
          workingSoftwareCount: valueAnalysis.workingSoftwareComponents.length,
          userImpactScore: valueAnalysis.userImpactAssessment.impactedUserCount,
          businessValue: valueAnalysis.businessValueRealization.estimatedRevenue
        }
      }
    };

    return iterationPlan;
  }

  /**
   * Generate plan summary and statistics
   */
  private generatePlanSummary(
    iterationPlans: IterationPlan[],
    workItems: PlanningWorkItem[],
    dependencies: DependencyGraph
  ): ARTPlanSummary {
    const totalStoryPoints = iterationPlans.reduce((sum, plan) => sum + plan.totalPoints, 0);
    const averageUtilization = iterationPlans.reduce(
      (sum, plan) => sum + plan.capacityUtilization.reduce(
        (capSum, cap) => capSum + cap.utilizationRate, 0
      ) / plan.capacityUtilization.length, 0
    ) / iterationPlans.length;

    const valueDeliveryIterations = iterationPlans.filter(
      plan => plan.deliverableValue.canDeliverWorkingSoftware
    ).length;

    const valueDeliveryConfidence = iterationPlans.reduce(
      (sum, plan) => sum + plan.deliverableValue.valueConfidence, 0
    ) / iterationPlans.length;

    // Assess overall risk level
    const hasHighCapacityUtilization = averageUtilization > 0.9;
    const hasLowValueDelivery = valueDeliveryConfidence < 0.7;
    const hasManyDependencies = dependencies.edges.length > workItems.length * 0.5;
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (hasHighCapacityUtilization || hasLowValueDelivery || hasManyDependencies) {
      riskLevel = 'medium';
    }
    if (hasHighCapacityUtilization && hasLowValueDelivery) {
      riskLevel = 'high';
    }

    const summary: ARTPlanSummary = {
      totalIterations: iterationPlans.length,
      totalWorkItems: workItems.length,
      totalStoryPoints,
      averageCapacityUtilization: averageUtilization,
      totalDependencies: dependencies.edges.length,
      criticalPathLength: dependencies.criticalPath.length,
      valueDeliveryConfidence,
      riskLevel,
      metrics: {
        properlySizedStories: this.calculateProperlySizedStories(workItems),
        dependencyResolution: this.calculateDependencyResolution(dependencies),
        iterationsWithValue: valueDeliveryIterations / iterationPlans.length,
        capacityBalance: this.calculateCapacityBalance(iterationPlans),
        planningConfidence: iterationPlans.reduce((sum, plan) => sum + plan.validation.validationScore, 0) / iterationPlans.length
      }
    };

    return summary;
  }

  /**
   * Generate plan metadata
   */
  private generatePlanMetadata(): ARTPlanMetadata {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      algorithmVersion: '1.0.0',
      configuration: this.config,
      sessionId: `art-planning-${Date.now()}`,
      notes: 'Generated by ART Planner (LIN-49)'
    };
  }

  // Helper methods
  private calculatePIDuration(pi: ProgramIncrement): number {
    return Math.ceil((pi.endDate.getTime() - pi.startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private isAllocatedToIteration(allocation: any, iteration: Iteration): boolean {
    // This would be implemented based on how the allocator assigns work to iterations
    return allocation.iterationId === iteration.id;
  }

  private calculatePrerequisites(allocatedWork: any[], dependencies: DependencyGraph): string[] {
    // Calculate work items that must be completed before this iteration
    return [];
  }

  private calculateEnables(allocatedWork: any[], dependencies: DependencyGraph): string[] {
    // Calculate work items that this iteration enables
    return [];
  }

  private calculateProperlySizedStories(workItems: PlanningWorkItem[]): number {
    const stories = workItems.filter(item => item.type === 'story');
    const properlySized = stories.filter(story => {
      const points = 'storyPoints' in story ? story.storyPoints : 0;
      return points && points <= 5;
    });
    return stories.length > 0 ? properlySized.length / stories.length : 1;
  }

  private calculateDependencyResolution(dependencies: DependencyGraph): number {
    // For now, assume all dependencies are resolved
    return 1.0;
  }

  private calculateCapacityBalance(iterationPlans: IterationPlan[]): number {
    const utilizations = iterationPlans.flatMap(plan => 
      plan.capacityUtilization.map(cap => cap.utilizationRate)
    );
    
    if (utilizations.length === 0) return 1.0;
    
    const mean = utilizations.reduce((sum, util) => sum + util, 0) / utilizations.length;
    const variance = utilizations.reduce((sum, util) => sum + Math.pow(util - mean, 2), 0) / utilizations.length;
    
    return 1.0 - Math.sqrt(variance); // Lower variance = better balance
  }
}