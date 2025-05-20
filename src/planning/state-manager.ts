/**
 * Planning Session State Manager
 * 
 * This module provides a class for managing the state of planning sessions.
 * It handles initializing, updating, and persisting planning session state.
 */

import * as logger from '../utils/logger';
import {
  PlanningSessionState,
  PlanningSessionStatus,
  PlanningSessionUpdate,
  PlanningSessionError,
  PlanningSessionWarning,
  PlanningSessionResult
} from './state';
import {
  getPlanningSession,
  updatePlanningSession
} from '../db/models';

/**
 * Class for managing the state of a planning session
 */
export class PlanningSessionStateManager {
  /** ID of the planning session */
  private sessionId: string;
  /** Current state of the planning session */
  private state: PlanningSessionState | null = null;

  /**
   * Creates a new PlanningSessionStateManager
   * 
   * @param sessionId - ID of the planning session to manage
   */
  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Initializes the planning session state from the database
   * 
   * @returns The initialized planning session state
   * @throws Error if the planning session is not found
   */
  async initialize(): Promise<PlanningSessionState> {
    try {
      const session = await getPlanningSession(parseInt(this.sessionId, 10));
      
      if (!session) {
        throw new Error(`Planning session not found: ${this.sessionId}`);
      }
      
      this.state = {
        id: session.id.toString(),
        organizationId: session.organization_id,
        confluencePageUrl: session.confluence_page_url,
        planningTitle: session.planning_title,
        status: session.status as PlanningSessionStatus,
        progress: 0,
        errors: [],
        warnings: [],
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
      
      return this.state;
    } catch (error) {
      logger.error('Error initializing planning session state', { error, sessionId: this.sessionId });
      throw error;
    }
  }

  /**
   * Gets the current state of the planning session
   * 
   * @returns The current planning session state
   */
  async getState(): Promise<PlanningSessionState> {
    if (!this.state) {
      return this.initialize();
    }
    
    return this.state;
  }

  /**
   * Updates the planning session state
   * 
   * @param update - The update to apply to the planning session state
   * @returns The updated planning session state
   * @throws Error if the planning session is not found
   */
  async updateState(update: PlanningSessionUpdate): Promise<PlanningSessionState> {
    if (!this.state) {
      await this.initialize();
    }
    
    if (!this.state) {
      throw new Error(`Planning session not found: ${this.sessionId}`);
    }
    
    // Update the state
    if (update.status !== undefined) {
      this.state.status = update.status;
    }
    
    if (update.progress !== undefined) {
      this.state.progress = update.progress;
    }
    
    if (update.progressMessage !== undefined) {
      this.state.progressMessage = update.progressMessage;
    }
    
    if (update.error) {
      this.state.errors.push(update.error);
      
      // If we get an error and the status is not already failed, set it to failed
      if (this.state.status !== PlanningSessionStatus.FAILED) {
        this.state.status = PlanningSessionStatus.FAILED;
      }
    }
    
    if (update.warning) {
      this.state.warnings.push(update.warning);
    }
    
    if (update.result) {
      this.state.result = update.result;
      
      // If we get a result and the status is not already completed, set it to completed
      if (this.state.status !== PlanningSessionStatus.COMPLETED) {
        this.state.status = PlanningSessionStatus.COMPLETED;
      }
    }
    
    // Update the timestamp
    this.state.updatedAt = new Date();
    
    // Persist the state
    await this.persistState();
    
    return this.state;
  }

  /**
   * Sets the progress of the planning session
   * 
   * @param progress - The progress percentage (0-100)
   * @param message - Optional message describing the current progress
   * @returns The updated planning session state
   */
  async setProgress(progress: number, message?: string): Promise<PlanningSessionState> {
    return this.updateState({
      progress,
      progressMessage: message
    });
  }

  /**
   * Sets the status of the planning session
   * 
   * @param status - The new status
   * @returns The updated planning session state
   */
  async setStatus(status: PlanningSessionStatus): Promise<PlanningSessionState> {
    return this.updateState({
      status
    });
  }

  /**
   * Adds an error to the planning session
   * 
   * @param message - The error message
   * @param code - Optional error code
   * @param details - Optional additional error details
   * @returns The updated planning session state
   */
  async addError(message: string, code?: string, details?: any): Promise<PlanningSessionState> {
    return this.updateState({
      error: {
        message,
        code,
        details,
        timestamp: new Date()
      }
    });
  }

  /**
   * Adds a warning to the planning session
   * 
   * @param message - The warning message
   * @param code - Optional warning code
   * @param details - Optional additional warning details
   * @returns The updated planning session state
   */
  async addWarning(message: string, code?: string, details?: any): Promise<PlanningSessionState> {
    return this.updateState({
      warning: {
        message,
        code,
        details,
        timestamp: new Date()
      }
    });
  }

  /**
   * Sets the result of the planning session
   * 
   * @param result - The planning session result
   * @returns The updated planning session state
   */
  async setResult(result: PlanningSessionResult): Promise<PlanningSessionState> {
    return this.updateState({
      result,
      status: PlanningSessionStatus.COMPLETED
    });
  }

  /**
   * Persists the planning session state to the database
   * 
   * @private
   */
  private async persistState(): Promise<void> {
    if (!this.state) {
      return;
    }
    
    try {
      // Since there's no metadata field in the database schema,
      // we'll just update the status field for now
      // In a real implementation, we would need to add a metadata field to the database schema
      await updatePlanningSession(parseInt(this.sessionId, 10), {
        status: this.state.status
      });
      
      // Log the state that would be stored in a metadata field
      logger.info('Planning session state updated', {
        sessionId: this.sessionId,
        progress: this.state.progress,
        progressMessage: this.state.progressMessage,
        errorsCount: this.state.errors.length,
        warningsCount: this.state.warnings.length,
        hasResult: !!this.state.result
      });
    } catch (error) {
      logger.error('Error persisting planning session state', { error, sessionId: this.sessionId });
      throw error;
    }
  }
}
