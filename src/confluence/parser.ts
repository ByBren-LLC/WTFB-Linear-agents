/**
 * Confluence document parser
 *
 * This module provides functionality to parse Confluence documents from their storage format (XHTML-based)
 * into a structured format that can be easily processed by the Linear Planning Agent.
 */

import * as cheerio from 'cheerio';
import type { Element as CheerioElement } from 'cheerio';
import * as logger from '../utils/logger';
import {
  parseHeading,
  parseParagraph,
  parseTable,
  parseList,
  parseLink,
  parseImage,
  parseMacro
} from './element-parsers';

/**
 * Represents a parsed element from a Confluence document
 */
export interface ParsedElement {
  /** The type of element (e.g., 'heading', 'paragraph', 'table', etc.) */
  type: string;

  /** The content of the element, either as a string or as nested elements */
  content: string | ParsedElement[];

  /** Optional attributes associated with the element */
  attributes?: Record<string, string>;
}

/**
 * Parser for Confluence documents
 *
 * This class takes Confluence storage format (XHTML-based) and converts it to a structured format
 * that can be easily processed by the Linear Planning Agent.
 */
export class ConfluenceParser {
  /** Cheerio instance for parsing the document */
  private $: cheerio.Root;

  /** Parsed document structure */
  private document: ParsedElement[];

  /**
   * Creates a new ConfluenceParser instance
   *
   * @param storageFormat - The Confluence storage format (XHTML-based) to parse
   */
  constructor(storageFormat: string) {
    try {
      this.$ = cheerio.load(storageFormat, { xmlMode: true });
      this.document = this.parseDocument();
      logger.info('Confluence document parsed successfully');
    } catch (error) {
      logger.error('Failed to parse Confluence document', { error });
      throw new Error('Failed to parse Confluence document: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Parses the entire document
   *
   * @returns An array of parsed elements representing the document structure
   */
  private parseDocument(): ParsedElement[] {
    const result: ParsedElement[] = [];
    const body = this.$('body').first();

    if (!body.length) {
      logger.warn('No body element found in Confluence document');
      return result;
    }

    // Process all child elements of the body
    body.children().each((_, element) => {
      const parsedElement = this.parseElement(element);
      if (parsedElement) {
        result.push(parsedElement);
      }
    });

    return result;
  }

  /**
   * Parses a single element
   *
   * @param element - The element to parse
   * @returns The parsed element, or undefined if the element could not be parsed
   */
  private parseElement(element: CheerioElement): ParsedElement | undefined {
    const tagName = element.tagName?.toLowerCase() || '';

    try {
      // Parse different types of elements
      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return parseHeading(this.$, element);

        case 'p':
          return parseParagraph(this.$, element);

        case 'table':
          return parseTable(this.$, element);

        case 'ul':
        case 'ol':
          return parseList(this.$, element);

        case 'a':
          return parseLink(this.$, element);

        case 'img':
          return parseImage(this.$, element);

        case 'ac:structured-macro':
          return parseMacro(this.$, element);

        case 'div':
        case 'span':
          // For container elements, parse their children
          const children: ParsedElement[] = [];
          this.$(element).children().each((_, child) => {
            const parsedChild = this.parseElement(child);
            if (parsedChild) {
              children.push(parsedChild);
            }
          });

          if (children.length > 0) {
            return {
              type: tagName,
              content: children,
              attributes: this.getElementAttributes(element)
            };
          }

          // If no children were parsed, return the text content
          {
            const divTextContent = this.$(element).text().trim();
            if (divTextContent) {
              return {
                type: tagName,
                content: divTextContent,
                attributes: this.getElementAttributes(element)
              };
            }
          }

          return undefined;

        default:
          // For unknown elements, just return their text content
          {
            const unknownTextContent = this.$(element).text().trim();
            if (unknownTextContent) {
              return {
                type: 'unknown',
                content: unknownTextContent,
                attributes: { originalTag: tagName, ...this.getElementAttributes(element) }
              };
            }
          }
          return undefined;
      }
    } catch (error) {
      logger.error(`Failed to parse element: ${tagName}`, { error });
      return {
        type: 'error',
        content: `Failed to parse ${tagName}: ${error instanceof Error ? error.message : String(error)}`,
        attributes: { originalTag: tagName }
      };
    }
  }

  /**
   * Gets all attributes of an element
   *
   * @param element - The element to get attributes from
   * @returns A record of attribute names and values
   */
  private getElementAttributes(element: CheerioElement): Record<string, string> {
    const attributes: Record<string, string> = {};

    if (element.attribs) {
      Object.entries(element.attribs).forEach(([key, value]) => {
        attributes[key] = String(value);
      });
    }

    return attributes;
  }

  /**
   * Gets all headings in the document
   *
   * @returns An array of parsed heading elements
   */
  getHeadings(): ParsedElement[] {
    return this.findElementsByType(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  }

  /**
   * Gets all paragraphs in the document
   *
   * @returns An array of parsed paragraph elements
   */
  getParagraphs(): ParsedElement[] {
    return this.findElementsByType(['p']);
  }

  /**
   * Gets all tables in the document
   *
   * @returns An array of parsed table elements
   */
  getTables(): ParsedElement[] {
    return this.findElementsByType(['table']);
  }

  /**
   * Gets all lists in the document
   *
   * @returns An array of parsed list elements
   */
  getLists(): ParsedElement[] {
    return this.findElementsByType(['ul', 'ol']);
  }

  /**
   * Gets all links in the document
   *
   * @returns An array of parsed link elements
   */
  getLinks(): ParsedElement[] {
    return this.findElementsByType(['a']);
  }

  /**
   * Gets all images in the document
   *
   * @returns An array of parsed image elements
   */
  getImages(): ParsedElement[] {
    return this.findElementsByType(['img']);
  }

  /**
   * Gets all macros in the document
   *
   * @returns An array of parsed macro elements
   */
  getMacros(): ParsedElement[] {
    return this.findElementsByType(['ac:structured-macro']);
  }

  /**
   * Gets the full content of the document
   *
   * @returns An array of parsed elements representing the document structure
   */
  getFullContent(): ParsedElement[] {
    return this.document;
  }

  /**
   * Finds elements by type
   *
   * @param types - The types of elements to find
   * @returns An array of parsed elements of the specified types
   */
  private findElementsByType(types: string[]): ParsedElement[] {
    const result: ParsedElement[] = [];

    const findInElement = (element: ParsedElement) => {
      if (types.includes(element.type)) {
        result.push(element);
      }

      if (Array.isArray(element.content)) {
        element.content.forEach(findInElement);
      }
    };

    this.document.forEach(findInElement);

    return result;
  }
}
