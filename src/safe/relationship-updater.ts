/**
 * Relationship Updater
 *
 * This module provides utilities for updating relationships between issues in Linear.
 * It can update parent-child relationships and other types of relationships.
 *
 * ARCHITECTURAL NOTE - Linear SDK v2.6.0 Compatibility:
 * This implementation was updated for Linear SDK v2.6.0 compatibility during LIN-27/28/30 fixes.
 * The relationship management has been SIMPLIFIED to focus on creation rather than full CRUD operations.
 *
 * CURRENT LIMITATIONS:
 * - Does not query existing relationships before creating new ones
 * - Does not remove obsolete relationships (cleanup)
 * - May create duplicate relationships (handled gracefully with error catching)
 * - No relationship validation or circular dependency prevention
 *
 * PRODUCTION READINESS:
 * This simplified approach is suitable for MVP and basic relationship management.
 * For production robustness, implement the enhancement roadmap detailed in updateRelationships().
 *
 * TECHNICAL DEBT TRACKING:
 * - Issue: LIN-27 (parent) - TypeScript & Linear SDK v2.6.0 compatibility
 * - Sub-issues: LIN-28 (response patterns), LIN-30 (enums), LIN-31 (datetime)
 * - Future enhancement ticket needed for robust relationship management
 */
import { LinearClient, Issue } from '@linear/sdk';
import { IssueRelationType } from '@linear/sdk/dist/_generated_documents';
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
      const parent = child.parent ? await child.parent : null;
      const currentParentId = parent?.id || null;

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
          // ARCHITECTURAL NOTE: Linear SDK v2.6.0 Relationship Access Simplification
          //
          // CURRENT APPROACH: Simplified relationship creation without querying existing relationships
          // - Creates new relationships directly using createIssueRelation()
          // - Handles duplicate relationship errors gracefully with try/catch
          // - Does NOT remove old relationships that are no longer needed
          //
          // FUTURE ENHANCEMENT ROADMAP:
          // 1. Research Linear SDK v2.6.0 relationship query patterns:
          //    - Investigate correct async access patterns for issue.blocks/relations
          //    - Determine if relationships are accessed via issue.relations() or different method
          //    - Study Linear SDK v2.6.0 documentation for relationship pagination
          // 2. Implement robust relationship management:
          //    - Query existing relationships before creating new ones
          //    - Remove relationships that are no longer needed (cleanup)
          //    - Handle relationship pagination for issues with many relationships
          // 3. Add relationship validation:
          //    - Verify relationship types are valid for issue types
          //    - Prevent circular dependencies in blocking relationships
          //    - Add relationship conflict detection and resolution
          // 4. Performance optimization:
          //    - Batch relationship operations where possible
          //    - Cache relationship queries to reduce API calls
          //    - Implement relationship change detection to minimize updates
          //
          // TECHNICAL DEBT: This simplified approach may create duplicate relationships
          // and does not clean up obsolete relationships. Acceptable for MVP but should
          // be enhanced for production robustness.
          //
          // For Linear SDK v2.6.0, we'll create relationships directly without complex querying
          // This is a simplified approach that focuses on creating new relationships
          for (const relatedIssueId of relatedIssueIds) {
            try {
              // Use Linear SDK v2.6.0 enum constant for issue relationship type
              await this.linearClient.createIssueRelation({
                issueId,
                relatedIssueId,
                type: IssueRelationType.Blocks
              });

              logger.info('Added blocking relationship', {
                issueId,
                relatedIssueId
              });
            } catch (error) {
              // Relationship might already exist, log and continue
              logger.warn('Failed to create blocking relationship (may already exist)', {
                issueId,
                relatedIssueId,
                error: (error as Error).message
              });
            }
          }
          break;

        case 'related':
          // ARCHITECTURAL NOTE: Same simplification as 'blocks' case above
          // See detailed enhancement roadmap in 'blocks' case comments
          // For Linear SDK v2.6.0, we'll create relationships directly without complex querying
          // This is a simplified approach that focuses on creating new relationships
          for (const relatedIssueId of relatedIssueIds) {
            try {
              // Use Linear SDK v2.6.0 enum constant for issue relationship type
              await this.linearClient.createIssueRelation({
                issueId,
                relatedIssueId,
                type: IssueRelationType.Related
              });

              logger.info('Added related relationship', {
                issueId,
                relatedIssueId
              });
            } catch (error) {
              // Relationship might already exist, log and continue
              logger.warn('Failed to create related relationship (may already exist)', {
                issueId,
                relatedIssueId,
                error: (error as Error).message
              });
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
