/**
 * Capacity Manager for ART Planning (LIN-49)
 * 
 * Manages team capacity calculation, validation, and optimization
 * for iteration planning in the Agile Release Train.
 */

import {
  Iteration,
  IterationCapacity,
  ARTTeam,
  CapacityUtilization,
  AllocatedWorkItem,
  CapacityCalculationResult,
  ARTPlanningConfig,
  CapacityValidationError
} from '../types/art-planning-types';
import * as logger from '../utils/logger';

/**
 * Default capacity configuration values
 */
const DEFAULT_CAPACITY_FACTORS = {
  holidayFactor: 0.9,        // 10% reduction for holidays
  ptoFactor: 0.85,          // 15% reduction for PTO
  meetingFactor: 0.8,       // 20% reduction for meetings/ceremonies
  focusFactor: 0.85,        // 15% reduction for context switching
  uncertaintyBuffer: 0.1    // 10% buffer for uncertainty
};

/**
 * Manages team capacity for ART iteration planning
 */
export class CapacityManager {
  private config: ARTPlanningConfig;

  constructor(config: ARTPlanningConfig) {
    this.config = config;
    logger.debug('CapacityManager initialized', {
      bufferCapacity: config.bufferCapacity,
      maxUtilization: config.maxCapacityUtilization
    });
  }

  /**
   * Calculate capacity for all teams in an iteration
   */
  async calculateIterationCapacity(
    iteration: Iteration,
    teams: ARTTeam[]
  ): Promise<CapacityCalculationResult> {
    logger.debug('Calculating iteration capacity', {
      iterationId: iteration.id,
      teamCount: teams.length,
      duration: iteration.duration
    });

    const teamCapacities: IterationCapacity[] = [];
    const notes: string[] = [];
    const risks: string[] = [];
    let totalCapacity = 0;
    let confidenceScore = 1.0;

    for (const team of teams) {
      if (iteration.teams.includes(team.id)) {
        const teamCapacity = await this.calculateTeamCapacity(
          team,
          iteration,
          notes,
          risks
        );
        
        teamCapacities.push(teamCapacity);
        totalCapacity += teamCapacity.availableCapacity;
        
        // Update confidence based on team confidence
        confidenceScore = Math.min(confidenceScore, teamCapacity.confidenceFactor);
      }
    }

    const result: CapacityCalculationResult = {
      teamCapacities,
      totalCapacity,
      confidenceScore,
      notes,
      risks
    };

    logger.info('Iteration capacity calculated', {
      iterationId: iteration.id,
      totalCapacity,
      teamCount: teamCapacities.length,
      confidenceScore: confidenceScore.toFixed(2)
    });

    return result;
  }

  /**
   * Calculate capacity utilization for allocated work
   */
  async calculateCapacityUtilization(
    allocatedWork: AllocatedWorkItem[],
    teamCapacities: IterationCapacity[]
  ): Promise<CapacityUtilization[]> {
    const utilizations: CapacityUtilization[] = [];

    for (const teamCapacity of teamCapacities) {
      const teamWork = allocatedWork.filter(work => work.assignedTeam === teamCapacity.teamId);
      const allocatedPoints = teamWork.reduce((sum, work) => sum + work.allocatedPoints, 0);
      
      const utilizationRate = teamCapacity.availableCapacity > 0 
        ? allocatedPoints / teamCapacity.availableCapacity 
        : 0;

      const isOverAllocated = utilizationRate > this.config.maxCapacityUtilization;
      const bufferCapacity = Math.max(0, teamCapacity.availableCapacity - allocatedPoints);

      const utilization: CapacityUtilization = {
        teamId: teamCapacity.teamId,
        totalCapacity: teamCapacity.totalCapacity,
        allocatedCapacity: allocatedPoints,
        utilizationRate,
        isOverAllocated,
        bufferCapacity
      };

      utilizations.push(utilization);
    }

    return utilizations;
  }

  /**
   * Validate capacity allocation for an iteration
   */
  async validateCapacityAllocation(
    utilizations: CapacityUtilization[],
    iterationId: string
  ): Promise<{ isValid: boolean; issues: string[]; recommendations: string[] }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    for (const utilization of utilizations) {
      // Check for over-allocation
      if (utilization.isOverAllocated) {
        issues.push(`Team ${utilization.teamId} is over-allocated at ${(utilization.utilizationRate * 100).toFixed(1)}%`);
        recommendations.push(`Reduce allocation for team ${utilization.teamId} or increase capacity`);
      }

      // Check for very low utilization
      if (utilization.utilizationRate < 0.5) {
        recommendations.push(`Team ${utilization.teamId} has low utilization (${(utilization.utilizationRate * 100).toFixed(1)}%) - consider additional work`);
      }

      // Check for exactly at capacity (no buffer)
      if (utilization.utilizationRate > 0.95 && !utilization.isOverAllocated) {
        recommendations.push(`Team ${utilization.teamId} has no capacity buffer - consider reducing allocation`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Optimize capacity distribution across iterations
   */
  async optimizeCapacityDistribution(
    allocatedWork: AllocatedWorkItem[],
    teamCapacities: IterationCapacity[]
  ): Promise<AllocatedWorkItem[]> {
    logger.debug('Optimizing capacity distribution', {
      workItemCount: allocatedWork.length,
      teamCount: teamCapacities.length
    });

    // For Phase 1, return work as-is
    // TODO: Implement capacity optimization algorithms in Phase 3
    return allocatedWork;
  }

  /**
   * Calculate capacity for a single team in an iteration
   */
  private async calculateTeamCapacity(
    team: ARTTeam,
    iteration: Iteration,
    notes: string[],
    risks: string[]
  ): Promise<IterationCapacity> {
    // Start with base velocity
    let totalCapacity = team.averageVelocity;
    let availableCapacity = totalCapacity;

    // Apply team capacity factor
    availableCapacity *= team.capacityFactor;
    notes.push(`Applied team capacity factor ${team.capacityFactor} for ${team.name}`);

    // Apply iteration duration scaling
    const standardIterationDays = this.config.defaultIterationLength;
    const actualIterationDays = iteration.duration;
    const durationFactor = actualIterationDays / standardIterationDays;
    availableCapacity *= durationFactor;
    
    if (durationFactor !== 1.0) {
      notes.push(`Adjusted for iteration duration: ${actualIterationDays} days (factor: ${durationFactor.toFixed(2)})`);
    }

    // Apply capacity reduction factors
    availableCapacity *= DEFAULT_CAPACITY_FACTORS.holidayFactor;
    availableCapacity *= DEFAULT_CAPACITY_FACTORS.ptoFactor;
    availableCapacity *= DEFAULT_CAPACITY_FACTORS.meetingFactor;
    availableCapacity *= DEFAULT_CAPACITY_FACTORS.focusFactor;

    // Apply configuration buffer
    availableCapacity *= (1 - this.config.bufferCapacity);
    notes.push(`Applied ${(this.config.bufferCapacity * 100).toFixed(0)}% buffer capacity`);

    // Calculate confidence factor
    let confidenceFactor = 0.9; // Base confidence

    // Reduce confidence for new teams or teams with low velocity history
    if (team.averageVelocity < 10) {
      confidenceFactor -= 0.1;
      risks.push(`Team ${team.name} has low historical velocity`);
    }

    // Reduce confidence for very small teams
    if (team.memberCount < 3) {
      confidenceFactor -= 0.15;
      risks.push(`Team ${team.name} is very small (${team.memberCount} members)`);
    }

    // Reduce confidence for very large teams
    if (team.memberCount > 10) {
      confidenceFactor -= 0.1;
      risks.push(`Team ${team.name} is very large (${team.memberCount} members)`);
    }

    // Check for specialization mismatches (placeholder)
    if (team.specializations.length === 0) {
      confidenceFactor -= 0.05;
      risks.push(`Team ${team.name} has no defined specializations`);
    }

    const capacity: IterationCapacity = {
      teamId: team.id,
      teamName: team.name,
      totalCapacity: Math.round(totalCapacity),
      availableCapacity: Math.round(availableCapacity),
      teamSize: team.memberCount,
      averageVelocity: team.averageVelocity,
      confidenceFactor: Math.max(0.3, Math.min(1.0, confidenceFactor))
    };

    logger.debug('Team capacity calculated', {
      teamId: team.id,
      teamName: team.name,
      totalCapacity: capacity.totalCapacity,
      availableCapacity: capacity.availableCapacity,
      confidenceFactor: capacity.confidenceFactor
    });

    return capacity;
  }

  /**
   * Get recommended capacity adjustments
   */
  async getCapacityRecommendations(
    utilizations: CapacityUtilization[],
    teamCapacities: IterationCapacity[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze utilization patterns
    const overUtilizedTeams = utilizations.filter(u => u.isOverAllocated);
    const underUtilizedTeams = utilizations.filter(u => u.utilizationRate < 0.6);

    if (overUtilizedTeams.length > 0) {
      recommendations.push(`${overUtilizedTeams.length} teams are over-allocated - consider redistributing work`);
    }

    if (underUtilizedTeams.length > 0) {
      recommendations.push(`${underUtilizedTeams.length} teams have low utilization - consider additional work or cross-training`);
    }

    // Check for capacity imbalance
    const utilizationRates = utilizations.map(u => u.utilizationRate);
    const avgUtilization = utilizationRates.reduce((sum, rate) => sum + rate, 0) / utilizationRates.length;
    const maxDeviation = Math.max(...utilizationRates.map(rate => Math.abs(rate - avgUtilization)));

    if (maxDeviation > 0.3) {
      recommendations.push('Large capacity imbalance detected - consider rebalancing work across teams');
    }

    // Check total capacity vs demand
    const totalDemand = utilizations.reduce((sum, u) => sum + u.allocatedCapacity, 0);
    const totalCapacity = utilizations.reduce((sum, u) => sum + u.totalCapacity, 0);
    const overallUtilization = totalCapacity > 0 ? totalDemand / totalCapacity : 0;

    if (overallUtilization > 0.9) {
      recommendations.push('Overall capacity utilization is very high - consider reducing scope or adding capacity');
    } else if (overallUtilization < 0.5) {
      recommendations.push('Overall capacity utilization is low - consider adding more work or reducing team size');
    }

    return recommendations;
  }

  /**
   * Calculate capacity metrics for reporting
   */
  calculateCapacityMetrics(utilizations: CapacityUtilization[]): {
    averageUtilization: number;
    maxUtilization: number;
    minUtilization: number;
    utilizationStandardDeviation: number;
    overAllocatedTeams: number;
    totalCapacity: number;
    totalAllocated: number;
  } {
    if (utilizations.length === 0) {
      return {
        averageUtilization: 0,
        maxUtilization: 0,
        minUtilization: 0,
        utilizationStandardDeviation: 0,
        overAllocatedTeams: 0,
        totalCapacity: 0,
        totalAllocated: 0
      };
    }

    const rates = utilizations.map(u => u.utilizationRate);
    const averageUtilization = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const maxUtilization = Math.max(...rates);
    const minUtilization = Math.min(...rates);
    
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - averageUtilization, 2), 0) / rates.length;
    const utilizationStandardDeviation = Math.sqrt(variance);
    
    const overAllocatedTeams = utilizations.filter(u => u.isOverAllocated).length;
    const totalCapacity = utilizations.reduce((sum, u) => sum + u.totalCapacity, 0);
    const totalAllocated = utilizations.reduce((sum, u) => sum + u.allocatedCapacity, 0);

    return {
      averageUtilization,
      maxUtilization,
      minUtilization,
      utilizationStandardDeviation,
      overAllocatedTeams,
      totalCapacity,
      totalAllocated
    };
  }

  /**
   * Validate team capacity data
   */
  validateTeamCapacity(team: ARTTeam): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (team.averageVelocity <= 0) {
      issues.push(`Team ${team.name} has invalid average velocity: ${team.averageVelocity}`);
    }

    if (team.memberCount <= 0) {
      issues.push(`Team ${team.name} has invalid member count: ${team.memberCount}`);
    }

    if (team.capacityFactor < 0 || team.capacityFactor > 1) {
      issues.push(`Team ${team.name} has invalid capacity factor: ${team.capacityFactor}`);
    }

    if (team.averageVelocity > team.memberCount * 10) {
      issues.push(`Team ${team.name} has unusually high velocity (${team.averageVelocity}) for team size (${team.memberCount})`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}