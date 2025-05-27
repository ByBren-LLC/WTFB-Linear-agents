/**
 * Structure analyzer for planning documents.
 * This module contains functions for analyzing the structure of planning documents.
 */

import * as logger from '../utils/logger';
import { Epic, Feature, Story, Enabler } from './models';
import { isEpicSection, isFeatureSection, isStorySection, isEnablerSection, extractAcceptanceCriteria, extractStoryPoints, extractAttributes, determineEnablerType, extractTextFromElements } from './pattern-recognition';
import { v4 as uuidv4 } from 'uuid';
import { ConfluenceSection } from '../confluence/parser';

/**
 * Identifies planning structure in document sections.
 * @param sections Document sections
 * @returns Object containing sections categorized by planning item type
 */
export const identifyPlanningStructure = (sections: ConfluenceSection[]): {
  epicSections: ConfluenceSection[];
  featureSections: ConfluenceSection[];
  storySections: ConfluenceSection[];
  enablerSections: ConfluenceSection[];
} => {
  logger.info('Identifying planning structure in document');

  const epicSections: ConfluenceSection[] = [];
  const featureSections: ConfluenceSection[] = [];
  const storySections: ConfluenceSection[] = [];
  const enablerSections: ConfluenceSection[] = [];

  // Flatten sections to make it easier to analyze
  const flattenedSections = flattenDocumentStructure(sections);

  // Categorize sections
  flattenedSections.forEach(section => {
    if (isEpicSection(section)) {
      epicSections.push(section);
    } else if (isFeatureSection(section)) {
      featureSections.push(section);
    } else if (isStorySection(section)) {
      storySections.push(section);
    } else if (isEnablerSection(section)) {
      enablerSections.push(section);
    }
  });

  return {
    epicSections,
    featureSections,
    storySections,
    enablerSections
  };
};

/**
 * Flattens document structure.
 * @param sections Document sections
 * @returns Flattened array of document sections
 */
export const flattenDocumentStructure = (sections: ConfluenceSection[]): ConfluenceSection[] => {
  const flattened: ConfluenceSection[] = [];

  const flatten = (section: ConfluenceSection) => {
    flattened.push(section);

    if (section.subsections && section.subsections.length > 0) {
      section.subsections.forEach(flatten);
    }
  };

  sections.forEach(flatten);

  return flattened;
};

/**
 * Extracts epics from document sections.
 * @param sections Document sections
 * @returns Array of epics
 */
export const extractEpicsFromSections = (sections: ConfluenceSection[]): Epic[] => {
  logger.info(`Extracting epics from ${sections.length} sections`);

  return sections.map(section => {
    const description = extractTextFromElements(section.elements);
    const attributes = extractAttributes(section);

    return {
      id: uuidv4(),
      type: 'epic',
      title: section.title,
      description,
      attributes,
      features: []
    };
  });
};

/**
 * Extracts features from document sections.
 * @param sections Document sections
 * @returns Array of features
 */
export const extractFeaturesFromSections = (sections: ConfluenceSection[]): Feature[] => {
  logger.info(`Extracting features from ${sections.length} sections`);

  return sections.map(section => {
    const description = extractTextFromElements(section.elements);
    const attributes = extractAttributes(section);

    return {
      id: uuidv4(),
      type: 'feature',
      title: section.title,
      description,
      attributes,
      stories: [],
      enablers: []
    };
  });
};

/**
 * Extracts stories from document sections.
 * @param sections Document sections
 * @returns Array of stories
 */
export const extractStoriesFromSections = (sections: ConfluenceSection[]): Story[] => {
  logger.info(`Extracting stories from ${sections.length} sections`);

  return sections.map(section => {
    const description = extractTextFromElements(section.elements);
    const acceptanceCriteria = extractAcceptanceCriteria(section);
    const storyPoints = extractStoryPoints(section);
    const attributes = extractAttributes(section);

    return {
      id: uuidv4(),
      type: 'story',
      title: section.title,
      description,
      acceptanceCriteria,
      storyPoints,
      attributes
    };
  });
};

/**
 * Extracts enablers from document sections.
 * @param sections Document sections
 * @returns Array of enablers
 */
export const extractEnablersFromSections = (sections: ConfluenceSection[]): Enabler[] => {
  logger.info(`Extracting enablers from ${sections.length} sections`);

  return sections.map(section => {
    const description = extractTextFromElements(section.elements);
    const enablerType = determineEnablerType(section);
    const attributes = extractAttributes(section);

    return {
      id: uuidv4(),
      type: 'enabler',
      title: section.title,
      description,
      enablerType,
      attributes
    };
  });
};
