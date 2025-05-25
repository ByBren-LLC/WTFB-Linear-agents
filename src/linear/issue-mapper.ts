/**
 * Issue mapper for Linear issues
 *
 * This module provides functions to map planning information to Linear issues.
 * It handles conversion of attributes, labels, and other metadata.
 */

import { CompatibleIssueCreateInput as IssueCreateInput, CompatibleIssueUpdateInput as IssueUpdateInput } from './compatibility-layer';
import { Epic, Feature, Story, Enabler } from '../planning/models';
import { EnablerType } from '../safe/safe_linear_implementation';

/**
 * Maps an Epic to a Linear issue create input
 *
 * @param epic The Epic to map
 * @param teamId The Linear team ID
 * @returns The Linear issue create input
 */
export const mapEpicToIssueInput = async (
  epic: Epic,
  teamId: string,
  labelIds: string[] = []
): Promise<IssueCreateInput> => {
  // Map attributes to labels if any
  const attributeLabels = epic.attributes ? await mapAttributesToLabels(epic.attributes) : [];

  return {
    teamId,
    title: `[EPIC] ${epic.title}`,
    description: epic.description,
    labelIds: [...labelIds, ...attributeLabels],
    priority: mapPriorityToLinear(epic.attributes?.priority)
  };
};

/**
 * Maps a Feature to a Linear issue create input
 *
 * @param feature The Feature to map
 * @param teamId The Linear team ID
 * @param epicId The parent Epic ID (optional)
 * @returns The Linear issue create input
 */
export const mapFeatureToIssueInput = async (
  feature: Feature,
  teamId: string,
  epicId?: string,
  labelIds: string[] = []
): Promise<IssueCreateInput> => {
  // Map attributes to labels if any
  const attributeLabels = feature.attributes ? await mapAttributesToLabels(feature.attributes) : [];

  return {
    teamId,
    title: `[FEATURE] ${feature.title}`,
    description: feature.description,
    labelIds: [...labelIds, ...attributeLabels],
    priority: mapPriorityToLinear(feature.attributes?.priority),
    estimate: mapStoryPointsToEstimate(feature.storyPoints),
    ...(epicId ? { parentId: epicId } : {})
  };
};

/**
 * Maps a Story to a Linear issue create input
 *
 * @param story The Story to map
 * @param teamId The Linear team ID
 * @param featureId The parent Feature ID (optional)
 * @returns The Linear issue create input
 */
export const mapStoryToIssueInput = async (
  story: Story,
  teamId: string,
  featureId?: string,
  labelIds: string[] = []
): Promise<IssueCreateInput> => {
  // Map attributes to labels if any
  const attributeLabels = story.attributes ? await mapAttributesToLabels(story.attributes) : [];

  // Format acceptance criteria if present
  let description = story.description;
  if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
    description += '\n\n## Acceptance Criteria\n';
    story.acceptanceCriteria.forEach(criteria => {
      description += `- [ ] ${criteria}\n`;
    });
  }

  return {
    teamId,
    title: story.title,
    description,
    labelIds: [...labelIds, ...attributeLabels],
    priority: mapPriorityToLinear(story.attributes?.priority),
    estimate: mapStoryPointsToEstimate(story.storyPoints),
    ...(featureId ? { parentId: featureId } : {})
  };
};

/**
 * Maps an Enabler to a Linear issue create input
 *
 * @param enabler The Enabler to map
 * @param teamId The Linear team ID
 * @param featureId The parent Feature ID (optional)
 * @returns The Linear issue create input
 */
export const mapEnablerToIssueInput = async (
  enabler: Enabler,
  teamId: string,
  featureId?: string,
  labelIds: string[] = []
): Promise<IssueCreateInput> => {
  // Map attributes to labels if any
  const attributeLabels = enabler.attributes ? await mapAttributesToLabels(enabler.attributes) : [];

  return {
    teamId,
    title: `[ENABLER] ${enabler.title}`,
    description: enabler.description,
    labelIds: [...labelIds, ...attributeLabels],
    priority: mapPriorityToLinear(enabler.attributes?.priority),
    estimate: mapStoryPointsToEstimate(enabler.storyPoints),
    ...(featureId ? { parentId: featureId } : {})
  };
};

/**
 * Maps attributes to Linear label IDs
 *
 * @param attributes The attributes to map
 * @returns Array of label IDs
 */
export const mapAttributesToLabels = async (attributes: Record<string, any>): Promise<string[]> => {
  // This is a placeholder. In a real implementation, this would query Linear for existing labels
  // or create new ones based on the attributes.
  return [];
};

/**
 * Maps story points to Linear estimate
 *
 * @param storyPoints The story points to map
 * @returns The Linear estimate value
 */
export const mapStoryPointsToEstimate = (storyPoints?: number): number | undefined => {
  if (storyPoints === undefined) {
    return undefined;
  }

  // Linear estimates are typically 1, 2, 3, 5, 8, 13
  // Map story points to the closest Linear estimate
  const linearEstimates = [1, 2, 3, 5, 8, 13];

  // Find the closest estimate
  return linearEstimates.reduce((prev, curr) => {
    return (Math.abs(curr - storyPoints) < Math.abs(prev - storyPoints) ? curr : prev);
  });
};

/**
 * Maps priority string to Linear priority number
 *
 * @param priority The priority string
 * @returns The Linear priority number
 */
export const mapPriorityToLinear = (priority?: string): number | undefined => {
  if (!priority) {
    return undefined;
  }

  // Linear priorities: 0 (none), 1 (urgent), 2 (high), 3 (medium), 4 (low)
  switch (priority.toLowerCase()) {
    case 'urgent':
    case 'critical':
      return 1;
    case 'high':
      return 2;
    case 'medium':
    case 'normal':
      return 3;
    case 'low':
      return 4;
    default:
      return undefined;
  }
};

/**
 * Maps enabler type string to SAFe EnablerType
 *
 * @param type The enabler type string
 * @returns The SAFe EnablerType
 */
export const mapEnablerTypeToSAFe = (type?: string): EnablerType => {
  if (!type) {
    return EnablerType.TECHNICAL_DEBT;
  }

  switch (type.toLowerCase()) {
    case 'architecture':
    case 'architectural':
      return EnablerType.ARCHITECTURE;
    case 'infrastructure':
      return EnablerType.INFRASTRUCTURE;
    case 'technical debt':
    case 'debt':
      return EnablerType.TECHNICAL_DEBT;
    case 'research':
    case 'exploration':
    case 'spike':
      return EnablerType.RESEARCH;
    default:
      return EnablerType.TECHNICAL_DEBT;
  }
};
