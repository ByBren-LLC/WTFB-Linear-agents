/**
 * Confluence Macro Handlers
 *
 * This module provides handlers for common Confluence macros.
 */

import * as logger from '../utils/logger';
import { ConfluenceElement, ConfluenceElementType } from './parser';

/**
 * Interface for a macro handler
 */
export interface MacroHandler {
  /**
   * Handles a macro element
   *
   * @param element The macro element
   * @returns The processed element or null if the macro is not supported
   */
  handle(element: ConfluenceElement): ConfluenceElement | null;
}

/**
 * Handler for the info macro
 */
export class InfoMacroHandler implements MacroHandler {
  handle(element: ConfluenceElement): ConfluenceElement | null {
    if (element.type !== ConfluenceElementType.MACRO || element.attributes?.name !== 'info') {
      return null;
    }

    return {
      type: ConfluenceElementType.SECTION,
      content: element.content,
      attributes: {
        type: 'info',
        title: element.attributes?.parameters?.title || 'Info'
      }
    };
  }
}

/**
 * Handler for the note macro
 */
export class NoteMacroHandler implements MacroHandler {
  handle(element: ConfluenceElement): ConfluenceElement | null {
    if (element.type !== ConfluenceElementType.MACRO || element.attributes?.name !== 'note') {
      return null;
    }

    return {
      type: ConfluenceElementType.SECTION,
      content: element.content,
      attributes: {
        type: 'note',
        title: element.attributes?.parameters?.title || 'Note'
      }
    };
  }
}

/**
 * Handler for the warning macro
 */
export class WarningMacroHandler implements MacroHandler {
  handle(element: ConfluenceElement): ConfluenceElement | null {
    if (element.type !== ConfluenceElementType.MACRO || element.attributes?.name !== 'warning') {
      return null;
    }

    return {
      type: ConfluenceElementType.SECTION,
      content: element.content,
      attributes: {
        type: 'warning',
        title: element.attributes?.parameters?.title || 'Warning'
      }
    };
  }
}

/**
 * Handler for the code macro
 */
export class CodeMacroHandler implements MacroHandler {
  handle(element: ConfluenceElement): ConfluenceElement | null {
    if (element.type !== ConfluenceElementType.MACRO || element.attributes?.name !== 'code') {
      return null;
    }

    return {
      type: ConfluenceElementType.CODE,
      content: element.content,
      attributes: {
        isBlock: true,
        language: element.attributes?.parameters?.language || ''
      }
    };
  }
}

/**
 * Handler for the table of contents macro
 */
export class TocMacroHandler implements MacroHandler {
  handle(element: ConfluenceElement): ConfluenceElement | null {
    if (
      element.type !== ConfluenceElementType.MACRO ||
      (element.attributes?.name !== 'toc' && element.attributes?.name !== 'table-of-contents')
    ) {
      return null;
    }

    return {
      type: ConfluenceElementType.SECTION,
      attributes: {
        type: 'toc',
        minLevel: parseInt(element.attributes?.parameters?.minLevel || '1', 10),
        maxLevel: parseInt(element.attributes?.parameters?.maxLevel || '7', 10)
      }
    };
  }
}

/**
 * Handler for the status macro
 */
export class StatusMacroHandler implements MacroHandler {
  handle(element: ConfluenceElement): ConfluenceElement | null {
    if (element.type !== ConfluenceElementType.MACRO || element.attributes?.name !== 'status') {
      return null;
    }

    return {
      type: ConfluenceElementType.SECTION,
      content: element.content,
      attributes: {
        type: 'status',
        color: element.attributes?.parameters?.color || '',
        title: element.attributes?.parameters?.title || 'Status'
      }
    };
  }
}

/**
 * Handler for the expand macro
 */
export class ExpandMacroHandler implements MacroHandler {
  handle(element: ConfluenceElement): ConfluenceElement | null {
    if (element.type !== ConfluenceElementType.MACRO || element.attributes?.name !== 'expand') {
      return null;
    }

    return {
      type: ConfluenceElementType.SECTION,
      content: element.content,
      attributes: {
        type: 'expand',
        title: element.attributes?.parameters?.title || 'Click to expand...'
      }
    };
  }
}

/**
 * Handler for the panel macro
 */
export class PanelMacroHandler implements MacroHandler {
  handle(element: ConfluenceElement): ConfluenceElement | null {
    if (element.type !== ConfluenceElementType.MACRO || element.attributes?.name !== 'panel') {
      return null;
    }

    return {
      type: ConfluenceElementType.SECTION,
      content: element.content,
      attributes: {
        type: 'panel',
        title: element.attributes?.parameters?.title || '',
        borderStyle: element.attributes?.parameters?.borderStyle || 'solid',
        borderColor: element.attributes?.parameters?.borderColor || '#ccc',
        borderWidth: element.attributes?.parameters?.borderWidth || '1px',
        backgroundColor: element.attributes?.parameters?.bgColor || 'transparent'
      }
    };
  }
}

/**
 * Handler for the jira macro
 */
export class JiraMacroHandler implements MacroHandler {
  handle(element: ConfluenceElement): ConfluenceElement | null {
    if (element.type !== ConfluenceElementType.MACRO || element.attributes?.name !== 'jira') {
      return null;
    }

    return {
      type: ConfluenceElementType.SECTION,
      attributes: {
        type: 'jira',
        server: element.attributes?.parameters?.server || '',
        key: element.attributes?.parameters?.key || '',
        columns: element.attributes?.parameters?.columns || 'key,summary,type,created,updated,due,assignee,reporter,priority,status,resolution',
        maximumIssues: parseInt(element.attributes?.parameters?.maximumIssues || '20', 10),
        jqlQuery: element.attributes?.parameters?.jqlQuery || ''
      }
    };
  }
}

/**
 * Composite macro handler that delegates to specific handlers
 */
export class CompositeMacroHandler implements MacroHandler {
  private handlers: MacroHandler[] = [];

  constructor() {
    // Register all macro handlers
    this.handlers.push(new InfoMacroHandler());
    this.handlers.push(new NoteMacroHandler());
    this.handlers.push(new WarningMacroHandler());
    this.handlers.push(new CodeMacroHandler());
    this.handlers.push(new TocMacroHandler());
    this.handlers.push(new StatusMacroHandler());
    this.handlers.push(new ExpandMacroHandler());
    this.handlers.push(new PanelMacroHandler());
    this.handlers.push(new JiraMacroHandler());
  }

  handle(element: ConfluenceElement): ConfluenceElement | null {
    if (element.type !== ConfluenceElementType.MACRO) {
      return null;
    }

    // Try each handler
    for (const handler of this.handlers) {
      const result = handler.handle(element);
      if (result) {
        return result;
      }
    }

    // If no handler processed the macro, return a generic representation
    logger.warn('Unhandled Confluence macro', { macroName: element.attributes?.name });
    return {
      type: ConfluenceElementType.SECTION,
      content: element.content,
      attributes: {
        type: 'macro',
        name: element.attributes?.name || 'unknown',
        parameters: element.attributes?.parameters || {}
      }
    };
  }
}
