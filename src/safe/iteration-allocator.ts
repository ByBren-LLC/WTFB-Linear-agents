/**
 * Iteration Allocator for ART Planning (LIN-49)
 * 
 * Handles the allocation of work items to iterations while respecting
 * dependencies, capacity constraints, and value delivery requirements.
 */

import {
  PlanningWorkItem,
  Iteration,
  ARTTeam,
  AllocationResult,
  AllocatedWorkItem,
  UnallocatedWorkItem,
  AllocationStatistics,
  AllocationIssue,
  ARTPlanningConfig,
  DependencyOrderingError
} from '../types/art-planning-types';
import { DependencyGraph, DependencyRelationship } from '../types/dependency-types';
import * as logger from '../utils/logger';

/**
 * Algorithm for allocating work items to iterations
 */
export class IterationAllocator {
  private config: ARTPlanningConfig;

  constructor(config: ARTPlanningConfig) {
    this.config = config;
    logger.debug('IterationAllocator initialized', {
      maxUtilization: config.maxCapacityUtilization,
      bufferCapacity: config.bufferCapacity
    });
  }

  /**
   * Main allocation method: distribute work items across iterations
   */
  async allocateWorkItems(
    workItems: PlanningWorkItem[],
    iterations: Iteration[],
    dependencies: DependencyGraph,
    teams: ARTTeam[]
  ): Promise<AllocationResult> {
    const startTime = Date.now();
    logger.info('Starting work item allocation', {
      workItemCount: workItems.length,
      iterationCount: iterations.length,
      teamCount: teams.length
    });

    const allocated: AllocatedWorkItem[] = [];
    const unallocated: UnallocatedWorkItem[] = [];
    const issues: AllocationIssue[] = [];

    try {
      // Step 1: Prepare allocation context
      const allocationContext = this.prepareAllocationContext(iterations, teams, dependencies);
      
      // Step 2: Sort work items by dependency order and priority
      const sortedWorkItems = this.prioritizeWorkItems(workItems, dependencies);
      
      // Step 3: Allocate each work item to the earliest feasible iteration
      for (const workItem of sortedWorkItems) {
        const allocationResult = await this.allocateWorkItem(
          workItem,
          allocationContext,
          dependencies,
          allocated
        );

        if (allocationResult.success && allocationResult.allocation) {
          allocated.push(allocationResult.allocation);
          this.updateAllocationContext(allocationContext, allocationResult.allocation);
        } else {
          unallocated.push({
            workItem,
            reason: allocationResult.reason || 'Unknown allocation failure',
            blockers: allocationResult.blockers || [],
            solutions: allocationResult.solutions || []
          });
        }
      }

      // Step 4: Validate allocation results
      const validationIssues = this.validateAllocation(allocated, iterations, dependencies);
      issues.push(...validationIssues);

      // Step 5: Optimize allocation if enabled
      if (this.config.enableDependencyOptimization) {
        const optimizedAllocations = this.optimizeAllocation(allocated, dependencies);
        allocated.splice(0, allocated.length, ...optimizedAllocations);
      }

      const statistics = this.calculateAllocationStatistics(
        workItems,
        allocated,
        unallocated,
        Date.now() - startTime
      );

      const result: AllocationResult = {
        allocated,
        unallocated,
        statistics,
        issues
      };

      logger.info('Work item allocation completed', {
        allocated: allocated.length,
        unallocated: unallocated.length,
        successRate: statistics.successRate,
        processingTime: `${statistics.processingTime}ms`
      });

      return result;

    } catch (error) {
      logger.error('Work item allocation failed', { error });
      throw error;
    }
  }

  /**
   * Prepare allocation context with iteration capacities and constraints
   */
  private prepareAllocationContext(
    iterations: Iteration[],
    teams: ARTTeam[],
    dependencies: DependencyGraph
  ): AllocationContext {
    const context = {
      iterations: new Map<string, IterationAllocationState>(),
      teamCapacities: new Map<string, number>(),
      dependencyConstraints: this.buildDependencyConstraints(dependencies)
    };

    // Initialize iteration states
    for (const iteration of iterations) {
      const teamCapacities = new Map<string, number>();
      
      for (const team of teams) {
        if (iteration.teams.includes(team.id)) {
          // Calculate available capacity for this team in this iteration
          const baseCapacity = team.averageVelocity;
          const adjustedCapacity = baseCapacity * team.capacityFactor * (1 - this.config.bufferCapacity);
          teamCapacities.set(team.id, adjustedCapacity);
        }
      }

      context.iterations.set(iteration.id, {
        iteration,
        teamCapacities,
        allocatedWork: [],
        remainingCapacity: this.calculateTotalCapacity(teamCapacities),
        utilizationRate: 0
      });
    }

    // Set team capacities
    for (const team of teams) {
      context.teamCapacities.set(team.id, team.averageVelocity);
    }

    return context;
  }

  /**
   * Prioritize work items for allocation considering dependencies and business value
   */
  private prioritizeWorkItems(
    workItems: PlanningWorkItem[],
    dependencies: DependencyGraph
  ): PlanningWorkItem[] {
    // Create priority scores
    const priorityScores = new Map<string, number>();

    for (const item of workItems) {
      let score = 0;

      // Base priority (if available)
      if ('priority' in item && item.priority) {
        score += (5 - item.priority) * 100; // Higher priority = higher score
      }

      // Dependency influence (items with many dependents get higher priority)
      const dependentCount = dependencies.edges.filter(edge => edge.targetId === item.id).length;
      score += dependentCount * 50;

      // Critical path items get priority boost
      if (dependencies.criticalPath.includes(item.id)) {
        score += 200;
      }

      // Smaller items get slight priority boost (easier to fit)
      const points = 'storyPoints' in item ? (item.storyPoints || 3) : 3;
      score += (6 - points) * 10;

      priorityScores.set(item.id, score);
    }

    // Sort by priority score (descending)
    return workItems.sort((a, b) => {
      const scoreA = priorityScores.get(a.id) || 0;
      const scoreB = priorityScores.get(b.id) || 0;
      return scoreB - scoreA;
    });
  }

  /**
   * Allocate a single work item to the earliest feasible iteration
   */
  private async allocateWorkItem(
    workItem: PlanningWorkItem,
    allocationContext: AllocationContext,
    dependencies: DependencyGraph,
    existingAllocations: AllocatedWorkItem[]
  ): Promise<{ success: boolean; allocation?: AllocatedWorkItem; reason?: string; blockers?: string[]; solutions?: string[] }> {
    
    const workItemPoints = this.getWorkItemPoints(workItem);
    
    // Find dependencies that must be completed first
    const prerequisites = this.findPrerequisites(workItem.id, dependencies);
    
    // Find the earliest iteration where prerequisites are satisfied
    const earliestIteration = this.findEarliestFeasibleIteration(
      prerequisites,
      existingAllocations,
      allocationContext
    );

    if (!earliestIteration) {
      return {
        success: false,
        reason: 'No feasible iteration found for dependencies',
        blockers: prerequisites,
        solutions: ['Resolve dependency conflicts', 'Consider breaking down work item']
      };
    }

    // Find best team for this work item
    const bestTeam = this.findBestTeamForWorkItem(workItem, earliestIteration, allocationContext);
    
    if (!bestTeam) {
      return {
        success: false,
        reason: 'No team has sufficient capacity',
        blockers: ['Capacity constraints'],
        solutions: ['Reduce scope', 'Add team capacity', 'Move to later iteration']
      };
    }

    // Check if allocation would violate capacity constraints
    const wouldExceedCapacity = this.wouldExceedCapacity(
      workItem,
      earliestIteration.iteration,
      bestTeam,
      allocationContext
    );

    if (wouldExceedCapacity) {
      return {
        success: false,
        reason: 'Would exceed team capacity',
        blockers: ['Capacity constraints'],
        solutions: ['Move to later iteration', 'Reduce story points', 'Split across iterations']
      };
    }

    // Create allocation
    const allocation: AllocatedWorkItem = {
      workItem,
      assignedTeam: bestTeam,
      allocatedPoints: workItemPoints,
      isComplete: true,
      confidence: this.calculateAllocationConfidence(workItem, earliestIteration.iteration, dependencies),
      rationale: this.generateAllocationRationale(workItem, earliestIteration.iteration, bestTeam),
      blockedBy: prerequisites,
      enables: this.findEnabledWorkItems(workItem.id, dependencies)
    };

    return { success: true, allocation };
  }

  /**
   * Find prerequisites for a work item based on dependencies
   */
  private findPrerequisites(workItemId: string, dependencies: DependencyGraph): string[] {
    return dependencies.edges
      .filter(edge => edge.sourceId === workItemId && (edge.type === 'requires' || edge.type === 'blocked_by'))
      .map(edge => edge.targetId);
  }

  /**
   * Find work items that this item enables
   */
  private findEnabledWorkItems(workItemId: string, dependencies: DependencyGraph): string[] {
    return dependencies.edges
      .filter(edge => edge.targetId === workItemId && (edge.type === 'enables' || edge.type === 'blocks'))
      .map(edge => edge.sourceId);
  }

  /**
   * Find the earliest iteration where all prerequisites are satisfied
   */
  private findEarliestFeasibleIteration(
    prerequisites: string[],
    existingAllocations: AllocatedWorkItem[],
    allocationContext: AllocationContext
  ): IterationAllocationState | null {
    if (prerequisites.length === 0) {
      // No prerequisites, can start in first iteration
      return Array.from(allocationContext.iterations.values())[0];
    }

    // Find when all prerequisites will be completed
    let latestPrerequisiteIteration = 0;
    
    for (const prerequisiteId of prerequisites) {
      const allocation = existingAllocations.find(alloc => alloc.workItem.id === prerequisiteId);
      if (allocation) {
        const iterationIndex = this.getIterationIndex(allocation, allocationContext);
        latestPrerequisiteIteration = Math.max(latestPrerequisiteIteration, iterationIndex);
      } else {
        // Prerequisite not yet allocated - this is a problem
        return null;
      }
    }

    // Return the iteration after the latest prerequisite
    const iterations = Array.from(allocationContext.iterations.values());
    const targetIndex = latestPrerequisiteIteration + 1;
    
    return targetIndex < iterations.length ? iterations[targetIndex] : null;
  }

  /**
   * Find the best team for a work item considering specializations and capacity
   */
  private findBestTeamForWorkItem(workItem: PlanningWorkItem, iteration: IterationAllocationState, allocationContext: AllocationContext): string | null {
    const workItemPoints = this.getWorkItemPoints(workItem);
    const availableTeams = iteration.iteration.teams;
    
    let bestTeam: string | null = null;
    let bestScore = -1;

    for (const teamId of availableTeams) {
      const teamCapacity = iteration.teamCapacities.get(teamId) || 0;
      const remainingCapacity = teamCapacity; // TODO: Track used capacity per team
      
      if (remainingCapacity >= workItemPoints) {
        // Simple scoring: prefer teams with more remaining capacity
        const score = remainingCapacity / workItemPoints;
        
        if (score > bestScore) {
          bestScore = score;
          bestTeam = teamId;
        }
      }
    }

    return bestTeam;
  }

  /**
   * Check if allocating work item would exceed capacity constraints
   */
  private wouldExceedCapacity(
    workItem: PlanningWorkItem,
    iteration: Iteration,
    teamId: string,
    allocationContext: AllocationContext
  ): boolean {
    const iterationState = allocationContext.iterations.get(iteration.id);
    if (!iterationState) return true;

    const workItemPoints = this.getWorkItemPoints(workItem);
    const teamCapacity = iterationState.teamCapacities.get(teamId) || 0;
    const maxUtilization = this.config.maxCapacityUtilization;
    
    // Calculate current team utilization in this iteration
    const currentTeamPoints = iterationState.allocatedWork
      .filter((alloc: any) => alloc.assignedTeam === teamId)
      .reduce((sum: number, alloc: any) => sum + alloc.allocatedPoints, 0);

    const newUtilization = (currentTeamPoints + workItemPoints) / teamCapacity;
    
    return newUtilization > maxUtilization;
  }

  /**
   * Update allocation context after successful allocation
   */
  private updateAllocationContext(allocationContext: AllocationContext, allocation: AllocatedWorkItem): void {
    // Find the iteration for this allocation
    for (const [iterationId, iterationState] of allocationContext.iterations.entries()) {
      // TODO: Determine which iteration this allocation belongs to
      // For now, we'll need to track this in the allocation
    }
  }

  /**
   * Validate the overall allocation for issues
   */
  private validateAllocation(
    allocations: AllocatedWorkItem[],
    iterations: Iteration[],
    dependencies: DependencyGraph
  ): AllocationIssue[] {
    const issues: AllocationIssue[] = [];

    // Check for dependency ordering violations
    const dependencyViolations = this.checkDependencyOrdering(allocations, dependencies);
    if (dependencyViolations.length > 0) {
      issues.push({
        type: 'dependency_violation',
        severity: 'critical',
        description: 'Work items scheduled before their dependencies',
        affectedIterations: dependencyViolations.map(v => v.iterationId),
        recommendations: ['Reorder work items to respect dependencies']
      });
    }

    // Check for capacity overruns
    const capacityOverruns = this.checkCapacityOverruns(allocations, iterations);
    if (capacityOverruns.length > 0) {
      issues.push({
        type: 'capacity_overrun',
        severity: 'high',
        description: 'Team capacity exceeded in some iterations',
        affectedIterations: capacityOverruns,
        recommendations: ['Reduce scope', 'Add capacity', 'Redistribute work']
      });
    }

    return issues;
  }

  /**
   * Optimize allocation to improve dependency flow and value delivery
   */
  private optimizeAllocation(
    allocations: AllocatedWorkItem[],
    dependencies: DependencyGraph
  ): AllocatedWorkItem[] {
    // For now, return allocations as-is
    // TODO: Implement optimization algorithms
    return allocations;
  }

  /**
   * Calculate allocation statistics
   */
  private calculateAllocationStatistics(
    totalWorkItems: PlanningWorkItem[],
    allocated: AllocatedWorkItem[],
    unallocated: UnallocatedWorkItem[],
    processingTime: number
  ): AllocationStatistics {
    const totalCount = totalWorkItems.length;
    const allocatedCount = allocated.length;
    const unallocatedCount = unallocated.length;
    
    const averageUtilization = allocated.length > 0 
      ? allocated.reduce((sum, alloc) => sum + alloc.confidence, 0) / allocated.length
      : 0;

    return {
      totalWorkItems: totalCount,
      allocatedCount,
      unallocatedCount,
      successRate: totalCount > 0 ? allocatedCount / totalCount : 1,
      averageUtilization,
      processingTime
    };
  }

  // Helper methods
  private getWorkItemPoints(workItem: PlanningWorkItem): number {
    if ('storyPoints' in workItem && workItem.storyPoints) {
      return workItem.storyPoints;
    }
    return 3; // Default story points
  }

  private calculateTotalCapacity(teamCapacities: Map<string, number>): number {
    return Array.from(teamCapacities.values()).reduce((sum, capacity) => sum + capacity, 0);
  }

  private getIterationIndex(allocation: AllocatedWorkItem, allocationContext: AllocationContext): number {
    // TODO: Implement based on how we track which iteration an allocation belongs to
    return 0;
  }

  private calculateAllocationConfidence(
    workItem: PlanningWorkItem,
    iteration: Iteration,
    dependencies: DependencyGraph
  ): number {
    let confidence = 0.8; // Base confidence

    // Adjust based on dependency complexity
    const prerequisiteCount = this.findPrerequisites(workItem.id, dependencies).length;
    confidence -= prerequisiteCount * 0.05;

    // Adjust based on work item size
    const points = this.getWorkItemPoints(workItem);
    if (points > 5) confidence -= 0.1;
    if (points <= 2) confidence += 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private generateAllocationRationale(
    workItem: PlanningWorkItem,
    iteration: Iteration,
    teamId: string
  ): string {
    return `Allocated to ${iteration.name} based on dependency ordering and team ${teamId} capacity`;
  }

  private buildDependencyConstraints(dependencies: DependencyGraph) {
    // Build constraint map for fast lookup
    const constraints = new Map<string, string[]>();
    
    for (const edge of dependencies.edges) {
      if (edge.type === 'requires' || edge.type === 'blocked_by') {
        const existing = constraints.get(edge.sourceId) || [];
        existing.push(edge.targetId);
        constraints.set(edge.sourceId, existing);
      }
    }
    
    return constraints;
  }

  private checkDependencyOrdering(
    allocations: AllocatedWorkItem[],
    dependencies: DependencyGraph
  ): any[] {
    // TODO: Implement dependency ordering validation
    return [];
  }

  private checkCapacityOverruns(
    allocations: AllocatedWorkItem[],
    iterations: Iteration[]
  ): string[] {
    // TODO: Implement capacity overrun detection
    return [];
  }
}

// Helper interfaces
interface IterationAllocationState {
  iteration: Iteration;
  teamCapacities: Map<string, number>;
  allocatedWork: AllocatedWorkItem[];
  remainingCapacity: number;
  utilizationRate: number;
}

interface AllocationContext {
  iterations: Map<string, IterationAllocationState>;
  teamCapacities: Map<string, number>;
  dependencyConstraints: Map<string, string[]>;
}