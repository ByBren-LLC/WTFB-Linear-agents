/**
 * Story Scoring Engine for WSJF Prioritization (LIN-50)
 * 
 * Implements Weighted Shortest Job First (WSJF) methodology for SAFe ART planning.
 * Calculates business value, time criticality, risk reduction, and job size scores
 * to optimize value delivery through data-driven prioritization.
 */

import {
  ScoredStory,
  BusinessValueScore,
  TimeCriticalityScore,
  RiskReductionScore,
  JobSizeScore,
  WSJFComponents,
  ScoringConfig,
  ScoringResult,
  ScoringError,
  LinearPriority
} from '../types/scoring-types';
import { Story } from '../planning/models';
import * as logger from '../utils/logger';

/**
 * Default scoring configuration following SAFe WSJF methodology
 */
const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    businessValue: 0.35,     // 35% weight to business value
    timeCriticality: 0.25,   // 25% weight to time criticality
    riskReduction: 0.25,     // 25% weight to risk reduction
    // Job size is denominator, not weighted
  },
  priorityMapping: {
    urgentThreshold: 8.0,    // WSJF >= 8.0 = Urgent
    highThreshold: 5.0,      // WSJF >= 5.0 = High
    mediumThreshold: 2.0,    // WSJF >= 2.0 = Medium
    // WSJF < 2.0 = Low
  },
  scoringVersion: '1.0.0'
};

/**
 * Core story scoring engine implementing WSJF methodology
 */
export class StoryScorer {
  private config: ScoringConfig;

  constructor(config: Partial<ScoringConfig> = {}) {
    this.config = { ...DEFAULT_SCORING_CONFIG, ...config };
    logger.info('StoryScorer initialized', {
      scoringVersion: this.config.scoringVersion,
      weights: this.config.weights
    });
  }

  /**
   * Score multiple stories using WSJF methodology
   */
  async scoreStories(stories: Story[]): Promise<ScoringResult> {
    const startTime = Date.now();
    logger.info('Starting story scoring', { storyCount: stories.length });

    try {
      const scoredStories: ScoredStory[] = [];
      const errors: ScoringError[] = [];

      // Score each story individually
      for (const story of stories) {
        try {
          const scoredStory = await this.scoreStory(story);
          scoredStories.push(scoredStory);
        } catch (error) {
          const scoringError = error instanceof ScoringError 
            ? error 
            : new ScoringError(`Failed to score story ${story.id}`, story.id, 'scoring');
          errors.push(scoringError);
          logger.error('Story scoring failed', { 
            storyId: story.id, 
            error: scoringError.message 
          });
        }
      }

      // Sort by WSJF score (highest first)
      scoredStories.sort((a, b) => b.wsjfScore - a.wsjfScore);

      // Generate priority updates
      const priorityUpdates = this.generatePriorityUpdates(scoredStories);

      // Generate optimization recommendations
      const recommendations = this.generateOptimizationRecommendations(scoredStories);

      const processingTime = Date.now() - startTime;
      const result: ScoringResult = {
        scoredStories,
        priorityUpdates,
        recommendations,
        summary: {
          totalStories: scoredStories.length,
          averageWsjfScore: scoredStories.reduce((sum, s) => sum + s.wsjfScore, 0) / scoredStories.length,
          highPriorityCount: scoredStories.filter(s => s.recommendedPriority <= LinearPriority.HIGH).length,
          recommendationsCount: recommendations.length
        },
        processingTime,
        timestamp: new Date()
      };

      logger.info('Story scoring completed', {
        totalStories: result.summary.totalStories,
        averageWsjfScore: result.summary.averageWsjfScore.toFixed(2),
        highPriorityCount: result.summary.highPriorityCount,
        processingTime: `${processingTime}ms`
      });

      return result;

    } catch (error) {
      logger.error('Batch story scoring failed', { error });
      throw new ScoringError('Failed to score stories batch', undefined, 'batch-scoring');
    }
  }

  /**
   * Score a single story using WSJF methodology
   */
  async scoreStory(story: Story): Promise<ScoredStory> {
    logger.debug('Scoring story', { storyId: story.id, title: story.title });

    try {
      // Calculate all WSJF components
      const businessValue = this.calculateBusinessValue(story);
      const timeCriticality = this.calculateTimeCriticality(story);
      const riskReduction = this.calculateRiskReduction(story);
      const jobSize = this.calculateJobSize(story);

      // Calculate WSJF score: (Business Value + Time Criticality + Risk Reduction) / Job Size
      const numerator = (
        businessValue.totalScore * this.config.weights.businessValue +
        timeCriticality.totalScore * this.config.weights.timeCriticality +
        riskReduction.totalScore * this.config.weights.riskReduction
      );
      const wsjfScore = jobSize.totalScore > 0 ? numerator / jobSize.totalScore : 0;

      // Calculate priority score (0-100 scale)
      const priorityScore = Math.min(100, wsjfScore * 10);

      // Determine recommended Linear priority
      const recommendedPriority = this.mapScoreToLinearPriority(wsjfScore);

      const scoredStory: ScoredStory = {
        ...story,
        priority: story.priority || LinearPriority.MEDIUM, // Default to medium if not set
        businessValue: businessValue.totalScore,
        timeCriticality: timeCriticality.totalScore,
        riskReduction: riskReduction.totalScore,
        jobSize: jobSize.totalScore,
        wsjfScore,
        priorityScore,
        recommendedPriority,
        scoringTimestamp: new Date(),
        scoringVersion: this.config.scoringVersion
      };

      logger.debug('Story scoring completed', {
        storyId: story.id,
        wsjfScore: wsjfScore.toFixed(2),
        recommendedPriority: LinearPriority[recommendedPriority]
      });

      return scoredStory;

    } catch (error) {
      logger.error('Story scoring failed', { storyId: story.id, error });
      throw new ScoringError(`Failed to score story: ${error instanceof Error ? error.message : 'Unknown error'}`, story.id, 'individual-scoring');
    }
  }

  /**
   * Calculate business value score (0-100)
   */
  private calculateBusinessValue(story: Story): BusinessValueScore {
    const content = `${story.title} ${story.description || ''}`.toLowerCase();
    
    // User impact scoring
    const userKeywords = ['user', 'customer', 'interface', 'ui', 'ux', 'experience', 'usability'];
    const userImpact = Math.min(100, 30 + (this.countKeywords(content, userKeywords) * 15));

    // Business impact scoring
    const businessKeywords = ['revenue', 'cost', 'efficiency', 'automation', 'process', 'kpi', 'metric'];
    const businessImpact = Math.min(100, 25 + (this.countKeywords(content, businessKeywords) * 20));

    // Technical debt scoring
    const techDebtKeywords = ['refactor', 'cleanup', 'optimize', 'performance', 'maintainability', 'debt'];
    const technicalDebt = Math.min(100, 20 + (this.countKeywords(content, techDebtKeywords) * 15));

    // Strategic value scoring
    const strategicKeywords = ['strategic', 'vision', 'roadmap', 'competitive', 'innovation', 'growth'];
    const strategicValue = Math.min(100, 15 + (this.countKeywords(content, strategicKeywords) * 25));

    // Story points boost (larger stories often have more business value)
    const pointsBoost = Math.min(20, (story.storyPoints || 0) * 2);

    const totalScore = Math.min(100, (userImpact + businessImpact + technicalDebt + strategicValue + pointsBoost) / 5);

    return {
      userImpact,
      businessImpact,
      technicalDebt,
      strategicValue,
      totalScore
    };
  }

  /**
   * Calculate time criticality score (0-100)
   */
  private calculateTimeCriticality(story: Story): TimeCriticalityScore {
    const content = `${story.title} ${story.description || ''}`.toLowerCase();
    
    // Market window timing
    const marketKeywords = ['deadline', 'launch', 'release', 'market', 'competitive', 'window'];
    const marketWindow = Math.min(100, 20 + (this.countKeywords(content, marketKeywords) * 20));

    // Customer commitment impact
    const commitmentKeywords = ['customer', 'commitment', 'promised', 'demo', 'presentation', 'milestone'];
    const customerCommitment = Math.min(100, 15 + (this.countKeywords(content, commitmentKeywords) * 25));

    // Regulatory or compliance urgency
    const regulatoryKeywords = ['compliance', 'regulatory', 'legal', 'audit', 'security', 'gdpr', 'hipaa'];
    const regulatoryDeadline = Math.min(100, 10 + (this.countKeywords(content, regulatoryKeywords) * 30));

    // Priority boost from Linear priority (if available)
    const priorityBoost = story.priority ? Math.max(0, (5 - story.priority) * 15) : 0;

    const totalScore = Math.min(100, (marketWindow + customerCommitment + regulatoryDeadline + priorityBoost) / 4);

    return {
      marketWindow,
      customerCommitment,
      regulatoryDeadline,
      totalScore
    };
  }

  /**
   * Calculate risk reduction score (0-100)
   */
  private calculateRiskReduction(story: Story): RiskReductionScore {
    const content = `${story.title} ${story.description || ''}`.toLowerCase();
    
    // Security risk mitigation
    const securityKeywords = ['security', 'vulnerability', 'encryption', 'authentication', 'authorization'];
    const securityRisk = Math.min(100, 15 + (this.countKeywords(content, securityKeywords) * 25));

    // Operational risk reduction
    const operationalKeywords = ['reliability', 'availability', 'monitoring', 'alerting', 'backup', 'recovery'];
    const operationalRisk = Math.min(100, 20 + (this.countKeywords(content, operationalKeywords) * 20));

    // Technical risk mitigation
    const technicalKeywords = ['stability', 'performance', 'scalability', 'maintenance', 'upgrade'];
    const technicalRisk = Math.min(100, 25 + (this.countKeywords(content, technicalKeywords) * 15));

    // Business risk reduction
    const businessKeywords = ['risk', 'compliance', 'continuity', 'disaster', 'contingency'];
    const businessRisk = Math.min(100, 10 + (this.countKeywords(content, businessKeywords) * 30));

    const totalScore = Math.min(100, (securityRisk + operationalRisk + technicalRisk + businessRisk) / 4);

    return {
      securityRisk,
      operationalRisk,
      technicalRisk,
      businessRisk,
      totalScore
    };
  }

  /**
   * Calculate job size score (story points with complexity adjustments)
   */
  private calculateJobSize(story: Story): JobSizeScore {
    const content = `${story.title} ${story.description || ''}`.toLowerCase();
    
    const storyPoints = story.storyPoints || 1;
    
    // Complexity indicators
    const complexityKeywords = ['complex', 'integration', 'migration', 'algorithm', 'optimization'];
    const complexity = Math.min(5, 1 + (this.countKeywords(content, complexityKeywords) * 0.5));

    // Uncertainty indicators
    const uncertaintyKeywords = ['research', 'investigate', 'explore', 'unknown', 'unclear', 'tbd'];
    const uncertainty = Math.min(5, 1 + (this.countKeywords(content, uncertaintyKeywords) * 0.7));

    // Dependencies count (estimated from story content)
    const dependencyKeywords = ['depends', 'requires', 'needs', 'after', 'prerequisite'];
    const dependencies = this.countKeywords(content, dependencyKeywords);

    // Total job size (higher = more work)
    const totalScore = storyPoints * (1 + (complexity - 1) * 0.2 + (uncertainty - 1) * 0.2) + dependencies * 0.5;

    return {
      storyPoints,
      complexity,
      uncertainty,
      dependencies,
      totalScore
    };
  }

  /**
   * Map WSJF score to Linear priority level
   */
  private mapScoreToLinearPriority(wsjfScore: number): LinearPriority {
    if (wsjfScore >= this.config.priorityMapping.urgentThreshold) {
      return LinearPriority.URGENT;
    } else if (wsjfScore >= this.config.priorityMapping.highThreshold) {
      return LinearPriority.HIGH;
    } else if (wsjfScore >= this.config.priorityMapping.mediumThreshold) {
      return LinearPriority.MEDIUM;
    } else {
      return LinearPriority.LOW;
    }
  }

  /**
   * Count keyword occurrences in content
   */
  private countKeywords(content: string, keywords: string[]): number {
    return keywords.filter(keyword => content.includes(keyword)).length;
  }

  /**
   * Generate priority updates for Linear
   */
  private generatePriorityUpdates(scoredStories: ScoredStory[]) {
    return scoredStories.map(story => ({
      storyId: story.id,
      currentPriority: story.priority || LinearPriority.MEDIUM,
      recommendedPriority: story.recommendedPriority,
      wsjfScore: story.wsjfScore,
      rationale: `WSJF Score: ${story.wsjfScore.toFixed(2)} (Business Value: ${story.businessValue.toFixed(1)}, Time Criticality: ${story.timeCriticality.toFixed(1)}, Risk Reduction: ${story.riskReduction.toFixed(1)}, Job Size: ${story.jobSize.toFixed(1)})`,
      updateTimestamp: new Date()
    }));
  }

  /**
   * Generate value delivery optimization recommendations
   */
  private generateOptimizationRecommendations(scoredStories: ScoredStory[]) {
    const recommendations = [];
    
    // Recommend prioritizing high-value, low-effort stories
    const quickWins = scoredStories.filter(s => s.wsjfScore > 6 && s.jobSize <= 3);
    if (quickWins.length > 0) {
      recommendations.push({
        recommendationType: 'PRIORITIZE' as const,
        affectedStories: quickWins.map(s => s.id),
        rationale: 'High WSJF score with low job size - excellent value delivery opportunity',
        expectedImpact: 'Quick delivery of high business value',
        confidence: 0.9
      });
    }

    // Recommend splitting large, high-value stories
    const largeBetterStories = scoredStories.filter(s => s.wsjfScore > 5 && s.jobSize > 8);
    if (largeBetterStories.length > 0) {
      recommendations.push({
        recommendationType: 'SPLIT' as const,
        affectedStories: largeBetterStories.map(s => s.id),
        rationale: 'High business value but large job size - consider story decomposition',
        expectedImpact: 'Earlier value delivery through incremental implementation',
        confidence: 0.7
      });
    }

    return recommendations;
  }
}