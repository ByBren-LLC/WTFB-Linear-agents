/**
 * Enhanced CLI Executor with Response System Integration (LIN-60)
 * 
 * Extends the base CLI executor to integrate with the enhanced response
 * system, providing rich, context-aware responses for all commands.
 */

import { CLIExecutor, ExecutionResult } from './cli-executor';
import { ParsedCommand } from './types/command-types';
import { LinearClientWrapper } from '../linear/client';
import { EnhancedResponseEngine } from './response-engine';
import { ResponseContext, FormattedResponse } from './types/response-types';
import { ProgressTracker } from './progress-tracker';
import * as logger from '../utils/logger';

/**
 * Enhanced execution result with formatted response
 */
export interface EnhancedExecutionResult extends ExecutionResult {
  /** Formatted response for display */
  formattedResponse?: FormattedResponse;
  
  /** Response context used */
  responseContext?: ResponseContext;
}

/**
 * Operation step definitions for different commands
 */
const OPERATION_STEPS = {
  ART_PLAN: [
    { name: 'Fetching work items', description: 'Retrieving work items for the PI', estimatedDuration: 2000 },
    { name: 'Building dependency graph', description: 'Analyzing dependencies between items', estimatedDuration: 3000 },
    { name: 'Analyzing team capacity', description: 'Calculating team availability and velocity', estimatedDuration: 2000 },
    { name: 'Optimizing allocation', description: 'Allocating work items to iterations', estimatedDuration: 5000 },
    { name: 'Generating plan', description: 'Creating final ART plan', estimatedDuration: 1000 }
  ],
  STORY_DECOMPOSE: [
    { name: 'Analyzing story', description: 'Understanding story requirements', estimatedDuration: 1000 },
    { name: 'Identifying components', description: 'Breaking down into logical parts', estimatedDuration: 2000 },
    { name: 'Creating sub-stories', description: 'Generating decomposed stories', estimatedDuration: 3000 }
  ],
  VALUE_ANALYZE: [
    { name: 'Collecting metrics', description: 'Gathering value delivery data', estimatedDuration: 2000 },
    { name: 'Analyzing trends', description: 'Identifying value patterns', estimatedDuration: 3000 },
    { name: 'Generating insights', description: 'Creating value analysis report', estimatedDuration: 2000 }
  ],
  DEPENDENCY_MAP: [
    { name: 'Scanning relationships', description: 'Finding all dependencies', estimatedDuration: 3000 },
    { name: 'Building graph', description: 'Creating dependency visualization', estimatedDuration: 2000 },
    { name: 'Identifying risks', description: 'Analyzing dependency impacts', estimatedDuration: 2000 }
  ]
};

/**
 * Enhanced CLI Executor with rich responses
 */
export class EnhancedCLIExecutor extends CLIExecutor {
  private responseEngine: EnhancedResponseEngine;

  constructor(
    linearClient: LinearClientWrapper,
    dbConnection?: any
  ) {
    super(linearClient, dbConnection);
    this.responseEngine = new EnhancedResponseEngine(linearClient);
  }

  /**
   * Execute command with enhanced response formatting
   */
  async executeWithEnhancedResponse(command: ParsedCommand): Promise<EnhancedExecutionResult> {
    const startTime = Date.now();

    // Build response context
    const responseContext: ResponseContext = {
      user: command.context.assigneeId ? {
        id: command.context.assigneeId,
        name: command.context.assigneeName || 'User',
        role: 'developer' // Default role since we don't have user info in IssueContext
      } : undefined,
      issue: command.context.issueId ? {
        id: command.context.issueId,
        identifier: command.context.issueIdentifier || '',
        type: this.inferIssueType(command.context),
        state: command.context.state || 'Unknown',
        priority: command.context.priority || 2,
        team: command.context.teamId ? {
          id: command.context.teamId,
          name: command.context.teamName || 'Team'
        } : undefined
      } : undefined,
      operation: {
        type: command.intent,
        complexity: this.assessOperationComplexity(command),
        startTime: new Date(startTime)
      },
      command: {
        intent: command.intent,
        parameters: command.parameters,
        raw: command.rawText
      }
    };

    try {
      // Determine if operation needs progress tracking
      const operationSteps = this.getOperationSteps(command.intent);
      const isLongRunning = this.isLongRunningOperation(command.intent);

      let result: ExecutionResult;
      let formattedResponse: FormattedResponse;

      if (isLongRunning && operationSteps && responseContext.issue?.id) {
        // Execute with progress tracking
        const operation = this.execute(command);
        formattedResponse = await this.responseEngine.generateResponseWithProgress(
          responseContext,
          operation,
          operationSteps
        );
        result = await operation;
      } else {
        // Execute without progress tracking
        result = await this.execute(command);
        
        // Generate enhanced response
        formattedResponse = await this.responseEngine.generateCommandResponse(
          responseContext,
          result
        );
      }

      // Add execution time to result
      result.executionTime = Date.now() - startTime;

      return {
        ...result,
        formattedResponse,
        responseContext
      };

    } catch (error) {
      logger.error('Enhanced execution failed', {
        command: command.intent,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Create error result
      const errorResult: ExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime: Date.now() - startTime,
        command: command.intent,
        parameters: command.parameters
      };

      // Generate error response
      const formattedResponse = await this.responseEngine.generateCommandResponse(
        responseContext,
        errorResult
      );

      return {
        ...errorResult,
        formattedResponse,
        responseContext
      };
    }
  }

  /**
   * Get operation steps for command
   */
  private getOperationSteps(intent: string): typeof OPERATION_STEPS[keyof typeof OPERATION_STEPS] | undefined {
    return OPERATION_STEPS[intent as keyof typeof OPERATION_STEPS];
  }

  /**
   * Check if operation is long-running
   */
  private isLongRunningOperation(intent: string): boolean {
    const longRunningCommands = ['ART_PLAN', 'VALUE_ANALYZE', 'DEPENDENCY_MAP', 'ART_OPTIMIZE'];
    return longRunningCommands.includes(intent);
  }

  /**
   * Assess operation complexity
   */
  private assessOperationComplexity(command: ParsedCommand): 'simple' | 'complex' | 'long-running' {
    if (this.isLongRunningOperation(command.intent)) {
      return 'long-running';
    }

    const complexCommands = ['STORY_DECOMPOSE', 'DEPENDENCY_MAP', 'VALUE_ANALYZE'];
    if (complexCommands.includes(command.intent)) {
      return 'complex';
    }

    return 'simple';
  }

  /**
   * Infer issue type from context
   */
  private inferIssueType(context: any): 'Epic' | 'Feature' | 'Story' | 'Bug' | 'Task' {
    // Check labels for type hints
    const labels = context.labels || [];
    if (labels.some((l: string) => l.toLowerCase() === 'epic')) return 'Epic';
    if (labels.some((l: string) => l.toLowerCase() === 'feature')) return 'Feature';
    if (labels.some((l: string) => l.toLowerCase() === 'bug')) return 'Bug';
    if (labels.some((l: string) => l.toLowerCase() === 'task')) return 'Task';
    return 'Story'; // Default
  }

  /**
   * Execute command and stream updates (for future real-time updates)
   */
  async *executeWithStreaming(command: ParsedCommand): AsyncGenerator<{
    type: 'progress' | 'result' | 'error';
    data: any;
  }> {
    const startTime = Date.now();
    const operationSteps = this.getOperationSteps(command.intent);

    if (!operationSteps) {
      // No progress tracking needed
      try {
        const result = await this.execute(command);
        yield { type: 'result', data: result };
      } catch (error) {
        yield { type: 'error', data: error };
      }
      return;
    }

    // Simulate progress updates
    let completedSteps = 0;
    for (const step of operationSteps) {
      yield {
        type: 'progress',
        data: {
          currentStep: step.name,
          progress: Math.round((completedSteps / operationSteps.length) * 100),
          description: step.description
        }
      };

      // Wait for simulated step duration
      await new Promise(resolve => setTimeout(resolve, step.estimatedDuration));
      completedSteps++;
    }

    // Execute actual command
    try {
      const result = await this.execute(command);
      yield { type: 'result', data: result };
    } catch (error) {
      yield { type: 'error', data: error };
    }
  }

  /**
   * Get response engine for external use
   */
  getResponseEngine(): EnhancedResponseEngine {
    return this.responseEngine;
  }
}