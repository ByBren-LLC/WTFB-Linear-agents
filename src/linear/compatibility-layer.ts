/**
 * Linear SDK Compatibility Layer
 *
 * This module provides a compatibility layer for the Linear SDK, allowing existing code
 * written for SDK 1.x patterns to work with SDK 2.x without modification.
 *
 * Key changes from 1.x to 2.x:
 * - issueCreate -> createIssue
 * - issueUpdate -> updateIssue
 * - commentCreate -> createComment
 * - issueLabelCreate -> createIssueLabel
 * - cycleCreate -> createCycle
 * - milestoneCreate -> createMilestone
 * - issueRelationCreate -> createIssueRelation
 * - issueRelationDelete -> deleteIssueRelation
 */

import { LinearClient, LinearDocument, LinearFetch } from '@linear/sdk';
import * as logger from '../utils/logger';
import { handleLinearError } from './error-handler';
import { RateLimiter } from './rate-limiter';
import { retry, RetryOptions } from './retry';
import { refreshToken } from '../auth/tokens';

// Type definitions for compatibility
export interface IssueCreateInput {
  teamId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: number;
  labelIds?: string[];
  stateId?: string;
  parentId?: string;
  projectId?: string;
  cycleId?: string;
  estimate?: number;
  dueDate?: Date;
}

export interface IssueUpdateInput {
  title?: string;
  description?: string;
  assigneeId?: string;
  priority?: number;
  labelIds?: string[];
  stateId?: string;
  parentId?: string;
  projectId?: string;
  cycleId?: string;
  estimate?: number;
  dueDate?: Date;
}

export interface CommentCreateInput {
  issueId: string;
  body: string;
}

export interface IssueLabelCreateInput {
  teamId: string;
  name: string;
  color: string; // Make color required with default
  description?: string;
}

export interface CycleCreateInput {
  teamId: string;
  name: string;
  description?: string;
  startsAt: Date | string; // Support both Date and string
  endsAt: Date | string; // Support both Date and string
}

export interface MilestoneCreateInput {
  name: string;
  description?: string;
  targetDate?: Date | string; // Support both Date and string
}

export interface IssueRelationCreateInput {
  issueId: string;
  relatedIssueId: string;
  type: any; // Use any to avoid type conflicts with different SDK versions
}

// Enhanced LinearFetch wrapper to provide missing properties
export class CompatibleLinearFetch<T> {
  private _fetch: Promise<T>;
  private _data: T | null = null;
  private _resolved = false;

  constructor(fetch: Promise<T>) {
    this._fetch = fetch;
    // Eagerly resolve to populate _data
    this._fetch.then(data => {
      this._data = data;
      this._resolved = true;
    }).catch(() => {
      this._resolved = true;
    });
  }

  // Provide the missing 'nodes' property for connection types
  get nodes(): T[] {
    if (this._data && Array.isArray(this._data)) {
      return this._data;
    }
    // For connections, try to access nodes property
    if (this._data && typeof this._data === 'object' && 'nodes' in this._data) {
      return (this._data as any).nodes;
    }
    return [];
  }

  // Provide the missing 'id' property
  get id(): string | undefined {
    if (this._data && typeof this._data === 'object' && 'id' in this._data) {
      return (this._data as any).id;
    }
    return undefined;
  }

  // Provide other common properties
  get name(): string | undefined {
    if (this._data && typeof this._data === 'object' && 'name' in this._data) {
      return (this._data as any).name;
    }
    return undefined;
  }

  // Forward all other properties and methods to the original fetch
  async then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    try {
      const result = await this._fetch;
      this._data = result;
      return onfulfilled ? onfulfilled(result) : (result as any);
    } catch (error) {
      return onrejected ? onrejected(error) : Promise.reject(error);
    }
  }

  // Make it awaitable
  async valueOf(): Promise<T> {
    const result = await this._fetch;
    this._data = result;
    return result;
  }

  // Add Symbol.asyncIterator to make it awaitable
  [Symbol.toStringTag] = 'CompatibleLinearFetch';
}

/**
 * Linear SDK Compatibility Layer Client
 *
 * Provides backward compatibility for Linear SDK 1.x patterns while using 2.x underneath
 */
export class LinearCompatibilityClient {
  private linearClient: LinearClient;
  private rateLimiter: RateLimiter;
  private organizationId: string;

  constructor(
    config: { accessToken: string; organizationId?: string } | string,
    organizationId?: string
  ) {
    // Handle multiple constructor patterns for backward compatibility
    let accessToken: string;
    let orgId: string;

    if (typeof config === 'string') {
      // Legacy pattern: new LinearClient(accessToken, organizationId)
      accessToken = config;
      orgId = organizationId || 'default';
    } else {
      // Modern pattern: new LinearClient({ accessToken, organizationId })
      accessToken = config.accessToken;
      orgId = config.organizationId || organizationId || 'default';
    }

    this.linearClient = new LinearClient({ accessToken });
    this.rateLimiter = new RateLimiter();
    this.organizationId = orgId;
  }

  /**
   * Helper method to convert Date/string to Date object
   */
  private ensureDate(dateInput: Date | string): Date {
    if (typeof dateInput === 'string') {
      return new Date(dateInput);
    }
    return dateInput;
  }

  /**
   * Helper method to provide default color for labels
   */
  private getDefaultColor(): string {
    return '#4EA7FC'; // Default blue color
  }

  /**
   * Executes a Linear API query with error handling, rate limiting, and retry logic
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

  // ============================================================================
  // 1.x COMPATIBILITY METHODS (old patterns)
  // ============================================================================

  /**
   * Creates a new issue (1.x pattern: issueCreate)
   */
  async issueCreate(input: IssueCreateInput): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.createIssue(input),
      'issueCreate'
    );
  }

  /**
   * Updates an issue (1.x pattern: issueUpdate)
   */
  async issueUpdate(issueId: string, input: IssueUpdateInput): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.updateIssue(issueId, input),
      'issueUpdate'
    );
  }

  /**
   * Creates a comment (1.x pattern: commentCreate)
   */
  async commentCreate(input: CommentCreateInput): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.createComment(input),
      'commentCreate'
    );
  }

  /**
   * Creates an issue label (1.x pattern: issueLabelCreate)
   */
  async issueLabelCreate(input: IssueLabelCreateInput): Promise<any> {
    // Ensure color has a default value
    const processedInput = {
      ...input,
      color: input.color || this.getDefaultColor()
    };

    return this.executeQuery(
      () => this.linearClient.createIssueLabel(processedInput),
      'issueLabelCreate'
    );
  }

  /**
   * Creates a cycle (1.x pattern: cycleCreate)
   */
  async cycleCreate(input: CycleCreateInput): Promise<any> {
    // Convert dates to proper format
    const processedInput = {
      ...input,
      startsAt: this.ensureDate(input.startsAt),
      endsAt: this.ensureDate(input.endsAt)
    };

    return this.executeQuery(
      () => this.linearClient.createCycle(processedInput),
      'cycleCreate'
    );
  }

  /**
   * Creates a milestone (1.x pattern: milestoneCreate)
   * Note: Milestones may not be available in all Linear SDK versions
   */
  async milestoneCreate(input: MilestoneCreateInput): Promise<any> {
    // Convert date to proper format if provided
    const processedInput = {
      ...input,
      ...(input.targetDate && { targetDate: this.ensureDate(input.targetDate) })
    };

    return this.executeQuery(
      () => {
        // Check if createMilestone method exists
        if (typeof (this.linearClient as any).createMilestone === 'function') {
          return (this.linearClient as any).createMilestone(processedInput);
        } else {
          throw new Error('Milestone creation is not supported in this Linear SDK version');
        }
      },
      'milestoneCreate'
    );
  }

  /**
   * Creates an issue relation (1.x pattern: issueRelationCreate)
   */
  async issueRelationCreate(input: IssueRelationCreateInput): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.createIssueRelation(input),
      'issueRelationCreate'
    );
  }

  /**
   * Deletes an issue relation (1.x pattern: issueRelationDelete)
   */
  async issueRelationDelete(relationId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.deleteIssueRelation(relationId),
      'issueRelationDelete'
    );
  }

  // ============================================================================
  // 2.x METHODS (new patterns) - for forward compatibility
  // ============================================================================

  /**
   * Creates a new issue (2.x pattern: createIssue)
   */
  async createIssue(input: IssueCreateInput): Promise<any> {
    return this.issueCreate(input);
  }

  /**
   * Updates an issue (2.x pattern: updateIssue)
   */
  async updateIssue(issueId: string, input: IssueUpdateInput): Promise<any> {
    return this.issueUpdate(issueId, input);
  }

  /**
   * Creates a comment (2.x pattern: createComment)
   */
  async createComment(input: CommentCreateInput): Promise<any> {
    return this.commentCreate(input);
  }

  /**
   * Creates an issue label (2.x pattern: createIssueLabel)
   */
  async createIssueLabel(input: IssueLabelCreateInput): Promise<any> {
    return this.issueLabelCreate(input);
  }

  /**
   * Creates a cycle (2.x pattern: createCycle)
   */
  async createCycle(input: CycleCreateInput): Promise<any> {
    return this.cycleCreate(input);
  }

  /**
   * Creates a milestone (2.x pattern: createMilestone)
   */
  async createMilestone(input: MilestoneCreateInput): Promise<any> {
    return this.milestoneCreate(input);
  }

  /**
   * Creates an issue relation (2.x pattern: createIssueRelation)
   */
  async createIssueRelation(input: IssueRelationCreateInput): Promise<any> {
    return this.issueRelationCreate(input);
  }

  /**
   * Deletes an issue relation (2.x pattern: deleteIssueRelation)
   */
  async deleteIssueRelation(relationId: string): Promise<any> {
    return this.issueRelationDelete(relationId);
  }

  // ============================================================================
  // QUERY METHODS (compatible with both 1.x and 2.x)
  // ============================================================================

  /**
   * Gets an issue by ID
   */
  async issue(issueId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issue(issueId),
      'issue'
    );
  }

  /**
   * Gets all issues with optional filter
   */
  async issues(filter?: any): Promise<CompatibleLinearFetch<any>> {
    const result = await this.executeQuery(
      () => this.linearClient.issues(filter),
      'issues'
    );
    return new CompatibleLinearFetch(Promise.resolve(result));
  }

  /**
   * Gets all teams
   */
  async teams(): Promise<CompatibleLinearFetch<any>> {
    const result = await this.executeQuery(
      () => this.linearClient.teams(),
      'teams'
    );
    return new CompatibleLinearFetch(Promise.resolve(result));
  }

  /**
   * Gets a team by ID
   */
  async team(teamId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.team(teamId),
      'team'
    );
  }

  /**
   * Gets issue labels for a team
   */
  async issueLabels(teamId?: string): Promise<CompatibleLinearFetch<any>> {
    const filter = teamId ? { team: { id: { eq: teamId } } } : undefined;
    const result = await this.executeQuery(
      () => this.linearClient.issueLabels({ filter }),
      'issueLabels'
    );
    return new CompatibleLinearFetch(Promise.resolve(result));
  }

  /**
   * Gets milestones
   * Note: Milestones may not be available in all Linear SDK versions
   */
  async milestones(): Promise<CompatibleLinearFetch<any>> {
    const result = await this.executeQuery(
      () => {
        // Check if milestones method exists
        if (typeof (this.linearClient as any).milestones === 'function') {
          return (this.linearClient as any).milestones();
        } else {
          // Return empty result if milestones are not supported
          return { nodes: [] };
        }
      },
      'milestones'
    );
    return new CompatibleLinearFetch(Promise.resolve(result));
  }

  /**
   * Gets cycles with optional filter (for PI planning)
   */
  async cycles(filter?: any): Promise<CompatibleLinearFetch<any>> {
    const result = await this.executeQuery(
      () => this.linearClient.cycles(filter),
      'cycles'
    );
    return new CompatibleLinearFetch(Promise.resolve(result));
  }

  /**
   * Gets a cycle by ID (for PI planning)
   */
  async cycle(cycleId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.cycle(cycleId),
      'cycle'
    );
  }

  /**
   * Gets the current viewer (user)
   */
  get viewer(): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.viewer,
      'viewer'
    );
  }

  /**
   * Gets issue relation by ID
   */
  async issueRelation(relationId: string): Promise<any> {
    return this.executeQuery(
      () => this.linearClient.issueRelation(relationId),
      'issueRelation'
    );
  }

  // ============================================================================
  // ENHANCED METHODS WITH COMPATIBILITY WRAPPERS
  // ============================================================================

  /**
   * Gets team issues with enhanced compatibility
   */
  async getTeamIssues(teamId: string, filter?: any): Promise<CompatibleLinearFetch<any>> {
    const combinedFilter = {
      team: { id: { eq: teamId } },
      ...filter
    };
    return this.issues({ filter: combinedFilter });
  }

  /**
   * Gets all teams with enhanced compatibility
   */
  async getTeams(): Promise<CompatibleLinearFetch<any>> {
    return this.teams();
  }

  /**
   * Gets an issue with enhanced compatibility
   */
  async getIssue(issueId: string): Promise<any> {
    return this.issue(issueId);
  }

  /**
   * Gets the current user with enhanced compatibility
   */
  async getUser(): Promise<any> {
    return this.viewer;
  }
}

/**
 * Factory function to create a compatible Linear client
 */
export function createLinearClient(
  config: { accessToken: string; organizationId?: string } | string,
  organizationId?: string
): LinearCompatibilityClient {
  return new LinearCompatibilityClient(config, organizationId);
}

// Export the compatibility client as the default Linear client
export { LinearCompatibilityClient as LinearClient };
export { LinearCompatibilityClient as LinearClientWrapper };

// Export types for external use (re-export to avoid conflicts)
export type {
  IssueCreateInput as CompatibleIssueCreateInput,
  IssueUpdateInput as CompatibleIssueUpdateInput,
  CommentCreateInput as CompatibleCommentCreateInput,
  IssueLabelCreateInput as CompatibleIssueLabelCreateInput,
  CycleCreateInput as CompatibleCycleCreateInput,
  MilestoneCreateInput as CompatibleMilestoneCreateInput,
  IssueRelationCreateInput as CompatibleIssueRelationCreateInput
};
