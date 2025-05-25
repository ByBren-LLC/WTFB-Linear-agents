/**
 * Planning session manager
 * 
 * This module provides a class to manage the planning session.
 * It tracks progress and handles errors during issue creation.
 */

import { PlanningDocument } from './models';
import { LinearIssueCreator } from '../linear/issue-creator';
import { LinearIssueFinder } from '../linear/issue-finder';
import { LinearIssueUpdater } from '../linear/issue-updater';
import * as logger from '../utils/logger';

/**
 * Planning session status
 */
export enum PlanningSessionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Planning session result
 */
export interface PlanningSessionResult {
  sessionId: string;
  status: PlanningSessionStatus;
  progress: number;
  errors: Array<{
    message: string;
    item: any;
  }>;
  result?: {
    epics: Record<string, string>;
    features: Record<string, string>;
    stories: Record<string, string>;
    enablers: Record<string, string>;
  };
}

/**
 * Planning session manager
 */
export class PlanningSessionManager {
  private planningDocument: PlanningDocument;
  private issueCreator: LinearIssueCreator;
  private issueFinder: LinearIssueFinder;
  private issueUpdater: LinearIssueUpdater;
  private sessionId: string;
  private status: PlanningSessionStatus;
  private progress: number;
  private errors: Array<{
    message: string;
    item: any;
  }>;
  private result?: {
    epics: Record<string, string>;
    features: Record<string, string>;
    stories: Record<string, string>;
    enablers: Record<string, string>;
  };

  /**
   * Creates a new planning session manager
   * 
   * @param planningDocument The planning document
   * @param accessToken Linear API access token
   * @param teamId Linear team ID
   * @param sessionId Session ID
   */
  constructor(
    planningDocument: PlanningDocument,
    accessToken: string,
    teamId: string,
    sessionId: string
  ) {
    this.planningDocument = planningDocument;
    this.issueCreator = new LinearIssueCreator(accessToken, teamId);
    this.issueFinder = new LinearIssueFinder(accessToken, teamId);
    this.issueUpdater = new LinearIssueUpdater(accessToken);
    this.sessionId = sessionId;
    this.status = PlanningSessionStatus.PENDING;
    this.progress = 0;
    this.errors = [];
  }

  /**
   * Creates issues from the planning document
   * 
   * @returns The planning session result
   */
  async createIssues(): Promise<PlanningSessionResult> {
    try {
      this.status = PlanningSessionStatus.IN_PROGRESS;
      await this.updateProgress(0);
      
      logger.info('Starting planning session', { 
        sessionId: this.sessionId,
        documentId: this.planningDocument.id,
        title: this.planningDocument.title
      });
      
      // Calculate total items for progress tracking
      const totalItems = this.calculateTotalItems();
      let processedItems = 0;
      
      // Create issues
      this.result = await this.issueCreator.createIssuesFromPlanningDocument(this.planningDocument);
      
      // Update progress to 100%
      this.status = PlanningSessionStatus.COMPLETED;
      await this.updateProgress(100);
      
      logger.info('Planning session completed', { 
        sessionId: this.sessionId,
        documentId: this.planningDocument.id,
        epicCount: Object.keys(this.result.epics).length,
        featureCount: Object.keys(this.result.features).length,
        storyCount: Object.keys(this.result.stories).length,
        enablerCount: Object.keys(this.result.enablers).length
      });
      
      return this.getSessionResult();
    } catch (error) {
      this.status = PlanningSessionStatus.FAILED;
      await this.handleError(error, this.planningDocument);
      
      logger.error('Planning session failed', { 
        sessionId: this.sessionId,
        documentId: this.planningDocument.id,
        error
      });
      
      return this.getSessionResult();
    }
  }

  /**
   * Updates the progress of the planning session
   * 
   * @param progress The progress percentage (0-100)
   */
  async updateProgress(progress: number): Promise<void> {
    this.progress = progress;
    
    // In a real implementation, this would update the progress in a database or send a notification
    logger.info('Planning session progress updated', { 
      sessionId: this.sessionId,
      progress
    });
  }

  /**
   * Handles an error during the planning session
   * 
   * @param error The error
   * @param item The item that caused the error
   */
  async handleError(error: Error, item: any): Promise<void> {
    this.errors.push({
      message: error.message,
      item
    });
    
    // In a real implementation, this would log the error to a database or send a notification
    logger.error('Planning session error', { 
      sessionId: this.sessionId,
      error,
      item
    });
  }

  /**
   * Gets the current session result
   * 
   * @returns The planning session result
   */
  getSessionResult(): PlanningSessionResult {
    return {
      sessionId: this.sessionId,
      status: this.status,
      progress: this.progress,
      errors: this.errors,
      result: this.result
    };
  }

  /**
   * Calculates the total number of items in the planning document
   * 
   * @returns The total number of items
   */
  private calculateTotalItems(): number {
    let total = 0;
    
    // Count epics
    total += this.planningDocument.epics.length;
    
    // Count features in epics
    for (const epic of this.planningDocument.epics) {
      if (epic.features) {
        total += epic.features.length;
        
        // Count stories and enablers in features
        for (const feature of epic.features) {
          if (feature.stories) {
            total += feature.stories.length;
          }
          
          if (feature.enablers) {
            total += feature.enablers.length;
          }
        }
      }
    }
    
    // Count standalone features
    if (this.planningDocument.features) {
      total += this.planningDocument.features.length;
      
      // Count stories and enablers in features
      for (const feature of this.planningDocument.features) {
        if (feature.stories) {
          total += feature.stories.length;
        }
        
        if (feature.enablers) {
          total += feature.enablers.length;
        }
      }
    }
    
    // Count standalone stories
    if (this.planningDocument.stories) {
      total += this.planningDocument.stories.length;
    }
    
    // Count standalone enablers
    if (this.planningDocument.enablers) {
      total += this.planningDocument.enablers.length;
    }
    
    return total;
  }
}
