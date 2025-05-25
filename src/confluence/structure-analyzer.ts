/**
 * Document structure analyzer for Confluence documents
 * 
 * This module provides functionality to analyze the structure of Confluence documents,
 * identifying sections, subsections, and hierarchical relationships.
 */

import * as logger from '../utils/logger';
import { ParsedElement } from './parser';

/**
 * Represents a section in a document
 */
export interface DocumentSection {
  /** The title of the section */
  title: string;
  
  /** The heading level of the section (1-6) */
  level: number;
  
  /** The content elements of the section */
  content: ParsedElement[];
  
  /** Subsections within this section */
  subsections: DocumentSection[];
}

/**
 * Analyzes the structure of a document
 * 
 * @param document - The parsed document elements
 * @returns An array of document sections
 */
export const analyzeDocumentStructure = (document: ParsedElement[]): DocumentSection[] => {
  try {
    // Find all headings in the document
    const headings = document.filter(element => 
      element.type.startsWith('h') && 
      element.type.length === 2 && 
      !isNaN(parseInt(element.type.charAt(1), 10))
    );
    
    if (headings.length === 0) {
      logger.warn('No headings found in document');
      return [{
        title: 'Document',
        level: 0,
        content: document,
        subsections: []
      }];
    }
    
    // Create sections based on headings
    const sections: DocumentSection[] = [];
    let currentSection: DocumentSection | null = null;
    let currentLevel = 0;
    
    // Create a map of elements by their index in the document
    const elementIndexMap = new Map<ParsedElement, number>();
    document.forEach((element, index) => {
      elementIndexMap.set(element, index);
    });
    
    // Sort headings by their position in the document
    headings.sort((a, b) => {
      const indexA = elementIndexMap.get(a) || 0;
      const indexB = elementIndexMap.get(b) || 0;
      return indexA - indexB;
    });
    
    // Process each heading
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const headingLevel = parseInt(heading.type.charAt(1), 10);
      const headingTitle = typeof heading.content === 'string' ? heading.content : '';
      
      // Find the content between this heading and the next heading
      const headingIndex = elementIndexMap.get(heading) || 0;
      const nextHeadingIndex = i < headings.length - 1 ? 
        elementIndexMap.get(headings[i + 1]) || document.length : 
        document.length;
      
      const sectionContent = document.slice(headingIndex + 1, nextHeadingIndex);
      
      // Create a new section
      const newSection: DocumentSection = {
        title: headingTitle,
        level: headingLevel,
        content: sectionContent,
        subsections: []
      };
      
      // Add the section to the appropriate parent
      if (currentSection === null || headingLevel <= currentLevel) {
        // This is a top-level section or a sibling of the current section
        sections.push(newSection);
        currentSection = newSection;
        currentLevel = headingLevel;
      } else {
        // This is a subsection of the current section
        let parent = currentSection;
        
        // Find the appropriate parent section based on heading level
        while (parent.subsections.length > 0 && parent.subsections[parent.subsections.length - 1].level < headingLevel) {
          parent = parent.subsections[parent.subsections.length - 1];
        }
        
        parent.subsections.push(newSection);
        currentSection = newSection;
        currentLevel = headingLevel;
      }
    }
    
    return sections;
  } catch (error) {
    logger.error('Failed to analyze document structure', { error });
    return [{
      title: 'Document',
      level: 0,
      content: document,
      subsections: []
    }];
  }
};

/**
 * Flattens a hierarchical document structure into a flat array of sections
 * 
 * @param sections - The hierarchical document sections
 * @returns A flat array of document sections
 */
export const flattenDocumentStructure = (sections: DocumentSection[]): DocumentSection[] => {
  const result: DocumentSection[] = [];
  
  const flatten = (section: DocumentSection) => {
    result.push(section);
    
    section.subsections.forEach(subsection => {
      flatten(subsection);
    });
  };
  
  sections.forEach(section => {
    flatten(section);
  });
  
  return result;
};
