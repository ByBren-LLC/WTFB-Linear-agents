/**
 * Planning Information Models
 * 
 * This module defines the data models for planning information extracted from Confluence.
 * These models represent the SAFe hierarchy: Epics, Features, Stories, and Enablers.
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
  /** Labels associated with the item */
  labels?: string[];
}

/**
 * Epic in SAFe hierarchy
 */
export interface Epic extends PlanningItem {
  /** Features associated with this Epic */
  features?: string[];
}

/**
 * Feature in SAFe hierarchy
 */
export interface Feature extends PlanningItem {
  /** Parent Epic ID */
  epicId?: string;
  /** Stories associated with this Feature */
  stories?: string[];
  /** Enablers associated with this Feature */
  enablers?: string[];
  /** Whether this is a business feature (true) or enabler feature (false) */
  isBusinessFeature?: boolean;
}

/**
 * Story in SAFe hierarchy
 */
export interface Story extends PlanningItem {
  /** Parent Feature ID */
  featureId?: string;
  /** Acceptance criteria for the story */
  acceptanceCriteria?: string[];
}

/**
 * Enabler in SAFe hierarchy
 */
export interface Enabler extends PlanningItem {
  /** Parent Feature ID */
  featureId?: string;
  /** Type of enabler */
  enablerType: 'Architecture' | 'Infrastructure' | 'Technical Debt' | 'Research';
}

/**
 * Complete planning document containing all SAFe items
 */
export interface PlanningDocument {
  /** Unique identifier for the planning document */
  id: string;
  /** Title of the planning document */
  title: string;
  /** Epics in the planning document */
  epics: Epic[];
  /** Features in the planning document */
  features: Feature[];
  /** Stories in the planning document */
  stories: Story[];
  /** Enablers in the planning document */
  enablers: Enabler[];
}
