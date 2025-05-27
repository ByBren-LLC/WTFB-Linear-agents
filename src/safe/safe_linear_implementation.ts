/**
 * SAFe Implementation in Linear
 *
 * This module provides utilities for implementing SAFe methodology in Linear,
 * based on the research findings and recommendations.
 */
import { LinearClient, Issue } from '@linear/sdk';
import * as logger from '../utils/logger';

/**
 * Types of Enablers in SAFe
 */
export enum EnablerType {
  ARCHITECTURE = 'Architecture',
  INFRASTRUCTURE = 'Infrastructure',
  TECHNICAL_DEBT = 'Technical Debt',
  RESEARCH = 'Research'
}

/**
 * SAFe hierarchy management utility for Linear
 */
export class SAFeLinearImplementation {
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

      // Get the Epic label ID
      const epicLabelId = await this.getSafeLabelId('Epic');

      // Create the Epic
      const response = await this.linearClient.createIssue({
        teamId,
        title: `[EPIC] ${title}`,
        description,
        labelIds: [...labelIds, epicLabelId]
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
    labels: string[] = [],
    isBusinessFeature: boolean = true
  ): Promise<Issue | null> {
    try {
      // Get label IDs
      const labelIds = await this.getLabelIds(labels);

      // Get the Feature label ID
      const featureLabelId = await this.getSafeLabelId('Feature');

      // Get the Business/Enabler label ID if needed
      let categoryLabelId: string | null = null;
      if (isBusinessFeature) {
        categoryLabelId = await this.getSafeLabelId('Business');
      } else {
        categoryLabelId = await this.getSafeLabelId('Enabler');
      }

      // Create the Feature
      const response = await this.linearClient.createIssue({
        teamId,
        title: `[FEATURE] ${title}`,
        description,
        labelIds: [...labelIds, featureLabelId, ...(categoryLabelId ? [categoryLabelId] : [])],
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
  async createEnabler(
    teamId: string,
    parentId: string | null,
    title: string,
    description: string,
    enablerType: EnablerType,
    labels: string[] = []
  ): Promise<Issue | null> {
    try {
      // Get label IDs
      const labelIds = await this.getLabelIds(labels);

      // Get the Enabler label ID
      const enablerLabelId = await this.getSafeLabelId('Enabler');

      // Get the Enabler Type label ID
      const typeLabelId = await this.getSafeLabelId(enablerType);

      // Create the Enabler
      const response = await this.linearClient.createIssue({
        teamId,
        title: `[ENABLER] ${title}`,
        description,
        labelIds: [...labelIds, enablerLabelId, typeLabelId],
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
   * Creates a Program Increment in Linear using Cycles
   */
  async createProgramIncrement(
    teamId: string,
    name: string,
    startDate: Date,
    endDate: Date,
    description: string = ''
  ) {
    try {
      // Create the Cycle
      const response = await this.linearClient.createCycle({
        teamId,
        name: `PI-${name}`,
        description,
        startsAt: startDate,
        endsAt: endDate
      });

      if (!response.success || !response.cycle) {
        throw new Error('Failed to create Program Increment');
      }

      const cycle = await response.cycle;
      logger.info('Created Program Increment', {
        piId: cycle.id,
        name
      });

      return cycle;
    } catch (error) {
      logger.error('Error creating Program Increment', { error, name });
      throw error;
    }
  }

  /**
   * Assigns features to a Program Increment
   */
  async assignFeaturesToPI(
    piId: string,
    featureIds: string[]
  ) {
    try {
      const results = [];

      for (const featureId of featureIds) {
        const response = await this.linearClient.updateIssue(featureId, {
          cycleId: piId
        });

        if (!response.success) {
          logger.warn(`Failed to assign feature ${featureId} to PI ${piId}`);
        } else {
          const issue = await response.issue;
          results.push(issue);
          logger.info('Assigned feature to PI', { featureId, piId });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error assigning features to PI', { error, piId, featureIds });
      throw error;
    }
  }

  /**
   * Gets all Epics
   */
  async getEpics(teamId: string) {
    try {
      const epicLabelId = await this.getSafeLabelId('Epic');

      const response = await this.linearClient.issues({
        filter: {
          team: { id: { eq: teamId } },
          labels: { id: { eq: epicLabelId } }
        }
      });

      return response.nodes;
    } catch (error) {
      logger.error('Error getting Epics', { error, teamId });
      throw error;
    }
  }

  /**
   * Gets all Features
   */
  async getFeatures(teamId: string) {
    try {
      const featureLabelId = await this.getSafeLabelId('Feature');

      const response = await this.linearClient.issues({
        filter: {
          team: { id: { eq: teamId } },
          labels: { id: { eq: featureLabelId } }
        }
      });

      return response.nodes;
    } catch (error) {
      logger.error('Error getting Features', { error, teamId });
      throw error;
    }
  }

  /**
   * Gets all Enablers
   */
  async getEnablers(teamId: string) {
    try {
      const enablerLabelId = await this.getSafeLabelId('Enabler');

      const response = await this.linearClient.issues({
        filter: {
          team: { id: { eq: teamId } },
          labels: { id: { eq: enablerLabelId } }
        }
      });

      return response.nodes;
    } catch (error) {
      logger.error('Error getting Enablers', { error, teamId });
      throw error;
    }
  }

  /**
   * Gets all Program Increments
   */
  async getProgramIncrements(teamId: string) {
    try {
      const response = await this.linearClient.cycles({
        filter: {
          team: { id: { eq: teamId } },
          name: { startsWith: 'PI-' }
        }
      });

      return response.nodes;
    } catch (error) {
      logger.error('Error getting Program Increments', { error, teamId });
      throw error;
    }
  }

  /**
   * Gets the current Program Increment
   */
  async getCurrentProgramIncrement(teamId: string) {
    try {
      const now = new Date();
      const cycles = await this.linearClient.cycles({
        filter: {
          team: { id: { eq: teamId } },
          name: { startsWith: 'PI-' },
          startsAt: { lte: now },
          endsAt: { gte: now }
        }
      });

      if (cycles.nodes.length === 0) {
        return null;
      }

      return cycles.nodes[0];
    } catch (error) {
      logger.error('Error getting current Program Increment', { error, teamId });
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
   * Gets or creates a SAFe label ID
   */
  private async getSafeLabelId(labelName: string): Promise<string> {
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

      const response = await this.linearClient.createIssueLabel({
        name: labelName,
        color
      });

      if (!response.success || !response.issueLabel) {
        throw new Error(`Failed to create ${labelName} label`);
      }

      return response.issueLabel.id;
    } catch (error) {
      logger.error(`Error getting ${labelName} label ID`, { error });
      throw error;
    }
  }
}
