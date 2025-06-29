/**
 * API Adapter for Story Decomposition Engine
 * 
 * This adapter bridges the gap between the LIN-47 implementation
 * and the interface expected by Phase 2 agents (LIN-48, LIN-50).
 * 
 * It wraps the existing StoryDecompositionEngine and provides
 * the API contract specified in the orchestration documents.
 */

import { StoryDecompositionEngine } from './story-decomposition-engine';
import { 
  StoryDecompositionAPI,
  LargeStory,
  DecomposedStory,
  ValidationResult,
  BusinessValue,
  ValidationError,
  ValidationWarning
} from '../types/decomposition-api-types';
import { Story } from '../planning/models';
import { DecompositionResult } from '../types/decomposition-types';
import * as logger from '../utils/logger';

/**
 * Adapter that implements the expected API interface for Phase 2 agents
 */
export class DecompositionAPIAdapter implements StoryDecompositionAPI {
  private engine: StoryDecompositionEngine;

  constructor(engine?: StoryDecompositionEngine) {
    this.engine = engine || new StoryDecompositionEngine();
    logger.info('Decomposition API Adapter initialized');
  }

  /**
   * Decomposes a large story into smaller sub-stories
   * Maps from actual implementation to expected interface
   */
  async decomposeStory(story: LargeStory): Promise<DecomposedStory[]> {
    logger.debug('API Adapter: decomposeStory called', { 
      storyId: story.id, 
      estimate: story.estimate 
    });

    // Validate that story is large enough for decomposition
    if (story.estimate <= 5) {
      logger.warn('Story does not need decomposition', { 
        storyId: story.id, 
        estimate: story.estimate 
      });
      throw new Error(`Story ${story.id} has ${story.estimate} points, no decomposition needed`);
    }

    try {
      // Call the actual implementation
      const result: DecompositionResult = await this.engine.decomposeStory(story);
      
      // Map the result to expected DecomposedStory format
      const decomposedStories: DecomposedStory[] = result.subStories.map((subStory, index) => ({
        ...subStory,
        parentStoryId: story.id,
        decompositionIndex: index,
        originalStoryPoints: story.estimate,
        businessValuePortion: this.calculateBusinessValuePortion(
          result.pointsDistribution[index] || 0,
          story.estimate
        )
      }));

      logger.info('Story decomposition completed via adapter', {
        storyId: story.id,
        subStoryCount: decomposedStories.length,
        totalPoints: decomposedStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)
      });

      return decomposedStories;

    } catch (error) {
      logger.error('Decomposition failed via adapter', { 
        storyId: story.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Validates that decomposition maintains integrity
   * Exposes validation logic that was previously private
   */
  async validateDecomposition(decomposed: DecomposedStory[]): Promise<ValidationResult> {
    logger.debug('API Adapter: validateDecomposition called', { 
      storyCount: decomposed.length 
    });

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation checks
    if (decomposed.length === 0) {
      errors.push({
        code: 'EMPTY_DECOMPOSITION',
        message: 'Decomposition cannot be empty'
      });
    }

    // Check for consistent parent story
    const parentIds = new Set(decomposed.map(s => s.parentStoryId));
    if (parentIds.size > 1) {
      errors.push({
        code: 'MULTIPLE_PARENTS',
        message: 'All decomposed stories must have the same parent'
      });
    }

    // Validate story points
    const totalPoints = decomposed.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
    const originalPoints = decomposed[0]?.originalStoryPoints || 0;
    
    if (Math.abs(totalPoints - originalPoints) > 1) {
      warnings.push({
        code: 'POINTS_MISMATCH',
        message: `Total points (${totalPoints}) doesn't match original (${originalPoints})`
      });
    }

    // Check individual story sizes
    for (const story of decomposed) {
      if ((story.storyPoints || 0) > 5) {
        errors.push({
          code: 'STORY_TOO_LARGE',
          message: `Story ${story.id} has ${story.storyPoints} points (max 5)`,
          storyId: story.id
        });
      }
    }

    // Validate business value distribution
    const totalValuePortion = decomposed.reduce((sum, s) => sum + s.businessValuePortion, 0);
    if (Math.abs(totalValuePortion - 1.0) > 0.01) {
      warnings.push({
        code: 'VALUE_DISTRIBUTION_IMBALANCE',
        message: `Business value portions sum to ${totalValuePortion.toFixed(2)}, expected 1.0`
      });
    }

    const isValid = errors.length === 0;
    const averagePoints = totalPoints / decomposed.length;

    const result: ValidationResult = {
      isValid,
      errors,
      warnings,
      metrics: {
        totalPoints,
        averagePoints,
        storyCount: decomposed.length,
        businessValuePreserved: Math.abs(totalValuePortion - 1.0) <= 0.01
      }
    };

    logger.info('Decomposition validation completed', {
      isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
      metrics: result.metrics
    });

    return result;
  }

  /**
   * Maps business value from parent to sub-stories
   * Implements business value analysis that was missing
   */
  async getBusinessValueMapping(story: Story): Promise<BusinessValue> {
    logger.debug('API Adapter: getBusinessValueMapping called', { 
      storyId: story.id 
    });

    // Analyze story content for business value indicators
    const businessValue: BusinessValue = {
      storyId: story.id,
      totalValue: this.calculateTotalBusinessValue(story),
      valueComponents: {
        userImpact: this.assessUserImpact(story),
        businessImpact: this.assessBusinessImpact(story),
        technicalDebt: this.assessTechnicalDebtReduction(story),
        riskReduction: this.assessRiskReduction(story)
      }
    };

    // Calculate WSJF score if we have enough information
    if (story.storyPoints && story.storyPoints > 0) {
      businessValue.wsjfScore = businessValue.totalValue / story.storyPoints;
    }

    logger.info('Business value mapping completed', {
      storyId: story.id,
      totalValue: businessValue.totalValue,
      wsjfScore: businessValue.wsjfScore
    });

    return businessValue;
  }

  /**
   * Calculate business value portion for decomposed story
   */
  private calculateBusinessValuePortion(storyPoints: number, totalPoints: number): number {
    if (totalPoints === 0) return 0;
    return storyPoints / totalPoints;
  }

  /**
   * Calculate total business value based on story characteristics
   */
  private calculateTotalBusinessValue(story: Story): number {
    let value = 0;
    
    // Base value from story points (complexity indicator)
    value += (story.storyPoints || 1) * 10;
    
    // Boost for user-facing features
    if (this.hasUserFacingContent(story)) {
      value += 20;
    }
    
    // Boost for stories with many acceptance criteria (complexity indicator)
    if (story.acceptanceCriteria && story.acceptanceCriteria.length > 3) {
      value += 15;
    }
    
    return value;
  }

  /**
   * Assess user impact component of business value
   */
  private assessUserImpact(story: Story): number {
    const content = `${story.title} ${story.description || ''}`.toLowerCase();
    
    let impact = 30; // Base impact
    
    // Look for user-facing keywords
    const userKeywords = ['user', 'customer', 'interface', 'ui', 'ux', 'experience'];
    const userMentions = userKeywords.filter(keyword => content.includes(keyword)).length;
    impact += userMentions * 10;
    
    return Math.min(impact, 100);
  }

  /**
   * Assess business impact component
   */
  private assessBusinessImpact(story: Story): number {
    const content = `${story.title} ${story.description}`.toLowerCase();
    
    let impact = 25; // Base impact
    
    // Look for business keywords
    const businessKeywords = ['revenue', 'cost', 'efficiency', 'automation', 'process'];
    const businessMentions = businessKeywords.filter(keyword => content.includes(keyword)).length;
    impact += businessMentions * 15;
    
    return Math.min(impact, 100);
  }

  /**
   * Assess technical debt reduction value
   */
  private assessTechnicalDebtReduction(story: Story): number {
    const content = `${story.title} ${story.description}`.toLowerCase();
    
    let reduction = 20; // Base value
    
    // Look for refactoring/cleanup keywords
    const techDebtKeywords = ['refactor', 'cleanup', 'optimize', 'performance', 'maintainability'];
    const techDebtMentions = techDebtKeywords.filter(keyword => content.includes(keyword)).length;
    reduction += techDebtMentions * 15;
    
    return Math.min(reduction, 100);
  }

  /**
   * Assess risk reduction value
   */
  private assessRiskReduction(story: Story): number {
    const content = `${story.title} ${story.description}`.toLowerCase();
    
    let reduction = 15; // Base value
    
    // Look for risk-related keywords
    const riskKeywords = ['security', 'compliance', 'stability', 'reliability', 'backup'];
    const riskMentions = riskKeywords.filter(keyword => content.includes(keyword)).length;
    reduction += riskMentions * 20;
    
    return Math.min(reduction, 100);
  }

  /**
   * Check if story has user-facing content
   */
  private hasUserFacingContent(story: Story): boolean {
    const content = `${story.title} ${story.description}`.toLowerCase();
    const userFacingKeywords = ['user', 'interface', 'ui', 'frontend', 'display', 'show'];
    
    return userFacingKeywords.some(keyword => content.includes(keyword));
  }
}

/**
 * Factory function to create a configured adapter instance
 */
export function createDecompositionAPI(engine?: StoryDecompositionEngine): StoryDecompositionAPI {
  return new DecompositionAPIAdapter(engine);
}

/**
 * Default export for convenience
 */
export default DecompositionAPIAdapter;