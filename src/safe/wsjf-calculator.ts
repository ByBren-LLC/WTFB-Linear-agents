/**
 * WSJF (Weighted Shortest Job First) Calculator (LIN-50)
 * 
 * Implements SAFe WSJF prioritization methodology for optimal value delivery.
 * Provides advanced prioritization algorithms and value delivery optimization.
 */

import {
  ScoredStory,
  WSJFComponents,
  ScoringConfig,
  ValueOptimizationRecommendation,
  LinearPriority
} from '../types/scoring-types';
import * as logger from '../utils/logger';

/**
 * Advanced WSJF calculator with prioritization optimization
 */
export class WSJFCalculator {
  private config: ScoringConfig;

  constructor(config: ScoringConfig) {
    this.config = config;
    logger.info('WSJFCalculator initialized', {
      weights: config.weights,
      priorityMapping: config.priorityMapping
    });
  }

  /**
   * Calculate WSJF score using SAFe methodology
   * WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
   */
  calculateWSJF(
    businessValue: number,
    timeCriticality: number,
    riskReduction: number,
    jobSize: number
  ): number {
    if (jobSize <= 0) {
      logger.warn('Invalid job size for WSJF calculation', { jobSize });
      return 0;
    }

    const numerator = (
      businessValue * this.config.weights.businessValue +
      timeCriticality * this.config.weights.timeCriticality +
      riskReduction * this.config.weights.riskReduction
    );

    const wsjfScore = numerator / jobSize;
    
    logger.debug('WSJF calculation completed', {
      businessValue,
      timeCriticality,
      riskReduction,
      jobSize,
      wsjfScore: wsjfScore.toFixed(2)
    });

    return wsjfScore;
  }

  /**
   * Prioritize stories using WSJF scores and advanced sorting
   */
  prioritizeStories(scoredStories: ScoredStory[]): ScoredStory[] {
    logger.info('Prioritizing stories using WSJF', { storyCount: scoredStories.length });

    // Sort by WSJF score (highest first), with tie-breakers
    const prioritized = [...scoredStories].sort((a, b) => {
      // Primary sort: WSJF score
      if (Math.abs(a.wsjfScore - b.wsjfScore) > 0.1) {
        return b.wsjfScore - a.wsjfScore;
      }
      
      // Tie-breaker 1: Business value
      if (Math.abs(a.businessValue - b.businessValue) > 5) {
        return b.businessValue - a.businessValue;
      }
      
      // Tie-breaker 2: Job size (smaller is better)
      if (Math.abs(a.jobSize - b.jobSize) > 1) {
        return a.jobSize - b.jobSize;
      }
      
      // Tie-breaker 3: Time criticality
      return b.timeCriticality - a.timeCriticality;
    });

    logger.info('Story prioritization completed', {
      topStory: prioritized[0]?.id,
      topWSJF: prioritized[0]?.wsjfScore?.toFixed(2),
      bottomStory: prioritized[prioritized.length - 1]?.id,
      bottomWSJF: prioritized[prioritized.length - 1]?.wsjfScore?.toFixed(2)
    });

    return prioritized;
  }

  /**
   * Optimize value delivery considering dependencies and team capacity
   */
  optimizeValueDelivery(
    stories: ScoredStory[],
    dependencies?: Map<string, string[]>,
    teamCapacity?: number
  ): ScoredStory[] {
    logger.info('Optimizing value delivery', {
      storyCount: stories.length,
      hasDependencies: !!dependencies,
      teamCapacity
    });

    let optimized = this.prioritizeStories(stories);

    // Apply dependency constraints if provided
    if (dependencies && dependencies.size > 0) {
      optimized = this.applyDependencyConstraints(optimized, dependencies);
    }

    // Apply capacity constraints if provided
    if (teamCapacity && teamCapacity > 0) {
      optimized = this.applyCapacityConstraints(optimized, teamCapacity);
    }

    // Apply value delivery timing optimization
    optimized = this.optimizeValueTiming(optimized);

    logger.info('Value delivery optimization completed', {
      finalStoryCount: optimized.length
    });

    return optimized;
  }

  /**
   * Generate value optimization recommendations
   */
  generateOptimizationRecommendations(stories: ScoredStory[]): ValueOptimizationRecommendation[] {
    const recommendations: ValueOptimizationRecommendation[] = [];

    // Quick wins: High value, low effort
    const quickWins = stories.filter(s => s.wsjfScore > 6 && s.jobSize <= 3);
    if (quickWins.length > 0) {
      recommendations.push({
        recommendationType: 'PRIORITIZE',
        affectedStories: quickWins.map(s => s.id),
        rationale: `Found ${quickWins.length} quick wins with high WSJF scores (>6) and low job size (≤3)`,
        expectedImpact: 'Quick delivery of high business value with minimal effort',
        confidence: 0.9
      });
    }

    // Large valuable stories: Consider splitting
    const largeValuableStories = stories.filter(s => s.wsjfScore > 5 && s.jobSize > 8);
    if (largeValuableStories.length > 0) {
      recommendations.push({
        recommendationType: 'SPLIT',
        affectedStories: largeValuableStories.map(s => s.id),
        rationale: `Found ${largeValuableStories.length} high-value stories with large job size (>8) that could benefit from decomposition`,
        expectedImpact: 'Earlier and more frequent value delivery through incremental implementation',
        confidence: 0.7
      });
    }

    // Low-value, high-effort stories: Consider delaying
    const lowValueHighEffort = stories.filter(s => s.wsjfScore < 2 && s.jobSize > 5);
    if (lowValueHighEffort.length > 0) {
      recommendations.push({
        recommendationType: 'DELAY',
        affectedStories: lowValueHighEffort.map(s => s.id),
        rationale: `Found ${lowValueHighEffort.length} stories with low WSJF scores (<2) and high effort (>5) that may not provide optimal value`,
        expectedImpact: 'Focus team capacity on higher-value work',
        confidence: 0.6
      });
    }

    // Similar small stories: Consider combining
    const smallSimilarStories = this.findSimilarSmallStories(stories);
    if (smallSimilarStories.length > 1) {
      recommendations.push({
        recommendationType: 'COMBINE',
        affectedStories: smallSimilarStories.map(s => s.id),
        rationale: `Found ${smallSimilarStories.length} small, related stories that could be combined for efficiency`,
        expectedImpact: 'Reduced overhead and improved implementation efficiency',
        confidence: 0.5
      });
    }

    logger.info('Generated value optimization recommendations', {
      recommendationCount: recommendations.length,
      types: recommendations.map(r => r.recommendationType)
    });

    return recommendations;
  }

  /**
   * Apply dependency constraints to story ordering
   */
  private applyDependencyConstraints(
    stories: ScoredStory[],
    dependencies: Map<string, string[]>
  ): ScoredStory[] {
    logger.debug('Applying dependency constraints', {
      dependencyCount: dependencies.size
    });

    const result: ScoredStory[] = [];
    const remaining = new Set(stories.map(s => s.id));
    const processed = new Set<string>();

    // Topological sort considering dependencies
    while (remaining.size > 0) {
      let progress = false;

      for (const story of stories) {
        if (!remaining.has(story.id) || processed.has(story.id)) continue;

        const storyDependencies = dependencies.get(story.id) || [];
        const dependenciesMet = storyDependencies.every(dep => processed.has(dep));

        if (dependenciesMet) {
          result.push(story);
          processed.add(story.id);
          remaining.delete(story.id);
          progress = true;
        }
      }

      // Prevent infinite loop if circular dependencies exist
      if (!progress) {
        logger.warn('Circular dependencies detected, adding remaining stories');
        const remainingStories = stories.filter(s => remaining.has(s.id));
        result.push(...remainingStories);
        break;
      }
    }

    return result;
  }

  /**
   * Apply team capacity constraints
   */
  private applyCapacityConstraints(stories: ScoredStory[], teamCapacity: number): ScoredStory[] {
    logger.debug('Applying capacity constraints', { teamCapacity });

    let totalEffort = 0;
    const result: ScoredStory[] = [];

    for (const story of stories) {
      if (totalEffort + story.jobSize <= teamCapacity) {
        result.push(story);
        totalEffort += story.jobSize;
      } else {
        logger.debug('Story exceeds remaining capacity', {
          storyId: story.id,
          storySize: story.jobSize,
          remainingCapacity: teamCapacity - totalEffort
        });
        break;
      }
    }

    logger.info('Capacity constraints applied', {
      selectedStories: result.length,
      totalEffort,
      capacityUtilization: ((totalEffort / teamCapacity) * 100).toFixed(1) + '%'
    });

    return result;
  }

  /**
   * Optimize value delivery timing
   */
  private optimizeValueTiming(stories: ScoredStory[]): ScoredStory[] {
    // Group stories by priority tiers
    const urgent = stories.filter(s => s.recommendedPriority === LinearPriority.URGENT);
    const high = stories.filter(s => s.recommendedPriority === LinearPriority.HIGH);
    const medium = stories.filter(s => s.recommendedPriority === LinearPriority.MEDIUM);
    const low = stories.filter(s => s.recommendedPriority === LinearPriority.LOW);

    // Within each tier, prioritize by WSJF score
    const sortByWSJF = (a: ScoredStory, b: ScoredStory) => b.wsjfScore - a.wsjfScore;

    return [
      ...urgent.sort(sortByWSJF),
      ...high.sort(sortByWSJF),
      ...medium.sort(sortByWSJF),
      ...low.sort(sortByWSJF)
    ];
  }

  /**
   * Find similar small stories that could be combined
   */
  private findSimilarSmallStories(stories: ScoredStory[]): ScoredStory[] {
    const smallStories = stories.filter(s => s.jobSize <= 2);
    const similarityThreshold = 0.7;

    // Simple similarity check based on title keywords
    const similar: ScoredStory[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < smallStories.length - 1; i++) {
      const story1 = smallStories[i];
      if (processed.has(story1.id)) continue;

      const story1Keywords = this.extractKeywords(story1.title);
      
      for (let j = i + 1; j < smallStories.length; j++) {
        const story2 = smallStories[j];
        if (processed.has(story2.id)) continue;

        const story2Keywords = this.extractKeywords(story2.title);
        const similarity = this.calculateSimilarity(story1Keywords, story2Keywords);

        if (similarity >= similarityThreshold) {
          if (!processed.has(story1.id)) {
            similar.push(story1);
            processed.add(story1.id);
          }
          similar.push(story2);
          processed.add(story2.id);
        }
      }
    }

    return similar;
  }

  /**
   * Extract keywords from story title
   */
  private extractKeywords(title: string): Set<string> {
    const words = title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3); // Filter out very short words
    
    return new Set(words);
  }

  /**
   * Calculate similarity between two keyword sets
   */
  private calculateSimilarity(keywords1: Set<string>, keywords2: Set<string>): number {
    const intersection = new Set(Array.from(keywords1).filter(x => keywords2.has(x)));
    const union = new Set([...Array.from(keywords1), ...Array.from(keywords2)]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}