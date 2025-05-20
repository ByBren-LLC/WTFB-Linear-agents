/**
 * Structure analyzer for planning documents.
 * This module contains functions for analyzing the structure of planning documents.
 */

import * as logger from '../utils/logger';
import { Epic, Feature, Story, Enabler } from './models';
import { isEpicSection, isFeatureSection, isStorySection, isEnablerSection, extractAcceptanceCriteria, extractStoryPoints, extractAttributes, determineEnablerType, extractTextFromElements } from './pattern-recognition';
import { v4 as uuidv4 } from 'uuid';

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
 * Identifies planning structure in document sections.
 * @param sections Document sections
 * @returns Object containing sections categorized by planning item type
 */
export const identifyPlanningStructure = (sections: DocumentSection[]): {
  epicSections: DocumentSection[];
  featureSections: DocumentSection[];
  storySections: DocumentSection[];
  enablerSections: DocumentSection[];
} => {
  logger.info('Identifying planning structure in document');
  
  const epicSections: DocumentSection[] = [];
  const featureSections: DocumentSection[] = [];
  const storySections: DocumentSection[] = [];
  const enablerSections: DocumentSection[] = [];
  
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
export const flattenDocumentStructure = (sections: DocumentSection[]): DocumentSection[] => {
  const flattened: DocumentSection[] = [];
  
  const flatten = (section: DocumentSection) => {
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
export const extractEpicsFromSections = (sections: DocumentSection[]): Epic[] => {
  logger.info(`Extracting epics from ${sections.length} sections`);
  
  return sections.map(section => {
    const description = extractTextFromElements(section.content);
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
export const extractFeaturesFromSections = (sections: DocumentSection[]): Feature[] => {
  logger.info(`Extracting features from ${sections.length} sections`);
  
  return sections.map(section => {
    const description = extractTextFromElements(section.content);
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
export const extractStoriesFromSections = (sections: DocumentSection[]): Story[] => {
  logger.info(`Extracting stories from ${sections.length} sections`);
  
  return sections.map(section => {
    const description = extractTextFromElements(section.content);
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
export const extractEnablersFromSections = (sections: DocumentSection[]): Enabler[] => {
  logger.info(`Extracting enablers from ${sections.length} sections`);
  
  return sections.map(section => {
    const description = extractTextFromElements(section.content);
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
