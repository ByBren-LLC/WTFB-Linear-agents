/**
 * Planning Session State Store
 * 
 * This module provides a class for storing and retrieving planning session state.
 * It manages a collection of state managers for different planning sessions.
 */

import * as logger from '../utils/logger';
import { PlanningSessionState } from './state';
import { PlanningSessionStateManager } from './state-manager';
import {
  getPlanningSessionsByOrganization,
  deletePlanningSession
} from '../db/models';

/**
 * Class for storing and retrieving planning session state
 */
export class PlanningSessionStateStore {
  /** Map of session IDs to state managers */
  private stateManagers: Map<string, PlanningSessionStateManager> = new Map();

  /**
   * Gets a state manager for a planning session
   * 
   * @param sessionId - ID of the planning session
   * @returns A state manager for the planning session
   */
  async getStateManager(sessionId: string): Promise<PlanningSessionStateManager> {
    let stateManager = this.stateManagers.get(sessionId);
    
    if (!stateManager) {
      stateManager = new PlanningSessionStateManager(sessionId);
      this.stateManagers.set(sessionId, stateManager);
    }
    
    return stateManager;
  }

  /**
   * Gets the state of a planning session
   * 
   * @param sessionId - ID of the planning session
   * @returns The state of the planning session
   */
  async getState(sessionId: string): Promise<PlanningSessionState> {
    const stateManager = await this.getStateManager(sessionId);
    return stateManager.getState();
  }

  /**
   * Gets the states of all planning sessions for an organization
   * 
   * @param organizationId - ID of the organization
   * @returns An array of planning session states
   */
  async getStatesByOrganization(organizationId: string): Promise<PlanningSessionState[]> {
    try {
      const sessions = await getPlanningSessionsByOrganization(organizationId);
      
      const states: PlanningSessionState[] = [];
      
      for (const session of sessions) {
        const stateManager = await this.getStateManager(session.id.toString());
        const state = await stateManager.getState();
        states.push(state);
      }
      
      return states;
    } catch (error) {
      logger.error('Error getting planning session states by organization', { error, organizationId });
      throw error;
    }
  }

  /**
   * Deletes a planning session
   * 
   * @param sessionId - ID of the planning session
   * @returns True if the planning session was deleted, false otherwise
   */
  async deleteState(sessionId: string): Promise<boolean> {
    try {
      // Remove from the state managers map
      this.stateManagers.delete(sessionId);
      
      // Delete from the database
      return await deletePlanningSession(parseInt(sessionId, 10));
    } catch (error) {
      logger.error('Error deleting planning session state', { error, sessionId });
      throw error;
    }
  }
}

/**
 * Singleton instance of the planning session state store
 */
export const planningSessionStateStore = new PlanningSessionStateStore();
