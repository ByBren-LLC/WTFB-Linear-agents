/**
 * Relationship Updater
 *
 * This module provides utilities for updating relationships between issues in Linear.
 */
import { LinearClient, Issue } from '@linear/sdk';
import * as logger from '../utils/logger';

/**
 * Utility for updating relationships between issues in Linear
 */
export class RelationshipUpdater {
  private linearClient: LinearClient;

  /**
   * Creates a new RelationshipUpdater
   *
   * @param accessToken - Linear API access token
   */
  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
  }

  /**
   * Updates the parent-child relationship between two issues
   *
   * @param childId - Child issue ID
   * @param newParentId - New parent issue ID, or null to remove parent
   */
  async updateParentChild(childId: string, newParentId: string | null): Promise<void> {
    try {
      logger.info('Updating parent-child relationship', {
        childId,
        newParentId
      });

      // Get the current parent of the child
      const child = await this.linearClient.issue(childId);
      const currentParentId = child.parent?.id || null;

      // If the parent hasn't changed, do nothing
      if (currentParentId === newParentId) {
        logger.info('Parent-child relationship already up to date', {
          childId,
          parentId: newParentId
        });
        return;
      }

      // Update the parent
      const response = await this.linearClient.updateIssue(childId, {
        parentId: newParentId
      });

      if (!response.success) {
        throw new Error('Failed to update parent-child relationship');
      }

      logger.info('Parent-child relationship updated successfully', {
        childId,
        oldParentId: currentParentId,
        newParentId
      });
    } catch (error) {
      logger.error('Error updating parent-child relationship', {
        error,
        childId,
        newParentId
      });
      throw error;
    }
  }

  /**
   * Moves an issue to a new parent
   *
   * @param issueId - Issue ID to move
   * @param newParentId - New parent issue ID, or null to remove parent
   */
  async moveIssue(issueId: string, newParentId: string | null): Promise<void> {
    return this.updateParentChild(issueId, newParentId);
  }

  /**
   * Updates the relationships between an issue and related issues
   *
   * @param issueId - Issue ID
   * @param relatedIssueIds - Related issue IDs
   * @param relationshipType - Type of relationship
   */
  async updateRelationships(
    issueId: string,
    relatedIssueIds: string[],
    relationshipType: string
  ): Promise<void> {
    try {
      logger.info('Updating relationships', {
        issueId,
        relatedIssueIds,
        relationshipType
      });

      // Get the current relationships
      const issue = await this.linearClient.issue(issueId);

      // Handle different relationship types
      switch (relationshipType) {
        case 'blocks':
          // Get current blocking relationships
          const currentBlockingIds = issue.blocks?.nodes.map(rel => rel.id) || [];

          // Add new blocking relationships
          for (const relatedIssueId of relatedIssueIds) {
            if (!currentBlockingIds.includes(relatedIssueId)) {
              await this.linearClient.createIssueRelation({
                issueId,
                relatedIssueId,
                type: 'blocks'
              });

              logger.info('Added blocking relationship', {
                issueId,
                relatedIssueId
              });
            }
          }

          // Remove old blocking relationships
          for (const currentBlockingId of currentBlockingIds) {
            if (!relatedIssueIds.includes(currentBlockingId)) {
              // Find the relationship ID
              const relationship = issue.blocks?.nodes.find(rel => rel.id === currentBlockingId);

              if (relationship) {
                await this.linearClient.deleteIssueRelation({
                  id: relationship.id
                });

                logger.info('Removed blocking relationship', {
                  issueId,
                  relatedIssueId: currentBlockingId
                });
              }
            }
          }
          break;

        case 'related':
          // Get current related relationships
          const currentRelatedIds = issue.relations?.nodes.map(rel => rel.relatedIssue.id) || [];

          // Add new related relationships
          for (const relatedIssueId of relatedIssueIds) {
            if (!currentRelatedIds.includes(relatedIssueId)) {
              await this.linearClient.createIssueRelation({
                issueId,
                relatedIssueId,
                type: 'relates'
              });

              logger.info('Added related relationship', {
                issueId,
                relatedIssueId
              });
            }
          }

          // Remove old related relationships
          for (const currentRelatedId of currentRelatedIds) {
            if (!relatedIssueIds.includes(currentRelatedId)) {
              // Find the relationship ID
              const relationship = issue.relations?.nodes.find(rel => rel.relatedIssue.id === currentRelatedId);

              if (relationship) {
                await this.linearClient.deleteIssueRelation({
                  id: relationship.id
                });

                logger.info('Removed related relationship', {
                  issueId,
                  relatedIssueId: currentRelatedId
                });
              }
            }
          }
          break;

        default:
          logger.warn('Unsupported relationship type', { relationshipType });
          break;
      }

      logger.info('Relationships updated successfully', {
        issueId,
        relationshipType
      });
    } catch (error) {
      logger.error('Error updating relationships', {
        error,
        issueId,
        relatedIssueIds,
        relationshipType
      });
      throw error;
    }
  }
}
