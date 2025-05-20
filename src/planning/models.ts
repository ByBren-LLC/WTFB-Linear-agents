/**
 * Planning information models
 * 
 * This module defines the data models for planning information extracted from Confluence documents.
 * These models represent the SAFe hierarchy and are used to create Linear issues.
 */

/**
 * Base interface for all planning items
 */
export interface PlanningItem {
  /** Unique identifier for the item */
  id: string;
  /** Title of the item */
  title: string;
  /** Description of the item */
  description: string;
  /** Additional attributes for the item */
  attributes?: Record<string, any>;
}

/**
 * Epic in SAFe hierarchy
 */
export interface Epic extends PlanningItem {
  /** Features contained in this epic */
  features?: Feature[];
}

/**
 * Feature in SAFe hierarchy
 */
export interface Feature extends PlanningItem {
  /** Epic ID this feature belongs to */
  epicId?: string;
  /** Whether this is a business feature (true) or enabler feature (false) */
  isBusinessFeature?: boolean;
  /** Story points estimate */
  storyPoints?: number;
  /** Stories contained in this feature */
  stories?: Story[];
  /** Enablers contained in this feature */
  enablers?: Enabler[];
}

/**
 * Story in SAFe hierarchy
 */
export interface Story extends PlanningItem {
  /** Feature ID this story belongs to */
  featureId?: string;
  /** Story points estimate */
  storyPoints?: number;
  /** Acceptance criteria */
  acceptanceCriteria?: string[];
}

/**
 * Enabler in SAFe hierarchy
 */
export interface Enabler extends PlanningItem {
  /** Feature ID this enabler belongs to */
  featureId?: string;
  /** Type of enabler */
  enablerType: string;
  /** Story points estimate */
  storyPoints?: number;
}

/**
 * Planning document containing all planning items
 */
export interface PlanningDocument {
  /** Document ID */
  id: string;
  /** Document title */
  title: string;
  /** Document description */
  description: string;
  /** Epics in the document */
  epics: Epic[];
  /** Features not associated with epics */
  features?: Feature[];
  /** Stories not associated with features */
  stories?: Story[];
  /** Enablers not associated with features */
  enablers?: Enabler[];
  /** Additional metadata */
  metadata?: Record<string, any>;
}
