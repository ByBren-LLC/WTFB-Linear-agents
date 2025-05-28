import { LinearClient, Issue } from '@linear/sdk';
import * as logger from '../utils/logger';

/**
 * SAFe hierarchy management utility
 *
 * This utility helps maintain proper SAFe hierarchy in Linear:
 * Epic -> Feature -> Story
 */
export class SAFeHierarchy {
  private linearClient: LinearClient;

  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
  }

  /**
   * Creates an Epic in Linear
   */
  async createEpic(
    teamId: string,
    title: string,
    description: string,
    labels: string[] = []
  ): Promise<Issue | null> {
    try {
      // Get label IDs
      const labelIds = await this.getLabelIds(labels);

      // Create the Epic
      const response = await this.linearClient.createIssue({
        teamId,
        title,
        description,
        labelIds,
        // Add Epic label if not already included
        ...(labels.includes('Epic') ? {} : { labelIds: [...labelIds, await this.getEpicLabelId()] })
      });

      if (!response.success || !response.issue) {
        throw new Error('Failed to create Epic');
      }

      const issue = await response.issue;
      logger.info('Created Epic', {
        epicId: issue.id,
        title
      });

      return issue;
    } catch (error) {
      logger.error('Error creating Epic', { error, title });
      throw error;
    }
  }

  /**
   * Creates a Feature in Linear as a child of an Epic
   */
  async createFeature(
    teamId: string,
    epicId: string,
    title: string,
    description: string,
    labels: string[] = []
  ): Promise<Issue | null> {
    try {
      // Get label IDs
      const labelIds = await this.getLabelIds(labels);

      // Create the Feature
      const response = await this.linearClient.createIssue({
        teamId,
        title,
        description,
        labelIds,
        // Add Feature label if not already included
        ...(labels.includes('Feature') ? {} : { labelIds: [...labelIds, await this.getFeatureLabelId()] }),
        // Set parent issue (Epic)
        parentId: epicId
      });

      if (!response.success || !response.issue) {
        throw new Error('Failed to create Feature');
      }

      const issue = await response.issue;
      logger.info('Created Feature', {
        featureId: issue.id,
        epicId,
        title
      });

      return issue;
    } catch (error) {
      logger.error('Error creating Feature', { error, epicId, title });
      throw error;
    }
  }

  /**
   * Creates a Story in Linear as a child of a Feature
   */
  async createStory(
    teamId: string,
    featureId: string,
    title: string,
    description: string,
    labels: string[] = []
  ): Promise<Issue | null> {
    try {
      // Get label IDs
      const labelIds = await this.getLabelIds(labels);

      // Create the Story
      const response = await this.linearClient.createIssue({
        teamId,
        title,
        description,
        labelIds,
        // Set parent issue (Feature)
        parentId: featureId
      });

      if (!response.success || !response.issue) {
        throw new Error('Failed to create Story');
      }

      const issue = await response.issue;
      logger.info('Created Story', {
        storyId: issue.id,
        featureId,
        title
      });

      return issue;
    } catch (error) {
      logger.error('Error creating Story', { error, featureId, title });
      throw error;
    }
  }

  /**
   * Creates a Technical Enabler in Linear
   */
  async createEnablerStory(
    teamId: string,
    parentId: string | null,
    title: string,
    description: string,
    enablerType: 'Architecture' | 'Infrastructure' | 'Technical Debt' | 'Research',
    labels: string[] = []
  ): Promise<Issue | null> {
    try {
      // Get label IDs
      const labelIds = await this.getLabelIds([...labels, 'Technical Enabler', enablerType]);

      // Create the Enabler
      const response = await this.linearClient.createIssue({
        teamId,
        title,
        description,
        labelIds,
        // Set parent issue if provided
        ...(parentId ? { parentId } : {})
      });

      if (!response.success || !response.issue) {
        throw new Error('Failed to create Technical Enabler');
      }

      const issue = await response.issue;
      logger.info('Created Technical Enabler', {
        enablerId: issue.id,
        parentId,
        title
      });

      return issue;
    } catch (error) {
      logger.error('Error creating Technical Enabler', { error, parentId, title });
      throw error;
    }
  }

  /**
   * Gets label IDs for the given label names
   */
  private async getLabelIds(labelNames: string[]): Promise<string[]> {
    try {
      if (!labelNames.length) {
        return [];
      }

      const labels = await this.linearClient.issueLabels();

      return labels.nodes
        .filter(label => labelNames.includes(label.name))
        .map(label => label.id);
    } catch (error) {
      logger.error('Error getting label IDs', { error, labelNames });
      throw error;
    }
  }

  /**
   * Gets or creates the Epic label ID
   */
  private async getEpicLabelId(): Promise<string> {
    try {
      const labels = await this.linearClient.issueLabels();

      const epicLabel = labels.nodes.find(label => label.name === 'Epic');

      if (epicLabel) {
        return epicLabel.id;
      }

      // Create the Epic label if it doesn't exist
      const response = await this.linearClient.createIssueLabel({
        name: 'Epic',
        color: '#FF5630'
      });

      if (!response.success || !response.issueLabel) {
        throw new Error('Failed to create Epic label');
      }

      const issueLabel = await response.issueLabel;
      return issueLabel.id;
    } catch (error) {
      logger.error('Error getting Epic label ID', { error });
      throw error;
    }
  }

  /**
   * Gets or creates the Feature label ID
   */
  private async getFeatureLabelId(): Promise<string> {
    try {
      const labels = await this.linearClient.issueLabels();

      const featureLabel = labels.nodes.find(label => label.name === 'Feature');

      if (featureLabel) {
        return featureLabel.id;
      }

      // Create the Feature label if it doesn't exist
      const response = await this.linearClient.createIssueLabel({
        name: 'Feature',
        color: '#36B37E'
      });

      if (!response.success || !response.issueLabel) {
        throw new Error('Failed to create Feature label');
      }

      const issueLabel = await response.issueLabel;
      return issueLabel.id;
    } catch (error) {
      logger.error('Error getting Feature label ID', { error });
      throw error;
    }
  }
}
