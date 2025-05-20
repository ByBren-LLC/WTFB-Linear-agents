/**
 * Confluence Content Extractor
 *
 * This module provides utilities for extracting content from parsed Confluence documents.
 */

import * as logger from '../utils/logger';
import { ConfluenceDocument, ConfluenceElement, ConfluenceElementType, ConfluenceSection } from './parser';

/**
 * Interface for search options
 */
export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  includeHeadings?: boolean;
  includeParagraphs?: boolean;
  includeLists?: boolean;
  includeTables?: boolean;
  includeMacros?: boolean;
}

/**
 * Interface for search result
 */
export interface SearchResult {
  element: ConfluenceElement;
  section?: ConfluenceSection;
  matches: string[];
}

/**
 * Confluence content extractor class
 */
export class ContentExtractor {
  private document: ConfluenceDocument;

  /**
   * Creates a new content extractor
   *
   * @param document The parsed Confluence document
   */
  constructor(document: ConfluenceDocument) {
    this.document = document;
  }

  /**
   * Extracts all text content from the document
   *
   * @returns The extracted text content
   */
  extractText(): string {
    try {
      return this.extractTextFromElements(this.document.elements);
    } catch (error) {
      logger.error('Error extracting text from document', { error });
      return '';
    }
  }

  /**
   * Extracts text content from elements
   *
   * @param elements The elements to extract text from
   * @returns The extracted text content
   */
  private extractTextFromElements(elements: ConfluenceElement[]): string {
    return elements
      .map(element => this.extractTextFromElement(element))
      .filter(text => text)
      .join('\n');
  }

  /**
   * Extracts text content from an element
   *
   * @param element The element to extract text from
   * @returns The extracted text content
   */
  private extractTextFromElement(element: ConfluenceElement): string {
    if (!element) {
      return '';
    }

    // If the element has content, return it
    if (element.content) {
      return element.content;
    }

    // If the element has children, extract text from them
    if (element.children && element.children.length > 0) {
      return this.extractTextFromElements(element.children);
    }

    return '';
  }

  /**
   * Extracts all headings from the document
   *
   * @param minLevel The minimum heading level to include (1-6)
   * @param maxLevel The maximum heading level to include (1-6)
   * @returns The extracted headings
   */
  extractHeadings(minLevel: number = 1, maxLevel: number = 6): ConfluenceElement[] {
    try {
      return this.filterElements(this.document.elements, element => {
        return (
          element.type === ConfluenceElementType.HEADING &&
          element.attributes?.level >= minLevel &&
          element.attributes?.level <= maxLevel
        );
      });
    } catch (error) {
      logger.error('Error extracting headings from document', { error });
      return [];
    }
  }

  /**
   * Extracts all paragraphs from the document
   *
   * @returns The extracted paragraphs
   */
  extractParagraphs(): ConfluenceElement[] {
    try {
      return this.filterElements(this.document.elements, element => {
        return element.type === ConfluenceElementType.PARAGRAPH;
      });
    } catch (error) {
      logger.error('Error extracting paragraphs from document', { error });
      return [];
    }
  }

  /**
   * Extracts all lists from the document
   *
   * @returns The extracted lists
   */
  extractLists(): ConfluenceElement[] {
    try {
      return this.filterElements(this.document.elements, element => {
        return element.type === ConfluenceElementType.LIST;
      });
    } catch (error) {
      logger.error('Error extracting lists from document', { error });
      return [];
    }
  }

  /**
   * Extracts all tables from the document
   *
   * @returns The extracted tables
   */
  extractTables(): ConfluenceElement[] {
    try {
      return this.filterElements(this.document.elements, element => {
        return element.type === ConfluenceElementType.TABLE;
      });
    } catch (error) {
      logger.error('Error extracting tables from document', { error });
      return [];
    }
  }

  /**
   * Extracts all macros from the document
   *
   * @param macroName Optional macro name to filter by
   * @returns The extracted macros
   */
  extractMacros(macroName?: string): ConfluenceElement[] {
    try {
      return this.filterElements(this.document.elements, element => {
        return (
          element.type === ConfluenceElementType.MACRO &&
          (!macroName || element.attributes?.name === macroName)
        );
      });
    } catch (error) {
      logger.error('Error extracting macros from document', { error });
      return [];
    }
  }

  /**
   * Searches for text in the document
   *
   * @param searchText The text to search for
   * @param options Search options
   * @returns The search results
   */
  search(searchText: string, options: SearchOptions = {}): SearchResult[] {
    try {
      const results: SearchResult[] = [];
      const defaultOptions: SearchOptions = {
        caseSensitive: false,
        wholeWord: false,
        includeHeadings: true,
        includeParagraphs: true,
        includeLists: true,
        includeTables: true,
        includeMacros: true
      };

      const mergedOptions = { ...defaultOptions, ...options };
      const regex = this.createSearchRegex(searchText, mergedOptions);

      // Search in each section
      for (const section of this.document.sections) {
        this.searchInSection(section, regex, mergedOptions, results);
      }

      return results;
    } catch (error) {
      logger.error('Error searching in document', { error, searchText });
      return [];
    }
  }

  /**
   * Searches for text in a section
   *
   * @param section The section to search in
   * @param regex The search regex
   * @param options Search options
   * @param results The search results array to populate
   */
  private searchInSection(
    section: ConfluenceSection,
    regex: RegExp,
    options: SearchOptions,
    results: SearchResult[]
  ): void {
    // Search in section elements
    for (const element of section.elements) {
      const elementResults = this.searchInElement(element, regex, options);
      if (elementResults.length > 0) {
        results.push({
          element,
          section,
          matches: elementResults
        });
      }
    }

    // Search in subsections
    for (const subsection of section.subsections) {
      this.searchInSection(subsection, regex, options, results);
    }
  }

  /**
   * Searches for text in an element
   *
   * @param element The element to search in
   * @param regex The search regex
   * @param options Search options
   * @returns The matches found
   */
  private searchInElement(
    element: ConfluenceElement,
    regex: RegExp,
    options: SearchOptions
  ): string[] {
    const matches: string[] = [];

    // Check if we should search in this element type
    if (
      (element.type === ConfluenceElementType.HEADING && !options.includeHeadings) ||
      (element.type === ConfluenceElementType.PARAGRAPH && !options.includeParagraphs) ||
      (element.type === ConfluenceElementType.LIST && !options.includeLists) ||
      (element.type === ConfluenceElementType.TABLE && !options.includeTables) ||
      (element.type === ConfluenceElementType.MACRO && !options.includeMacros)
    ) {
      return matches;
    }

    // Search in element content
    if (element.content) {
      const contentMatches = element.content.match(regex);
      if (contentMatches) {
        matches.push(...contentMatches);
      }
    }

    // Search in element children
    if (element.children && element.children.length > 0) {
      for (const child of element.children) {
        const childMatches = this.searchInElement(child, regex, options);
        if (childMatches.length > 0) {
          matches.push(...childMatches);
        }
      }
    }

    return matches;
  }

  /**
   * Creates a search regex
   *
   * @param searchText The text to search for
   * @param options Search options
   * @returns The search regex
   */
  private createSearchRegex(searchText: string, options: SearchOptions): RegExp {
    let pattern = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special characters

    if (options.wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    return new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
  }

  /**
   * Filters elements recursively
   *
   * @param elements The elements to filter
   * @param predicate The filter predicate
   * @returns The filtered elements
   */
  private filterElements(
    elements: ConfluenceElement[],
    predicate: (element: ConfluenceElement) => boolean
  ): ConfluenceElement[] {
    const result: ConfluenceElement[] = [];

    for (const element of elements) {
      if (predicate(element)) {
        result.push(element);
      }

      if (element.children && element.children.length > 0) {
        result.push(...this.filterElements(element.children, predicate));
      }
    }

    return result;
  }
}
