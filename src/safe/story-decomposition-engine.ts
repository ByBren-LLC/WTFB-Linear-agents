/**
 * Story Decomposition Engine for automated story breakdown
 * 
 * This module provides the core functionality for automatically breaking down
 * large stories (>5 points) into implementable sub-stories (≤5 points each)
 * while maintaining SAFe compliance and business value.
 */

import { v4 as uuidv4 } from 'uuid';
import { Story } from '../planning/models';
import {
  DecompositionResult,
  DecompositionConfig,
  StoryAnalysis,
  SubStoryContext,
  AcceptanceCriteriaMapping,
  DecompositionValidation,
  DecompositionAuditEntry,
  StoryDecompositionError,
  DecompositionEvent
} from '../types/decomposition-types';
import * as logger from '../utils/logger';

/**
 * Story Decomposition Engine implementation
 * 
 * Provides automated decomposition of large stories into implementable sub-stories
 * following SAFe methodology and maintaining business value.
 */
export class StoryDecompositionEngine {
  private config: DecompositionConfig;
  private auditTrail: DecompositionAuditEntry[] = [];
  private eventListeners: ((event: DecompositionEvent) => void)[] = [];

  constructor(config?: Partial<DecompositionConfig>) {
    this.config = {
      maxStoryPoints: 5,
      minSubStories: 2,
      maxSubStories: 4,
      maxSubStoryPoints: 5,
      preserveParentStory: true,
      pointsDistributionStrategy: 'weighted',
      criteriaDistributionStrategy: 'thematic',
      ...config
    };

    logger.info('Story Decomposition Engine initialized', { config: this.config });
  }

  /**
   * Analyzes a story to determine if it should be decomposed
   */
  async analyzeStory(story: Story): Promise<StoryAnalysis> {
    logger.debug('Analyzing story for decomposition', { storyId: story.id, title: story.title });

    const analysis: StoryAnalysis = {
      shouldDecompose: false,
      currentPoints: story.storyPoints || 0,
      complexityFactors: [],
      suggestedSubStoryCount: 0,
      logicalBoundaries: [],
      riskFactors: [],
      confidence: 0
    };

    // Check if story points exceed threshold
    if (!story.storyPoints || story.storyPoints <= this.config.maxStoryPoints) {
      analysis.shouldDecompose = false;
      analysis.riskFactors.push('Story points within acceptable range');
      return analysis;
    }

    analysis.shouldDecompose = true;

    // Analyze complexity factors
    analysis.complexityFactors = this.identifyComplexityFactors(story);
    
    // Suggest number of sub-stories based on points and complexity
    analysis.suggestedSubStoryCount = this.calculateOptimalSubStoryCount(story);
    
    // Identify logical boundaries for decomposition
    analysis.logicalBoundaries = this.identifyLogicalBoundaries(story);
    
    // Assess risk factors
    analysis.riskFactors = this.assessDecompositionRisks(story);
    
    // Calculate confidence level
    analysis.confidence = this.calculateDecompositionConfidence(story, analysis);

    logger.info('Story analysis completed', {
      storyId: story.id,
      shouldDecompose: analysis.shouldDecompose,
      suggestedCount: analysis.suggestedSubStoryCount,
      confidence: analysis.confidence
    });

    return analysis;
  }

  /**
   * Decomposes a large story into implementable sub-stories
   */
  async decomposeStory(story: Story): Promise<DecompositionResult> {
    const decompositionId = uuidv4();
    const timestamp = new Date();

    logger.info('Starting story decomposition', {
      storyId: story.id,
      decompositionId,
      storyPoints: story.storyPoints
    });

    this.emitEvent('started', story.id, decompositionId, { storyPoints: story.storyPoints });

    try {
      // First, analyze the story
      const analysis = await this.analyzeStory(story);
      this.emitEvent('analyzed', story.id, decompositionId, { analysis });

      if (!analysis.shouldDecompose) {
        throw new StoryDecompositionError(
          'Story does not require decomposition',
          'STORY_TOO_SMALL',
          story.id,
          { currentPoints: story.storyPoints }
        );
      }

      // Validate story has sufficient information for decomposition
      this.validateStoryForDecomposition(story);

      // Calculate points distribution
      const pointsDistribution = this.calculatePointsDistribution(
        story.storyPoints!,
        analysis.suggestedSubStoryCount
      );

      // Distribute acceptance criteria
      const criteriaMapping = this.distributeAcceptanceCriteria(
        story.acceptanceCriteria,
        analysis.suggestedSubStoryCount
      );

      // Generate sub-stories
      const subStories = this.generateSubStories(
        story,
        analysis.suggestedSubStoryCount,
        pointsDistribution,
        criteriaMapping
      );

      // Create decomposition result
      const decompositionResult: DecompositionResult = {
        parentStory: story,
        subStories,
        decompositionRationale: this.generateDecompositionRationale(story, analysis),
        pointsDistribution,
        criteriaMapping,
        decompositionId,
        timestamp
      };

      // Validate the decomposition
      const validation = this.validateDecomposition(decompositionResult);
      this.emitEvent('decomposed', story.id, decompositionId, { subStoryCount: subStories.length });

      if (!validation.pointsValid || !validation.criteriaValid || !validation.sizingValid) {
        throw new StoryDecompositionError(
          'Decomposition validation failed',
          'VALIDATION_FAILED',
          story.id,
          { validation }
        );
      }

      this.emitEvent('validated', story.id, decompositionId, { validation });

      // Add audit entry
      this.addAuditEntry(decompositionId, 'created', 'system', {
        storyId: story.id,
        subStoryCount: subStories.length,
        pointsDistribution,
        validation
      }, 'success');

      this.emitEvent('completed', story.id, decompositionId, { result: decompositionResult });

      logger.info('Story decomposition completed successfully', {
        storyId: story.id,
        decompositionId,
        subStoryCount: subStories.length
      });

      return decompositionResult;

    } catch (error) {
      this.emitEvent('failed', story.id, decompositionId, { error: (error as Error).message });

      this.addAuditEntry(decompositionId, 'created', 'system', {
        storyId: story.id,
        error: (error as Error).message
      }, 'failure', (error as Error).message);

      logger.error('Story decomposition failed', {
        storyId: story.id,
        decompositionId,
        error
      });

      throw error;
    }
  }

  /**
   * Calculates optimal point distribution across sub-stories
   */
  private calculatePointsDistribution(totalPoints: number, subStoryCount: number): number[] {
    logger.debug('Calculating points distribution', { totalPoints, subStoryCount });

    const distribution: number[] = [];
    
    switch (this.config.pointsDistributionStrategy) {
      case 'even':
        return this.calculateEvenDistribution(totalPoints, subStoryCount);
      
      case 'fibonacci':
        return this.calculateFibonacciDistribution(totalPoints, subStoryCount);
      
      case 'weighted':
      default:
        return this.calculateWeightedDistribution(totalPoints, subStoryCount);
    }
  }

  /**
   * Calculates even distribution of points
   */
  private calculateEvenDistribution(totalPoints: number, subStoryCount: number): number[] {
    const basePoints = Math.floor(totalPoints / subStoryCount);
    const remainder = totalPoints % subStoryCount;
    
    const distribution = new Array(subStoryCount).fill(basePoints);
    
    // Distribute remainder across first few sub-stories
    for (let i = 0; i < remainder; i++) {
      distribution[i]++;
    }
    
    // Ensure no sub-story exceeds max points
    return distribution.map(points => Math.min(points, this.config.maxSubStoryPoints));
  }

  /**
   * Calculates weighted distribution (larger first sub-story, smaller subsequent ones)
   */
  private calculateWeightedDistribution(totalPoints: number, subStoryCount: number): number[] {
    const distribution: number[] = [];
    let remainingPoints = totalPoints;
    
    // First sub-story gets the largest share
    const firstStoryPoints = Math.min(
      Math.ceil(totalPoints * 0.4),
      this.config.maxSubStoryPoints
    );
    distribution.push(firstStoryPoints);
    remainingPoints -= firstStoryPoints;
    
    // Distribute remaining points evenly across other sub-stories
    const remainingSubStories = subStoryCount - 1;
    if (remainingSubStories > 0) {
      const evenDistribution = this.calculateEvenDistribution(remainingPoints, remainingSubStories);
      distribution.push(...evenDistribution);
    }
    
    return distribution;
  }

  /**
   * Calculates fibonacci-based distribution
   */
  private calculateFibonacciDistribution(totalPoints: number, subStoryCount: number): number[] {
    const fibSequence = this.generateFibonacci(subStoryCount);
    const fibSum = fibSequence.reduce((sum, val) => sum + val, 0);
    
    return fibSequence.map(fibValue => {
      const points = Math.round((fibValue / fibSum) * totalPoints);
      return Math.min(Math.max(points, 1), this.config.maxSubStoryPoints);
    });
  }

  /**
   * Generates fibonacci sequence of specified length
   */
  private generateFibonacci(length: number): number[] {
    if (length <= 0) return [];
    if (length === 1) return [1];
    
    const sequence = [1, 1];
    for (let i = 2; i < length; i++) {
      sequence.push(sequence[i - 1] + sequence[i - 2]);
    }
    
    return sequence.slice(0, length);
  }

  /**
   * Distributes acceptance criteria across sub-stories
   */
  private distributeAcceptanceCriteria(
    criteria: string[],
    subStoryCount: number
  ): AcceptanceCriteriaMapping[] {
    logger.debug('Distributing acceptance criteria', {
      criteriaCount: criteria.length,
      subStoryCount
    });

    const mappings: AcceptanceCriteriaMapping[] = [];
    
    if (criteria.length === 0) {
      logger.warn('No acceptance criteria to distribute');
      return mappings;
    }

    switch (this.config.criteriaDistributionStrategy) {
      case 'sequential':
        return this.distributeSequentially(criteria, subStoryCount);
      
      case 'balanced':
        return this.distributeBalanced(criteria, subStoryCount);
      
      case 'thematic':
      default:
        return this.distributeThematically(criteria, subStoryCount);
    }
  }

  /**
   * Distributes criteria sequentially (round-robin)
   */
  private distributeSequentially(criteria: string[], subStoryCount: number): AcceptanceCriteriaMapping[] {
    const mappings: AcceptanceCriteriaMapping[] = [];
    
    criteria.forEach((criterion, index) => {
      const targetSubStoryIndex = index % subStoryCount;
      const targetSubStoryId = `sub-story-${targetSubStoryIndex}`;
      
      mappings.push({
        originalCriteria: criterion,
        targetSubStoryId,
        adaptedCriteria: criterion, // For now, keep original
        originalIndex: index,
        mappingRationale: `Sequential distribution to sub-story ${targetSubStoryIndex + 1}`
      });
    });
    
    return mappings;
  }

  /**
   * Distributes criteria for balanced distribution
   */
  private distributeBalanced(criteria: string[], subStoryCount: number): AcceptanceCriteriaMapping[] {
    const mappings: AcceptanceCriteriaMapping[] = [];
    const criteriaPerSubStory = Math.ceil(criteria.length / subStoryCount);
    
    criteria.forEach((criterion, index) => {
      const targetSubStoryIndex = Math.floor(index / criteriaPerSubStory);
      const actualTargetIndex = Math.min(targetSubStoryIndex, subStoryCount - 1);
      const targetSubStoryId = `sub-story-${actualTargetIndex}`;
      
      mappings.push({
        originalCriteria: criterion,
        targetSubStoryId,
        adaptedCriteria: criterion,
        originalIndex: index,
        mappingRationale: `Balanced distribution to sub-story ${actualTargetIndex + 1}`
      });
    });
    
    return mappings;
  }

  /**
   * Distributes criteria thematically (groups related criteria)
   */
  private distributeThematically(criteria: string[], subStoryCount: number): AcceptanceCriteriaMapping[] {
    // For now, use balanced distribution
    // In a more sophisticated implementation, this would use NLP to group related criteria
    return this.distributeBalanced(criteria, subStoryCount);
  }

  /**
   * Generates sub-stories from decomposition parameters
   */
  private generateSubStories(
    parentStory: Story,
    subStoryCount: number,
    pointsDistribution: number[],
    criteriaMapping: AcceptanceCriteriaMapping[]
  ): Story[] {
    logger.debug('Generating sub-stories', {
      parentStoryId: parentStory.id,
      subStoryCount,
      pointsDistribution
    });

    const subStories: Story[] = [];
    
    for (let i = 0; i < subStoryCount; i++) {
      const subStoryId = uuidv4();
      const subStoryContext: SubStoryContext = {
        index: i,
        totalSubStories: subStoryCount,
        allocatedPoints: pointsDistribution[i],
        assignedCriteria: criteriaMapping.filter(mapping => 
          mapping.targetSubStoryId === `sub-story-${i}`
        ),
        suggestedTitle: '',
        suggestedDescription: ''
      };

      // Update criteria mappings with actual sub-story IDs
      subStoryContext.assignedCriteria.forEach(mapping => {
        mapping.targetSubStoryId = subStoryId;
      });

      // Generate title and description
      const content = this.generateSubStoryContent(parentStory, subStoryContext);
      
      const subStory: Story = {
        id: subStoryId,
        type: 'story',
        title: content.title,
        description: content.description,
        parentId: parentStory.id,
        acceptanceCriteria: subStoryContext.assignedCriteria.map(mapping => mapping.adaptedCriteria),
        storyPoints: subStoryContext.allocatedPoints,
        attributes: {
          ...parentStory.attributes,
          decomposedFrom: parentStory.id,
          subStoryIndex: i + 1,
          totalSubStories: subStoryCount
        },
        labels: [...(parentStory.labels || []), 'decomposed', `sub-story-${i + 1}`]
      };

      subStories.push(subStory);
    }

    return subStories;
  }

  /**
   * Generates title and description for a sub-story
   */
  private generateSubStoryContent(
    parentStory: Story,
    context: SubStoryContext
  ): { title: string; description: string } {
    const { index, totalSubStories, allocatedPoints } = context;
    
    // Generate title based on parent story and sub-story index
    const title = `${parentStory.title} - Part ${index + 1} of ${totalSubStories}`;
    
    // Generate description that maintains parent context
    const description = [
      `This is sub-story ${index + 1} of ${totalSubStories} decomposed from: "${parentStory.title}"`,
      '',
      `**Story Points**: ${allocatedPoints}`,
      '',
      '**Parent Story Context**:',
      parentStory.description,
      '',
      '**Sub-Story Focus**:',
      this.generateSubStoryFocus(parentStory, context),
      '',
      '**Acceptance Criteria**:',
      ...context.assignedCriteria.map((mapping, idx) => `${idx + 1}. ${mapping.adaptedCriteria}`)
    ].join('\n');

    return { title, description };
  }

  /**
   * Generates focused description for sub-story based on its context
   */
  private generateSubStoryFocus(parentStory: Story, context: SubStoryContext): string {
    const { index, totalSubStories } = context;
    
    if (totalSubStories === 2) {
      return index === 0 
        ? 'This sub-story focuses on the core functionality and initial implementation.'
        : 'This sub-story focuses on completion, validation, and edge cases.';
    }
    
    if (totalSubStories === 3) {
      switch (index) {
        case 0:
          return 'This sub-story focuses on foundational setup and basic functionality.';
        case 1:
          return 'This sub-story focuses on core business logic and main features.';
        case 2:
          return 'This sub-story focuses on completion, testing, and edge cases.';
      }
    }
    
    if (totalSubStories === 4) {
      switch (index) {
        case 0:
          return 'This sub-story focuses on initial setup and basic structure.';
        case 1:
          return 'This sub-story focuses on core functionality implementation.';
        case 2:
          return 'This sub-story focuses on advanced features and integration.';
        case 3:
          return 'This sub-story focuses on finalization, testing, and validation.';
      }
    }
    
    return `This sub-story focuses on component ${index + 1} of the overall implementation.`;
  }

  /**
   * Validates a story for decomposition readiness
   */
  private validateStoryForDecomposition(story: Story): void {
    if (!story.storyPoints || story.storyPoints <= this.config.maxStoryPoints) {
      throw new StoryDecompositionError(
        'Story points are too low for decomposition',
        'STORY_TOO_SMALL',
        story.id,
        { storyPoints: story.storyPoints }
      );
    }

    if (!story.acceptanceCriteria || story.acceptanceCriteria.length === 0) {
      throw new StoryDecompositionError(
        'Story must have acceptance criteria for decomposition',
        'INSUFFICIENT_CRITERIA',
        story.id
      );
    }

    if (!story.title || story.title.trim().length === 0) {
      throw new StoryDecompositionError(
        'Story must have a valid title',
        'INVALID_POINTS',
        story.id
      );
    }
  }

  /**
   * Validates the results of decomposition
   */
  private validateDecomposition(result: DecompositionResult): DecompositionValidation {
    const validation: DecompositionValidation = {
      pointsValid: false,
      criteriaValid: false,
      sizingValid: false,
      valuePreserved: false,
      validationErrors: [],
      validationWarnings: []
    };

    // Validate points distribution
    const totalSubStoryPoints = result.subStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
    const originalPoints = result.parentStory.storyPoints || 0;
    
    if (totalSubStoryPoints === originalPoints) {
      validation.pointsValid = true;
    } else {
      validation.validationErrors.push(
        `Points mismatch: Original ${originalPoints}, Sum of sub-stories ${totalSubStoryPoints}`
      );
    }

    // Validate criteria coverage
    const originalCriteriaCount = result.parentStory.acceptanceCriteria.length;
    const mappedCriteriaCount = result.criteriaMapping.length;
    
    if (mappedCriteriaCount === originalCriteriaCount) {
      validation.criteriaValid = true;
    } else {
      validation.validationErrors.push(
        `Criteria mismatch: Original ${originalCriteriaCount}, Mapped ${mappedCriteriaCount}`
      );
    }

    // Validate sub-story sizing
    const oversizedStories = result.subStories.filter(
      story => (story.storyPoints || 0) > this.config.maxSubStoryPoints
    );
    
    if (oversizedStories.length === 0) {
      validation.sizingValid = true;
    } else {
      validation.validationErrors.push(
        `${oversizedStories.length} sub-stories exceed maximum points (${this.config.maxSubStoryPoints})`
      );
    }

    // Validate business value preservation (basic check)
    if (result.subStories.every(story => story.title && story.description)) {
      validation.valuePreserved = true;
    } else {
      validation.validationErrors.push('Some sub-stories lack proper title or description');
    }

    return validation;
  }

  /**
   * Identifies complexity factors in a story
   */
  private identifyComplexityFactors(story: Story): string[] {
    const factors: string[] = [];
    
    // Check acceptance criteria count
    if (story.acceptanceCriteria.length > 5) {
      factors.push('High number of acceptance criteria');
    }
    
    // Check description length
    if (story.description.length > 500) {
      factors.push('Lengthy description indicating complexity');
    }
    
    // Check for technical keywords
    const technicalKeywords = ['integration', 'api', 'database', 'security', 'performance'];
    const hasComplexKeywords = technicalKeywords.some(keyword =>
      story.description.toLowerCase().includes(keyword) ||
      story.title.toLowerCase().includes(keyword)
    );
    
    if (hasComplexKeywords) {
      factors.push('Technical complexity indicators present');
    }
    
    return factors;
  }

  /**
   * Calculates optimal number of sub-stories
   */
  private calculateOptimalSubStoryCount(story: Story): number {
    const points = story.storyPoints || 0;
    
    // Base calculation on story points
    let suggestedCount = Math.ceil(points / this.config.maxSubStoryPoints);
    
    // Adjust based on complexity
    const complexityFactors = this.identifyComplexityFactors(story);
    if (complexityFactors.length > 2) {
      suggestedCount = Math.min(suggestedCount + 1, this.config.maxSubStories);
    }
    
    // Ensure within bounds
    return Math.max(
      this.config.minSubStories,
      Math.min(suggestedCount, this.config.maxSubStories)
    );
  }

  /**
   * Identifies logical boundaries for decomposition
   */
  private identifyLogicalBoundaries(story: Story): string[] {
    const boundaries: string[] = [];
    
    // Analyze acceptance criteria for natural groupings
    const criteriaGroups = this.groupAcceptanceCriteria(story.acceptanceCriteria);
    boundaries.push(...criteriaGroups);
    
    // Look for workflow steps in description
    const workflowSteps = this.extractWorkflowSteps(story.description);
    boundaries.push(...workflowSteps);
    
    return boundaries;
  }

  /**
   * Groups acceptance criteria by theme
   */
  private groupAcceptanceCriteria(criteria: string[]): string[] {
    // Simplified grouping - in practice, this would use more sophisticated analysis
    const groups: string[] = [];
    
    const themes = ['input', 'processing', 'output', 'validation', 'error'];
    themes.forEach(theme => {
      const themeCount = criteria.filter(criterion =>
        criterion.toLowerCase().includes(theme)
      ).length;
      
      if (themeCount > 0) {
        groups.push(`${theme} functionality (${themeCount} criteria)`);
      }
    });
    
    return groups;
  }

  /**
   * Extracts workflow steps from description
   */
  private extractWorkflowSteps(description: string): string[] {
    const steps: string[] = [];
    
    // Look for numbered lists or bullet points
    const stepPatterns = [
      /\d+\.\s+([^.]+)/g,
      /-\s+([^.]+)/g,
      /\*\s+([^.]+)/g
    ];
    
    stepPatterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        steps.push(...matches.map(match => match.replace(/^\d+\.\s*|-\s*|\*\s*/, '').trim()));
      }
    });
    
    return steps.slice(0, 5); // Limit to first 5 steps
  }

  /**
   * Assesses risks associated with decomposition
   */
  private assessDecompositionRisks(story: Story): string[] {
    const risks: string[] = [];
    
    // Risk: Very high point count
    if ((story.storyPoints || 0) > 15) {
      risks.push('Very high story points may indicate epic-level work');
    }
    
    // Risk: Very few acceptance criteria
    if (story.acceptanceCriteria.length < 2) {
      risks.push('Limited acceptance criteria may result in unclear sub-stories');
    }
    
    // Risk: Vague description
    if (story.description.length < 100) {
      risks.push('Brief description may lack detail for proper decomposition');
    }
    
    return risks;
  }

  /**
   * Calculates confidence level for decomposition
   */
  private calculateDecompositionConfidence(story: Story, analysis: StoryAnalysis): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on good factors
    if (story.acceptanceCriteria.length >= 3) confidence += 0.2;
    if (story.description.length > 200) confidence += 0.1;
    if (analysis.complexityFactors.length > 0) confidence += 0.1;
    if (analysis.logicalBoundaries.length > 0) confidence += 0.1;
    
    // Decrease confidence based on risk factors
    confidence -= analysis.riskFactors.length * 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generates rationale for decomposition
   */
  private generateDecompositionRationale(story: Story, analysis: StoryAnalysis): string {
    const parts: string[] = [];
    
    parts.push(`Story with ${story.storyPoints} points exceeds the ${this.config.maxStoryPoints}-point limit for implementable stories.`);
    
    if (analysis.complexityFactors.length > 0) {
      parts.push(`Complexity factors identified: ${analysis.complexityFactors.join(', ')}.`);
    }
    
    if (analysis.logicalBoundaries.length > 0) {
      parts.push(`Logical decomposition boundaries: ${analysis.logicalBoundaries.slice(0, 3).join(', ')}.`);
    }
    
    parts.push(`Decomposed into ${analysis.suggestedSubStoryCount} sub-stories using ${this.config.pointsDistributionStrategy} point distribution and ${this.config.criteriaDistributionStrategy} criteria distribution.`);
    
    return parts.join(' ');
  }

  /**
   * Adds an entry to the audit trail
   */
  private addAuditEntry(
    decompositionId: string,
    action: string,
    actor: string,
    details: Record<string, any>,
    result: 'success' | 'failure' | 'warning',
    errorMessage?: string
  ): void {
    const entry: DecompositionAuditEntry = {
      id: uuidv4(),
      decompositionId,
      action: action as any,
      timestamp: new Date(),
      actor,
      details,
      result,
      errorMessage
    };
    
    this.auditTrail.push(entry);
    
    logger.debug('Audit entry added', { entry });
  }

  /**
   * Emits an event during decomposition process
   */
  private emitEvent(
    type: string,
    storyId: string,
    decompositionId: string,
    payload: Record<string, any>
  ): void {
    const event: DecompositionEvent = {
      type: type as any,
      storyId,
      decompositionId,
      timestamp: new Date(),
      payload
    };
    
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.warn('Error in decomposition event listener', { error, event });
      }
    });
  }

  /**
   * Adds an event listener for decomposition events
   */
  addEventListener(listener: (event: DecompositionEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Removes an event listener
   */
  removeEventListener(listener: (event: DecompositionEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Gets the audit trail for a specific decomposition
   */
  getAuditTrail(decompositionId?: string): DecompositionAuditEntry[] {
    if (decompositionId) {
      return this.auditTrail.filter(entry => entry.decompositionId === decompositionId);
    }
    return [...this.auditTrail];
  }

  /**
   * Gets the current configuration
   */
  getConfig(): DecompositionConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration
   */
  updateConfig(newConfig: Partial<DecompositionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Decomposition engine configuration updated', { config: this.config });
  }
}