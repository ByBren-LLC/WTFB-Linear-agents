/**
 * Planning information models for the Linear Planning Agent.
 * These models represent the planning information extracted from Confluence documents.
 */

/**
 * Base interface for all planning items.
 */
export interface PlanningItem {
  /** Unique identifier for the planning item */
  id: string;
  /** Type of planning item */
  type: 'epic' | 'feature' | 'story' | 'enabler';
  /** Title of the planning item */
  title: string;
  /** Description of the planning item */
  description: string;
  /** ID of the parent planning item (if any) */
  parentId?: string;
  /** Additional attributes for the planning item */
  attributes: Record<string, any>;
}

/**
 * Epic planning item.
 * An epic is a large body of work that can be broken down into features.
 */
export interface Epic extends PlanningItem {
  /** Type of planning item (always 'epic' for Epic) */
  type: 'epic';
  /** Features contained within this epic */
  features: Feature[];
}

/**
 * Feature planning item.
 * A feature is a service that fulfills a stakeholder need.
 */
export interface Feature extends PlanningItem {
  /** Type of planning item (always 'feature' for Feature) */
  type: 'feature';
  /** ID of the epic that contains this feature (if any) */
  epicId?: string;
  /** Stories contained within this feature */
  stories: Story[];
  /** Enablers contained within this feature */
  enablers: Enabler[];
}

/**
 * Story planning item.
 * A story is a short description of a small piece of desired functionality.
 */
export interface Story extends PlanningItem {
  /** Type of planning item (always 'story' for Story) */
  type: 'story';
  /** ID of the feature that contains this story (if any) */
  featureId?: string;
  /** Acceptance criteria for the story */
  acceptanceCriteria: string[];
  /** Story points (effort estimate) for the story */
  storyPoints?: number;
}

/**
 * Enabler planning item.
 * An enabler supports the activities needed to extend the Architectural Runway.
 */
export interface Enabler extends PlanningItem {
  /** Type of planning item (always 'enabler' for Enabler) */
  type: 'enabler';
  /** ID of the feature that contains this enabler (if any) */
  featureId?: string;
  /** Type of enabler */
  enablerType: 'architecture' | 'infrastructure' | 'technical_debt' | 'research';
}

/**
 * Planning document containing all planning items.
 */
export interface PlanningDocument {
  /** Title of the planning document */
  title: string;
  /** Epics contained in the document */
  epics: Epic[];
  /** Features not associated with any epic */
  orphanedFeatures: Feature[];
  /** Stories not associated with any feature */
  orphanedStories: Story[];
  /** Enablers not associated with any feature */
  orphanedEnablers: Enabler[];
}
