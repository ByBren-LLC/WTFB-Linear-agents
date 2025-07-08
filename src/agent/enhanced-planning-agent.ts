/**
 * Enhanced Planning Agent with Story Decomposition Integration
 * 
 * This enhanced version of the Planning Agent includes automatic story decomposition
 * for stories that exceed the 5-point SAFe compliance limit.
 */

import { LinearClient } from '@linear/sdk';
import { Story } from '../planning/models';
import { StoryDecompositionEngine } from '../safe/story-decomposition-engine';
import { LinearStoryDecomposer, LinearIntegrationOptions } from '../safe/linear-story-decomposer';
import { DecompositionConfig } from '../types/decomposition-types';
import * as logger from '../utils/logger';

/**
 * Planning options for the enhanced agent
 */
export interface EnhancedPlanningOptions {
  /** Team ID where issues should be created */
  teamId: string;
  /** Project ID to associate issues with */
  projectId?: string;
  /** Enable automatic story decomposition */
  enableDecomposition: boolean;
  /** Configuration for story decomposition */
  decompositionConfig?: Partial<DecompositionConfig>;
  /** Linear integration options */
  linearOptions?: Partial<LinearIntegrationOptions>;
  /** Whether to create parent/child relationships */
  createRelationships: boolean;
}

/**
 * Result of enhanced planning process
 */
export interface EnhancedPlanningResult {
  /** Success status */
  success: boolean;
  /** Total number of stories processed */
  totalStories: number;
  /** Number of stories that were decomposed */
  decomposedStories: number;
  /** Total number of sub-stories created */
  subStoriesCreated: number;
  /** Linear issues created */
  createdIssues: {
    id: string;
    number: number;
    title: string;
    isSubStory: boolean;
    parentId?: string;
  }[];
  /** Stories that failed to process */
  failedStories: {
    storyId: string;
    title: string;
    error: string;
  }[];
  /** Processing statistics */
  statistics: {
    totalProcessingTime: number;
    averageDecompositionTime: number;
    successRate: number;
  };
}

/**
 * Enhanced Planning Agent with story decomposition capabilities
 */
export class EnhancedPlanningAgent {
  private linearClient: LinearClient;
  private decompositionEngine: StoryDecompositionEngine;
  private linearDecomposer: LinearStoryDecomposer;

  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.decompositionEngine = new StoryDecompositionEngine();
    this.linearDecomposer = new LinearStoryDecomposer(accessToken);

    logger.info('Enhanced Planning Agent initialized with story decomposition support');
  }

  /**
   * Processes a list of stories with automatic decomposition
   */
  async processStories(
    stories: Story[],
    options: EnhancedPlanningOptions
  ): Promise<EnhancedPlanningResult> {
    const startTime = Date.now();

    logger.info('Starting enhanced story processing', {
      storyCount: stories.length,
      teamId: options.teamId,
      enableDecomposition: options.enableDecomposition
    });

    const result: EnhancedPlanningResult = {
      success: false,
      totalStories: stories.length,
      decomposedStories: 0,
      subStoriesCreated: 0,
      createdIssues: [],
      failedStories: [],
      statistics: {
        totalProcessingTime: 0,
        averageDecompositionTime: 0,
        successRate: 0
      }
    };

    try {
      // Update decomposition engine configuration if provided
      if (options.decompositionConfig) {
        this.decompositionEngine.updateConfig(options.decompositionConfig);
      }

      // Process each story
      const processingPromises = stories.map(story => 
        this.processSingleStory(story, options)
      );

      const processingResults = await Promise.allSettled(processingPromises);

      // Collect results
      let totalDecompositionTime = 0;
      let decompositionCount = 0;

      processingResults.forEach((processingResult, index) => {
        const story = stories[index];

        if (processingResult.status === 'fulfilled') {
          const storyResult = processingResult.value;
          
          result.createdIssues.push(...storyResult.createdIssues);
          
          if (storyResult.wasDecomposed) {
            result.decomposedStories++;
            result.subStoriesCreated += storyResult.subStoryCount;
            totalDecompositionTime += storyResult.decompositionTime;
            decompositionCount++;
          }
        } else {
          result.failedStories.push({
            storyId: story.id,
            title: story.title,
            error: processingResult.reason.message
          });
        }
      });

      // Calculate statistics
      const endTime = Date.now();
      result.statistics.totalProcessingTime = endTime - startTime;
      result.statistics.averageDecompositionTime = decompositionCount > 0 
        ? totalDecompositionTime / decompositionCount 
        : 0;
      result.statistics.successRate = stories.length > 0 
        ? (stories.length - result.failedStories.length) / stories.length 
        : 0;

      result.success = result.failedStories.length < stories.length;

      logger.info('Enhanced story processing completed', {
        totalStories: result.totalStories,
        decomposedStories: result.decomposedStories,
        subStoriesCreated: result.subStoriesCreated,
        failedStories: result.failedStories.length,
        successRate: result.statistics.successRate
      });

      return result;

    } catch (error) {
      logger.error('Enhanced story processing failed', { error });
      throw error;
    }
  }

  /**
   * Processes a single story with decomposition if needed
   */
  private async processSingleStory(
    story: Story,
    options: EnhancedPlanningOptions
  ): Promise<{
    createdIssues: { id: string; number: number; title: string; isSubStory: boolean; parentId?: string }[];
    wasDecomposed: boolean;
    subStoryCount: number;
    decompositionTime: number;
  }> {
    const storyStartTime = Date.now();

    logger.debug('Processing single story', {
      storyId: story.id,
      title: story.title,
      storyPoints: story.storyPoints
    });

    try {
      // Check if decomposition is needed and enabled
      if (options.enableDecomposition && this.shouldDecomposeStory(story)) {
        return await this.processStoryWithDecomposition(story, options, storyStartTime);
      } else {
        return await this.processStoryAsIs(story, options, storyStartTime);
      }
    } catch (error) {
      logger.error('Failed to process single story', {
        storyId: story.id,
        title: story.title,
        error
      });
      throw error;
    }
  }

  /**
   * Processes a story with decomposition
   */
  private async processStoryWithDecomposition(
    story: Story,
    options: EnhancedPlanningOptions,
    startTime: number
  ): Promise<{
    createdIssues: { id: string; number: number; title: string; isSubStory: boolean; parentId?: string }[];
    wasDecomposed: boolean;
    subStoryCount: number;
    decompositionTime: number;
  }> {
    logger.info('Decomposing large story', {
      storyId: story.id,
      title: story.title,
      storyPoints: story.storyPoints
    });

    // Decompose the story
    const decompositionStartTime = Date.now();
    const decompositionResult = await this.decompositionEngine.decomposeStory(story);
    const decompositionTime = Date.now() - decompositionStartTime;

    // Create Linear issues from decomposition
    const linearOptions: LinearIntegrationOptions = {
      teamId: options.teamId,
      projectId: options.projectId,
      createRelationships: options.createRelationships,
      updateParentStory: true,
      additionalLabels: ['auto-decomposed'],
      ...options.linearOptions
    };

    const linearResult = await this.linearDecomposer.createDecomposedStories(
      decompositionResult,
      linearOptions
    );

    if (!linearResult.success) {
      throw new Error(linearResult.errorMessage || 'Failed to create decomposed stories in Linear');
    }

    // Format created issues
    const createdIssues = [
      ...(linearResult.parentIssue ? [{
        id: linearResult.parentIssue.id,
        number: linearResult.parentIssue.number,
        title: linearResult.parentIssue.title,
        isSubStory: false
      }] : []),
      ...linearResult.subStoryIssues.map(issue => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        isSubStory: true,
        parentId: issue.parentId
      }))
    ];

    logger.info('Story decomposition completed successfully', {
      storyId: story.id,
      decompositionId: decompositionResult.decompositionId,
      subStoryCount: decompositionResult.subStories.length,
      createdIssues: createdIssues.length
    });

    return {
      createdIssues,
      wasDecomposed: true,
      subStoryCount: decompositionResult.subStories.length,
      decompositionTime
    };
  }

  /**
   * Processes a story without decomposition
   */
  private async processStoryAsIs(
    story: Story,
    options: EnhancedPlanningOptions,
    startTime: number
  ): Promise<{
    createdIssues: { id: string; number: number; title: string; isSubStory: boolean; parentId?: string }[];
    wasDecomposed: boolean;
    subStoryCount: number;
    decompositionTime: number;
  }> {
    logger.debug('Processing story without decomposition', {
      storyId: story.id,
      title: story.title,
      storyPoints: story.storyPoints
    });

    // Create Linear issue directly
    const issueData = {
      title: story.title,
      description: this.formatStoryDescription(story),
      teamId: options.teamId,
      projectId: options.projectId,
      labelIds: await this.getOrCreateLabels(options.teamId, story.labels || []),
      ...options.linearOptions
    };

    const issueResponse = await this.linearClient.createIssue(issueData);

    if (!issueResponse.success) {
      throw new Error('Failed to create story in Linear');
    }

    const issue = await issueResponse.issue;
    if (!issue) {
      throw new Error('Failed to retrieve created issue');
    }

    return {
      createdIssues: [{
        id: issue.id,
        number: issue.number,
        title: issue.title,
        isSubStory: false
      }],
      wasDecomposed: false,
      subStoryCount: 0,
      decompositionTime: 0
    };
  }

  /**
   * Determines if a story should be decomposed
   */
  private shouldDecomposeStory(story: Story): boolean {
    // Check if story has points and exceeds the limit
    if (!story.storyPoints || story.storyPoints <= 5) {
      return false;
    }

    // Check if story has sufficient information for decomposition
    if (!story.acceptanceCriteria || story.acceptanceCriteria.length === 0) {
      logger.warn('Story has high points but no acceptance criteria for decomposition', {
        storyId: story.id,
        storyPoints: story.storyPoints
      });
      return false;
    }

    return true;
  }

  /**
   * Formats story description for Linear issue
   */
  private formatStoryDescription(story: Story): string {
    const parts = [
      story.description,
      '',
      '## Acceptance Criteria',
      ...story.acceptanceCriteria.map((criterion, index) => 
        `${index + 1}. ${criterion}`
      )
    ];

    if (story.storyPoints) {
      parts.splice(1, 0, '', `**Story Points**: ${story.storyPoints}`);
    }

    return parts.join('\n');
  }

  /**
   * Gets or creates labels for a story
   */
  private async getOrCreateLabels(teamId: string, labelNames: string[]): Promise<string[]> {
    if (!labelNames || labelNames.length === 0) {
      return [];
    }

    try {
      // Use the same logic as LinearStoryDecomposer
      return await this.linearDecomposer['createOrGetLabels'](teamId, labelNames);
    } catch (error) {
      logger.warn('Failed to process labels', { labelNames, error });
      return [];
    }
  }

  /**
   * Analyzes a list of stories and provides decomposition recommendations
   */
  async analyzeStories(stories: Story[]): Promise<{
    totalStories: number;
    storiesNeedingDecomposition: number;
    estimatedSubStories: number;
    complexStories: { id: string; title: string; points: number; reason: string }[];
    recommendations: string[];
  }> {
    logger.info('Analyzing stories for decomposition needs', { storyCount: stories.length });

    const analysis = {
      totalStories: stories.length,
      storiesNeedingDecomposition: 0,
      estimatedSubStories: 0,
      complexStories: [] as { id: string; title: string; points: number; reason: string }[],
      recommendations: [] as string[]
    };

    for (const story of stories) {
      if (this.shouldDecomposeStory(story)) {
        analysis.storiesNeedingDecomposition++;
        
        const storyAnalysis = await this.decompositionEngine.analyzeStory(story);
        analysis.estimatedSubStories += storyAnalysis.suggestedSubStoryCount;

        if (storyAnalysis.confidence < 0.7) {
          analysis.complexStories.push({
            id: story.id,
            title: story.title,
            points: story.storyPoints || 0,
            reason: `Low decomposition confidence (${(storyAnalysis.confidence * 100).toFixed(1)}%)`
          });
        }
      }
    }

    // Generate recommendations
    if (analysis.storiesNeedingDecomposition > 0) {
      analysis.recommendations.push(
        `${analysis.storiesNeedingDecomposition} stories exceed 5 points and should be decomposed`
      );
      analysis.recommendations.push(
        `Estimated ${analysis.estimatedSubStories} sub-stories will be created`
      );
    }

    if (analysis.complexStories.length > 0) {
      analysis.recommendations.push(
        `${analysis.complexStories.length} stories may need manual review before decomposition`
      );
    }

    if (analysis.storiesNeedingDecomposition === 0) {
      analysis.recommendations.push('All stories are within the 5-point SAFe compliance limit');
    }

    logger.info('Story analysis completed', analysis);

    return analysis;
  }

  /**
   * Gets the decomposition engine for advanced configuration
   */
  getDecompositionEngine(): StoryDecompositionEngine {
    return this.decompositionEngine;
  }

  /**
   * Gets the Linear decomposer for advanced configuration
   */
  getLinearDecomposer(): LinearStoryDecomposer {
    return this.linearDecomposer;
  }
}