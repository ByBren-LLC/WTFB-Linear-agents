/**
 * Linear Issue Creator
 *
 * This module provides utilities for creating issues in Linear.
 */
import { LinearClient, IssueCreateInput } from './';
import { Issue } from '@linear/sdk';
import * as logger from '../utils/logger';

/**
 * Utility for creating issues in Linear
 */
export class LinearIssueCreator {
  private linearClient: LinearClient;
  private teamId: string;

  /**
   * Creates a new LinearIssueCreator
   *
   * @param accessToken - Linear API access token
   * @param teamId - Linear team ID
   */
  constructor(accessToken: string, teamId: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.teamId = teamId;
  }

  /**
   * Creates an issue in Linear
   *
   * @param title - Issue title
   * @param description - Issue description
   * @param options - Additional options
   * @returns The created issue if successful, null otherwise
   */
  async createIssue(
    title: string,
    description: string,
    options: {
      parentId?: string;
      labelIds?: string[];
      assigneeId?: string;
      stateId?: string;
      priority?: number;
      externalId?: string;
    } = {}
  ): Promise<Issue | null> {
    try {
      const createData: IssueCreateInput = {
        teamId: this.teamId,
        title,
        description,
        ...options
      };

      const response = await this.linearClient.issueCreate(createData);

      if (!response.success || !response.issue) {
        throw new Error(`Failed to create issue: ${response.error}`);
      }

      logger.info('Created issue', {
        issueId: response.issue.id,
        title
      });

      return response.issue;
    } catch (error) {
      logger.error('Error creating issue', { error, title });
      throw error;
    }
  }

  /**
   * Creates an Epic in Linear
   *
   * @param title - Epic title
   * @param description - Epic description
   * @param options - Additional options
   * @returns The created Epic if successful, null otherwise
   */
  async createEpic(
    title: string,
    description: string,
    options: {
      labelIds?: string[];
      assigneeId?: string;
      stateId?: string;
      priority?: number;
      externalId?: string;
    } = {}
  ): Promise<Issue | null> {
    try {
      // Get the Epic label ID
      const epicLabelId = await this.getLabelId('Epic');

      if (!epicLabelId) {
        throw new Error('Epic label not found');
      }

      // Add Epic label to labelIds
      const labelIds = [...(options.labelIds || []), epicLabelId];

      // Create the Epic
      return this.createIssue(
        `[EPIC] ${title}`,
        description,
        {
          ...options,
          labelIds
        }
      );
    } catch (error) {
      logger.error('Error creating Epic', { error, title });
      throw error;
    }
  }

  /**
   * Creates a Feature in Linear
   *
   * @param title - Feature title
   * @param description - Feature description
   * @param epicId - Parent Epic ID
   * @param isBusinessFeature - Whether this is a business feature (true) or enabler feature (false)
   * @param options - Additional options
   * @returns The created Feature if successful, null otherwise
   */
  async createFeature(
    title: string,
    description: string,
    epicId: string | null = null,
    isBusinessFeature: boolean = true,
    options: {
      labelIds?: string[];
      assigneeId?: string;
      stateId?: string;
      priority?: number;
      externalId?: string;
    } = {}
  ): Promise<Issue | null> {
    try {
      // Get the Feature label ID
      const featureLabelId = await this.getLabelId('Feature');

      if (!featureLabelId) {
        throw new Error('Feature label not found');
      }

      // Get the Business/Enabler label ID if needed
      let categoryLabelId: string | null = null;
      if (isBusinessFeature) {
        categoryLabelId = await this.getLabelId('Business');
      } else {
        categoryLabelId = await this.getLabelId('Enabler');
      }

      // Add Feature label and category label to labelIds
      const labelIds = [
        ...(options.labelIds || []),
        featureLabelId,
        ...(categoryLabelId ? [categoryLabelId] : [])
      ];

      // Create the Feature
      return this.createIssue(
        `[FEATURE] ${title}`,
        description,
        {
          ...options,
          labelIds,
          ...(epicId ? { parentId: epicId } : {})
        }
      );
    } catch (error) {
      logger.error('Error creating Feature', { error, title, epicId });
      throw error;
    }
  }

  /**
   * Creates a Story in Linear
   *
   * @param title - Story title
   * @param description - Story description
   * @param featureId - Parent Feature ID
   * @param options - Additional options
   * @returns The created Story if successful, null otherwise
   */
  async createStory(
    title: string,
    description: string,
    featureId: string | null = null,
    options: {
      labelIds?: string[];
      assigneeId?: string;
      stateId?: string;
      priority?: number;
      externalId?: string;
    } = {}
  ): Promise<Issue | null> {
    try {
      // Create the Story
      return this.createIssue(
        title,
        description,
        {
          ...options,
          ...(featureId ? { parentId: featureId } : {})
        }
      );
    } catch (error) {
      logger.error('Error creating Story', { error, title, featureId });
      throw error;
    }
  }

  /**
   * Creates an Enabler in Linear
   *
   * @param title - Enabler title
   * @param description - Enabler description
   * @param enablerType - Type of enabler
   * @param featureId - Parent Feature ID
   * @param options - Additional options
   * @returns The created Enabler if successful, null otherwise
   */
  async createEnabler(
    title: string,
    description: string,
    enablerType: 'Architecture' | 'Infrastructure' | 'Technical Debt' | 'Research',
    featureId: string | null = null,
    options: {
      labelIds?: string[];
      assigneeId?: string;
      stateId?: string;
      priority?: number;
      externalId?: string;
    } = {}
  ): Promise<Issue | null> {
    try {
      // Get the Enabler label ID
      const enablerLabelId = await this.getLabelId('Enabler');

      if (!enablerLabelId) {
        throw new Error('Enabler label not found');
      }

      // Get the Enabler Type label ID
      const typeLabelId = await this.getLabelId(enablerType);

      // Add Enabler label and type label to labelIds
      const labelIds = [
        ...(options.labelIds || []),
        enablerLabelId,
        ...(typeLabelId ? [typeLabelId] : [])
      ];

      // Create the Enabler
      return this.createIssue(
        `[ENABLER] ${title}`,
        description,
        {
          ...options,
          labelIds,
          ...(featureId ? { parentId: featureId } : {})
        }
      );
    } catch (error) {
      logger.error('Error creating Enabler', { error, title, featureId });
      throw error;
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

      if (label) {
        return label.id;
      }

      // Create the label if it doesn't exist
      const colorMap: Record<string, string> = {
        'Epic': '#F2994A',
        'Feature': '#BB87FC',
        'Enabler': '#4EA7FC',
        'Business': '#4CB782',
        'Architecture': '#0366D6',
        'Infrastructure': '#6937C5',
        'Technical Debt': '#EB5757',
        'Research': '#F2C94C'
      };

      const color = colorMap[labelName] || '#4EA7FC';

      const response = await this.linearClient.issueLabelCreate({
        name: labelName,
        color
      });

      if (!response.success || !response.issueLabel) {
        throw new Error(`Failed to create ${labelName} label`);
      }

      return response.issueLabel.id;
    } catch (error) {
      logger.error(`Error getting ${labelName} label ID`, { error });
      return null;
    }
  }
}
