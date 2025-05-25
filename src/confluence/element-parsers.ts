/**
 * Element parsers for Confluence documents
 *
 * This module provides parsers for different types of elements found in Confluence documents.
 */

import * as cheerio from 'cheerio';
import { Element as CheerioElement } from 'cheerio';
import * as logger from '../utils/logger';
import { ParsedElement } from './parser';

/**
 * Parses a heading element
 *
 * @param $ - The Cheerio instance
 * @param element - The element to parse
 * @returns The parsed heading element
 */
export const parseHeading = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  const tagName = element.tagName?.toLowerCase() || '';
  const level = parseInt(tagName.substring(1), 10);
  const text = $(element).text().trim();

  return {
    type: tagName,
    content: text,
    attributes: {
      level: level.toString(),
      ...getElementAttributes($, element)
    }
  };
};

/**
 * Parses a paragraph element
 *
 * @param $ - The Cheerio instance
 * @param element - The element to parse
 * @returns The parsed paragraph element
 */
export const parseParagraph = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  // Check if the paragraph contains nested elements
  const children = $(element).children();

  if (children.length > 0) {
    const nestedElements: ParsedElement[] = [];

    children.each((_, child) => {
      const childElement = parseNestedElement($, child);
      if (childElement) {
        nestedElements.push(childElement);
      }
    });

    if (nestedElements.length > 0) {
      return {
        type: 'p',
        content: nestedElements,
        attributes: getElementAttributes($, element)
      };
    }
  }

  // If no nested elements, just return the text content
  return {
    type: 'p',
    content: $(element).text().trim(),
    attributes: getElementAttributes($, element)
  };
};

/**
 * Parses a table element
 *
 * @param $ - The Cheerio instance
 * @param element - The element to parse
 * @returns The parsed table element
 */
export const parseTable = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  const rows: ParsedElement[] = [];

  // Parse table headers
  $(element).find('thead tr').each((_, row) => {
    const cells: ParsedElement[] = [];

    $(row).find('th').each((_, cell) => {
      cells.push({
        type: 'th',
        content: $(cell).text().trim(),
        attributes: getElementAttributes($, cell)
      });
    });

    if (cells.length > 0) {
      rows.push({
        type: 'tr',
        content: cells,
        attributes: { isHeader: 'true', ...getElementAttributes($, row) }
      });
    }
  });

  // Parse table body
  $(element).find('tbody tr').each((_, row) => {
    const cells: ParsedElement[] = [];

    $(row).find('td').each((_, cell) => {
      cells.push({
        type: 'td',
        content: $(cell).text().trim(),
        attributes: getElementAttributes($, cell)
      });
    });

    if (cells.length > 0) {
      rows.push({
        type: 'tr',
        content: cells,
        attributes: getElementAttributes($, row)
      });
    }
  });

  return {
    type: 'table',
    content: rows,
    attributes: getElementAttributes($, element)
  };
};

/**
 * Parses a list element
 *
 * @param $ - The Cheerio instance
 * @param element - The element to parse
 * @returns The parsed list element
 */
export const parseList = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  const items: ParsedElement[] = [];

  $(element).find('li').each((_, item) => {
    // Check if the list item contains nested lists
    const nestedLists = $(item).find('ul, ol');

    if (nestedLists.length > 0) {
      const content: ParsedElement[] = [];

      // Add the text content of the list item
      const text = $(item).clone().children('ul, ol').remove().end().text().trim();
      if (text) {
        content.push({
          type: 'text',
          content: text
        });
      }

      // Add the nested lists
      nestedLists.each((_, nestedList) => {
        content.push(parseList($, nestedList));
      });

      items.push({
        type: 'li',
        content,
        attributes: getElementAttributes($, item)
      });
    } else {
      items.push({
        type: 'li',
        content: $(item).text().trim(),
        attributes: getElementAttributes($, item)
      });
    }
  });

  return {
    type: element.tagName?.toLowerCase() || 'ul',
    content: items,
    attributes: getElementAttributes($, element)
  };
};

/**
 * Parses a link element
 *
 * @param $ - The Cheerio instance
 * @param element - The element to parse
 * @returns The parsed link element
 */
export const parseLink = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  return {
    type: 'a',
    content: $(element).text().trim(),
    attributes: {
      href: $(element).attr('href') || '',
      ...getElementAttributes($, element)
    }
  };
};

/**
 * Parses an image element
 *
 * @param $ - The Cheerio instance
 * @param element - The element to parse
 * @returns The parsed image element
 */
export const parseImage = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  return {
    type: 'img',
    content: '',
    attributes: {
      src: $(element).attr('src') || '',
      alt: $(element).attr('alt') || '',
      ...getElementAttributes($, element)
    }
  };
};

/**
 * Parses a Confluence macro element
 *
 * @param $ - The Cheerio instance
 * @param element - The element to parse
 * @returns The parsed macro element
 */
export const parseMacro = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  const macroName = $(element).attr('ac:name') || 'unknown-macro';

  // Parse macro parameters
  const parameters: Record<string, string> = {};
  $(element).find('ac:parameter').each((_, param) => {
    const name = $(param).attr('ac:name') || 'unnamed-param';
    const value = $(param).text().trim();
    parameters[name] = value;
  });

  // Parse macro content
  const macroContent = $(element).find('ac:rich-text-body').text().trim();

  return {
    type: 'macro',
    content: macroContent,
    attributes: {
      name: macroName,
      ...parameters,
      ...getElementAttributes($, element)
    }
  };
};

/**
 * Parses a nested element
 *
 * @param $ - The Cheerio instance
 * @param element - The element to parse
 * @returns The parsed element, or undefined if the element could not be parsed
 */
export const parseNestedElement = ($: cheerio.Root, element: CheerioElement): ParsedElement | undefined => {
  if (!element.tagName) {
    // Text node
    const nodeText = $(element).text().trim();
    if (nodeText) {
      return {
        type: 'text',
        content: nodeText
      };
    }
    return undefined;
  }

  const tagName = element.tagName?.toLowerCase() || '';

  switch (tagName) {
    case 'a':
      return parseLink($, element);

    case 'img':
      return parseImage($, element);

    case 'strong':
    case 'b':
      return {
        type: 'strong',
        content: $(element).text().trim(),
        attributes: getElementAttributes($, element)
      };

    case 'em':
    case 'i':
      return {
        type: 'emphasis',
        content: $(element).text().trim(),
        attributes: getElementAttributes($, element)
      };

    case 'code':
      return {
        type: 'code',
        content: $(element).text().trim(),
        attributes: getElementAttributes($, element)
      };

    case 'span':
    case 'div':
      // For container elements, check if they have nested elements
      const children = $(element).children();

      if (children.length > 0) {
        const nestedElements: ParsedElement[] = [];

        children.each((_, child) => {
          const childElement = parseNestedElement($, child);
          if (childElement) {
            nestedElements.push(childElement);
          }
        });

        if (nestedElements.length > 0) {
          return {
            type: tagName,
            content: nestedElements,
            attributes: getElementAttributes($, element)
          };
        }
      }

      // If no nested elements, just return the text content
      {
        const divTextContent = $(element).text().trim();
        if (divTextContent) {
          return {
            type: tagName,
            content: divTextContent,
            attributes: getElementAttributes($, element)
          };
        }
      }

      return undefined;

    default:
      // For unknown elements, just return their text content
      {
        const unknownTextContent = $(element).text().trim();
        if (unknownTextContent) {
          return {
            type: 'unknown',
            content: unknownTextContent,
            attributes: { originalTag: tagName, ...getElementAttributes($, element) }
          };
        }
      }
      return undefined;
  }
};

/**
 * Gets all attributes of an element
 *
 * @param $ - The Cheerio instance
 * @param element - The element to get attributes from
 * @returns A record of attribute names and values
 */
export const getElementAttributes = ($: cheerio.Root, element: CheerioElement): Record<string, string> => {
  const attributes: Record<string, string> = {};

  if (element.attribs) {
    Object.entries(element.attribs).forEach(([key, value]) => {
      attributes[key] = String(value);
    });
  }

  return attributes;
};
