/**
 * Working Software Validator for ART Planning (LIN-49 Phase 2)
 * 
 * Validates that each iteration delivers deployable software
 * and ensures proper quality gates and deployment readiness.
 */

import {
  AllocatedWorkItem,
  PlanningWorkItem,
  IterationPlan,
  DeploymentReadinessResult,
  IntegrationValidation,
  UserValueValidation,
  DeliveryConfidenceScore,
  QualityGateStatus,
  DeploymentBlocker,
  WorkingSoftwareComponent
} from '../types/art-planning-types';
import { Story } from '../planning/models';
import * as logger from '../utils/logger';

/**
 * Working software validation configuration
 */
interface ValidationConfig {
  minAcceptanceCriteriaCount: number;
  minTestCoverage: number;
  maxIntegrationComplexity: number;
  requiredQualityGates: string[];
  deploymentReadinessThreshold: number;
}

/**
 * Default validation configuration
 */
const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  minAcceptanceCriteriaCount: 3,
  minTestCoverage: 0.8,
  maxIntegrationComplexity: 5,
  requiredQualityGates: ['code-review', 'test-coverage', 'security-scan', 'performance'],
  deploymentReadinessThreshold: 0.85
};

/**
 * Validates working software delivery capability for iterations
 */
export class WorkingSoftwareValidator {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    logger.debug('WorkingSoftwareValidator initialized', {
      minTestCoverage: this.config.minTestCoverage,
      readinessThreshold: this.config.deploymentReadinessThreshold
    });
  }

  /**
   * Validate deployment readiness for stories
   */
  async validateDeploymentReadiness(stories: Story[]): Promise<DeploymentReadinessResult> {
    logger.debug('Validating deployment readiness', {
      storyCount: stories.length
    });

    const readinessChecks = await Promise.all(
      stories.map(story => this.checkStoryReadiness(story))
    );

    const readyStories = readinessChecks.filter(check => check.isReady);
    const blockedStories = readinessChecks.filter(check => !check.isReady);

    const overallReadiness = stories.length > 0 
      ? readyStories.length / stories.length 
      : 0;

    const criticalBlockers = this.identifyCriticalBlockers(readinessChecks);
    const deploymentRisks = this.assessDeploymentRisks(stories, readinessChecks);

    const result: DeploymentReadinessResult = {
      canDeploy: overallReadiness >= this.config.deploymentReadinessThreshold,
      readinessScore: overallReadiness,
      readyStories: readyStories.map(check => check.storyId),
      blockedStories: blockedStories.map(check => ({
        storyId: check.storyId,
        blockers: check.blockers
      })),
      criticalBlockers,
      deploymentRisks,
      estimatedDeploymentDuration: this.estimateDeploymentDuration(readyStories.length),
      rollbackStrategy: this.defineRollbackStrategy(stories)
    };

    logger.info('Deployment readiness validation completed', {
      canDeploy: result.canDeploy,
      readinessScore: result.readinessScore.toFixed(2),
      readyCount: readyStories.length,
      blockedCount: blockedStories.length
    });

    return result;
  }

  /**
   * Check integration completeness for an iteration
   */
  async checkIntegrationCompleteness(iteration: IterationPlan): Promise<IntegrationValidation> {
    logger.debug('Checking integration completeness', {
      iterationId: iteration.iteration.id,
      workItemCount: iteration.allocatedWork.length
    });

    const integrationPoints = await this.identifyIntegrationPoints(iteration);
    const validatedIntegrations = await this.validateIntegrations(integrationPoints);
    const integrationDependencies = this.mapIntegrationDependencies(
      iteration.allocatedWork,
      integrationPoints
    );

    const completenessScore = this.calculateIntegrationCompleteness(
      integrationPoints,
      validatedIntegrations
    );

    const validation: IntegrationValidation = {
      isComplete: completenessScore >= 0.9,
      integrationPoints: integrationPoints.map(ip => ({
        id: ip.id,
        name: ip.name,
        type: ip.type,
        status: ip.status,
        dependencies: ip.dependencies
      })),
      validatedIntegrations: validatedIntegrations.map(vi => vi.id),
      pendingIntegrations: integrationPoints
        .filter(ip => !validatedIntegrations.some(vi => vi.id === ip.id))
        .map(ip => ip.id),
      integrationRisks: this.assessIntegrationRisks(integrationPoints, integrationDependencies),
      completenessScore,
      recommendations: this.generateIntegrationRecommendations(
        integrationPoints,
        validatedIntegrations
      )
    };

    logger.info('Integration completeness check completed', {
      isComplete: validation.isComplete,
      completenessScore: validation.completenessScore.toFixed(2),
      pendingCount: validation.pendingIntegrations.length
    });

    return validation;
  }

  /**
   * Validate user value delivery for stories
   */
  async validateUserValueDelivery(stories: Story[]): Promise<UserValueValidation> {
    logger.debug('Validating user value delivery', {
      storyCount: stories.length
    });

    const valueAssessments = await Promise.all(
      stories.map(story => this.assessStoryValue(story))
    );

    const highValueStories = valueAssessments.filter(assessment => assessment.valueScore > 0.7);
    const userImpactScore = this.calculateUserImpactScore(valueAssessments);
    const valueDistribution = this.analyzeValueDistribution(valueAssessments);

    const validation: UserValueValidation = {
      deliversUserValue: highValueStories.length >= stories.length * 0.7,
      userValueScore: userImpactScore,
      valueDeliveryConfidence: this.calculateValueConfidence(valueAssessments),
      impactedUserSegments: this.identifyImpactedSegments(stories),
      valueMetrics: {
        totalValuePoints: valueAssessments.reduce((sum, a) => sum + a.valuePoints, 0),
        averageValuePerStory: stories.length > 0 
          ? valueAssessments.reduce((sum, a) => sum + a.valuePoints, 0) / stories.length 
          : 0,
        highValueStoryCount: highValueStories.length,
        valueDistribution
      },
      recommendations: this.generateValueRecommendations(valueAssessments)
    };

    logger.info('User value validation completed', {
      deliversValue: validation.deliversUserValue,
      valueScore: validation.userValueScore.toFixed(2),
      confidence: validation.valueDeliveryConfidence.toFixed(2)
    });

    return validation;
  }

  /**
   * Assess delivery confidence for an iteration
   */
  async assessDeliveryConfidence(iteration: IterationPlan): Promise<DeliveryConfidenceScore> {
    logger.debug('Assessing delivery confidence', {
      iterationId: iteration.iteration.id
    });

    const teamConfidence = this.assessTeamConfidence(iteration);
    const technicalConfidence = this.assessTechnicalConfidence(iteration);
    const dependencyConfidence = this.assessDependencyConfidence(iteration);
    const capacityConfidence = this.assessCapacityConfidence(iteration);

    const overallConfidence = this.calculateOverallConfidence({
      teamConfidence,
      technicalConfidence,
      dependencyConfidence,
      capacityConfidence
    });

    const confidenceScore: DeliveryConfidenceScore = {
      overallConfidence,
      confidenceBreakdown: {
        teamReadiness: teamConfidence,
        technicalReadiness: technicalConfidence,
        dependencyResolution: dependencyConfidence,
        capacityAlignment: capacityConfidence
      },
      riskFactors: this.identifyConfidenceRisks(iteration, overallConfidence),
      confidenceLevel: this.categorizeConfidenceLevel(overallConfidence),
      recommendations: this.generateConfidenceRecommendations(
        overallConfidence,
        { teamConfidence, technicalConfidence, dependencyConfidence, capacityConfidence }
      )
    };

    logger.info('Delivery confidence assessment completed', {
      overallConfidence: confidenceScore.overallConfidence.toFixed(2),
      confidenceLevel: confidenceScore.confidenceLevel
    });

    return confidenceScore;
  }

  // Private helper methods

  private async checkStoryReadiness(story: Story): Promise<{
    storyId: string;
    isReady: boolean;
    blockers: string[];
  }> {
    const blockers: string[] = [];

    // Check acceptance criteria
    if (!story.acceptanceCriteria || story.acceptanceCriteria.length < this.config.minAcceptanceCriteriaCount) {
      blockers.push(`Insufficient acceptance criteria (min: ${this.config.minAcceptanceCriteriaCount})`);
    }

    // Check story points
    if (story.storyPoints && story.storyPoints > 5) {
      blockers.push('Story exceeds 5 point limit - needs decomposition');
    }

    // Check definition of done
    if (!this.meetsDefinitionOfDone(story)) {
      blockers.push('Does not meet Definition of Done criteria');
    }

    // Check dependencies
    if (story.attributes.blockedBy && story.attributes.blockedBy.length > 0) {
      blockers.push(`Blocked by ${story.attributes.blockedBy.length} unresolved dependencies`);
    }

    return {
      storyId: story.id,
      isReady: blockers.length === 0,
      blockers
    };
  }

  private meetsDefinitionOfDone(story: Story): boolean {
    // Simplified DoD check
    const hasAcceptanceCriteria = story.acceptanceCriteria && story.acceptanceCriteria.length > 0;
    const hasReasonableSize = story.storyPoints ? story.storyPoints <= 5 : true;
    const hasDescription = !!(story.description && story.description.length > 20);

    return hasAcceptanceCriteria && hasReasonableSize && hasDescription;
  }

  private identifyCriticalBlockers(readinessChecks: any[]): DeploymentBlocker[] {
    const blockers: DeploymentBlocker[] = [];
    const blockerCounts = new Map<string, number>();

    // Count blocker types
    for (const check of readinessChecks) {
      for (const blocker of check.blockers) {
        blockerCounts.set(blocker, (blockerCounts.get(blocker) || 0) + 1);
      }
    }

    // Create deployment blockers for common issues
    for (const [blockerType, count] of blockerCounts) {
      if (count >= 3) { // 3+ stories with same blocker is critical
        blockers.push({
          id: `blocker-${blockerType.toLowerCase().replace(/\s+/g, '-')}`,
          type: this.categorizeBlockerType(blockerType),
          severity: count >= 5 ? 'critical' : 'high',
          description: `${count} stories blocked by: ${blockerType}`,
          affectedWorkItems: readinessChecks
            .filter(check => check.blockers.includes(blockerType))
            .map(check => check.storyId),
          resolution: this.suggestBlockerResolution(blockerType)
        });
      }
    }

    return blockers;
  }

  private categorizeBlockerType(blocker: string): 'technical' | 'requirements' | 'dependency' | 'capacity' {
    const lower = blocker.toLowerCase();
    if (lower.includes('acceptance') || lower.includes('criteria')) return 'requirements';
    if (lower.includes('depend') || lower.includes('blocked')) return 'dependency';
    if (lower.includes('capacity') || lower.includes('resource')) return 'capacity';
    return 'technical';
  }

  private suggestBlockerResolution(blockerType: string): string {
    const lower = blockerType.toLowerCase();
    if (lower.includes('acceptance criteria')) {
      return 'Work with Product Owner to define clear acceptance criteria';
    }
    if (lower.includes('story exceeds')) {
      return 'Decompose large stories into smaller, manageable pieces';
    }
    if (lower.includes('definition of done')) {
      return 'Review and update stories to meet DoD requirements';
    }
    if (lower.includes('blocked by')) {
      return 'Resolve dependencies or resequence work';
    }
    return 'Address technical issues blocking deployment';
  }

  private assessDeploymentRisks(stories: Story[], readinessChecks: any[]): string[] {
    const risks: string[] = [];

    // Risk: Low readiness rate
    const readinessRate = readinessChecks.filter(c => c.isReady).length / Math.max(readinessChecks.length, 1);
    if (readinessRate < 0.7) {
      risks.push(`Only ${(readinessRate * 100).toFixed(0)}% of stories are deployment ready`);
    }

    // Risk: High complexity stories
    const highComplexityCount = stories.filter(s => s.storyPoints && s.storyPoints >= 5).length;
    if (highComplexityCount > 0) {
      risks.push(`${highComplexityCount} high-complexity stories may impact deployment`);
    }

    // Risk: Integration dependencies
    const integrationStories = stories.filter(s => 
      s.title.toLowerCase().includes('integration') || 
      s.description.toLowerCase().includes('api')
    );
    if (integrationStories.length > stories.length * 0.3) {
      risks.push('High concentration of integration work increases deployment risk');
    }

    return risks;
  }

  private estimateDeploymentDuration(readyStoryCount: number): number {
    // Base duration + time per story
    const baseDuration = 30; // 30 minutes base
    const timePerStory = 10; // 10 minutes per story
    return baseDuration + (readyStoryCount * timePerStory);
  }

  private defineRollbackStrategy(stories: Story[]): string {
    const hasDataChanges = stories.some(s => 
      s.description.toLowerCase().includes('database') || 
      s.description.toLowerCase().includes('migration')
    );

    const hasApiChanges = stories.some(s => 
      s.title.toLowerCase().includes('api') || 
      s.description.toLowerCase().includes('endpoint')
    );

    if (hasDataChanges && hasApiChanges) {
      return 'Blue-green deployment with database rollback scripts and API versioning';
    } else if (hasDataChanges) {
      return 'Staged rollback with database migration reversal';
    } else if (hasApiChanges) {
      return 'API versioning with gradual traffic shift';
    }
    
    return 'Standard rollback to previous deployment';
  }

  private async identifyIntegrationPoints(iteration: IterationPlan): Promise<any[]> {
    const integrationPoints: any[] = [];

    for (const item of iteration.allocatedWork) {
      const content = `${item.workItem.title} ${item.workItem.description}`.toLowerCase();
      
      if (content.includes('api') || content.includes('integration') || 
          content.includes('service') || content.includes('interface')) {
        integrationPoints.push({
          id: `integration-${item.workItem.id}`,
          name: item.workItem.title,
          type: this.identifyIntegrationType(content),
          status: item.confidence > 0.7 ? 'ready' : 'pending',
          dependencies: item.blockedBy,
          complexity: item.blockedBy.length + 1
        });
      }
    }

    return integrationPoints;
  }

  private identifyIntegrationType(content: string): 'api' | 'service' | 'database' | 'external' {
    if (content.includes('api') || content.includes('endpoint')) return 'api';
    if (content.includes('database') || content.includes('data')) return 'database';
    if (content.includes('external') || content.includes('third-party')) return 'external';
    return 'service';
  }

  private async validateIntegrations(integrationPoints: any[]): Promise<any[]> {
    return integrationPoints.filter(ip => {
      // Integration is validated if ready and not too complex
      return ip.status === 'ready' && ip.complexity <= this.config.maxIntegrationComplexity;
    });
  }

  private mapIntegrationDependencies(
    workItems: AllocatedWorkItem[],
    integrationPoints: any[]
  ): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    for (const ip of integrationPoints) {
      const deps: string[] = [];
      
      // Find work items that depend on this integration
      for (const item of workItems) {
        if (item.blockedBy.includes(ip.id) || item.enables.includes(ip.id)) {
          deps.push(item.workItem.id);
        }
      }
      
      dependencies.set(ip.id, deps);
    }

    return dependencies;
  }

  private calculateIntegrationCompleteness(
    integrationPoints: any[],
    validatedIntegrations: any[]
  ): number {
    if (integrationPoints.length === 0) return 1.0;
    return validatedIntegrations.length / integrationPoints.length;
  }

  private assessIntegrationRisks(
    integrationPoints: any[],
    dependencies: Map<string, string[]>
  ): string[] {
    const risks: string[] = [];

    // Risk: High complexity integrations
    const highComplexity = integrationPoints.filter(ip => ip.complexity > 3);
    if (highComplexity.length > 0) {
      risks.push(`${highComplexity.length} integrations have high complexity (3+ dependencies)`);
    }

    // Risk: Critical path integrations
    const criticalIntegrations = Array.from(dependencies.entries())
      .filter(([_, deps]) => deps.length > 2);
    if (criticalIntegrations.length > 0) {
      risks.push(`${criticalIntegrations.length} integrations are on critical path`);
    }

    // Risk: External integrations
    const externalIntegrations = integrationPoints.filter(ip => ip.type === 'external');
    if (externalIntegrations.length > 0) {
      risks.push(`${externalIntegrations.length} external integrations may have reliability concerns`);
    }

    return risks;
  }

  private generateIntegrationRecommendations(
    integrationPoints: any[],
    validatedIntegrations: any[]
  ): string[] {
    const recommendations: string[] = [];

    const pendingCount = integrationPoints.length - validatedIntegrations.length;
    if (pendingCount > 0) {
      recommendations.push(`Complete validation for ${pendingCount} pending integrations`);
    }

    const highComplexityCount = integrationPoints.filter(ip => ip.complexity > 3).length;
    if (highComplexityCount > 0) {
      recommendations.push('Consider simplifying high-complexity integrations');
    }

    if (integrationPoints.some(ip => ip.type === 'external')) {
      recommendations.push('Implement circuit breakers for external integrations');
    }

    return recommendations;
  }

  private async assessStoryValue(story: Story): Promise<{
    storyId: string;
    valueScore: number;
    valuePoints: number;
    userSegment: string;
  }> {
    let valueScore = 0.5; // Base score
    let valuePoints = (story.storyPoints || 1) * 10; // Base points

    // Increase value for user-facing stories
    const content = `${story.title} ${story.description}`.toLowerCase();
    if (content.includes('user') || content.includes('customer') || 
        content.includes('interface') || content.includes('experience')) {
      valueScore += 0.3;
      valuePoints *= 1.5;
    }

    // Increase value for high priority
    if (story.priority && story.priority <= 2) {
      valueScore += 0.2;
      valuePoints *= 1.2;
    }

    // Determine user segment
    let userSegment = 'general';
    if (content.includes('enterprise')) userSegment = 'enterprise';
    else if (content.includes('developer') || content.includes('api')) userSegment = 'developer';
    else if (content.includes('admin')) userSegment = 'admin';

    return {
      storyId: story.id,
      valueScore: Math.min(1.0, valueScore),
      valuePoints: Math.round(valuePoints),
      userSegment
    };
  }

  private calculateUserImpactScore(assessments: any[]): number {
    if (assessments.length === 0) return 0;
    
    const totalScore = assessments.reduce((sum, a) => sum + a.valueScore, 0);
    return totalScore / assessments.length;
  }

  private analyzeValueDistribution(assessments: any[]): {
    high: number;
    medium: number;
    low: number;
  } {
    const high = assessments.filter(a => a.valueScore > 0.7).length;
    const medium = assessments.filter(a => a.valueScore > 0.4 && a.valueScore <= 0.7).length;
    const low = assessments.filter(a => a.valueScore <= 0.4).length;

    return { high, medium, low };
  }

  private calculateValueConfidence(assessments: any[]): number {
    if (assessments.length === 0) return 0.5;

    // Base confidence on value score distribution
    const avgScore = this.calculateUserImpactScore(assessments);
    const distribution = this.analyzeValueDistribution(assessments);
    
    let confidence = avgScore;
    
    // Boost confidence for good distribution
    if (distribution.high > assessments.length * 0.5) {
      confidence += 0.1;
    }
    
    // Reduce confidence for poor distribution
    if (distribution.low > assessments.length * 0.3) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private identifyImpactedSegments(stories: Story[]): string[] {
    const segments = new Set<string>();

    for (const story of stories) {
      const content = `${story.title} ${story.description}`.toLowerCase();
      
      if (content.includes('all users') || content.includes('everyone')) {
        segments.add('all-users');
      }
      if (content.includes('enterprise')) {
        segments.add('enterprise');
      }
      if (content.includes('developer') || content.includes('api')) {
        segments.add('developers');
      }
      if (content.includes('admin')) {
        segments.add('administrators');
      }
      if (!segments.size) {
        segments.add('general-users');
      }
    }

    return Array.from(segments);
  }

  private generateValueRecommendations(assessments: any[]): string[] {
    const recommendations: string[] = [];
    const distribution = this.analyzeValueDistribution(assessments);

    if (distribution.low > assessments.length * 0.3) {
      recommendations.push('Increase focus on high-value user-facing stories');
    }

    const segmentCounts = new Map<string, number>();
    for (const assessment of assessments) {
      segmentCounts.set(
        assessment.userSegment,
        (segmentCounts.get(assessment.userSegment) || 0) + 1
      );
    }

    if (segmentCounts.size === 1) {
      recommendations.push('Diversify value delivery across multiple user segments');
    }

    if (assessments.every(a => a.valuePoints < 50)) {
      recommendations.push('Include some higher-impact stories for significant value delivery');
    }

    return recommendations;
  }

  private assessTeamConfidence(iteration: IterationPlan): number {
    // Base confidence on allocation confidence
    const avgConfidence = iteration.allocatedWork.reduce(
      (sum, item) => sum + item.confidence, 0
    ) / Math.max(iteration.allocatedWork.length, 1);

    return avgConfidence;
  }

  private assessTechnicalConfidence(iteration: IterationPlan): number {
    let confidence = 0.8; // Base technical confidence

    // Reduce for high complexity items
    const highComplexityCount = iteration.allocatedWork.filter(
      item => 'storyPoints' in item.workItem && item.workItem.storyPoints && item.workItem.storyPoints >= 5
    ).length;

    if (highComplexityCount > 0) {
      confidence -= highComplexityCount * 0.05;
    }

    // Reduce for many dependencies
    const avgDependencies = iteration.allocatedWork.reduce(
      (sum, item) => sum + item.blockedBy.length, 0
    ) / Math.max(iteration.allocatedWork.length, 1);

    if (avgDependencies > 2) {
      confidence -= 0.1;
    }

    return Math.max(0.3, confidence);
  }

  private assessDependencyConfidence(iteration: IterationPlan): number {
    const totalDependencies = iteration.allocatedWork.reduce(
      (sum, item) => sum + item.blockedBy.length, 0
    );

    const totalItems = iteration.allocatedWork.length;
    
    if (totalItems === 0) return 1.0;
    
    // Calculate dependency ratio
    const dependencyRatio = totalDependencies / totalItems;
    
    // Higher ratio = lower confidence
    return Math.max(0.3, 1.0 - (dependencyRatio * 0.2));
  }

  private assessCapacityConfidence(iteration: IterationPlan): number {
    // Average capacity utilization confidence
    const avgUtilization = iteration.capacityUtilization.reduce(
      (sum, cu) => sum + cu.utilizationRate, 0
    ) / Math.max(iteration.capacityUtilization.length, 1);

    // Optimal utilization is around 0.8
    if (avgUtilization > 0.9) {
      return 0.7; // Over-utilized
    } else if (avgUtilization < 0.6) {
      return 0.8; // Under-utilized
    } else {
      return 0.95; // Optimal range
    }
  }

  private calculateOverallConfidence(factors: {
    teamConfidence: number;
    technicalConfidence: number;
    dependencyConfidence: number;
    capacityConfidence: number;
  }): number {
    // Weighted average of confidence factors
    return (
      factors.teamConfidence * 0.3 +
      factors.technicalConfidence * 0.3 +
      factors.dependencyConfidence * 0.2 +
      factors.capacityConfidence * 0.2
    );
  }

  private identifyConfidenceRisks(
    iteration: IterationPlan,
    overallConfidence: number
  ): string[] {
    const risks: string[] = [];

    if (overallConfidence < 0.6) {
      risks.push('Low overall confidence may impact delivery success');
    }

    const overAllocatedTeams = iteration.capacityUtilization.filter(cu => cu.isOverAllocated);
    if (overAllocatedTeams.length > 0) {
      risks.push(`${overAllocatedTeams.length} teams are over-allocated`);
    }

    const highDependencyItems = iteration.allocatedWork.filter(item => item.blockedBy.length > 3);
    if (highDependencyItems.length > 0) {
      risks.push(`${highDependencyItems.length} items have complex dependencies`);
    }

    return risks;
  }

  private categorizeConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  private generateConfidenceRecommendations(
    overallConfidence: number,
    factors: {
      teamConfidence: number;
      technicalConfidence: number;
      dependencyConfidence: number;
      capacityConfidence: number;
    }
  ): string[] {
    const recommendations: string[] = [];

    if (factors.teamConfidence < 0.7) {
      recommendations.push('Improve team confidence through better estimation and planning');
    }

    if (factors.technicalConfidence < 0.7) {
      recommendations.push('Reduce technical complexity and clarify requirements');
    }

    if (factors.dependencyConfidence < 0.7) {
      recommendations.push('Work to reduce cross-team dependencies');
    }

    if (factors.capacityConfidence < 0.7) {
      recommendations.push('Balance capacity allocation across teams');
    }

    if (overallConfidence < 0.6) {
      recommendations.push('Consider reducing iteration scope to improve delivery confidence');
    }

    return recommendations;
  }
}