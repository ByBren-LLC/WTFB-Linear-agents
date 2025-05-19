/**
 * Technical Enabler management
 * 
 * This module handles the creation and management of Technical Enablers in Linear
 * following SAFe methodology.
 */
import { LinearClient } from '@linear/sdk';
import * as logger from '../utils/logger';
import { SAFeHierarchy } from './hierarchy';

/**
 * Types of Technical Enablers
 */
export enum EnablerType {
  ARCHITECTURE = 'Architecture',
  INFRASTRUCTURE = 'Infrastructure',
  TECHNICAL_DEBT = 'Technical Debt',
  RESEARCH = 'Research'
}

/**
 * Technical Enabler service
 */
export class EnablerService {
  private linearClient: LinearClient;
  private safeHierarchy: SAFeHierarchy;
  
  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.safeHierarchy = new SAFeHierarchy(accessToken);
  }
  
  /**
   * Creates a Technical Enabler in Linear
   */
  async createEnablerStory(
    teamId: string,
    title: string,
    description: string,
    enablerType: EnablerType,
    parentId?: string
  ) {
    try {
      return this.safeHierarchy.createEnablerStory(
        teamId,
        parentId || null,
        title,
        description,
        enablerType as any,
        [enablerType]
      );
    } catch (error) {
      logger.error('Error creating Technical Enabler', { error, title });
      throw error;
    }
  }
  
  /**
   * Gets all Technical Enablers
   */
  async getEnablers(teamId: string) {
    try {
      const response = await this.linearClient.issues({
        filter: {
          team: { id: { eq: teamId } },
          labels: { name: { eq: 'Technical Enabler' } }
        }
      });
      
      return response.nodes;
    } catch (error) {
      logger.error('Error getting Technical Enablers', { error, teamId });
      throw error;
    }
  }
  
  /**
   * Gets Technical Enablers by type
   */
  async getEnablersByType(teamId: string, enablerType: EnablerType) {
    try {
      const response = await this.linearClient.issues({
        filter: {
          team: { id: { eq: teamId } },
          labels: { 
            and: [
              { name: { eq: 'Technical Enabler' } },
              { name: { eq: enablerType } }
            ]
          }
        }
      });
      
      return response.nodes;
    } catch (error) {
      logger.error('Error getting Technical Enablers by type', { error, teamId, enablerType });
      throw error;
    }
  }
  
  /**
   * Gets the percentage of Technical Enabler work
   * compared to total work in a team
   */
  async getEnablerPercentage(teamId: string) {
    try {
      const allIssues = await this.linearClient.issues({
        filter: {
          team: { id: { eq: teamId } }
        }
      });
      
      const enablers = await this.getEnablers(teamId);
      
      const totalCount = allIssues.nodes.length;
      const enablerCount = enablers.length;
      
      if (totalCount === 0) {
        return 0;
      }
      
      return (enablerCount / totalCount) * 100;
    } catch (error) {
      logger.error('Error calculating Technical Enabler percentage', { error, teamId });
      throw error;
    }
  }
}
