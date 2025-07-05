/**
 * ART Validator for SAFe Iteration Planning (LIN-49)
 * 
 * Validates ART readiness and iteration plans to ensure proper
 * SAFe compliance and working software delivery capability.
 */

import {
  IterationPlan,
  Iteration,
  AllocatedWorkItem,
  CapacityUtilization,
  DeliverableValue,
  ValueDeliveryRisk,
  IterationValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationInfo,
  ARTReadinessAssessment,
  ARTReadinessCategory,
  ARTPlanningConfig
} from '../types/art-planning-types';
import { DependencyGraph } from '../types/dependency-types';
import * as logger from '../utils/logger';

/**
 * SAFe compliance validation thresholds
 */
const VALIDATION_THRESHOLDS = {
  maxStoryPoints: 5,
  minIterationValue: 0.7,
  maxCapacityUtilization: 0.85,
  minPlanningConfidence: 0.6,
  maxDependencyRisk: 0.3
};

/**
 * Validates ART planning for SAFe compliance and execution readiness
 */
export class ARTValidator {
  private config: ARTPlanningConfig;

  constructor(config: ARTPlanningConfig) {
    this.config = config;
    logger.debug('ARTValidator initialized', {
      minValueThreshold: config.minValueDeliveryThreshold,
      maxUtilization: config.maxCapacityUtilization
    });
  }

  /**
   * Validate story readiness across all iterations
   */
  async validateStoryReadiness(iterationPlans: IterationPlan[]): Promise<ARTReadinessAssessment> {
    logger.debug('Validating story readiness', {
      iterationCount: iterationPlans.length
    });

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 1.0;

    let totalStories = 0;
    let oversizedStories = 0;
    let storiesWithoutAC = 0;

    for (const plan of iterationPlans) {
      for (const allocation of plan.allocatedWork) {
        const workItem = allocation.workItem;
        
        if (workItem.type === 'story') {
          totalStories++;

          // Check story size
          const storyPoints = 'storyPoints' in workItem ? workItem.storyPoints : 0;
          if (storyPoints && storyPoints > VALIDATION_THRESHOLDS.maxStoryPoints) {
            oversizedStories++;
            issues.push(`Story ${workItem.id} has ${storyPoints} points (>5)`);
          }

          // Check acceptance criteria
          if ('acceptanceCriteria' in workItem) {
            const ac = workItem.acceptanceCriteria;
            if (!ac || ac.length === 0) {
              storiesWithoutAC++;
              issues.push(`Story ${workItem.id} lacks acceptance criteria`);
            }
          }
        }
      }
    }

    // Calculate score based on compliance
    if (totalStories > 0) {
      const oversizedRatio = oversizedStories / totalStories;
      const missingACRatio = storiesWithoutAC / totalStories;
      
      score -= oversizedRatio * 0.5; // 50% penalty for oversized stories
      score -= missingACRatio * 0.3; // 30% penalty for missing AC
    }

    score = Math.max(0, Math.min(1, score));

    // Generate recommendations
    if (oversizedStories > 0) {
      recommendations.push(`Break down ${oversizedStories} oversized stories into smaller sub-stories`);
    }
    
    if (storiesWithoutAC > 0) {
      recommendations.push(`Add acceptance criteria to ${storiesWithoutAC} stories`);
    }

    if (score >= 0.8) {
      recommendations.push('Story readiness is good - all stories are properly sized and defined');
    }

    const assessment: ARTReadinessAssessment = {
      category: ARTReadinessCategory.STORY_READINESS,
      score,
      isReady: score >= 0.8 && issues.length === 0,
      issues,
      recommendations
    };

    logger.debug('Story readiness validation completed', {
      score: score.toFixed(2),
      isReady: assessment.isReady,
      totalStories,
      oversizedStories,
      storiesWithoutAC
    });

    return assessment;
  }

  /**
   * Validate dependency resolution and ordering
   */
  async validateDependencyResolution(
    iterationPlans: IterationPlan[],
    dependencies: DependencyGraph
  ): Promise<ARTReadinessAssessment> {
    logger.debug('Validating dependency resolution', {
      iterationCount: iterationPlans.length,
      dependencyCount: dependencies.edges.length
    });

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 1.0;

    // Check for circular dependencies
    if (dependencies.circularDependencies.length > 0) {
      issues.push(`${dependencies.circularDependencies.length} circular dependencies detected`);
      score -= 0.4;
      recommendations.push('Resolve circular dependencies before execution');
    }

    // Check dependency ordering in iterations
    const orderingViolations = this.checkDependencyOrdering(iterationPlans, dependencies);
    if (orderingViolations.length > 0) {
      issues.push(`${orderingViolations.length} dependency ordering violations`);
      score -= orderingViolations.length * 0.1;
      recommendations.push('Reorder work items to respect dependency constraints');
    }

    // Check for external dependencies
    const externalDependencies = this.findExternalDependencies(iterationPlans, dependencies);
    if (externalDependencies.length > 0) {
      recommendations.push(`Monitor ${externalDependencies.length} external dependencies`);
      score -= externalDependencies.length * 0.05;
    }

    score = Math.max(0, Math.min(1, score));

    const assessment: ARTReadinessAssessment = {
      category: ARTReadinessCategory.DEPENDENCY_RESOLUTION,
      score,
      isReady: score >= 0.8 && issues.length === 0,
      issues,
      recommendations
    };

    logger.debug('Dependency resolution validation completed', {
      score: score.toFixed(2),
      isReady: assessment.isReady,
      circularDependencies: dependencies.circularDependencies.length,
      orderingViolations: orderingViolations.length
    });

    return assessment;
  }

  /**
   * Validate capacity allocation across iterations
   */
  async validateCapacityAllocation(iterationPlans: IterationPlan[]): Promise<ARTReadinessAssessment> {
    logger.debug('Validating capacity allocation', {
      iterationCount: iterationPlans.length
    });

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 1.0;

    let overAllocatedIterations = 0;
    let underUtilizedIterations = 0;

    for (const plan of iterationPlans) {
      const overAllocatedTeams = plan.capacityUtilization.filter(cu => cu.isOverAllocated);
      const underUtilizedTeams = plan.capacityUtilization.filter(cu => cu.utilizationRate < 0.5);

      if (overAllocatedTeams.length > 0) {
        overAllocatedIterations++;
        issues.push(`Iteration ${plan.iteration.name} has ${overAllocatedTeams.length} over-allocated teams`);
      }

      if (underUtilizedTeams.length > 0) {
        underUtilizedIterations++;
        recommendations.push(`Iteration ${plan.iteration.name} has ${underUtilizedTeams.length} under-utilized teams`);
      }
    }

    // Calculate score
    if (iterationPlans.length > 0) {
      const overAllocationRatio = overAllocatedIterations / iterationPlans.length;
      score -= overAllocationRatio * 0.6; // 60% penalty for over-allocation
    }

    score = Math.max(0, Math.min(1, score));

    // Generate recommendations
    if (overAllocatedIterations > 0) {
      recommendations.push('Redistribute work to resolve capacity over-allocation');
    }

    if (underUtilizedIterations > 0) {
      recommendations.push('Consider additional work for under-utilized teams');
    }

    const assessment: ARTReadinessAssessment = {
      category: ARTReadinessCategory.CAPACITY_ALLOCATION,
      score,
      isReady: score >= 0.8 && issues.length === 0,
      issues,
      recommendations
    };

    logger.debug('Capacity allocation validation completed', {
      score: score.toFixed(2),
      isReady: assessment.isReady,
      overAllocatedIterations,
      underUtilizedIterations
    });

    return assessment;
  }

  /**
   * Validate value delivery capability for each iteration
   */
  async validateValueDelivery(iterationPlans: IterationPlan[]): Promise<ARTReadinessAssessment> {
    logger.debug('Validating value delivery', {
      iterationCount: iterationPlans.length
    });

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 1.0;

    let iterationsWithValue = 0;
    let iterationsWithRisks = 0;

    for (const plan of iterationPlans) {
      const valueDelivery = plan.deliverableValue;

      if (valueDelivery.canDeliverWorkingSoftware) {
        iterationsWithValue++;
      } else {
        issues.push(`Iteration ${plan.iteration.name} cannot deliver working software`);
      }

      if (valueDelivery.valueConfidence < this.config.minValueDeliveryThreshold) {
        issues.push(`Iteration ${plan.iteration.name} has low value delivery confidence (${(valueDelivery.valueConfidence * 100).toFixed(0)}%)`);
      }

      if (valueDelivery.valueRisks.filter(risk => risk.severity === 'high' || risk.severity === 'critical').length > 0) {
        iterationsWithRisks++;
        recommendations.push(`Address high-severity value risks in iteration ${plan.iteration.name}`);
      }
    }

    // Calculate score
    if (iterationPlans.length > 0) {
      const valueDeliveryRatio = iterationsWithValue / iterationPlans.length;
      score = valueDeliveryRatio;
      
      // Penalize for high-risk iterations
      const riskRatio = iterationsWithRisks / iterationPlans.length;
      score -= riskRatio * 0.2;
    }

    score = Math.max(0, Math.min(1, score));

    // Generate recommendations
    if (iterationsWithValue < iterationPlans.length) {
      recommendations.push('Ensure all iterations can deliver working software value');
    }

    if (iterationsWithRisks > 0) {
      recommendations.push('Develop mitigation strategies for value delivery risks');
    }

    const assessment: ARTReadinessAssessment = {
      category: ARTReadinessCategory.VALUE_DELIVERY,
      score,
      isReady: score >= 0.8 && issues.length === 0,
      issues,
      recommendations
    };

    logger.debug('Value delivery validation completed', {
      score: score.toFixed(2),
      isReady: assessment.isReady,
      iterationsWithValue,
      iterationsWithRisks
    });

    return assessment;
  }

  /**
   * Validate deliverable value for a single iteration
   */
  async validateDeliverableValue(
    allocatedWork: AllocatedWorkItem[],
    dependencies: DependencyGraph
  ): Promise<DeliverableValue> {
    let canDeliverWorkingSoftware = false;
    const valueDeliveryStories: string[] = [];
    const valuePrerequisites: string[] = [];
    const valueRisks: ValueDeliveryRisk[] = [];

    // Analyze work items for value delivery potential
    for (const allocation of allocatedWork) {
      const workItem = allocation.workItem;
      
      if (workItem.type === 'story') {
        // Check if this story can deliver value
        if (this.canStoryDeliverValue(workItem, allocation)) {
          canDeliverWorkingSoftware = true;
          valueDeliveryStories.push(workItem.id);
        }
      }

      // Check for prerequisites
      if (allocation.blockedBy.length > 0) {
        valuePrerequisites.push(...allocation.blockedBy);
      }

      // Identify value delivery risks
      const risks = this.identifyValueRisks(allocation, dependencies);
      valueRisks.push(...risks);
    }

    // Determine primary value
    const primaryValue = canDeliverWorkingSoftware 
      ? `Working software delivered through ${valueDeliveryStories.length} user stories`
      : 'Infrastructure and enabler work';

    // Calculate value confidence
    const valueConfidence = this.calculateValueConfidence(
      allocatedWork,
      valueDeliveryStories,
      valueRisks
    );

    const deliverableValue: DeliverableValue = {
      canDeliverWorkingSoftware,
      primaryValue,
      secondaryValues: this.identifySecondaryValues(allocatedWork),
      valueConfidence,
      valueDeliveryStories,
      valuePrerequisites: Array.from(new Set(valuePrerequisites)),
      valueRisks
    };

    return deliverableValue;
  }

  /**
   * Validate a complete iteration plan
   */
  async validateIteration(
    iteration: Iteration,
    allocatedWork: AllocatedWorkItem[],
    capacityUtilization: CapacityUtilization[],
    deliverableValue: DeliverableValue
  ): Promise<IterationValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    // Validate capacity
    const overAllocatedTeams = capacityUtilization.filter(cu => cu.isOverAllocated);
    if (overAllocatedTeams.length > 0) {
      errors.push({
        code: 'CAPACITY_OVER_ALLOCATION',
        message: `${overAllocatedTeams.length} teams are over-allocated`,
        affectedWorkItems: allocatedWork.filter(work => 
          overAllocatedTeams.some(team => team.teamId === work.assignedTeam)
        ).map(work => work.workItem.id),
        suggestedFix: 'Redistribute work to available teams or reduce scope',
        severity: 'error'
      });
    }

    // Validate value delivery
    if (!deliverableValue.canDeliverWorkingSoftware) {
      warnings.push({
        code: 'NO_WORKING_SOFTWARE',
        message: 'Iteration does not deliver working software',
        affectedWorkItems: allocatedWork.map(work => work.workItem.id),
        recommendation: 'Include user-facing stories that deliver value'
      });
    }

    // Validate work item sizing
    const oversizedItems = allocatedWork.filter(work => {
      const points = 'storyPoints' in work.workItem ? work.workItem.storyPoints : 0;
      return points && points > VALIDATION_THRESHOLDS.maxStoryPoints;
    });

    if (oversizedItems.length > 0) {
      errors.push({
        code: 'OVERSIZED_STORIES',
        message: `${oversizedItems.length} stories exceed 5 story points`,
        affectedWorkItems: oversizedItems.map(item => item.workItem.id),
        suggestedFix: 'Break down large stories into smaller sub-stories',
        severity: 'error'
      });
    }

    // Calculate validation score
    const errorWeight = errors.length * 0.3;
    const warningWeight = warnings.length * 0.1;
    const validationScore = Math.max(0, 1 - errorWeight - warningWeight);

    const validation: IterationValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      validationScore
    };

    return validation;
  }

  // Helper methods

  private checkDependencyOrdering(
    iterationPlans: IterationPlan[],
    dependencies: DependencyGraph
  ): string[] {
    const violations: string[] = [];
    
    // Build iteration assignment map
    const workItemIterations = new Map<string, number>();
    
    iterationPlans.forEach((plan, index) => {
      plan.allocatedWork.forEach(allocation => {
        workItemIterations.set(allocation.workItem.id, index);
      });
    });

    // Check each dependency
    for (const edge of dependencies.edges) {
      if (edge.type === 'requires' || edge.type === 'blocked_by') {
        const sourceIteration = workItemIterations.get(edge.sourceId);
        const targetIteration = workItemIterations.get(edge.targetId);
        
        if (sourceIteration !== undefined && targetIteration !== undefined) {
          if (sourceIteration < targetIteration) {
            violations.push(`${edge.sourceId} scheduled before its dependency ${edge.targetId}`);
          }
        }
      }
    }

    return violations;
  }

  private findExternalDependencies(
    iterationPlans: IterationPlan[],
    dependencies: DependencyGraph
  ): string[] {
    const internalWorkItems = new Set();
    
    iterationPlans.forEach(plan => {
      plan.allocatedWork.forEach(allocation => {
        internalWorkItems.add(allocation.workItem.id);
      });
    });

    const externalDependencies: string[] = [];
    
    for (const edge of dependencies.edges) {
      if (internalWorkItems.has(edge.sourceId) && !internalWorkItems.has(edge.targetId)) {
        externalDependencies.push(edge.targetId);
      }
    }

    return Array.from(new Set(externalDependencies));
  }

  private canStoryDeliverValue(workItem: any, allocation: AllocatedWorkItem): boolean {
    // Simple heuristic: stories with acceptance criteria can deliver value
    if ('acceptanceCriteria' in workItem && workItem.acceptanceCriteria && workItem.acceptanceCriteria.length > 0) {
      return true;
    }
    
    // Stories that are user-facing (check title/description for user keywords)
    const content = `${workItem.title} ${workItem.description}`.toLowerCase();
    const userFacingKeywords = ['user', 'customer', 'interface', 'ui', 'ux', 'display', 'show'];
    
    return userFacingKeywords.some(keyword => content.includes(keyword));
  }

  private identifyValueRisks(
    allocation: AllocatedWorkItem,
    dependencies: DependencyGraph
  ): ValueDeliveryRisk[] {
    const risks: ValueDeliveryRisk[] = [];

    // Risk: Too many dependencies
    if (allocation.blockedBy.length > 3) {
      risks.push({
        id: `high-dependency-${allocation.workItem.id}`,
        description: `Work item has ${allocation.blockedBy.length} dependencies`,
        severity: 'medium',
        probability: 0.6,
        impact: 'May delay value delivery if dependencies are not ready',
        mitigations: ['Monitor dependency completion closely', 'Prepare alternative implementation'],
        owner: allocation.assignedTeam
      });
    }

    // Risk: Low allocation confidence
    if (allocation.confidence < 0.7) {
      risks.push({
        id: `low-confidence-${allocation.workItem.id}`,
        description: 'Low confidence in allocation estimate',
        severity: 'medium',
        probability: 0.4,
        impact: 'Work may take longer than expected',
        mitigations: ['Add buffer time', 'Break down work further', 'Get expert review']
      });
    }

    return risks;
  }

  private calculateValueConfidence(
    allocatedWork: AllocatedWorkItem[],
    valueDeliveryStories: string[],
    valueRisks: ValueDeliveryRisk[]
  ): number {
    let confidence = 0.8; // Base confidence

    // Boost confidence if we have value-delivering stories
    if (valueDeliveryStories.length > 0) {
      confidence += Math.min(0.2, valueDeliveryStories.length * 0.05);
    } else {
      confidence -= 0.3; // Penalize for no value stories
    }

    // Reduce confidence for high-severity risks
    const highSeverityRisks = valueRisks.filter(risk => 
      risk.severity === 'high' || risk.severity === 'critical'
    );
    confidence -= highSeverityRisks.length * 0.1;

    // Reduce confidence for low-confidence allocations
    const lowConfidenceWork = allocatedWork.filter(work => work.confidence < 0.7);
    confidence -= (lowConfidenceWork.length / allocatedWork.length) * 0.2;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private identifySecondaryValues(allocatedWork: AllocatedWorkItem[]): string[] {
    const secondaryValues: string[] = [];

    const hasEnablers = allocatedWork.some(work => work.workItem.type === 'enabler');
    if (hasEnablers) {
      secondaryValues.push('Technical enablers and infrastructure improvements');
    }

    const hasFeatures = allocatedWork.some(work => work.workItem.type === 'feature');
    if (hasFeatures) {
      secondaryValues.push('Feature development and capabilities');
    }

    const hasResearch = allocatedWork.some(work => 
      work.workItem.description.toLowerCase().includes('research') ||
      work.workItem.description.toLowerCase().includes('spike')
    );
    if (hasResearch) {
      secondaryValues.push('Learning and risk reduction');
    }

    return secondaryValues;
  }
}