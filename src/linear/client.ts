/**
 * Linear Client Wrapper
 *
 * This module provides a wrapper around the Linear SDK that includes error handling,
 * rate limiting, and retry logic.
 */

import { LinearClient, LinearDocument, LinearFetch } from '@linear/sdk';
import { LinearCompatibilityClient } from './compatibility-layer';
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
   * The Linear compatibility client instance
   */
  private linearClient: LinearCompatibilityClient;

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
    this.linearClient = new LinearCompatibilityClient(accessToken, organizationId);
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
    // Delegate to the compatibility client's executeQuery method
    return this.linearClient.executeQuery(queryFn, endpoint, retryOptions);
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
   * Updates an issue
   *
   * @param issueId The issue ID
   * @param input The issue update input
   * @returns The updated issue
   */
  async updateIssue(issueId: string, input: any): Promise<any> {
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
      () => this.linearClient.issueLabels(teamId),
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
}
