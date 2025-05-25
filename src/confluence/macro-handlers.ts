/**
 * Handlers for Confluence macros
 *
 * This module provides handlers for common Confluence macros.
 */

import * as cheerio from 'cheerio';
import type { Element as CheerioElement } from 'cheerio';
import * as logger from '../utils/logger';
import { ParsedElement } from './parser';

/**
 * Handles an info macro
 *
 * @param $ - The Cheerio instance
 * @param element - The macro element
 * @returns The parsed macro element
 */
export const handleInfoMacro = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  const title = $(element).find('ac:parameter[ac:name="title"]').text().trim();
  const content = $(element).find('ac:rich-text-body').text().trim();

  return {
    type: 'macro',
    content,
    attributes: {
      name: 'info',
      title,
      ...getElementAttributes($, element)
    }
  };
};

/**
 * Handles a note macro
 *
 * @param $ - The Cheerio instance
 * @param element - The macro element
 * @returns The parsed macro element
 */
export const handleNoteMacro = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  const title = $(element).find('ac:parameter[ac:name="title"]').text().trim();
  const content = $(element).find('ac:rich-text-body').text().trim();

  return {
    type: 'macro',
    content,
    attributes: {
      name: 'note',
      title,
      ...getElementAttributes($, element)
    }
  };
};

/**
 * Handles a warning macro
 *
 * @param $ - The Cheerio instance
 * @param element - The macro element
 * @returns The parsed macro element
 */
export const handleWarningMacro = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  const title = $(element).find('ac:parameter[ac:name="title"]').text().trim();
  const content = $(element).find('ac:rich-text-body').text().trim();

  return {
    type: 'macro',
    content,
    attributes: {
      name: 'warning',
      title,
      ...getElementAttributes($, element)
    }
  };
};

/**
 * Handles a code macro
 *
 * @param $ - The Cheerio instance
 * @param element - The macro element
 * @returns The parsed macro element
 */
export const handleCodeMacro = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  const language = $(element).find('ac:parameter[ac:name="language"]').text().trim();
  const content = $(element).find('ac:plain-text-body').text().trim();

  return {
    type: 'macro',
    content,
    attributes: {
      name: 'code',
      language,
      ...getElementAttributes($, element)
    }
  };
};

/**
 * Handles a table of contents macro
 *
 * @param $ - The Cheerio instance
 * @param element - The macro element
 * @returns The parsed macro element
 */
export const handleTableOfContentsMacro = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  const minLevel = $(element).find('ac:parameter[ac:name="minLevel"]').text().trim();
  const maxLevel = $(element).find('ac:parameter[ac:name="maxLevel"]').text().trim();

  return {
    type: 'macro',
    content: '',
    attributes: {
      name: 'toc',
      minLevel: minLevel || '1',
      maxLevel: maxLevel || '7',
      ...getElementAttributes($, element)
    }
  };
};

/**
 * Handles a status macro
 *
 * @param $ - The Cheerio instance
 * @param element - The macro element
 * @returns The parsed macro element
 */
export const handleStatusMacro = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  const color = $(element).find('ac:parameter[ac:name="color"]').text().trim();
  const title = $(element).find('ac:parameter[ac:name="title"]').text().trim();
  const content = $(element).find('ac:rich-text-body').text().trim();

  return {
    type: 'macro',
    content: content || title,
    attributes: {
      name: 'status',
      color,
      title,
      ...getElementAttributes($, element)
    }
  };
};

/**
 * Handles an expand macro
 *
 * @param $ - The Cheerio instance
 * @param element - The macro element
 * @returns The parsed macro element
 */
export const handleExpandMacro = ($: cheerio.Root, element: CheerioElement): ParsedElement => {
  const title = $(element).find('ac:parameter[ac:name="title"]').text().trim();
  const content = $(element).find('ac:rich-text-body').text().trim();

  return {
    type: 'macro',
    content,
    attributes: {
      name: 'expand',
      title,
      ...getElementAttributes($, element)
    }
  };
};

/**
 * Gets all attributes of an element
 *
 * @param $ - The Cheerio instance
 * @param element - The element to get attributes from
 * @returns A record of attribute names and values
 */
const getElementAttributes = ($: cheerio.Root, element: CheerioElement): Record<string, string> => {
  const attributes: Record<string, string> = {};

  if (element.attribs) {
    Object.entries(element.attribs).forEach(([key, value]) => {
      attributes[key] = String(value);
    });
  }

  return attributes;
};
