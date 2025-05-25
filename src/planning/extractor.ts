/**
 * Planning information extractor for the Linear Planning Agent.
 * This module extracts planning information from parsed Confluence documents.
 */

import * as logger from '../utils/logger';
import { PlanningDocument, Epic, Feature, Story, Enabler } from './models';
import { identifyPlanningStructure, extractEpicsFromSections, extractFeaturesFromSections, extractStoriesFromSections, extractEnablersFromSections } from './structure-analyzer';
import { buildEpicFeatureRelationships, buildFeatureStoryRelationships, buildFeatureEnablerRelationships } from './relationship-analyzer';

// These interfaces will be imported from the Parse Confluence Documents task
// For now, we'll define them here as placeholders
interface ParsedElement {
  type: string;
  content: string | ParsedElement[];
  attributes?: Record<string, string>;
}

interface DocumentSection {
  title: string;
  level: number;
  content: ParsedElement[];
  subsections: DocumentSection[];
}

/**
 * Extracts planning information from parsed Confluence documents.
 */
export class PlanningExtractor {
  private document: ParsedElement[];
  private sections: DocumentSection[];
  private planningDocument: PlanningDocument;

  /**
   * Creates a new PlanningExtractor.
   * @param document The parsed Confluence document
   * @param sections The document sections
   */
  constructor(document: ParsedElement[], sections: DocumentSection[]) {
    this.document = document;
    this.sections = sections;
    this.planningDocument = this.extractPlanningInformation();
  }

  /**
   * Extracts planning information from the parsed Confluence document.
   * @returns The planning document
   */
  private extractPlanningInformation(): PlanningDocument {
    logger.info('Extracting planning information from document');

    // Identify planning structure
    const { epicSections, featureSections, storySections, enablerSections } =
      identifyPlanningStructure(this.sections);

    // Extract planning items
    const epics = extractEpicsFromSections(epicSections);
    const features = extractFeaturesFromSections(featureSections);
    const stories = extractStoriesFromSections(storySections);
    const enablers = extractEnablersFromSections(enablerSections);

    // Build relationships
    const { epics: epicsWithFeatures, orphanedFeatures } =
      buildEpicFeatureRelationships(epics, features);

    const { features: featuresWithStories, orphanedStories } =
      buildFeatureStoryRelationships([...epicsWithFeatures.flatMap(epic => epic.features), ...orphanedFeatures], stories);

    const { features: featuresWithEnablers, orphanedEnablers } =
      buildFeatureEnablerRelationships([...epicsWithFeatures.flatMap(epic => epic.features), ...orphanedFeatures], enablers);

    // Merge features with stories and enablers
    const mergedFeatures = this.mergeFeatures(featuresWithStories, featuresWithEnablers);

    // Update epics with merged features
    const finalEpics = this.updateEpicsWithFeatures(epicsWithFeatures, mergedFeatures);

    // Get final orphaned features
    const finalOrphanedFeatures = mergedFeatures.filter(feature => !feature.epicId);

    // Create planning document
    return {
      title: this.extractDocumentTitle(),
      epics: finalEpics,
      orphanedFeatures: finalOrphanedFeatures,
      orphanedStories,
      orphanedEnablers
    };
  }

  /**
   * Merges features with stories and enablers.
   * @param featuresWithStories Features with stories
   * @param featuresWithEnablers Features with enablers
   * @returns Merged features
   */
  private mergeFeatures(featuresWithStories: Feature[], featuresWithEnablers: Feature[]): Feature[] {
    const featureMap = new Map<string, Feature>();

    // Add features with stories
    featuresWithStories.forEach(feature => {
      featureMap.set(feature.id, { ...feature, enablers: [] });
    });

    // Merge features with enablers
    featuresWithEnablers.forEach(feature => {
      if (featureMap.has(feature.id)) {
        const existingFeature = featureMap.get(feature.id)!;
        featureMap.set(feature.id, {
          ...existingFeature,
          enablers: feature.enablers
        });
      } else {
        featureMap.set(feature.id, { ...feature, stories: [] });
      }
    });

    return Array.from(featureMap.values());
  }

  /**
   * Updates epics with merged features.
   * @param epics Epics with features
   * @param mergedFeatures Merged features
   * @returns Updated epics
   */
  private updateEpicsWithFeatures(epics: Epic[], mergedFeatures: Feature[]): Epic[] {
    const featureMap = new Map<string, Feature>();

    // Create feature map
    mergedFeatures.forEach(feature => {
      featureMap.set(feature.id, feature);
    });

    // Update epics with merged features
    return epics.map(epic => ({
      ...epic,
      features: epic.features.map(feature => featureMap.get(feature.id)!).filter(Boolean)
    }));
  }

  /**
   * Extracts the document title.
   * @returns The document title
   */
  private extractDocumentTitle(): string {
    // Find the first heading element
    const headingElement = this.document.find(element =>
      element.type === 'heading' &&
      element.attributes?.level === '1'
    );

    if (headingElement && typeof headingElement.content === 'string') {
      return headingElement.content;
    }

    // If no heading is found, return a default title
    return 'Untitled Planning Document';
  }

  /**
   * Gets the planning document.
   * @returns The planning document
   */
  public getPlanningDocument(): PlanningDocument {
    return this.planningDocument;
  }

  /**
   * Gets all epics from the planning document.
   * @returns Array of epics
   */
  public getEpics(): Epic[] {
    return this.planningDocument.epics;
  }

  /**
   * Gets all features from the planning document.
   * @returns Array of features
   */
  public getFeatures(): Feature[] {
    const features: Feature[] = [];

    // Collect features from epics
    this.planningDocument.epics.forEach(epic => {
      features.push(...epic.features);
    });

    // Add orphaned features
    features.push(...(this.planningDocument.orphanedFeatures || []));

    return features;
  }

  /**
   * Gets all stories from the planning document.
   * @returns Array of stories
   */
  public getStories(): Story[] {
    const stories: Story[] = [];

    // Collect stories from features
    this.getFeatures().forEach(feature => {
      stories.push(...feature.stories);
    });

    // Add orphaned stories
    stories.push(...(this.planningDocument.orphanedStories || []));

    return stories;
  }

  /**
   * Gets all enablers from the planning document.
   * @returns Array of enablers
   */
  public getEnablers(): Enabler[] {
    const enablers: Enabler[] = [];

    // Collect enablers from features
    this.getFeatures().forEach(feature => {
      enablers.push(...feature.enablers);
    });

    // Add orphaned enablers
    enablers.push(...(this.planningDocument.orphanedEnablers || []));

    return enablers;
  }
}
