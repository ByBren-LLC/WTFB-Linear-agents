/**
 * Linear Issue Updater
 *
 * This module provides utilities for updating issues in Linear.
 */
import { LinearClient, Issue } from '@linear/sdk';
import * as logger from '../utils/logger';

/**
 * Utility for updating issues in Linear
 */
export class LinearIssueUpdater {
  private linearClient: LinearClient;

  /**
   * Creates a new LinearIssueUpdater
   *
   * @param accessToken - Linear API access token
   */
  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
  }

  /**
   * Updates an issue in Linear
   *
   * @param issueId - Linear issue ID
   * @param updateData - Data to update
   * @returns The updated issue if successful, null otherwise
   */
  async updateIssue(issueId: string, updateData: any): Promise<Issue | null> {
    try {
      const response = await this.linearClient.updateIssue(issueId, updateData);

      if (!response.success || !response.issue) {
        throw new Error('Failed to update issue');
      }

      const issue = await response.issue;

      logger.info('Updated issue', { issueId, updateData });

      return issue;
    } catch (error) {
      logger.error('Error updating issue', { error, issueId, updateData });
      throw error;
    }
  }

  /**
   * Updates the parent of an issue
   *
   * @param issueId - Linear issue ID
   * @param parentId - New parent issue ID, or null to remove parent
   * @returns The updated issue if successful, null otherwise
   */
  async updateParent(issueId: string, parentId: string | null): Promise<Issue | null> {
    return this.updateIssue(issueId, { parentId });
  }

  /**
   * Updates the title of an issue
   *
   * @param issueId - Linear issue ID
   * @param title - New title
   * @returns The updated issue if successful, null otherwise
   */
  async updateTitle(issueId: string, title: string): Promise<Issue | null> {
    return this.updateIssue(issueId, { title });
  }

  /**
   * Updates the description of an issue
   *
   * @param issueId - Linear issue ID
   * @param description - New description
   * @returns The updated issue if successful, null otherwise
   */
  async updateDescription(issueId: string, description: string): Promise<Issue | null> {
    return this.updateIssue(issueId, { description });
  }

  /**
   * Updates the labels of an issue
   *
   * @param issueId - Linear issue ID
   * @param labelIds - New label IDs
   * @returns The updated issue if successful, null otherwise
   */
  async updateLabels(issueId: string, labelIds: string[]): Promise<Issue | null> {
    return this.updateIssue(issueId, { labelIds });
  }

  /**
   * Adds labels to an issue
   *
   * @param issueId - Linear issue ID
   * @param labelIds - Label IDs to add
   * @returns The updated issue if successful, null otherwise
   */
  async addLabels(issueId: string, labelIds: string[]): Promise<Issue | null> {
    try {
      const issue = await this.linearClient.issue(issueId);
      const labelsResponse = await issue.labels();
      const existingLabelIds = labelsResponse.nodes.map((label: any) => label.id) || [];

      // Combine existing and new label IDs, removing duplicates
      const updatedLabelIds = Array.from(new Set([...existingLabelIds, ...labelIds]));

      return this.updateLabels(issueId, updatedLabelIds);
    } catch (error) {
      logger.error('Error adding labels to issue', { error, issueId, labelIds });
      throw error;
    }
  }

  /**
   * Removes labels from an issue
   *
   * @param issueId - Linear issue ID
   * @param labelIds - Label IDs to remove
   * @returns The updated issue if successful, null otherwise
   */
  async removeLabels(issueId: string, labelIds: string[]): Promise<Issue | null> {
    try {
      const issue = await this.linearClient.issue(issueId);
      const labelsResponse = await issue.labels();
      const existingLabelIds = labelsResponse.nodes.map((label: any) => label.id) || [];

      // Filter out the label IDs to remove
      const updatedLabelIds = existingLabelIds.filter((id: any) => !labelIds.includes(id));

      return this.updateLabels(issueId, updatedLabelIds);
    } catch (error) {
      logger.error('Error removing labels from issue', { error, issueId, labelIds });
      throw error;
    }
  }

  /**
   * Updates the state of an issue
   *
   * @param issueId - Linear issue ID
   * @param stateId - New state ID
   * @returns The updated issue if successful, null otherwise
   */
  async updateState(issueId: string, stateId: string): Promise<Issue | null> {
    return this.updateIssue(issueId, { stateId });
  }

  /**
   * Updates the assignee of an issue
   *
   * @param issueId - Linear issue ID
   * @param assigneeId - New assignee ID, or null to unassign
   * @returns The updated issue if successful, null otherwise
   */
  async updateAssignee(issueId: string, assigneeId: string | null): Promise<Issue | null> {
    return this.updateIssue(issueId, { assigneeId });
  }

  /**
   * Updates the priority of an issue
   *
   * @param issueId - Linear issue ID
   * @param priority - New priority (0-4)
   * @returns The updated issue if successful, null otherwise
   */
  async updatePriority(issueId: string, priority: number): Promise<Issue | null> {
    return this.updateIssue(issueId, { priority });
  }
}
