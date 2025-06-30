/**
 * Value Delivery Analyzer for ART Planning (LIN-49 Phase 2)
 * 
 * Provides sophisticated value analysis algorithms to ensure
 * each iteration delivers maximum customer value and working software.
 */

import {
  IterationPlan,
  AllocatedWorkItem,
  PlanningWorkItem,
  ValueDeliveryAnalysis,
  WorkingSoftwareComponent,
  UserImpact,
  BusinessValueRealization,
  ValueDeliveryRisk,
  ValueStream,
  OptimizedIterationPlan,
  WorkingSoftwareValidation,
  UserValueMetrics,
  DeploymentBlocker,
  IntegrationStatus,
  RollbackAssessment,
  QualityGateStatus
} from '../types/art-planning-types';
import { DependencyGraph } from '../types/dependency-types';
import * as logger from '../utils/logger';

/**
 * Value delivery analysis configuration
 */
interface ValueAnalysisConfig {
  minValueConfidence: number;
  minWorkingSoftwareRatio: number;
  maxValueRiskScore: number;
  valueStreamPriorities: Map<string, number>;
}

/**
 * Default configuration for value analysis
 */
const DEFAULT_VALUE_CONFIG: ValueAnalysisConfig = {
  minValueConfidence: 0.7,
  minWorkingSoftwareRatio: 0.8,
  maxValueRiskScore: 0.3,
  valueStreamPriorities: new Map([
    ['customer-facing', 1.0],
    ['revenue-generating', 0.9],
    ['efficiency-improving', 0.7],
    ['technical-debt', 0.5],
    ['infrastructure', 0.3]
  ])
};

/**
 * Analyzes and optimizes value delivery for ART iterations
 */
export class ValueDeliveryAnalyzer {
  private config: ValueAnalysisConfig;

  constructor(config: Partial<ValueAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_VALUE_CONFIG, ...config };
    logger.debug('ValueDeliveryAnalyzer initialized', {
      minConfidence: this.config.minValueConfidence,
      minWorkingSoftwareRatio: this.config.minWorkingSoftwareRatio
    });
  }

  /**
   * Analyze value delivery potential for an iteration
   */
  async analyzeIterationValue(iteration: IterationPlan): Promise<ValueDeliveryAnalysis> {
    logger.debug('Analyzing iteration value', {
      iterationId: iteration.iteration.id,
      workItemCount: iteration.allocatedWork.length
    });

    // Map work items to value streams
    const valueStreams = await this.mapToValueStreams(iteration.allocatedWork);
    
    // Identify working software components
    const workingSoftwareComponents = await this.identifyWorkingSoftwareComponents(
      iteration.allocatedWork
    );
    
    // Calculate value delivery score
    const valueDeliveryScore = this.calculateValueDeliveryScore(
      valueStreams,
      workingSoftwareComponents,
      iteration.allocatedWork
    );
    
    // Assess user impact
    const userImpact = await this.assessUserImpact(iteration.allocatedWork);
    
    // Calculate business value realization
    const businessValueRealization = await this.calculateBusinessValueRealization(
      iteration,
      valueStreams
    );
    
    // Identify value delivery risks
    const deliveryRisks = await this.identifyValueDeliveryRisks(
      iteration,
      workingSoftwareComponents
    );
    
    // Generate improvement recommendations
    const improvementRecommendations = await this.generateValueImprovementRecommendations({
      iterationId: iteration.iteration.id,
      primaryValueStreams: valueStreams,
      workingSoftwareComponents,
      valueDeliveryScore,
      userImpactAssessment: userImpact,
      businessValueRealization,
      deliveryRisks,
      improvementRecommendations: [], // Will be filled
      confidenceScore: 0 // Will be calculated
    });
    
    // Calculate overall confidence score
    const confidenceScore = this.calculateValueConfidenceScore(
      valueDeliveryScore,
      workingSoftwareComponents.length,
      deliveryRisks
    );

    const analysis: ValueDeliveryAnalysis = {
      iterationId: iteration.iteration.id,
      primaryValueStreams: valueStreams,
      workingSoftwareComponents,
      valueDeliveryScore,
      userImpactAssessment: userImpact,
      businessValueRealization,
      deliveryRisks,
      improvementRecommendations,
      confidenceScore
    };

    logger.info('Iteration value analysis completed', {
      iterationId: iteration.iteration.id,
      valueScore: valueDeliveryScore.toFixed(2),
      confidenceScore: confidenceScore.toFixed(2),
      workingSoftwareCount: workingSoftwareComponents.length
    });

    return analysis;
  }

  /**
   * Validate that work items can deliver working software
   */
  async validateWorkingSoftwareDelivery(
    workItems: AllocatedWorkItem[]
  ): Promise<WorkingSoftwareValidation> {
    logger.debug('Validating working software delivery', {
      workItemCount: workItems.length
    });

    // Check deployment readiness
    const canDeployToProduction = await this.checkDeploymentReadiness(workItems);
    
    // Calculate deployment readiness score
    const deploymentReadinessScore = this.calculateDeploymentReadinessScore(workItems);
    
    // Identify critical blockers
    const criticalBlockers = await this.identifyCriticalBlockers(workItems);
    
    // Check integration status
    const integrationStatus = await this.checkIntegrationStatus(workItems);
    
    // Calculate user value metrics
    const userValueDelivered = await this.calculateUserValueMetrics(workItems);
    
    // Assess rollback capability
    const rollbackCapability = await this.assessRollbackCapability(workItems);
    
    // Check quality gates
    const qualityGates = await this.checkQualityGates(workItems);

    const validation: WorkingSoftwareValidation = {
      canDeployToProduction,
      deploymentReadinessScore,
      criticalBlockers,
      integrationStatus,
      userValueDelivered,
      rollbackCapability,
      qualityGates
    };

    logger.info('Working software validation completed', {
      canDeploy: canDeployToProduction,
      readinessScore: deploymentReadinessScore.toFixed(2),
      blockerCount: criticalBlockers.length
    });

    return validation;
  }

  /**
   * Optimize value delivery timing across iterations
   */
  async optimizeValueDeliveryTiming(
    iterations: IterationPlan[]
  ): Promise<OptimizedIterationPlan[]> {
    logger.debug('Optimizing value delivery timing', {
      iterationCount: iterations.length
    });

    const optimizedPlans: OptimizedIterationPlan[] = [];

    for (const iteration of iterations) {
      const valueAnalysis = await this.analyzeIterationValue(iteration);
      
      // Identify opportunities to pull value forward
      const valuePullOpportunities = this.identifyValuePullOpportunities(
        iteration,
        iterations
      );
      
      // Identify items that could be deferred
      const deferralCandidates = this.identifyDeferralCandidates(
        iteration,
        valueAnalysis
      );
      
      // Create optimized allocation
      const optimizedAllocation = this.createOptimizedAllocation(
        iteration,
        valuePullOpportunities,
        deferralCandidates
      );
      
      const optimizedPlan: OptimizedIterationPlan = {
        originalPlan: iteration,
        optimizedAllocation,
        valueImprovementPotential: this.calculateValueImprovement(
          iteration,
          optimizedAllocation
        ),
        riskReduction: this.calculateRiskReduction(
          valueAnalysis.deliveryRisks,
          optimizedAllocation
        ),
        confidenceImprovement: 0.1, // Placeholder
        implementationEffort: 'medium'
      };
      
      optimizedPlans.push(optimizedPlan);
    }

    return optimizedPlans;
  }

  /**
   * Identify risks to value delivery
   */
  async identifyValueDeliveryRisks(
    iteration: IterationPlan,
    workingSoftwareComponents: WorkingSoftwareComponent[]
  ): Promise<ValueDeliveryRisk[]> {
    const risks: ValueDeliveryRisk[] = [];

    // Risk: Insufficient working software
    const workingSoftwareRatio = workingSoftwareComponents.length / iteration.allocatedWork.length;
    if (workingSoftwareRatio < this.config.minWorkingSoftwareRatio) {
      risks.push({
        id: `low-working-software-${iteration.iteration.id}`,
        description: `Only ${(workingSoftwareRatio * 100).toFixed(0)}% of work items deliver working software`,
        severity: 'high',
        probability: 0.8,
        impact: 'Iteration may not deliver sufficient customer value',
        mitigations: [
          'Prioritize user-facing stories',
          'Defer infrastructure work to later iterations',
          'Break down enablers to deliver incremental value'
        ]
      });
    }

    // Risk: High dependency concentration
    const highDependencyItems = iteration.allocatedWork.filter(
      item => item.blockedBy.length > 3
    );
    if (highDependencyItems.length > 0) {
      risks.push({
        id: `high-dependency-concentration-${iteration.iteration.id}`,
        description: `${highDependencyItems.length} work items have 3+ dependencies`,
        severity: 'medium',
        probability: 0.6,
        impact: 'Value delivery may be delayed if dependencies slip',
        mitigations: [
          'Create contingency plans for critical dependencies',
          'Consider parallel implementation paths',
          'Increase communication with dependent teams'
        ]
      });
    }

    // Risk: Unbalanced value streams
    const valueStreamBalance = this.assessValueStreamBalance(iteration);
    if (valueStreamBalance.imbalanceScore > 0.5) {
      risks.push({
        id: `unbalanced-value-streams-${iteration.iteration.id}`,
        description: 'Value delivery concentrated in single stream',
        severity: 'medium',
        probability: 0.5,
        impact: 'Limited value diversity increases delivery risk',
        mitigations: [
          'Diversify work across multiple value streams',
          'Include fail-safe stories from different streams',
          'Plan for incremental value delivery'
        ]
      });
    }

    return risks;
  }

  /**
   * Generate recommendations for improving value delivery
   */
  async generateValueImprovementRecommendations(
    analysis: ValueDeliveryAnalysis
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Check value delivery score
    if (analysis.valueDeliveryScore < this.config.minValueConfidence) {
      recommendations.push(
        `Increase focus on customer-facing stories to improve value score from ${(analysis.valueDeliveryScore * 100).toFixed(0)}%`
      );
    }

    // Check working software ratio
    const workingSoftwareRatio = analysis.workingSoftwareComponents.length / 
      (analysis.workingSoftwareComponents.length + 5); // Approximate total items
    if (workingSoftwareRatio < 0.7) {
      recommendations.push(
        'Prioritize stories that deliver deployable features over enablers'
      );
    }

    // Check risk levels
    const highRisks = analysis.deliveryRisks.filter(
      risk => risk.severity === 'high' || risk.severity === 'critical'
    );
    if (highRisks.length > 0) {
      recommendations.push(
        `Address ${highRisks.length} high-severity risks before iteration start`
      );
    }

    // Check user impact
    if (analysis.userImpactAssessment.impactedUserCount < 100) {
      recommendations.push(
        'Consider including features that impact a broader user base'
      );
    }

    // Check business value realization
    if (analysis.businessValueRealization.timeToValue > 30) {
      recommendations.push(
        'Look for opportunities to deliver value incrementally within the iteration'
      );
    }

    return recommendations;
  }

  // Private helper methods

  private async mapToValueStreams(
    workItems: AllocatedWorkItem[]
  ): Promise<ValueStream[]> {
    const valueStreamMap = new Map<string, ValueStream>();

    for (const item of workItems) {
      const streamType = this.identifyValueStreamType(item.workItem);
      const streamId = `${streamType}-stream`;
      
      if (!valueStreamMap.has(streamId)) {
        valueStreamMap.set(streamId, {
          id: streamId,
          name: this.formatStreamName(streamType),
          type: streamType as any,
          workItems: [],
          totalValue: 0,
          deliveryConfidence: 0.8
        });
      }
      
      const stream = valueStreamMap.get(streamId)!;
      stream.workItems.push(item.workItem.id);
      stream.totalValue += this.calculateWorkItemValue(item.workItem);
    }

    // Calculate delivery confidence for each stream
    for (const stream of valueStreamMap.values()) {
      stream.deliveryConfidence = this.calculateStreamConfidence(stream, workItems);
    }

    return Array.from(valueStreamMap.values());
  }

  private identifyValueStreamType(workItem: PlanningWorkItem): string {
    const title = workItem.title.toLowerCase();
    const description = workItem.description.toLowerCase();
    const content = `${title} ${description}`;

    if (content.includes('customer') || content.includes('user') || 
        content.includes('ui') || content.includes('interface')) {
      return 'customer-facing';
    }
    
    if (content.includes('revenue') || content.includes('payment') || 
        content.includes('billing') || content.includes('sales')) {
      return 'revenue-generating';
    }
    
    if (content.includes('performance') || content.includes('optimization') || 
        content.includes('efficiency')) {
      return 'efficiency-improving';
    }
    
    if (content.includes('debt') || content.includes('refactor') || 
        content.includes('cleanup')) {
      return 'technical-debt';
    }
    
    return 'infrastructure';
  }

  private async identifyWorkingSoftwareComponents(
    workItems: AllocatedWorkItem[]
  ): Promise<WorkingSoftwareComponent[]> {
    const components: WorkingSoftwareComponent[] = [];

    for (const item of workItems) {
      if (this.isWorkingSoftware(item.workItem)) {
        components.push({
          id: `component-${item.workItem.id}`,
          name: item.workItem.title,
          type: this.identifyComponentType(item.workItem),
          workItems: [item.workItem.id],
          deploymentReadiness: await this.assessComponentReadiness(item),
          userValue: this.calculateComponentUserValue(item.workItem),
          dependencies: item.blockedBy
        });
      }
    }

    return components;
  }

  private isWorkingSoftware(workItem: PlanningWorkItem): boolean {
    // Stories with acceptance criteria are likely to deliver working software
    if (workItem.type === 'story' && 'acceptanceCriteria' in workItem) {
      const criteria = workItem.acceptanceCriteria;
      return criteria && criteria.length > 0;
    }
    
    // Features that are user-facing
    if (workItem.type === 'feature') {
      const content = `${workItem.title} ${workItem.description}`.toLowerCase();
      return ['user', 'customer', 'interface', 'api', 'endpoint'].some(
        keyword => content.includes(keyword)
      );
    }
    
    return false;
  }

  private calculateValueDeliveryScore(
    valueStreams: ValueStream[],
    workingSoftwareComponents: WorkingSoftwareComponent[],
    allocatedWork: AllocatedWorkItem[]
  ): number {
    let score = 0;
    
    // Factor 1: Value stream coverage (30%)
    const streamScore = valueStreams.reduce((sum, stream) => {
      const priority = this.config.valueStreamPriorities.get(stream.type) || 0.5;
      return sum + (stream.totalValue * priority);
    }, 0) / Math.max(valueStreams.length, 1);
    score += streamScore * 0.3;
    
    // Factor 2: Working software ratio (40%)
    const workingSoftwareRatio = workingSoftwareComponents.length / 
      Math.max(allocatedWork.length, 1);
    score += workingSoftwareRatio * 0.4;
    
    // Factor 3: Deployment readiness (30%)
    const avgReadiness = workingSoftwareComponents.reduce(
      (sum, comp) => sum + comp.deploymentReadiness, 0
    ) / Math.max(workingSoftwareComponents.length, 1);
    score += avgReadiness * 0.3;
    
    return Math.min(1.0, Math.max(0, score));
  }

  private formatStreamName(streamType: string): string {
    return streamType.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private calculateWorkItemValue(workItem: PlanningWorkItem): number {
    let value = 50; // Base value
    
    // Adjust based on type
    if (workItem.type === 'story') value += 30;
    if (workItem.type === 'feature') value += 50;
    
    // Adjust based on priority
    if ('priority' in workItem && workItem.priority) {
      value += (5 - workItem.priority) * 20;
    }
    
    return value;
  }

  private calculateStreamConfidence(
    stream: ValueStream,
    allWorkItems: AllocatedWorkItem[]
  ): number {
    const streamItems = allWorkItems.filter(
      item => stream.workItems.includes(item.workItem.id)
    );
    
    let confidence = 0.9; // Base confidence
    
    // Reduce for high dependency items
    const avgDependencies = streamItems.reduce(
      (sum, item) => sum + item.blockedBy.length, 0
    ) / Math.max(streamItems.length, 1);
    
    if (avgDependencies > 2) confidence -= 0.2;
    
    // Reduce for low allocation confidence
    const avgConfidence = streamItems.reduce(
      (sum, item) => sum + item.confidence, 0
    ) / Math.max(streamItems.length, 1);
    
    confidence *= avgConfidence;
    
    return Math.max(0.3, Math.min(1.0, confidence));
  }

  private async assessUserImpact(
    workItems: AllocatedWorkItem[]
  ): Promise<UserImpact> {
    let totalImpactedUsers = 0;
    const impactTypes = new Set<string>();
    const userSegments = new Set<string>();
    
    for (const item of workItems) {
      const impact = this.estimateUserImpact(item.workItem);
      totalImpactedUsers += impact.userCount;
      impactTypes.add(impact.impactType);
      userSegments.add(impact.segment);
    }
    
    return {
      impactedUserCount: totalImpactedUsers,
      impactTypes: Array.from(impactTypes),
      userSegments: Array.from(userSegments),
      estimatedAdoptionRate: this.estimateAdoptionRate(workItems),
      valuePerUser: this.calculateValuePerUser(workItems, totalImpactedUsers)
    };
  }

  private estimateUserImpact(workItem: PlanningWorkItem): {
    userCount: number;
    impactType: string;
    segment: string;
  } {
    const content = `${workItem.title} ${workItem.description}`.toLowerCase();
    
    let userCount = 100; // Default
    let impactType = 'enhancement';
    let segment = 'general';
    
    // Estimate based on keywords
    if (content.includes('all users') || content.includes('everyone')) {
      userCount = 10000;
      segment = 'all';
    } else if (content.includes('enterprise') || content.includes('admin')) {
      userCount = 500;
      segment = 'enterprise';
    } else if (content.includes('api') || content.includes('integration')) {
      userCount = 200;
      segment = 'developers';
    }
    
    // Determine impact type
    if (content.includes('new feature')) impactType = 'new-capability';
    else if (content.includes('fix') || content.includes('bug')) impactType = 'quality-improvement';
    else if (content.includes('performance')) impactType = 'performance-enhancement';
    
    return { userCount, impactType, segment };
  }

  private async calculateBusinessValueRealization(
    iteration: IterationPlan,
    valueStreams: ValueStream[]
  ): Promise<BusinessValueRealization> {
    const revenueImpact = this.calculateRevenueImpact(valueStreams);
    const costSavings = this.calculateCostSavings(iteration.allocatedWork);
    const timeToValue = this.estimateTimeToValue(iteration);
    const confidenceLevel = this.calculateBusinessConfidence(valueStreams);
    
    return {
      estimatedRevenue: revenueImpact,
      costSavings,
      timeToValue,
      confidenceLevel,
      valueDrivers: this.identifyValueDrivers(valueStreams),
      assumptions: this.documentAssumptions(iteration)
    };
  }

  private calculateRevenueImpact(valueStreams: ValueStream[]): number {
    return valueStreams
      .filter(stream => stream.type === 'revenue-generating')
      .reduce((sum, stream) => sum + stream.totalValue * 100, 0);
  }

  private calculateCostSavings(workItems: AllocatedWorkItem[]): number {
    return workItems
      .filter(item => {
        const content = `${item.workItem.title} ${item.workItem.description}`.toLowerCase();
        return content.includes('efficiency') || content.includes('automation');
      })
      .reduce((sum, item) => sum + 500, 0); // $500 per efficiency improvement
  }

  private estimateTimeToValue(iteration: IterationPlan): number {
    // Days until value is realized
    return iteration.iteration.duration / 2; // Assume mid-iteration delivery
  }

  private calculateBusinessConfidence(valueStreams: ValueStream[]): number {
    if (valueStreams.length === 0) return 0.5;
    
    const avgConfidence = valueStreams.reduce(
      (sum, stream) => sum + stream.deliveryConfidence, 0
    ) / valueStreams.length;
    
    return avgConfidence;
  }

  private identifyValueDrivers(valueStreams: ValueStream[]): string[] {
    const drivers: string[] = [];
    
    for (const stream of valueStreams) {
      switch (stream.type) {
        case 'customer-facing':
          drivers.push('Improved user experience');
          break;
        case 'revenue-generating':
          drivers.push('New revenue opportunities');
          break;
        case 'efficiency-improving':
          drivers.push('Operational efficiency gains');
          break;
        case 'technical-debt':
          drivers.push('Reduced maintenance costs');
          break;
        case 'infrastructure':
          drivers.push('Platform stability improvements');
          break;
      }
    }
    
    return [...new Set(drivers)];
  }

  private documentAssumptions(iteration: IterationPlan): string[] {
    return [
      `All ${iteration.allocatedWork.length} work items completed within iteration`,
      'No critical dependencies delayed',
      'Teams maintain expected velocity',
      'No major technical blockers encountered'
    ];
  }

  private calculateValueConfidenceScore(
    valueDeliveryScore: number,
    workingSoftwareCount: number,
    risks: ValueDeliveryRisk[]
  ): number {
    let confidence = valueDeliveryScore;
    
    // Boost for good working software count
    if (workingSoftwareCount > 5) confidence += 0.1;
    
    // Reduce for risks
    const highRiskCount = risks.filter(
      r => r.severity === 'high' || r.severity === 'critical'
    ).length;
    
    confidence -= highRiskCount * 0.1;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private async checkDeploymentReadiness(
    workItems: AllocatedWorkItem[]
  ): Promise<boolean> {
    const readyItems = workItems.filter(item => {
      // Check if item has completed acceptance criteria
      if ('acceptanceCriteria' in item.workItem) {
        return item.workItem.acceptanceCriteria && 
               item.workItem.acceptanceCriteria.length > 0;
      }
      return false;
    });
    
    return readyItems.length >= workItems.length * 0.8;
  }

  private calculateDeploymentReadinessScore(
    workItems: AllocatedWorkItem[]
  ): number {
    let score = 0;
    
    for (const item of workItems) {
      let itemScore = 0.5; // Base score
      
      // Check for acceptance criteria
      if ('acceptanceCriteria' in item.workItem && 
          item.workItem.acceptanceCriteria && item.workItem.acceptanceCriteria.length > 0) {
        itemScore += 0.2;
      }
      
      // Check for low dependencies
      if (item.blockedBy.length === 0) itemScore += 0.2;
      else if (item.blockedBy.length <= 2) itemScore += 0.1;
      
      // Check confidence
      itemScore *= item.confidence;
      
      score += itemScore;
    }
    
    return score / Math.max(workItems.length, 1);
  }

  private async identifyCriticalBlockers(
    workItems: AllocatedWorkItem[]
  ): Promise<DeploymentBlocker[]> {
    const blockers: DeploymentBlocker[] = [];
    
    // Check for incomplete dependencies
    const incompleteDeps = workItems.filter(item => item.blockedBy.length > 3);
    if (incompleteDeps.length > 0) {
      blockers.push({
        id: 'high-dependency-items',
        type: 'dependency',
        severity: 'critical',
        description: `${incompleteDeps.length} items have 3+ unresolved dependencies`,
        affectedWorkItems: incompleteDeps.map(item => item.workItem.id),
        resolution: 'Complete prerequisite work items first'
      });
    }
    
    // Check for missing acceptance criteria
    const missingAC = workItems.filter(item => {
      if ('acceptanceCriteria' in item.workItem) {
        return !item.workItem.acceptanceCriteria || 
               item.workItem.acceptanceCriteria.length === 0;
      }
      return true;
    });
    
    if (missingAC.length > 0) {
      blockers.push({
        id: 'missing-acceptance-criteria',
        type: 'requirements',
        severity: 'high',
        description: `${missingAC.length} items lack acceptance criteria`,
        affectedWorkItems: missingAC.map(item => item.workItem.id),
        resolution: 'Define clear acceptance criteria for all stories'
      });
    }
    
    return blockers;
  }

  private async checkIntegrationStatus(
    workItems: AllocatedWorkItem[]
  ): Promise<IntegrationStatus> {
    const integrationPoints = this.identifyIntegrationPoints(workItems);
    const readyIntegrations = integrationPoints.filter(ip => ip.isReady).length;
    
    return {
      totalIntegrationPoints: integrationPoints.length,
      completedIntegrations: readyIntegrations,
      pendingIntegrations: integrationPoints.length - readyIntegrations,
      integrationReadiness: integrationPoints.length > 0 
        ? readyIntegrations / integrationPoints.length 
        : 1.0,
      criticalIntegrations: integrationPoints.filter(ip => ip.isCritical).map(ip => ip.name)
    };
  }

  private identifyIntegrationPoints(workItems: AllocatedWorkItem[]): any[] {
    const integrationPoints: any[] = [];
    
    for (const item of workItems) {
      const content = `${item.workItem.title} ${item.workItem.description}`.toLowerCase();
      
      if (content.includes('api') || content.includes('integration') || 
          content.includes('interface')) {
        integrationPoints.push({
          name: item.workItem.title,
          isReady: item.confidence > 0.7,
          isCritical: item.blockedBy.length === 0 && item.enables.length > 2
        });
      }
    }
    
    return integrationPoints;
  }

  private async calculateUserValueMetrics(
    workItems: AllocatedWorkItem[]
  ): Promise<UserValueMetrics> {
    const userFacingItems = workItems.filter(item => 
      this.isUserFacing(item.workItem)
    );
    
    return {
      userStoriesCompleted: userFacingItems.length,
      estimatedUserSatisfaction: this.estimateUserSatisfaction(userFacingItems),
      featureAdoptionPotential: this.calculateAdoptionPotential(userFacingItems),
      valueDeliveryVelocity: userFacingItems.length / Math.max(workItems.length, 1)
    };
  }

  private isUserFacing(workItem: PlanningWorkItem): boolean {
    const content = `${workItem.title} ${workItem.description}`.toLowerCase();
    return ['user', 'customer', 'ui', 'interface', 'experience'].some(
      keyword => content.includes(keyword)
    );
  }

  private estimateUserSatisfaction(userFacingItems: AllocatedWorkItem[]): number {
    if (userFacingItems.length === 0) return 0.5;
    
    // Base satisfaction on completion confidence
    const avgConfidence = userFacingItems.reduce(
      (sum, item) => sum + item.confidence, 0
    ) / userFacingItems.length;
    
    return avgConfidence * 0.9; // 90% of confidence translates to satisfaction
  }

  private calculateAdoptionPotential(userFacingItems: AllocatedWorkItem[]): number {
    let potential = 0.5; // Base potential
    
    // Increase for more user-facing items
    potential += Math.min(0.3, userFacingItems.length * 0.05);
    
    // Increase for high-priority items
    const highPriorityCount = userFacingItems.filter(item => {
      if ('priority' in item.workItem && item.workItem.priority) {
        return item.workItem.priority <= 2;
      }
      return false;
    }).length;
    
    potential += highPriorityCount * 0.1;
    
    return Math.min(1.0, potential);
  }

  private async assessRollbackCapability(
    workItems: AllocatedWorkItem[]
  ): Promise<RollbackAssessment> {
    const hasRollbackPlan = workItems.some(item => {
      const content = `${item.workItem.title} ${item.workItem.description}`.toLowerCase();
      return content.includes('rollback') || content.includes('revert');
    });
    
    const rollbackComplexity = this.assessRollbackComplexity(workItems);
    
    return {
      canRollback: true, // Assume always possible
      rollbackComplexity,
      estimatedRollbackTime: rollbackComplexity === 'low' ? 15 : 
                            rollbackComplexity === 'medium' ? 60 : 240,
      rollbackRisks: this.identifyRollbackRisks(workItems),
      rollbackPlan: hasRollbackPlan ? 'Documented' : 'Standard procedures'
    };
  }

  private assessRollbackComplexity(workItems: AllocatedWorkItem[]): 'low' | 'medium' | 'high' {
    const avgDependencies = workItems.reduce(
      (sum, item) => sum + item.blockedBy.length, 0
    ) / Math.max(workItems.length, 1);
    
    if (avgDependencies < 1) return 'low';
    if (avgDependencies < 3) return 'medium';
    return 'high';
  }

  private identifyRollbackRisks(workItems: AllocatedWorkItem[]): string[] {
    const risks: string[] = [];
    
    const highDepItems = workItems.filter(item => item.blockedBy.length > 3);
    if (highDepItems.length > 0) {
      risks.push('Multiple dependencies may complicate rollback');
    }
    
    const dataChanges = workItems.some(item => {
      const content = item.workItem.description.toLowerCase();
      return content.includes('database') || content.includes('migration');
    });
    
    if (dataChanges) {
      risks.push('Database changes may require special rollback procedures');
    }
    
    return risks;
  }

  private async checkQualityGates(
    workItems: AllocatedWorkItem[]
  ): Promise<QualityGateStatus[]> {
    return [
      {
        gateName: 'Code Review',
        status: 'pending',
        criteria: 'All code changes reviewed by 2+ developers',
        currentState: 'Not started'
      },
      {
        gateName: 'Test Coverage',
        status: 'pending',
        criteria: 'Minimum 80% test coverage',
        currentState: 'Tests not yet written'
      },
      {
        gateName: 'Security Scan',
        status: 'pending',
        criteria: 'No critical vulnerabilities',
        currentState: 'Scan not performed'
      },
      {
        gateName: 'Performance Testing',
        status: 'pending',
        criteria: 'Response time <200ms for critical paths',
        currentState: 'Performance tests not executed'
      }
    ];
  }

  private identifyValuePullOpportunities(
    iteration: IterationPlan,
    allIterations: IterationPlan[]
  ): AllocatedWorkItem[] {
    // Identify items from future iterations that could be pulled forward
    const currentIndex = allIterations.findIndex(
      it => it.iteration.id === iteration.iteration.id
    );
    
    if (currentIndex === allIterations.length - 1) return [];
    
    const opportunities: AllocatedWorkItem[] = [];
    const futureIterations = allIterations.slice(currentIndex + 1);
    
    for (const futureIteration of futureIterations) {
      const pullCandidates = futureIteration.allocatedWork.filter(item => {
        // Can pull if no dependencies or all dependencies in current/past iterations
        return item.blockedBy.length === 0 || 
               item.blockedBy.every(dep => this.isDependencyMet(dep, currentIndex, allIterations));
      });
      
      opportunities.push(...pullCandidates.slice(0, 2)); // Max 2 items per future iteration
    }
    
    return opportunities;
  }

  private isDependencyMet(
    dependencyId: string,
    currentIndex: number,
    iterations: IterationPlan[]
  ): boolean {
    for (let i = 0; i <= currentIndex; i++) {
      const hasItem = iterations[i].allocatedWork.some(
        item => item.workItem.id === dependencyId
      );
      if (hasItem) return true;
    }
    return false;
  }

  private identifyDeferralCandidates(
    iteration: IterationPlan,
    analysis: ValueDeliveryAnalysis
  ): AllocatedWorkItem[] {
    // Items that could be deferred to later iterations
    return iteration.allocatedWork.filter(item => {
      // Defer low-value technical items
      const isLowValue = !analysis.workingSoftwareComponents.some(
        comp => comp.workItems.includes(item.workItem.id)
      );
      
      // Defer items with many unsatisfied dependencies
      const hasHighDependencies = item.blockedBy.length > 3;
      
      // Defer low confidence items
      const hasLowConfidence = item.confidence < 0.6;
      
      return isLowValue && (hasHighDependencies || hasLowConfidence);
    });
  }

  private createOptimizedAllocation(
    iteration: IterationPlan,
    pullOpportunities: AllocatedWorkItem[],
    deferralCandidates: AllocatedWorkItem[]
  ): AllocatedWorkItem[] {
    // Remove deferral candidates
    const optimized = iteration.allocatedWork.filter(
      item => !deferralCandidates.includes(item)
    );
    
    // Add pull opportunities (up to capacity)
    const availableCapacity = iteration.totalCapacity - 
      optimized.reduce((sum, item) => sum + item.allocatedPoints, 0);
    
    for (const opportunity of pullOpportunities) {
      if (opportunity.allocatedPoints <= availableCapacity) {
        optimized.push(opportunity);
      }
    }
    
    return optimized;
  }

  private calculateValueImprovement(
    original: IterationPlan,
    optimized: AllocatedWorkItem[]
  ): number {
    const originalValue = this.calculateIterationValue(original.allocatedWork);
    const optimizedValue = this.calculateIterationValue(optimized);
    
    return (optimizedValue - originalValue) / Math.max(originalValue, 1);
  }

  private calculateIterationValue(workItems: AllocatedWorkItem[]): number {
    return workItems.reduce((sum, item) => {
      return sum + this.calculateWorkItemValue(item.workItem);
    }, 0);
  }

  private calculateRiskReduction(
    originalRisks: ValueDeliveryRisk[],
    optimizedAllocation: AllocatedWorkItem[]
  ): number {
    // Simplified: assume 10% reduction per deferred high-dependency item
    const highDepCount = optimizedAllocation.filter(
      item => item.blockedBy.length > 3
    ).length;
    
    const originalHighDepCount = originalRisks.filter(
      risk => risk.id.includes('dependency')
    ).length;
    
    if (originalHighDepCount === 0) return 0;
    
    return (originalHighDepCount - highDepCount) / originalHighDepCount;
  }

  private estimateAdoptionRate(workItems: AllocatedWorkItem[]): number {
    const userFacingCount = workItems.filter(
      item => this.isUserFacing(item.workItem)
    ).length;
    
    // Base adoption rate on ratio of user-facing items
    const userFacingRatio = userFacingCount / Math.max(workItems.length, 1);
    
    // 70% adoption for high user-facing ratio, 30% for low
    return 0.3 + (userFacingRatio * 0.4);
  }

  private calculateValuePerUser(
    workItems: AllocatedWorkItem[],
    totalUsers: number
  ): number {
    if (totalUsers === 0) return 0;
    
    const totalValue = this.calculateIterationValue(workItems);
    return totalValue / totalUsers;
  }

  private assessValueStreamBalance(
    iteration: IterationPlan
  ): { imbalanceScore: number } {
    const streamCounts = new Map<string, number>();
    
    for (const item of iteration.allocatedWork) {
      const streamType = this.identifyValueStreamType(item.workItem);
      streamCounts.set(streamType, (streamCounts.get(streamType) || 0) + 1);
    }
    
    if (streamCounts.size === 0) return { imbalanceScore: 1.0 };
    
    const counts = Array.from(streamCounts.values());
    const maxCount = Math.max(...counts);
    const totalCount = counts.reduce((sum, count) => sum + count, 0);
    
    // Imbalance score: how concentrated is the work in one stream
    const imbalanceScore = maxCount / totalCount;
    
    return { imbalanceScore };
  }

  private identifyComponentType(workItem: PlanningWorkItem): 'feature' | 'api' | 'ui' | 'service' {
    const content = `${workItem.title} ${workItem.description}`.toLowerCase();
    
    if (content.includes('api') || content.includes('endpoint')) return 'api';
    if (content.includes('ui') || content.includes('interface') || 
        content.includes('screen')) return 'ui';
    if (content.includes('service') || content.includes('backend')) return 'service';
    
    return 'feature';
  }

  private async assessComponentReadiness(item: AllocatedWorkItem): Promise<number> {
    let readiness = item.confidence;
    
    // Reduce for high dependencies
    if (item.blockedBy.length > 2) readiness *= 0.8;
    
    // Boost for clear acceptance criteria
    if ('acceptanceCriteria' in item.workItem && 
        item.workItem.acceptanceCriteria && item.workItem.acceptanceCriteria.length > 3) {
      readiness *= 1.1;
    }
    
    return Math.min(1.0, readiness);
  }

  private calculateComponentUserValue(workItem: PlanningWorkItem): number {
    let value = 50; // Base value
    
    // High value for user-facing components
    if (this.isUserFacing(workItem)) value += 50;
    
    // Additional value for high priority
    if ('priority' in workItem && workItem.priority && workItem.priority <= 2) value += 30;
    
    return value;
  }
}