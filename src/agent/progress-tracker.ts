/**
 * Progress Tracker for Enhanced Response System (LIN-60)
 * 
 * Tracks and reports progress for long-running operations,
 * providing real-time updates to users through Linear comments.
 */

import { LinearClientWrapper } from '../linear/client';
import { ProgressUpdate } from './types/response-types';
import { ResponseTemplateEngine } from './response-template-engine';
import { ResponseType } from './types/response-types';
import * as logger from '../utils/logger';

/**
 * Operation tracking information
 */
interface TrackedOperation {
  operationId: string;
  issueId: string;
  commentId?: string;
  startTime: Date;
  lastUpdateTime: Date;
  updateInterval: NodeJS.Timeout;
  promise: Promise<any>;
  steps: OperationStep[];
  currentStepIndex: number;
  preliminaryResults?: any;
}

/**
 * Operation step definition
 */
interface OperationStep {
  name: string;
  description: string;
  estimatedDuration: number; // milliseconds
  actualDuration?: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

/**
 * Progress tracker for multi-step operations
 */
export class ProgressTracker {
  private operations: Map<string, TrackedOperation> = new Map();
  private updateThreshold = 2000; // Minimum time between updates (ms)

  constructor(
    private linearClient: LinearClientWrapper,
    private templateEngine: ResponseTemplateEngine
  ) {}

  /**
   * Start tracking an operation
   */
  async trackOperation(
    operationId: string,
    issueId: string,
    operation: Promise<any>,
    steps: OperationStep[],
    onProgress?: (update: ProgressUpdate) => void
  ): Promise<any> {
    try {
      // Initialize tracking
      const trackedOp: TrackedOperation = {
        operationId,
        issueId,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        promise: operation,
        steps: [...steps], // Copy to avoid mutations
        currentStepIndex: 0,
        updateInterval: setInterval(() => {
          this.sendProgressUpdate(operationId, onProgress);
        }, this.updateThreshold)
      };

      this.operations.set(operationId, trackedOp);

      // Send initial progress update
      await this.sendInitialUpdate(trackedOp);

      // Execute operation with progress tracking
      const result = await this.executeWithProgress(trackedOp);

      // Send completion update
      await this.sendCompletionUpdate(trackedOp, result);

      return result;
    } catch (error) {
      // Send error update
      await this.sendErrorUpdate(operationId, error);
      throw error;
    } finally {
      // Clean up
      this.cleanupOperation(operationId);
    }
  }

  /**
   * Execute operation with progress tracking
   */
  private async executeWithProgress(operation: TrackedOperation): Promise<any> {
    try {
      // Mark first step as in-progress
      if (operation.steps.length > 0) {
        operation.steps[0].status = 'in-progress';
      }

      // Execute the operation
      const result = await operation.promise;

      // Mark all steps as completed if not already updated
      operation.steps.forEach(step => {
        if (step.status !== 'failed') {
          step.status = 'completed';
        }
      });

      return result;
    } catch (error) {
      // Mark current step as failed
      if (operation.currentStepIndex < operation.steps.length) {
        operation.steps[operation.currentStepIndex].status = 'failed';
      }
      throw error;
    }
  }

  /**
   * Update operation step progress
   */
  updateStep(operationId: string, stepIndex: number, status: OperationStep['status']): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      logger.warn('Operation not found for step update', { operationId, stepIndex });
      return;
    }

    if (stepIndex < operation.steps.length) {
      const step = operation.steps[stepIndex];
      const previousStatus = step.status;
      step.status = status;

      // Update actual duration if completed
      if (status === 'completed' && previousStatus === 'in-progress') {
        step.actualDuration = Date.now() - operation.startTime.getTime();
      }

      // Move to next step if completed
      if (status === 'completed' && stepIndex === operation.currentStepIndex) {
        operation.currentStepIndex++;
        if (operation.currentStepIndex < operation.steps.length) {
          operation.steps[operation.currentStepIndex].status = 'in-progress';
        }
      }
    }
  }

  /**
   * Update preliminary results
   */
  updatePreliminaryResults(operationId: string, results: any): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.preliminaryResults = results;
    }
  }

  /**
   * Send initial progress update
   */
  private async sendInitialUpdate(operation: TrackedOperation): Promise<void> {
    const progress = this.calculateProgress(operation);
    const template = this.templateEngine.selectTemplate(
      ResponseType.PROGRESS,
      'operation_start',
      {} as any
    );

    if (!template) {
      logger.error('No progress template found');
      return;
    }

    const content = this.templateEngine.renderTemplate(template, {
      title: 'Operation Started',
      progress: progress.progress,
      status: 'Starting...',
      eta: this.calculateETA(operation),
      completedSteps: this.formatCompletedSteps(operation),
      currentStep: this.formatCurrentStep(operation),
      hasPreliminaryResults: false
    });

    try {
      const comment = await this.linearClient.createComment(operation.issueId, content);
      operation.commentId = comment.id;
    } catch (error) {
      logger.error('Failed to send initial progress update', {
        operationId: operation.operationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send progress update
   */
  private async sendProgressUpdate(
    operationId: string,
    onProgress?: (update: ProgressUpdate) => void
  ): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return;
    }

    // Check if enough time has passed since last update
    const timeSinceLastUpdate = Date.now() - operation.lastUpdateTime.getTime();
    if (timeSinceLastUpdate < this.updateThreshold) {
      return;
    }

    const progress = this.calculateProgress(operation);
    
    // Call progress callback if provided
    if (onProgress) {
      onProgress(progress);
    }

    // Update Linear comment
    const template = this.templateEngine.selectTemplate(
      ResponseType.PROGRESS,
      'operation_update',
      {} as any
    );

    if (!template) {
      return;
    }

    const content = this.templateEngine.renderTemplate(template, {
      title: 'Operation in Progress',
      progress: progress.progress,
      status: progress.status,
      eta: this.calculateETA(operation),
      completedSteps: this.formatCompletedSteps(operation),
      currentStep: this.formatCurrentStep(operation),
      hasPreliminaryResults: !!operation.preliminaryResults,
      preliminaryResults: this.formatPreliminaryResults(operation.preliminaryResults)
    });

    try {
      if (operation.commentId) {
        // Update existing comment
        await this.linearClient.updateComment(operation.commentId, content);
      } else {
        // Create new comment if needed
        const comment = await this.linearClient.createComment(operation.issueId, content);
        operation.commentId = comment.id;
      }
      operation.lastUpdateTime = new Date();
    } catch (error) {
      logger.error('Failed to send progress update', {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send completion update
   */
  private async sendCompletionUpdate(operation: TrackedOperation, result: any): Promise<void> {
    if (!operation.commentId) {
      return; // No comment to update
    }

    // Let the main response system handle the final formatting
    // Just add a completion note to the progress comment
    const completionNote = '\n\n✅ **Operation completed successfully!** See the response below.';

    try {
      const currentContent = await this.getCommentContent(operation.commentId);
      await this.linearClient.updateComment(
        operation.commentId,
        currentContent + completionNote
      );
    } catch (error) {
      logger.error('Failed to send completion update', {
        operationId: operation.operationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send error update
   */
  private async sendErrorUpdate(operationId: string, error: any): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation || !operation.commentId) {
      return;
    }

    const errorNote = '\n\n❌ **Operation failed.** See the error details below.';

    try {
      const currentContent = await this.getCommentContent(operation.commentId);
      await this.linearClient.updateComment(
        operation.commentId,
        currentContent + errorNote
      );
    } catch (updateError) {
      logger.error('Failed to send error update', {
        operationId,
        error: updateError instanceof Error ? updateError.message : 'Unknown error'
      });
    }
  }

  /**
   * Calculate operation progress
   */
  private calculateProgress(operation: TrackedOperation): ProgressUpdate {
    const completedSteps = operation.steps.filter(s => s.status === 'completed').length;
    const totalSteps = operation.steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const currentStep = operation.steps[operation.currentStepIndex];
    const status = this.getOperationStatus(operation);

    return {
      operationId: operation.operationId,
      status,
      progress,
      currentStep: currentStep?.name || 'Initializing',
      completedSteps: operation.steps
        .filter(s => s.status === 'completed')
        .map(s => s.name),
      remainingSteps: operation.steps
        .filter(s => s.status === 'pending')
        .map(s => s.name),
      estimatedTimeRemaining: this.estimateTimeRemaining(operation),
      preliminaryResults: operation.preliminaryResults
    };
  }

  /**
   * Get operation status
   */
  private getOperationStatus(operation: TrackedOperation): ProgressUpdate['status'] {
    if (operation.steps.some(s => s.status === 'failed')) {
      return 'failed';
    }
    if (operation.steps.every(s => s.status === 'completed')) {
      return 'completed';
    }
    if (operation.currentStepIndex === 0 && operation.steps[0]?.status === 'pending') {
      return 'starting';
    }
    if (operation.currentStepIndex >= operation.steps.length - 1) {
      return 'completing';
    }
    return 'in-progress';
  }

  /**
   * Estimate time remaining
   */
  private estimateTimeRemaining(operation: TrackedOperation): number {
    const remainingSteps = operation.steps.filter(s => s.status === 'pending');
    const estimatedMs = remainingSteps.reduce((sum, step) => sum + step.estimatedDuration, 0);
    return Math.round(estimatedMs / 1000); // Convert to seconds
  }

  /**
   * Calculate ETA
   */
  private calculateETA(operation: TrackedOperation): string {
    const remainingSeconds = this.estimateTimeRemaining(operation);
    if (remainingSeconds < 60) {
      return `~${remainingSeconds} seconds`;
    }
    const minutes = Math.round(remainingSeconds / 60);
    return `~${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  /**
   * Format completed steps
   */
  private formatCompletedSteps(operation: TrackedOperation): string {
    const completed = operation.steps.filter(s => s.status === 'completed');
    if (completed.length === 0) {
      return 'None yet';
    }
    return completed.map((step, index) => `${index + 1}. ✅ ${step.name}`).join('\n');
  }

  /**
   * Format current step
   */
  private formatCurrentStep(operation: TrackedOperation): string {
    const current = operation.steps[operation.currentStepIndex];
    if (!current || current.status === 'completed') {
      return 'Finalizing...';
    }
    return `**${current.name}** - ${current.description}`;
  }

  /**
   * Format preliminary results
   */
  private formatPreliminaryResults(results: any): string {
    if (!results) {
      return '';
    }

    // Handle different result types
    if (typeof results === 'string') {
      return results;
    }

    if (typeof results === 'object') {
      // Format object results nicely
      const formatted = Object.entries(results)
        .map(([key, value]) => `- **${key}**: ${value}`)
        .join('\n');
      return formatted;
    }

    return String(results);
  }

  /**
   * Get comment content (simplified - would need actual API call)
   */
  private async getCommentContent(commentId: string): Promise<string> {
    // In a real implementation, would fetch the comment content
    // For now, return empty string
    return '';
  }

  /**
   * Clean up completed operation
   */
  private cleanupOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      clearInterval(operation.updateInterval);
      this.operations.delete(operationId);
    }
  }

  /**
   * Check if operation is being tracked
   */
  isTracking(operationId: string): boolean {
    return this.operations.has(operationId);
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): string[] {
    return Array.from(this.operations.keys());
  }
}