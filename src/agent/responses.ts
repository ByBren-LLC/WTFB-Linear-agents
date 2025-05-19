/**
 * Response generation for the planning agent
 * 
 * This module handles generating responses for the planning agent.
 */
import * as templates from '../utils/templates';

/**
 * Response type for agent actions
 */
export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Creates a response for when the agent is mentioned
 */
export const createMentionResponse = (username: string): AgentResponse => {
  return {
    success: true,
    message: templates.createMentionResponse(username)
  };
};

/**
 * Creates a response for when the agent is assigned an issue
 */
export const createAssignmentResponse = (username: string, issueId: string): AgentResponse => {
  return {
    success: true,
    message: templates.createAssignmentResponse(username, issueId)
  };
};

/**
 * Creates a response for when the agent has completed planning
 */
export const createPlanningCompleteResponse = (
  username: string,
  epicId: string,
  featureCount: number
): AgentResponse => {
  return {
    success: true,
    message: templates.createPlanningCompleteResponse(username, epicId, featureCount),
    data: {
      epicId,
      featureCount
    }
  };
};

/**
 * Creates a response for when the agent encounters an error
 */
export const createErrorResponse = (username: string, errorMessage: string): AgentResponse => {
  return {
    success: false,
    message: templates.createErrorResponse(username, errorMessage)
  };
};

/**
 * Creates a response for when the agent needs more information
 */
export const createMoreInfoResponse = (username: string, missingInfo: string): AgentResponse => {
  return {
    success: false,
    message: templates.createMoreInfoResponse(username, missingInfo)
  };
};

/**
 * Creates a response for when the agent has started working on a task
 */
export const createStartedResponse = (username: string): AgentResponse => {
  return {
    success: true,
    message: templates.createStartedResponse(username)
  };
};
