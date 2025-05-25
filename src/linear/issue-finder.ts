/**
 * Linear Issue Finder
 *
 * This module provides utilities for finding issues in Linear based on various criteria.
 */
import { LinearClient, Issue, IssueConnection } from '@linear/sdk';
import * as logger from '../utils/logger';

/**
 * Utility for finding issues in Linear
 */
export class LinearIssueFinder {
  private linearClient: LinearClient;
  private teamId: string;

  /**
   * Creates a new LinearIssueFinder
   *
   * @param accessToken - Linear API access token
   * @param teamId - Linear team ID
   */
  constructor(accessToken: string, teamId: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.teamId = teamId;
  }

  /**
   * Finds an issue by its ID
   *
   * @param issueId - Linear issue ID
   * @returns The issue if found, null otherwise
   */
  async findIssueById(issueId: string): Promise<Issue | null> {
    try {
      const issue = await this.linearClient.issue(issueId);
      return issue;
    } catch (error) {
      logger.error('Error finding issue by ID', { error, issueId });
      return null;
    }
  }

  /**
   * Finds issues by label
   *
   * @param labelName - Label name to search for
   * @returns Array of issues with the given label
   */
  async findIssuesByLabel(labelName: string): Promise<Issue[]> {
    try {
      const labelId = await this.getLabelId(labelName);

      if (!labelId) {
        return [];
      }

      const issues = await this.linearClient.issues({
        filter: {
          team: { id: { eq: this.teamId } },
          labels: { id: { eq: labelId } }
        }
      });

      return issues.nodes;
    } catch (error) {
      logger.error('Error finding issues by label', { error, labelName });
      return [];
    }
  }

  /**
   * Finds issues by multiple labels
   *
   * @param labelNames - Label names to search for
   * @returns Array of issues with all the given labels
   */
  async findIssuesByLabels(labelNames: string[]): Promise<Issue[]> {
    try {
      const labelIds = await Promise.all(
        labelNames.map(name => this.getLabelId(name))
      );

      const validLabelIds = labelIds.filter(id => id !== null) as string[];

      if (validLabelIds.length === 0) {
        return [];
      }

      let issues: Issue[] = [];
      let hasNextPage = true;
      let cursor: string | undefined = undefined;

      while (hasNextPage) {
        const response: IssueConnection = await this.linearClient.issues({
          filter: {
            team: { id: { eq: this.teamId } },
            labels: { id: { in: validLabelIds } }
          },
          after: cursor
        });

        issues = [...issues, ...response.nodes];
        hasNextPage = response.pageInfo.hasNextPage;
        cursor = response.pageInfo.endCursor;
      }

      // Filter issues to only include those with all the required labels
      const filteredIssues = [];
      for (const issue of issues) {
        const labelsResponse = await issue.labels();
        const issueLabels = labelsResponse.nodes || [];
        const issueLabelIds = issueLabels.map((label: any) => label.id);
        if (validLabelIds.every(id => issueLabelIds.includes(id))) {
          filteredIssues.push(issue);
        }
      }
      return filteredIssues;
    } catch (error) {
      logger.error('Error finding issues by labels', { error, labelNames });
      return [];
    }
  }

  /**
   * Finds epics in Linear
   *
   * @returns Array of epics
   */
  async findEpics(): Promise<Issue[]> {
    return this.findIssuesByLabel('Epic');
  }

  /**
   * Finds features in Linear
   *
   * @returns Array of features
   */
  async findFeatures(): Promise<Issue[]> {
    return this.findIssuesByLabel('Feature');
  }

  /**
   * Finds stories in Linear
   *
   * @returns Array of stories
   */
  async findStories(): Promise<Issue[]> {
    try {
      const epicLabelId = await this.getLabelId('Epic');
      const featureLabelId = await this.getLabelId('Feature');
      const enablerLabelId = await this.getLabelId('Enabler');

      const issues = await this.linearClient.issues({
        filter: {
          team: { id: { eq: this.teamId } },
          labels: {
            id: {
              nin: [
                ...(epicLabelId ? [epicLabelId] : []),
                ...(featureLabelId ? [featureLabelId] : []),
                ...(enablerLabelId ? [enablerLabelId] : [])
              ]
            }
          }
        }
      });

      return issues.nodes;
    } catch (error) {
      logger.error('Error finding stories', { error });
      return [];
    }
  }

  /**
   * Finds enablers in Linear
   *
   * @returns Array of enablers
   */
  async findEnablers(): Promise<Issue[]> {
    return this.findIssuesByLabel('Enabler');
  }

  /**
   * Finds issues by their external ID
   *
   * @param externalId - External ID to search for
   * @returns The issue if found, null otherwise
   */
  async findIssueByExternalId(externalId: string): Promise<Issue | null> {
    try {
      // Search for issues by external ID in title or description
      const issues = await this.linearClient.issues({
        filter: {
          team: { id: { eq: this.teamId } },
          title: { contains: externalId }
        }
      });

      if (issues.nodes.length === 0) {
        return null;
      }

      return issues.nodes[0];
    } catch (error) {
      logger.error('Error finding issue by external ID', { error, externalId });
      return null;
    }
  }

  /**
   * Gets the ID of a label by name
   *
   * @param labelName - Label name
   * @returns Label ID if found, null otherwise
   */
  private async getLabelId(labelName: string): Promise<string | null> {
    try {
      const labels = await this.linearClient.issueLabels();

      const label = labels.nodes.find(label => label.name === labelName);

      return label ? label.id : null;
    } catch (error) {
      logger.error('Error getting label ID', { error, labelName });
      return null;
    }
  }
}
