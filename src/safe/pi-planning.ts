/**
 * Program Increment (PI) Planning implementation
 * 
 * This module handles PI planning activities in Linear following SAFe methodology.
 */
import { LinearClient } from '@linear/sdk';
import * as logger from '../utils/logger';

/**
 * PI Planning service
 */
export class PIPlanningService {
  private linearClient: LinearClient;
  
  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
  }
  
  /**
   * Creates a Program Increment in Linear
   */
  async createProgramIncrement(
    teamId: string,
    name: string,
    startDate: Date,
    endDate: Date,
    description: string
  ) {
    try {
      // In Linear, we'll represent a Program Increment as a milestone
      const response = await this.linearClient.milestoneCreate({
        name,
        description,
        targetDate: endDate.toISOString(),
        sortOrder: 0
      });
      
      if (!response.success || !response.milestone) {
        throw new Error(`Failed to create Program Increment: ${response.error}`);
      }
      
      logger.info('Created Program Increment', { 
        piId: response.milestone.id, 
        name 
      });
      
      return response.milestone;
    } catch (error) {
      logger.error('Error creating Program Increment', { error, name });
      throw error;
    }
  }
  
  /**
   * Assigns features to a Program Increment
   */
  async assignFeaturesToPI(
    piId: string,
    featureIds: string[]
  ) {
    try {
      const results = [];
      
      for (const featureId of featureIds) {
        const response = await this.linearClient.issueUpdate(featureId, {
          milestoneId: piId
        });
        
        if (!response.success) {
          logger.warn(`Failed to assign feature ${featureId} to PI ${piId}: ${response.error}`);
        } else {
          results.push(response.issue);
          logger.info('Assigned feature to PI', { featureId, piId });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error assigning features to PI', { error, piId, featureIds });
      throw error;
    }
  }
  
  /**
   * Gets all Program Increments
   */
  async getProgramIncrements() {
    try {
      const response = await this.linearClient.milestones();
      
      return response.nodes;
    } catch (error) {
      logger.error('Error getting Program Increments', { error });
      throw error;
    }
  }
  
  /**
   * Gets the current Program Increment
   */
  async getCurrentProgramIncrement() {
    try {
      const now = new Date();
      const milestones = await this.linearClient.milestones();
      
      // Find the milestone with the closest target date in the future
      const currentPI = milestones.nodes
        .filter(milestone => new Date(milestone.targetDate) >= now)
        .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0];
      
      return currentPI;
    } catch (error) {
      logger.error('Error getting current Program Increment', { error });
      throw error;
    }
  }
}
