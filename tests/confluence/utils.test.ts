import { describe, it, expect } from '@jest/globals';
import * as utils from '../../src/confluence/utils';

describe('Confluence Utils', () => {
  describe('extractPageContent', () => {
    it('should extract text content from a Confluence page', () => {
      const page = {
        body: {
          storage: {
            value: '<p>This is a <strong>test</strong> page.</p>'
          }
        }
      };
      
      const result = utils.extractPageContent(page);
      
      expect(result).toBe('This is a test page.');
    });
    
    it('should handle missing body', () => {
      const page = {};
      
      const result = utils.extractPageContent(page);
      
      expect(result).toBe('');
    });
    
    it('should handle null page', () => {
      const result = utils.extractPageContent(null);
      
      expect(result).toBe('');
    });
  });

  describe('getPageIdFromUrl', () => {
    it('should extract page ID from URL format 1', () => {
      const url = 'https://example.atlassian.net/wiki/spaces/SPACE/pages/123456789';
      
      const result = utils.getPageIdFromUrl(url);
      
      expect(result).toBe('123456789');
    });
    
    it('should extract page ID from URL format 2', () => {
      const url = 'https://example.atlassian.net/wiki/spaces/SPACE/pages/123456789/Page+Title';
      
      const result = utils.getPageIdFromUrl(url);
      
      expect(result).toBe('123456789');
    });
    
    it('should return null for unsupported URL formats', () => {
      const url = 'https://example.atlassian.net/wiki/display/SPACE/Page+Title';
      
      const result = utils.getPageIdFromUrl(url);
      
      expect(result).toBeNull();
    });
    
    it('should handle invalid URLs', () => {
      const url = 'invalid-url';
      
      const result = utils.getPageIdFromUrl(url);
      
      expect(result).toBeNull();
    });
  });

  describe('extractStructuredData', () => {
    it('should extract tables from a Confluence page', () => {
      const page = {
        body: {
          storage: {
            value: `
              <table>
                <thead>
                  <tr>
                    <th>Header 1</th>
                    <th>Header 2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Cell 1</td>
                    <td>Cell 2</td>
                  </tr>
                  <tr>
                    <td>Cell 3</td>
                    <td>Cell 4</td>
                  </tr>
                </tbody>
              </table>
            `
          }
        }
      };
      
      const result = utils.extractStructuredData(page);
      
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].headers).toEqual(['Header 1', 'Header 2']);
      expect(result.tables[0].rows).toHaveLength(2);
      expect(result.tables[0].rows[0]).toEqual(['Cell 1', 'Cell 2']);
      expect(result.tables[0].rows[1]).toEqual(['Cell 3', 'Cell 4']);
    });
    
    it('should extract lists from a Confluence page', () => {
      const page = {
        body: {
          storage: {
            value: `
              <ul>
                <li>Item 1</li>
                <li>Item 2</li>
                <li>Item 3</li>
              </ul>
              <ol>
                <li>Numbered 1</li>
                <li>Numbered 2</li>
              </ol>
            `
          }
        }
      };
      
      const result = utils.extractStructuredData(page);
      
      expect(result.lists).toHaveLength(2);
      expect(result.lists[0].type).toBe('ul');
      expect(result.lists[0].items).toEqual(['Item 1', 'Item 2', 'Item 3']);
      expect(result.lists[1].type).toBe('ol');
      expect(result.lists[1].items).toEqual(['Numbered 1', 'Numbered 2']);
    });
    
    it('should extract headings from a Confluence page', () => {
      const page = {
        body: {
          storage: {
            value: `
              <h1>Heading 1</h1>
              <p>Some text</p>
              <h2>Heading 2</h2>
              <p>More text</p>
              <h3>Heading 3</h3>
            `
          }
        }
      };
      
      const result = utils.extractStructuredData(page);
      
      expect(result.headings).toHaveLength(3);
      expect(result.headings[0]).toEqual({ level: 1, text: 'Heading 1' });
      expect(result.headings[1]).toEqual({ level: 2, text: 'Heading 2' });
      expect(result.headings[2]).toEqual({ level: 3, text: 'Heading 3' });
    });
    
    it('should handle missing body', () => {
      const page = {};
      
      const result = utils.extractStructuredData(page);
      
      expect(result).toEqual({});
    });
  });

  describe('convertToMarkdown', () => {
    it('should convert headings to Markdown', () => {
      const html = '<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>';
      
      const result = utils.convertToMarkdown(html);
      
      expect(result).toContain('# Heading 1');
      expect(result).toContain('## Heading 2');
      expect(result).toContain('### Heading 3');
    });
    
    it('should convert formatting to Markdown', () => {
      const html = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';
      
      const result = utils.convertToMarkdown(html);
      
      expect(result).toContain('**bold**');
      expect(result).toContain('*italic*');
    });
    
    it('should convert links to Markdown', () => {
      const html = '<a href="https://example.com">Example</a>';
      
      const result = utils.convertToMarkdown(html);
      
      expect(result).toContain('[Example](https://example.com)');
    });
    
    it('should convert lists to Markdown', () => {
      const html = `
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
        <ol>
          <li>Numbered 1</li>
          <li>Numbered 2</li>
        </ol>
      `;
      
      const result = utils.convertToMarkdown(html);
      
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
      expect(result).toContain('1. Numbered 1');
      expect(result).toContain('2. Numbered 2');
    });
    
    it('should convert code blocks to Markdown', () => {
      const html = '<pre>function test() {\n  return true;\n}</pre>';
      
      const result = utils.convertToMarkdown(html);
      
      expect(result).toContain('```\nfunction test() {\n  return true;\n}\n```');
    });
    
    it('should convert inline code to Markdown', () => {
      const html = '<p>Use <code>const</code> instead of <code>var</code>.</p>';
      
      const result = utils.convertToMarkdown(html);
      
      expect(result).toContain('`const`');
      expect(result).toContain('`var`');
    });
  });
});
