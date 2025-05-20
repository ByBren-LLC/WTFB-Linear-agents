/**
 * Confluence utility functions
 *
 * This module provides utility functions for working with Confluence content.
 */

import * as logger from '../utils/logger';
import { JSDOM } from 'jsdom';

/**
 * Extracts the text content from a Confluence page
 *
 * @param page The Confluence page object
 * @returns The text content of the page
 */
export const extractPageContent = (page: any): string => {
  try {
    if (!page || !page.body || !page.body.storage || !page.body.storage.value) {
      return '';
    }

    const htmlContent = page.body.storage.value;
    
    // Use JSDOM to parse the HTML and extract text
    const dom = new JSDOM(htmlContent);
    const textContent = dom.window.document.body.textContent || '';
    
    return textContent.trim();
  } catch (error) {
    logger.error('Error extracting page content', { error });
    return '';
  }
};

/**
 * Extracts the page ID from a Confluence URL
 *
 * @param url The Confluence URL
 * @returns The page ID or null if not found
 */
export const getPageIdFromUrl = (url: string): string | null => {
  try {
    // Handle different URL formats
    // Format 1: https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789
    const pageIdMatch = url.match(/\/pages\/(\d+)/);
    if (pageIdMatch && pageIdMatch[1]) {
      return pageIdMatch[1];
    }

    // Format 2: https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789/Page+Title
    const pageIdTitleMatch = url.match(/\/pages\/(\d+)\//);
    if (pageIdTitleMatch && pageIdTitleMatch[1]) {
      return pageIdTitleMatch[1];
    }

    // Format 3: https://your-domain.atlassian.net/wiki/display/SPACE/Page+Title
    // For this format, we need to search by title, which is not implemented here
    
    return null;
  } catch (error) {
    logger.error('Error extracting page ID from URL', { error, url });
    return null;
  }
};

/**
 * Extracts structured data from a Confluence page
 *
 * This function extracts tables, lists, and other structured data from a Confluence page.
 *
 * @param page The Confluence page object
 * @returns An object containing the structured data
 */
export const extractStructuredData = (page: any): any => {
  try {
    if (!page || !page.body || !page.body.storage || !page.body.storage.value) {
      return {};
    }

    const htmlContent = page.body.storage.value;
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Extract tables
    const tables: any[] = [];
    document.querySelectorAll('table').forEach((table, tableIndex) => {
      const tableData: any = {
        headers: [],
        rows: []
      };
      
      // Extract table headers
      table.querySelectorAll('th').forEach(th => {
        tableData.headers.push(th.textContent?.trim() || '');
      });
      
      // Extract table rows
      table.querySelectorAll('tr').forEach(tr => {
        const rowData: string[] = [];
        tr.querySelectorAll('td').forEach(td => {
          rowData.push(td.textContent?.trim() || '');
        });
        
        if (rowData.length > 0) {
          tableData.rows.push(rowData);
        }
      });
      
      tables.push(tableData);
    });
    
    // Extract lists
    const lists: any[] = [];
    document.querySelectorAll('ul, ol').forEach((list, listIndex) => {
      const listItems: string[] = [];
      list.querySelectorAll('li').forEach(li => {
        listItems.push(li.textContent?.trim() || '');
      });
      
      lists.push({
        type: list.tagName.toLowerCase(),
        items: listItems
      });
    });
    
    // Extract headings
    const headings: any[] = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      headings.push({
        level: parseInt(heading.tagName.substring(1), 10),
        text: heading.textContent?.trim() || ''
      });
    });
    
    return {
      tables,
      lists,
      headings
    };
  } catch (error) {
    logger.error('Error extracting structured data', { error });
    return {};
  }
};

/**
 * Converts Confluence storage format to Markdown
 *
 * @param storageFormat The Confluence storage format HTML
 * @returns The Markdown representation
 */
export const convertToMarkdown = (storageFormat: string): string => {
  try {
    // This is a simplified conversion. For a more complete conversion,
    // consider using a library like turndown.js
    
    const dom = new JSDOM(storageFormat);
    const document = dom.window.document;
    
    // Replace headings
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      const level = parseInt(heading.tagName.substring(1), 10);
      const text = heading.textContent?.trim() || '';
      const markdown = `${'#'.repeat(level)} ${text}`;
      
      const newElement = document.createElement('div');
      newElement.textContent = markdown;
      heading.replaceWith(newElement);
    });
    
    // Replace bold text
    document.querySelectorAll('b, strong').forEach(bold => {
      const text = bold.textContent?.trim() || '';
      const markdown = `**${text}**`;
      
      const newElement = document.createElement('span');
      newElement.textContent = markdown;
      bold.replaceWith(newElement);
    });
    
    // Replace italic text
    document.querySelectorAll('i, em').forEach(italic => {
      const text = italic.textContent?.trim() || '';
      const markdown = `*${text}*`;
      
      const newElement = document.createElement('span');
      newElement.textContent = markdown;
      italic.replaceWith(newElement);
    });
    
    // Replace links
    document.querySelectorAll('a').forEach(link => {
      const text = link.textContent?.trim() || '';
      const href = link.getAttribute('href') || '';
      const markdown = `[${text}](${href})`;
      
      const newElement = document.createElement('span');
      newElement.textContent = markdown;
      link.replaceWith(newElement);
    });
    
    // Replace unordered lists
    document.querySelectorAll('ul').forEach(ul => {
      const items: string[] = [];
      ul.querySelectorAll('li').forEach(li => {
        items.push(`- ${li.textContent?.trim() || ''}`);
      });
      
      const markdown = items.join('\n');
      const newElement = document.createElement('div');
      newElement.textContent = markdown;
      ul.replaceWith(newElement);
    });
    
    // Replace ordered lists
    document.querySelectorAll('ol').forEach(ol => {
      const items: string[] = [];
      ol.querySelectorAll('li').forEach((li, index) => {
        items.push(`${index + 1}. ${li.textContent?.trim() || ''}`);
      });
      
      const markdown = items.join('\n');
      const newElement = document.createElement('div');
      newElement.textContent = markdown;
      ol.replaceWith(newElement);
    });
    
    // Replace code blocks
    document.querySelectorAll('pre').forEach(pre => {
      const text = pre.textContent?.trim() || '';
      const markdown = `\`\`\`\n${text}\n\`\`\``;
      
      const newElement = document.createElement('div');
      newElement.textContent = markdown;
      pre.replaceWith(newElement);
    });
    
    // Replace inline code
    document.querySelectorAll('code').forEach(code => {
      const text = code.textContent?.trim() || '';
      const markdown = `\`${text}\``;
      
      const newElement = document.createElement('span');
      newElement.textContent = markdown;
      code.replaceWith(newElement);
    });
    
    // Get the final text content
    const markdown = document.body.textContent?.trim() || '';
    
    return markdown;
  } catch (error) {
    logger.error('Error converting to Markdown', { error });
    return storageFormat;
  }
};
