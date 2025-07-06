/**
 * Linear Client Wrapper
 *
 * This module provides a wrapper around the Linear SDK that includes error handling,
 * rate limiting, and retry logic.
 */

import { LinearClient, LinearDocument, LinearFetch } from '@linear/sdk';
import * as logger from '../utils/logger';
import { handleLinearError } from './error-handler';
import { RateLimiter } from './rate-limiter';
import { retry, RetryOptions } from './retry';
import { refreshToken } from '../auth/tokens';

/**
 * Wrapper around the Linear SDK that includes error handling, rate limiting, and retry logic
 */
export class LinearClientWrapper {
  /**
   * The Linear client instance
   */
  private linearClient: LinearClient;

  /**
   * The rate limiter instance
   */
  private rateLimiter: RateLimiter;

  /**
   * The organization ID
   */
  private organizationId: string;

  /**
   * Creates a new LinearClientWrapper
   *
   * @param accessToken The Linear API access token
   * @param organizationId The Linear organization ID
   */
  constructor(accessToken: string, organizationId: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.rateLimiter = new RateLimiter();
    this.organizationId = organizationId;
  }

  /**
   * Executes a Linear API query with error handling, rate limiting, and retry logic
   *
   * @param queryFn The function that executes the query
   * @param endpoint The endpoint being called (for rate limiting)
   * @param retryOptions Options for retry logic
   * @returns The result of the query
   * @throws An error if the query fails after retries
   */
  async executeQuery<T>(
    queryFn: () => Promise<T>,
    endpoint: string,
    retryOptions?: Partial<RetryOptions>
  ): Promise<T> {
    try {
      // Throttle requests to respect rate limits
      await this.rateLimiter.throttle(endpoint);

      // Execute the query with retry logic
      return await retry(async () => {
        try {
          return await queryFn();
        } catch (error) {
          // Handle the error
          const handledError = handleLinearError(error);

          // If it's an authentication error, try to refresh the token
          if (handledError.name === 'LinearAuthenticationError') {
            logger.info('Attempting to refresh token after authentication error');
            const newToken = await refreshToken(this.organizationId);

            if (newToken) {
              logger.info('Token refreshed successfully, retrying request');
              // Update the client with the new token
              this.linearClient = new LinearClient({ accessToken: newToken });

              // Retry the query with the new token
              return await queryFn();
            } else {
              logger.error('Failed to refresh token');
            }
          }

          // Re-throw the handled error
          throw handledError;
        }
      }, retryOptions);
    } catch (error) {
      logger.error('Error executing Linear API query', { error: (error as Error).message, endpoint });
      throw error;
    }
  }

  /**
   * Gets an issue by ID
   *
   * @param issueId The issue ID
   * @returns The issue
   */
  async getIssue(issueId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issue(issueId),
      'getIssue'
    );
  }

  /**
   * Creates a new issue
   *
   * @param input The issue creation input
   * @returns The created issue
   */
  async createIssue(input: any): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.createIssue(input),
      'createIssue'
    );
  }

  /**
   * Updates an issue (legacy method - use the enhanced version below)
   *
   * @param issueId The issue ID
   * @param input The issue update input
   * @returns The updated issue
   */
  async updateIssueLegacy(issueId: string, input: any): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.updateIssue(issueId, input),
      'updateIssue'
    );
  }

  /**
   * Gets all issues for a team
   *
   * @param teamId The team ID
   * @param filter Optional filter
   * @returns The issues
   */
  async getTeamIssues(teamId: string, filter?: any): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issues({
        filter: {
          team: { id: { eq: teamId } },
          ...filter
        }
      }),
      'getTeamIssues'
    );
  }

  /**
   * Gets all teams
   *
   * @returns The teams
   */
  async getTeams(): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.teams(),
      'getTeams'
    );
  }

  /**
   * Gets a team by ID
   *
   * @param teamId The team ID
   * @returns The team
   */
  async getTeam(teamId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.team(teamId),
      'getTeam'
    );
  }

  /**
   * Gets all labels for a team
   *
   * @param teamId The team ID
   * @returns The labels
   */
  async getTeamLabels(teamId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issueLabels({
        filter: {
          team: { id: { eq: teamId } }
        }
      }),
      'getTeamLabels'
    );
  }

  /**
   * Creates a comment on an issue
   *
   * @param issueId The issue ID
   * @param body The comment body
   * @returns The created comment
   */
  async createComment(issueId: string, body: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.createComment({
        issueId,
        body
      }),
      'createComment'
    );
  }

  /**
   * Gets the current user
   *
   * @returns The current user
   */
  async getUser(): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.viewer,
      'getUser'
    );
  }

  /**
   * Gets issues with custom filter
   *
   * @param filter The issue filter
   * @returns The issues
   */
  async getIssues(filter?: any): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issues(filter),
      'getIssues'
    );
  }

  /**
   * Gets issue relations
   *
   * @param filter The filter for relations
   * @returns The issue relations
   */
  async getIssueRelations(filter?: any): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issueRelations(filter),
      'getIssueRelations'
    );
  }

  /**
   * Gets current viewer/user
   *
   * @returns The current user
   */
  async getViewer(): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.viewer,
      'getViewer'
    );
  }

  /**
   * Gets comments for an issue
   *
   * @param issueId The issue ID
   * @returns The comments
   */
  async getComments(issueId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.comments({
        filter: {
          issue: { id: { eq: issueId } }
        }
      }),
      'getComments'
    );
  }

  /**
   * Creates a comment on an issue
   *
   * @param issueId The issue ID
   * @param body The comment body
   * @returns The created comment
   */
  async createComment(issueId: string, body: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.createComment({
        issueId,
        body
      }),
      'createComment'
    );
  }

  // Phase 3: Cycle Management Methods

  /**
   * Creates a new cycle
   * 
   * @param input Cycle creation data
   * @returns The created cycle
   */
  async createCycle(input: {
    name: string;
    description?: string;
    startsAt: Date;
    endsAt: Date;
    teamId: string;
  }): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.createCycle({
        name: input.name,
        description: input.description,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        teamId: input.teamId
      }),
      'createCycle'
    );
  }

  /**
   * Updates an existing cycle
   * 
   * @param input Cycle update data
   * @returns The updated cycle
   */
  async updateCycle(input: {
    id: string;
    name?: string;
    description?: string;
    startsAt?: Date;
    endsAt?: Date;
  }): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.updateCycle(input.id, {
        name: input.name,
        description: input.description,
        startsAt: input.startsAt,
        endsAt: input.endsAt
      }),
      'updateCycle'
    );
  }

  /**
   * Archives a cycle
   * 
   * @param cycleId The cycle ID to archive
   * @returns The archived cycle
   */
  async archiveCycle(cycleId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.archiveCycle(cycleId),
      'archiveCycle'
    );
  }

  /**
   * Gets cycles for a team
   * 
   * @param teamId The team ID
   * @returns The team's cycles
   */
  async getTeamCycles(teamId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.cycles({
        filter: {
          team: { id: { eq: teamId } }
        }
      }),
      'getTeamCycles'
    );
  }

  /**
   * Creates a cycle goal
   * 
   * @param input Cycle goal creation data
   * @returns The created cycle goal
   */
  async createCycleGoal(input: {
    cycleId: string;
    name: string;
  }): Promise<any> {
    // Note: Linear SDK may not have direct cycle goal support
    // Use a comment-based approach for now
    return this.executeQuery(
      () => this.linearClient.createComment({
        issueId: input.cycleId, // This may need to be adjusted
        body: `📋 **CYCLE GOAL**: ${input.name}`
      }),
      'createCycleGoal'
    );
  }

  // Work Assignment Methods

  /**
   * Updates an issue with new data
   * 
   * @param input Issue update data
   * @returns The updated issue
   */
  async updateIssue(input: {
    id: string;
    assigneeId?: string;
    cycleId?: string | null;
    estimate?: number;
    labelIds?: string[];
    title?: string;
    description?: string;
    priority?: number;
    stateId?: string;
  }): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.updateIssue(input.id, {
        assigneeId: input.assigneeId,
        cycleId: input.cycleId,
        estimate: input.estimate,
        labelIds: input.labelIds,
        title: input.title,
        description: input.description,
        priority: input.priority,
        stateId: input.stateId
      }),
      'updateIssue'
    );
  }

  /**
   * Searches for issues
   * 
   * @param input Search parameters
   * @returns Search results
   */
  async searchIssues(input: {
    query: string;
    teamId?: string;
  }): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issues({
        filter: {
          title: { contains: input.query },
          team: input.teamId ? { id: { eq: input.teamId } } : undefined
        }
      }),
      'searchIssues'
    );
  }

  /**
   * Gets team members
   * 
   * @param teamId The team ID
   * @returns Team members
   */
  async getTeamMembers(teamId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.users({
        filter: {
          isMe: { eq: false }, // Get all users except self
          active: { eq: true }
        }
      }),
      'getTeamMembers'
    );
  }

  /**
   * Gets labels for a team
   * 
   * @param input Label filter parameters
   * @returns Team labels
   */
  async getLabels(input: {
    teamId?: string;
  }): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issueLabels({
        filter: input.teamId ? {
          team: { id: { eq: input.teamId } }
        } : undefined
      }),
      'getLabels'
    );
  }

  /**
   * Creates a new label
   * 
   * @param input Label creation data
   * @returns The created label
   */
  async createLabel(input: {
    name: string;
    teamId: string;
    color?: string;
    description?: string;
  }): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.createIssueLabel({
        name: input.name,
        teamId: input.teamId,
        color: input.color,
        description: input.description
      }),
      'createLabel'
    );
  }

  /**
   * Creates an issue relation
   * 
   * @param input Issue relation data  
   * @returns The created relation
   */
  async createIssueRelation(input: {
    issueId: string;
    relatedIssueId: string;
    type: string;
  }): Promise<any> {
    // Linear SDK doesn't have direct issue relation support
    // Use comment-based approach for dependency tracking (SAFe best practice)
    const relationComment = `🔗 **${input.type.toUpperCase()} RELATIONSHIP**: This issue ${input.type} issue ${input.relatedIssueId}`;
    
    return this.executeQuery(
      () => this.linearClient.createComment({
        issueId: input.issueId,
        body: relationComment
      }),
      'createIssueRelation'
    );
  }
}
