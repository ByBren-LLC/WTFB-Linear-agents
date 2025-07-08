/**
 * CLI Executor Bridge
 * 
 * Bridges command intelligence (LIN-61/62) to SAFe module execution.
 * Provides enterprise-grade execution with comprehensive error handling.
 */

import { ParsedCommand } from './types/command-types';
import { CommandIntent } from './types/command-types';
import { CommandParameters } from './types/parameter-types';
import { LinearClientWrapper } from '../linear/client';
import { ResponseFormatter } from './response-formatter';
import { ParameterTranslator } from './parameter-translator';
import { Story, Feature, Epic, Enabler } from '../planning/models';
import { IterationPlan } from '../types/art-planning-types';
import * as logger from '../utils/logger';

/**
 * Execution result with enterprise metadata
 */
export interface ExecutionResult {
  /** Whether execution succeeded */
  success: boolean;
  
  /** Result data from module execution */
  data?: any;
  
  /** Error message if failed */
  error?: string;
  
  /** Execution time in milliseconds */
  executionTime: number;
  
  /** Command that was executed */
  command: string;
  
  /** Parameters used */
  parameters: Record<string, any>;
  
  /** Additional metadata */
  metadata?: {
    /** Module version */
    moduleVersion?: string;
    /** Whether result was cached */
    cacheHit?: boolean;
    /** Any warnings during execution */
    warnings?: string[];
    /** Execution tracking ID */
    executionId?: string;
  };
}

/**
 * Enterprise CLI Executor
 * 
 * Executes parsed commands by routing to appropriate SAFe modules
 */
export class CLIExecutor {
  private readonly EXECUTION_TIMEOUT = 30000; // 30 seconds
  private readonly logger = logger;
  private responseFormatter: ResponseFormatter;
  private parameterTranslator: ParameterTranslator;

  constructor(
    private linearClient: LinearClientWrapper,
    private dbConnection?: any // Optional db connection for future use
  ) {
    this.responseFormatter = new ResponseFormatter();
    this.parameterTranslator = new ParameterTranslator();
  }

  /**
   * Execute a parsed command with enterprise error handling
   */
  async execute(command: ParsedCommand): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();

    this.logger.info('CLI execution started', {
      executionId,
      intent: command.intent,
      parameters: command.parameters,
      context: {
        issueId: command.context.issueId,
        teamId: command.context.teamId
      }
    });

    try {
      // Execute with timeout protection
      const result = await this.executeWithTimeout(command, executionId);

      this.logger.info('CLI execution completed', {
        executionId,
        success: result.success,
        executionTime: result.executionTime,
        command: result.command
      });

      return result;
    } catch (error) {
      return this.createErrorResult(command, error as Error, startTime, executionId);
    }
  }

  /**
   * Execute command and format response for Linear
   */
  async executeAndFormat(command: ParsedCommand): Promise<any> {
    const result = await this.execute(command);
    return this.responseFormatter.formatForLinear(result, command);
  }

  /**
   * Execute command with timeout protection
   */
  private async executeWithTimeout(
    command: ParsedCommand,
    executionId: string
  ): Promise<ExecutionResult> {
    return Promise.race([
      this.executeCommand(command, executionId),
      this.createTimeoutPromise(executionId)
    ]);
  }

  /**
   * Main command execution router
   */
  private async executeCommand(
    command: ParsedCommand,
    executionId: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Validate and translate parameters using ParameterTranslator
    const translatedParams = this.parameterTranslator.translateForIntent(
      command.parameters || {},
      command.intent,
      command.context
    );

    // Route to appropriate executor
    switch (command.intent) {
      case CommandIntent.ART_PLAN:
        return await this.executeARTPlanning(translatedParams, startTime, executionId);
      
      case CommandIntent.STORY_DECOMPOSE:
        return await this.executeStoryDecomposition(translatedParams, startTime, executionId);
      
      case CommandIntent.VALUE_ANALYZE:
        return await this.executeValueAnalysis(translatedParams, startTime, executionId);
      
      case CommandIntent.DEPENDENCY_MAP:
        return await this.executeDependencyMapping(translatedParams, startTime, executionId);
      
      case CommandIntent.STATUS_CHECK:
        return await this.executeStatusCheck(translatedParams, startTime, executionId);
      
      case CommandIntent.ART_OPTIMIZE:
        return await this.executeARTOptimization(translatedParams, startTime, executionId);
      
      case CommandIntent.STORY_SCORE:
        return await this.executeStoryScoring(translatedParams, startTime, executionId);
      
      case CommandIntent.HELP:
        return await this.executeHelp(translatedParams, startTime, executionId);
      
      default:
        throw new Error(`Unsupported command intent: ${command.intent}`);
    }
  }

  /**
   * Execute ART planning command
   */
  private async executeARTPlanning(
    params: CommandParameters,
    startTime: number,
    executionId: string
  ): Promise<ExecutionResult> {
    this.logger.debug('Executing ART planning', { executionId, params });

    try {
      // Direct import of ARTPlanner
      const { ARTPlanner } = await import('../safe/art-planner');
      
      // Fetch work items for the PI
      const workItems = await this.fetchWorkItemsForPI(
        params.piId || '',
        params.teamId
      );

      // Build dependency graph
      const dependencies = await this.buildDependencyGraph(workItems);

      // Get ART teams
      const teams = await this.getARTTeams(params.teamId);

      // Create program increment
      const programIncrement = this.createProgramIncrement(params.piId || '');

      // Initialize planner with configuration
      const planner = new ARTPlanner({
        defaultIterationLength: params.iterationLength || 14,
        bufferCapacity: params.bufferCapacity || 0.2,
        enableValueOptimization: params.enableValueOptimization !== false
      });

      // Execute ART planning with real data
      const artPlan = await planner.planART(
        programIncrement,
        workItems,
        dependencies,
        teams
      );

      // Format result
      const result = {
        success: true,
        message: 'ART planning completed successfully',
        plan: {
          piId: artPlan.programIncrement.id,
          teamId: params.teamId,
          iterations: artPlan.iterations.length,
          readinessScore: artPlan.artReadiness.readinessScore,
          totalWorkItems: artPlan.workItems.length,
          totalStoryPoints: artPlan.summary.totalStoryPoints,
          capacityUtilization: artPlan.summary.averageCapacityUtilization,
          valueDeliveryConfidence: artPlan.summary.valueDeliveryConfidence,
          criticalBlockers: artPlan.artReadiness.criticalBlockers,
          recommendations: artPlan.artReadiness.recommendations
        }
      };

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        command: 'art-plan',
        parameters: params,
        metadata: {
          moduleVersion: 'art-planner-v1.0',
          cacheHit: false,
          executionId,
          warnings: artPlan.artReadiness.criticalBlockers.length > 0 
            ? ['Critical blockers found in ART plan'] 
            : undefined
        }
      };
    } catch (error) {
      this.logger.error('ART planning execution failed', {
        executionId,
        error: (error as Error).message,
        params
      });
      throw error;
    }
  }

  /**
   * Execute story decomposition command
   */
  private async executeStoryDecomposition(
    params: CommandParameters,
    startTime: number,
    executionId: string
  ): Promise<ExecutionResult> {
    this.logger.debug('Executing story decomposition', { executionId, params });

    try {
      // Direct import of StoryDecompositionEngine
      const { StoryDecompositionEngine } = await import('../safe/story-decomposition-engine');
      
      const engine = new StoryDecompositionEngine();
      
      // Fetch the story from Linear
      if (!params.storyId) {
        throw new Error('Story ID is required for decomposition');
      }

      const story = await this.linearClient.getIssue(params.storyId);
      
      // Create story object for decomposition
      const storyToDecompose: Story = {
        id: story.id,
        type: 'story',
        title: story.title,
        description: story.description || '',
        storyPoints: story.estimate || 0,
        acceptanceCriteria: story.description ? 
          this.extractAcceptanceCriteria(story.description) : [],
        labels: story.labels?.nodes?.map((l: any) => l.name) || [],
        attributes: {
          identifier: story.identifier,
          state: story.state?.name
        }
      };

      // Execute decomposition
      const decompositionResult = await engine.decomposeStory(storyToDecompose);

      // Format result
      const result = {
        success: true,
        message: 'Story decomposition completed',
        decomposition: {
          originalStoryId: params.storyId,
          targetSize: params.targetSize || 5,
          originalPoints: storyToDecompose.storyPoints,
          subStories: decompositionResult.subStories.map(subStory => ({
            title: subStory.title,
            points: subStory.storyPoints,
            type: subStory.type || 'story',
            acceptanceCriteria: subStory.acceptanceCriteria
          })),
          totalPoints: decompositionResult.pointsDistribution.reduce((sum, p) => sum + p, 0),
          rationale: decompositionResult.decompositionRationale,
          decompositionId: decompositionResult.decompositionId
        }
      };

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        command: 'story-decompose',
        parameters: params,
        metadata: {
          moduleVersion: 'story-decomposition-v1.0',
          executionId
        }
      };
    } catch (error) {
      this.logger.error('Story decomposition failed', {
        executionId,
        error: (error as Error).message,
        params
      });
      throw error;
    }
  }

  /**
   * Execute value delivery analysis
   */
  private async executeValueAnalysis(
    params: CommandParameters,
    startTime: number,
    executionId: string
  ): Promise<ExecutionResult> {
    this.logger.debug('Executing value analysis', { executionId, params });

    try {
      // Direct import of ValueDeliveryAnalyzer
      const { ValueDeliveryAnalyzer } = await import('../safe/value-delivery-analyzer');
      
      const analyzer = new ValueDeliveryAnalyzer();
      
      // Determine scope for analysis
      let workItems: any[] = [];
      
      if (params.scope?.type === 'team' && params.scope.id) {
        // Fetch team work items
        workItems = await this.linearClient.getIssues({
          filter: {
            team: { id: { eq: params.scope.id } },
            state: { type: { in: ['started', 'unstarted'] } }
          }
        }).then(result => result.nodes);
      } else if (params.scope?.type === 'project' && params.scope.id) {
        // Fetch project work items
        workItems = await this.linearClient.getIssues({
          filter: {
            project: { id: { eq: params.scope.id } }
          }
        }).then(result => result.nodes);
      } else if (params.piId) {
        // Default to PI scope
        workItems = await this.fetchWorkItemsForPI(params.piId, params.teamId);
      }

      // Create iteration plan for analysis
      const iterationPlan: IterationPlan = {
        iteration: {
          id: params.iterationId || 'current',
          name: 'Current Iteration',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          duration: 14,
          teams: params.teamId ? [params.teamId] : [],
          goals: [],
          capacity: []
        },
        allocatedWork: workItems.map(item => ({
          workItem: item,
          assignedTeam: item.team?.id || params.teamId || '',
          allocatedPoints: item.estimate || 0,
          isComplete: false,
          estimatedEffort: (item.estimate || 0) * 8, // Convert points to hours
          dependencies: [],
          riskLevel: 'low' as const,
          valueContribution: 0.7,
          confidence: 0.8,
          rationale: 'Allocated for value analysis',
          blockedBy: [],
          enables: []
        })),
        totalPoints: workItems.reduce((sum, item) => sum + (item.estimate || 0), 0),
        totalCapacity: 100, // Default capacity
        capacityUtilization: [],
        deliverableValue: {
          canDeliverWorkingSoftware: true,
          primaryValue: 'Analysis of current work items',
          secondaryValues: [],
          valueConfidence: 0.8,
          valueDeliveryStories: [],
          valuePrerequisites: [],
          valueRisks: []
        },
        prerequisites: [],
        enables: [],
        validation: { 
          isValid: true, 
          errors: [], 
          warnings: [], 
          info: [], 
          validationScore: 1.0 
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          algorithmVersion: '1.0.0',
          planningConfidence: 0.8
        }
      };

      // Analyze value delivery
      const valueAnalysis = await analyzer.analyzeIterationValue(iterationPlan);

      // Format result
      const result = {
        success: true,
        message: 'Value delivery analysis completed',
        analysis: {
          scope: params.scope,
          timeframe: params.timeframe,
          valueScore: Math.round(valueAnalysis.valueDeliveryScore * 100),
          confidenceScore: valueAnalysis.confidenceScore,
          workingSoftwareComponents: valueAnalysis.workingSoftwareComponents.length,
          deliveryRisks: valueAnalysis.deliveryRisks,
          userImpact: {
            impactedUserCount: valueAnalysis.userImpactAssessment.impactedUserCount,
            adoptionRate: valueAnalysis.userImpactAssessment.estimatedAdoptionRate
          },
          businessValue: {
            estimatedRevenue: valueAnalysis.businessValueRealization.estimatedRevenue,
            costSavings: valueAnalysis.businessValueRealization.costSavings
          },
          recommendations: valueAnalysis.improvementRecommendations
        }
      };

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        command: 'value-analyze',
        parameters: params,
        metadata: {
          moduleVersion: 'value-analyzer-v1.0',
          executionId,
          warnings: valueAnalysis.deliveryRisks.length > 0 ?
            ['Value delivery risks identified'] : undefined
        }
      };
    } catch (error) {
      this.logger.error('Value analysis failed', {
        executionId,
        error: (error as Error).message,
        params
      });
      throw error;
    }
  }

  /**
   * Execute dependency mapping
   */
  private async executeDependencyMapping(
    params: CommandParameters,
    startTime: number,
    executionId: string
  ): Promise<ExecutionResult> {
    this.logger.debug('Executing dependency mapping', { executionId, params });

    try {
      // Direct import of DependencyMapper
      const { DependencyMapper } = await import('../safe/dependency-mapper');
      
      const mapper = new DependencyMapper();
      
      // Get starting issue
      const startId = params.fromId || params.storyId;
      if (!startId) {
        throw new Error('Starting issue ID is required for dependency mapping');
      }

      // Fetch issue relations from Linear
      const relations = await this.linearClient.getIssueRelations({
        filter: {
          issue: { id: { eq: startId } }
        }
      });

      // Build dependency graph
      const nodes = new Map<string, any>();
      const edges: any[] = [];

      // Add starting node
      const startIssue = await this.linearClient.getIssue(startId);
      nodes.set(startId, {
        id: startIssue.id,
        identifier: startIssue.identifier,
        title: startIssue.title,
        type: this.determineWorkItemType(startIssue),
        status: startIssue.state.name,
        team: startIssue.team?.name
      });

      // Process relations based on direction
      for (const relation of relations.nodes) {
        const shouldInclude = 
          params.direction === 'both' ||
          (params.direction === 'upstream' && relation.type === 'blocks') ||
          (params.direction === 'downstream' && relation.type === 'blocked_by');

        if (shouldInclude) {
          const relatedId = relation.relatedIssue.id;
          
          // Add related node if not present
          if (!nodes.has(relatedId)) {
            nodes.set(relatedId, {
              id: relation.relatedIssue.id,
              identifier: relation.relatedIssue.identifier,
              title: relation.relatedIssue.title,
              type: this.determineWorkItemType(relation.relatedIssue),
              status: relation.relatedIssue.state.name,
              team: relation.relatedIssue.team?.name
            });
          }

          // Add edge
          edges.push({
            from: relation.issue.id,
            to: relatedId,
            type: relation.type,
            direction: relation.type === 'blocks' ? 'upstream' : 'downstream'
          });
        }
      }

      // Map dependencies using the mapper
      const mappingResult = await mapper.mapDependencies(Array.from(nodes.values()));
      
      // Extract analysis data
      const analysisResult = {
        criticalPath: mappingResult.graph.criticalPath,
        blockedItems: edges.filter(e => e.type === 'blocks').map(e => e.to),
        dependencyScore: 1 - (mappingResult.summary.circularDependencies / Math.max(edges.length, 1)),
        riskLevel: mappingResult.summary.circularDependencies > 0 ? 'high' : 
                   edges.length > nodes.size * 2 ? 'medium' : 'low',
        recommendations: mappingResult.graph.validation.warnings
      };

      // Format result
      const result = {
        success: true,
        message: 'Dependency mapping completed',
        mapping: {
          fromId: startId,
          direction: params.direction || 'both',
          totalDependencies: edges.length,
          criticalPath: analysisResult.criticalPath,
          dependencies: Array.from(nodes.values()).map(node => ({
            ...node,
            isBlocked: analysisResult.blockedItems.includes(node.id),
            isCritical: analysisResult.criticalPath.includes(node.id)
          })),
          metrics: {
            dependencyScore: analysisResult.dependencyScore,
            riskLevel: analysisResult.riskLevel,
            blockedCount: analysisResult.blockedItems.length,
            criticalPathLength: analysisResult.criticalPath.length
          },
          recommendations: analysisResult.recommendations
        }
      };

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        command: 'dependency-map',
        parameters: params,
        metadata: {
          moduleVersion: 'dependency-mapper-v1.0',
          executionId,
          warnings: analysisResult.riskLevel === 'high' || analysisResult.riskLevel === 'critical' ?
            ['High dependency risk detected'] : undefined
        }
      };
    } catch (error) {
      this.logger.error('Dependency mapping failed', {
        executionId,
        error: (error as Error).message,
        params
      });
      throw error;
    }
  }

  /**
   * Execute status check
   */
  private async executeStatusCheck(
    params: CommandParameters,
    startTime: number,
    executionId: string
  ): Promise<ExecutionResult> {
    this.logger.debug('Executing status check', { executionId, params });

    try {
      // TODO: Implement actual status check
      const result = {
        success: true,
        message: 'Status check completed',
        status: {
          scope: params.scope,
          format: params.format || 'markdown',
          health: 'good'
        }
      };

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        command: 'status-check',
        parameters: params,
        metadata: {
          executionId
        }
      };
    } catch (error) {
      this.logger.error('Status check failed', {
        executionId,
        error: (error as Error).message,
        params
      });
      throw error;
    }
  }

  /**
   * Execute ART optimization
   */
  private async executeARTOptimization(
    params: CommandParameters,
    startTime: number,
    executionId: string
  ): Promise<ExecutionResult> {
    this.logger.debug('Executing ART optimization', { executionId, params });

    try {
      // Direct import of ARTReadinessOptimizer and ARTPlanner
      const { ARTReadinessOptimizer } = await import('../safe/art-readiness-optimizer');
      const { ARTPlanner } = await import('../safe/art-planner');
      
      const optimizer = new ARTReadinessOptimizer();
      
      // First, get the current ART plan
      const workItems = await this.fetchWorkItemsForPI(
        params.piId || '',
        params.teamId
      );
      const dependencies = await this.buildDependencyGraph(workItems);
      const teams = await this.getARTTeams(params.teamId);
      const programIncrement = this.createProgramIncrement(params.piId || '');

      // Create current ART plan
      const planner = new ARTPlanner();
      const currentPlan = await planner.planART(
        programIncrement,
        workItems,
        dependencies,
        teams
      );

      // Optimize the plan
      const optimizationResult = await optimizer.optimizeARTReadiness(currentPlan);

      // Format result
      const result = {
        success: true,
        message: 'ART optimization completed',
        optimization: {
          teamId: params.teamId,
          piId: params.piId,
          currentReadiness: currentPlan.artReadiness.readinessScore,
          optimizedReadiness: currentPlan.artReadiness.readinessScore + optimizationResult.readinessScoreImprovement,
          improvements: optimizationResult.improvementActions.map(action => ({
            type: action.category,
            description: action.action,
            impact: action.estimatedImpact,
            effort: action.effortRequired
          })),
          valueImprovement: optimizationResult.valueDeliveryImprovement,
          riskReduction: optimizationResult.riskReduction.riskReductionPercentage,
          implementationComplexity: optimizationResult.implementationComplexity
        }
      };

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        command: 'art-optimize',
        parameters: params,
        metadata: {
          moduleVersion: 'art-optimizer-v1.0',
          executionId,
          warnings: optimizationResult.improvementActions.length === 0 ?
            ['No optimization opportunities found'] : undefined
        }
      };
    } catch (error) {
      this.logger.error('ART optimization failed', {
        executionId,
        error: (error as Error).message,
        params
      });
      throw error;
    }
  }

  /**
   * Execute story scoring
   */
  private async executeStoryScoring(
    params: CommandParameters,
    startTime: number,
    executionId: string
  ): Promise<ExecutionResult> {
    this.logger.debug('Executing story scoring', { executionId, params });

    try {
      // TODO: Implement story scoring
      const result = {
        success: true,
        message: 'Story scoring completed',
        scoring: {
          storyId: params.storyId,
          points: params.storyPoints,
          wsjfScore: 0
        }
      };

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        command: 'story-score',
        parameters: params,
        metadata: {
          executionId
        }
      };
    } catch (error) {
      this.logger.error('Story scoring failed', {
        executionId,
        error: (error as Error).message,
        params
      });
      throw error;
    }
  }

  /**
   * Execute help command
   */
  private async executeHelp(
    params: CommandParameters,
    startTime: number,
    executionId: string
  ): Promise<ExecutionResult> {
    const helpText = {
      success: true,
      message: 'Available commands',
      commands: [
        'plan [PI] - Create ART plan for a Program Increment',
        'decompose [story] - Break down large stories',
        'analyze value - Analyze value delivery',
        'map dependencies - Map story dependencies',
        'check status - Check system status',
        'optimize - Optimize ART readiness',
        'score [story] - Calculate WSJF score'
      ]
    };

    return {
      success: true,
      data: helpText,
      executionTime: Date.now() - startTime,
      command: 'help',
      parameters: params,
      metadata: {
        executionId
      }
    };
  }


  /**
   * Create timeout promise
   */
  private createTimeoutPromise(executionId: string): Promise<ExecutionResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        this.logger.warn('CLI execution timeout', { 
          executionId,
          timeout: this.EXECUTION_TIMEOUT 
        });
        reject(new Error(`Execution timeout after ${this.EXECUTION_TIMEOUT}ms`));
      }, this.EXECUTION_TIMEOUT);
    });
  }

  /**
   * Create error result
   */
  private createErrorResult(
    command: ParsedCommand,
    error: Error,
    startTime: number,
    executionId: string
  ): ExecutionResult {
    this.logger.error('CLI execution error', {
      executionId,
      intent: command.intent,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: this.formatErrorMessage(error),
      executionTime: Date.now() - startTime,
      command: command.intent,
      parameters: command.parameters || {},
      metadata: {
        executionId,
        warnings: ['Command execution failed']
      }
    };
  }

  /**
   * Format error message for user consumption
   */
  private formatErrorMessage(error: Error): string {
    // Check for common error types and provide user-friendly messages
    if (error.message.includes('timeout')) {
      return 'The operation took too long to complete. Please try again with a smaller scope.';
    }
    
    if (error.message.includes('not found')) {
      return 'The requested resource was not found. Please check the ID and try again.';
    }
    
    if (error.message.includes('permission')) {
      return 'You do not have permission to perform this operation.';
    }
    
    // Default to the original error message
    return `Operation failed: ${error.message}`;
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Fetch work items for a given PI from Linear
   */
  private async fetchWorkItemsForPI(piId: string, teamId?: string): Promise<any[]> {
    try {
      // Fetch issues with PI label
      const issues = await this.linearClient.getIssues({
        filter: {
          labels: { some: { name: { eq: piId } } },
          team: teamId ? { id: { eq: teamId } } : undefined
        }
      });

      // Transform Linear issues to planning work items
      return issues.nodes.map((issue: any) => {
        const type = this.determineWorkItemType(issue);
        const baseItem = {
          id: issue.id,
          type: type as any,
          title: issue.title,
          description: issue.description || '',
          parentId: issue.parent?.id,
          attributes: {
            identifier: issue.identifier,
            state: issue.state.name,
            teamId: issue.team?.id
          },
          labels: issue.labels?.nodes?.map((l: any) => l.name) || []
        };

        // Add type-specific properties
        if (type === 'story') {
          return {
            ...baseItem,
            type: 'story' as const,
            acceptanceCriteria: issue.description ? 
              this.extractAcceptanceCriteria(issue.description) : [],
            storyPoints: issue.estimate || 0,
            priority: issue.priority || 0,
            featureId: issue.parent?.id
          } as Story;
        } else if (type === 'enabler') {
          return {
            ...baseItem,
            type: 'enabler' as const,
            enablerType: 'technical_debt' as const,
            acceptanceCriteria: issue.description ? 
              this.extractAcceptanceCriteria(issue.description) : [],
            featureId: issue.parent?.id
          } as Enabler;
        } else if (type === 'feature') {
          return {
            ...baseItem,
            type: 'feature' as const,
            stories: [],
            enablers: [],
            epicId: issue.parent?.id,
            isBusinessFeature: true
          } as Feature;
        } else {
          return {
            ...baseItem,
            type: 'epic' as const,
            features: []
          } as Epic;
        }
      });
    } catch (error) {
      this.logger.error('Failed to fetch work items for PI', {
        piId,
        teamId,
        error: (error as Error).message
      });
      return [];
    }
  }

  /**
   * Build dependency graph from work items
   */
  private async buildDependencyGraph(workItems: any[]): Promise<any> {
    try {
      const dependencies: any[] = [];
      
      // Fetch relations for each work item
      for (const workItem of workItems) {
        const relations = await this.linearClient.getIssueRelations({
          filter: { issue: { id: { eq: workItem.id } } }
        });

        relations.nodes.forEach((relation: any) => {
          dependencies.push({
            from: relation.issue.id,
            to: relation.relatedIssue.id,
            type: relation.type
          });
        });
      }

      return {
        nodes: workItems.map(item => ({ id: item.id, data: item })),
        edges: dependencies
      };
    } catch (error) {
      this.logger.error('Failed to build dependency graph', {
        error: (error as Error).message
      });
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Get ART teams from Linear
   */
  private async getARTTeams(teamId?: string): Promise<any[]> {
    try {
      if (teamId) {
        // Get specific team
        const team = await this.linearClient.getTeam(teamId);
        return [{
          id: team.id,
          key: team.key,
          name: team.name,
          members: [] // TODO: Fetch team members if needed
        }];
      } else {
        // Get all teams
        const teams = await this.linearClient.getTeams();
        return teams.nodes.map((team: any) => ({
          id: team.id,
          key: team.key,
          name: team.name,
          members: []
        }));
      }
    } catch (error) {
      this.logger.error('Failed to fetch ART teams', {
        teamId,
        error: (error as Error).message
      });
      return [];
    }
  }

  /**
   * Create program increment object
   */
  private createProgramIncrement(piId: string): any {
    // Parse PI ID format: PI-YYYY-QN
    const match = piId.match(/PI-(\d{4})-Q(\d)/);
    if (!match) {
      return {
        id: piId,
        name: piId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      };
    }

    const year = parseInt(match[1]);
    const quarter = parseInt(match[2]);
    const startMonth = (quarter - 1) * 3;
    
    return {
      id: piId,
      name: piId,
      year,
      quarter,
      startDate: new Date(year, startMonth, 1),
      endDate: new Date(year, startMonth + 3, 0)
    };
  }

  /**
   * Determine work item type from Linear issue
   */
  private determineWorkItemType(issue: any): string {
    const labels = issue.labels?.nodes || [];
    
    if (labels.some((l: any) => l.name.toLowerCase() === 'epic')) return 'epic';
    if (labels.some((l: any) => l.name.toLowerCase() === 'feature')) return 'feature';
    if (labels.some((l: any) => l.name.toLowerCase() === 'enabler')) return 'enabler';
    
    return 'story';
  }

  /**
   * Extract acceptance criteria from issue description
   */
  private extractAcceptanceCriteria(description: string): string[] {
    const criteria: string[] = [];
    
    // Look for common AC patterns
    const acPatterns = [
      /acceptance criteria:?\s*\n([\s\S]*?)(?:\n\n|$)/i,
      /AC:?\s*\n([\s\S]*?)(?:\n\n|$)/i,
      /given.*when.*then/gi
    ];

    for (const pattern of acPatterns) {
      const match = description.match(pattern);
      if (match) {
        const acText = match[1] || match[0];
        // Split by bullet points or newlines
        const items = acText.split(/[\n\-\*•]/).filter(item => item.trim());
        criteria.push(...items.map(item => item.trim()));
        break;
      }
    }

    // If no specific AC found, extract checklist items
    if (criteria.length === 0) {
      const checklistPattern = /\[[\sx]\]\s*(.+)/g;
      let match;
      while ((match = checklistPattern.exec(description)) !== null) {
        criteria.push(match[1].trim());
      }
    }

    return criteria;
  }
}