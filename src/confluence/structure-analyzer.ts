/**
 * Confluence Document Structure Analyzer
 *
 * This module provides utilities for analyzing the structure of Confluence documents.
 */

import * as logger from '../utils/logger';
import { ConfluenceDocument, ConfluenceElement, ConfluenceElementType, ConfluenceSection } from './parser';

/**
 * Interface for a document structure
 */
export interface DocumentStructure {
  title: string;
  sections: SectionStructure[];
  metadata: Record<string, any>;
}

/**
 * Interface for a section structure
 */
export interface SectionStructure {
  id: string;
  title: string;
  level: number;
  path: string[];
  content: string;
  subsections: SectionStructure[];
  elements: {
    paragraphs: number;
    lists: number;
    tables: number;
    macros: number;
    code: number;
    links: number;
    images: number;
  };
}

/**
 * Confluence document structure analyzer class
 */
export class StructureAnalyzer {
  private document: ConfluenceDocument;

  /**
   * Creates a new structure analyzer
   *
   * @param document The parsed Confluence document
   */
  constructor(document: ConfluenceDocument) {
    this.document = document;
  }

  /**
   * Analyzes the document structure
   *
   * @returns The document structure
   */
  analyze(): DocumentStructure {
    try {
      return {
        title: this.document.title,
        sections: this.analyzeSections(this.document.sections, []),
        metadata: this.document.metadata
      };
    } catch (error) {
      logger.error('Error analyzing document structure', { error });
      throw error;
    }
  }

  /**
   * Analyzes sections
   *
   * @param sections The sections to analyze
   * @param parentPath The parent section path
   * @returns The section structures
   */
  private analyzeSections(sections: ConfluenceSection[], parentPath: string[]): SectionStructure[] {
    return sections.map(section => this.analyzeSection(section, parentPath));
  }

  /**
   * Analyzes a section
   *
   * @param section The section to analyze
   * @param parentPath The parent section path
   * @returns The section structure
   */
  private analyzeSection(section: ConfluenceSection, parentPath: string[]): SectionStructure {
    const path = [...parentPath, section.title];
    
    // Count elements by type
    const elementCounts = this.countElementTypes(section.elements);
    
    // Extract section content
    const content = this.extractSectionContent(section);
    
    // Analyze subsections
    const subsections = this.analyzeSections(section.subsections, path);
    
    return {
      id: section.id,
      title: section.title,
      level: section.level,
      path,
      content,
      subsections,
      elements: {
        paragraphs: elementCounts.paragraph || 0,
        lists: elementCounts.list || 0,
        tables: elementCounts.table || 0,
        macros: elementCounts.macro || 0,
        code: elementCounts.code || 0,
        links: elementCounts.link || 0,
        images: elementCounts.image || 0
      }
    };
  }

  /**
   * Counts element types in a section
   *
   * @param elements The elements to count
   * @returns The element counts by type
   */
  private countElementTypes(elements: ConfluenceElement[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const element of elements) {
      // Get the element type without the ConfluenceElementType. prefix
      const type = element.type.toString().toLowerCase();
      
      // Increment the count for this type
      counts[type] = (counts[type] || 0) + 1;
      
      // Count child elements
      if (element.children && element.children.length > 0) {
        const childCounts = this.countElementTypes(element.children);
        
        // Merge child counts
        for (const [childType, childCount] of Object.entries(childCounts)) {
          counts[childType] = (counts[childType] || 0) + childCount;
        }
      }
    }
    
    return counts;
  }

  /**
   * Extracts content from a section
   *
   * @param section The section to extract content from
   * @returns The section content
   */
  private extractSectionContent(section: ConfluenceSection): string {
    return section.elements
      .map(element => this.extractElementContent(element))
      .filter(content => content)
      .join('\n');
  }

  /**
   * Extracts content from an element
   *
   * @param element The element to extract content from
   * @returns The element content
   */
  private extractElementContent(element: ConfluenceElement): string {
    if (!element) {
      return '';
    }

    // If the element has content, return it
    if (element.content) {
      return element.content;
    }

    // If the element has children, extract content from them
    if (element.children && element.children.length > 0) {
      return element.children
        .map(child => this.extractElementContent(child))
        .filter(content => content)
        .join('\n');
    }

    return '';
  }

  /**
   * Gets the table of contents for the document
   *
   * @param minLevel The minimum heading level to include (1-6)
   * @param maxLevel The maximum heading level to include (1-6)
   * @returns The table of contents
   */
  getTableOfContents(minLevel: number = 1, maxLevel: number = 6): SectionStructure[] {
    try {
      // Filter sections by level
      const filterSections = (sections: SectionStructure[]): SectionStructure[] => {
        return sections
          .filter(section => section.level >= minLevel && section.level <= maxLevel)
          .map(section => ({
            ...section,
            subsections: filterSections(section.subsections)
          }));
      };

      const structure = this.analyze();
      return filterSections(structure.sections);
    } catch (error) {
      logger.error('Error generating table of contents', { error });
      return [];
    }
  }

  /**
   * Gets the section hierarchy as a flat list
   *
   * @returns The flat section list
   */
  getFlatSectionList(): SectionStructure[] {
    try {
      const flatList: SectionStructure[] = [];
      
      // Recursively flatten the section hierarchy
      const flattenSections = (sections: SectionStructure[]): void => {
        for (const section of sections) {
          flatList.push(section);
          flattenSections(section.subsections);
        }
      };
      
      const structure = this.analyze();
      flattenSections(structure.sections);
      
      return flatList;
    } catch (error) {
      logger.error('Error generating flat section list', { error });
      return [];
    }
  }

  /**
   * Finds a section by ID
   *
   * @param sectionId The section ID to find
   * @returns The found section or null if not found
   */
  findSectionById(sectionId: string): SectionStructure | null {
    try {
      // Get the flat section list
      const sections = this.getFlatSectionList();
      
      // Find the section with the matching ID
      return sections.find(section => section.id === sectionId) || null;
    } catch (error) {
      logger.error('Error finding section by ID', { error, sectionId });
      return null;
    }
  }

  /**
   * Finds sections by title
   *
   * @param title The section title to find
   * @param exactMatch Whether to require an exact match
   * @returns The found sections
   */
  findSectionsByTitle(title: string, exactMatch: boolean = true): SectionStructure[] {
    try {
      // Get the flat section list
      const sections = this.getFlatSectionList();
      
      // Find sections with matching titles
      if (exactMatch) {
        return sections.filter(section => section.title === title);
      } else {
        const lowerTitle = title.toLowerCase();
        return sections.filter(section => section.title.toLowerCase().includes(lowerTitle));
      }
    } catch (error) {
      logger.error('Error finding sections by title', { error, title });
      return [];
    }
  }

  /**
   * Gets the section path as a string
   *
   * @param section The section
   * @param separator The path separator
   * @returns The section path
   */
  getSectionPath(section: SectionStructure, separator: string = ' > '): string {
    return section.path.join(separator);
  }
}
