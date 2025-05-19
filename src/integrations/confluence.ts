import axios from 'axios';
import * as logger from '../utils/logger';

/**
 * Confluence API integration for fetching documentation
 */
export class ConfluenceAPI {
  private baseUrl: string;
  private auth: {
    username: string;
    password: string;
  };

  constructor() {
    const username = process.env.CONFLUENCE_USERNAME;
    const apiToken = process.env.CONFLUENCE_API_TOKEN;
    const baseUrl = process.env.CONFLUENCE_BASE_URL;

    if (!username || !apiToken || !baseUrl) {
      throw new Error('Missing Confluence API credentials in environment variables');
    }

    this.baseUrl = baseUrl;
    this.auth = {
      username,
      password: apiToken
    };
  }

  /**
   * Fetches a Confluence page by URL
   */
  async getPageByUrl(pageUrl: string) {
    try {
      // Extract page ID from URL
      const pageId = this.extractPageIdFromUrl(pageUrl);
      
      if (!pageId) {
        throw new Error(`Could not extract page ID from URL: ${pageUrl}`);
      }
      
      return this.getPageById(pageId);
    } catch (error) {
      logger.error('Error fetching Confluence page by URL', { error, pageUrl });
      throw error;
    }
  }

  /**
   * Fetches a Confluence page by ID
   */
  async getPageById(pageId: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/rest/api/content/${pageId}`,
        {
          params: {
            expand: 'body.storage,space,version'
          },
          auth: this.auth
        }
      );
      
      return response.data;
    } catch (error) {
      logger.error('Error fetching Confluence page by ID', { error, pageId });
      throw error;
    }
  }

  /**
   * Extracts the page ID from a Confluence URL
   */
  private extractPageIdFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      // Check if this is a Confluence URL
      if (!urlObj.hostname.includes('atlassian.net')) {
        throw new Error('Not a valid Atlassian Confluence URL');
      }
      
      // Extract page ID from path
      // Format: /wiki/spaces/SPACE_KEY/pages/PAGE_ID/PAGE_TITLE
      const pathParts = urlObj.pathname.split('/');
      const pagesIndex = pathParts.indexOf('pages');
      
      if (pagesIndex !== -1 && pagesIndex + 1 < pathParts.length) {
        return pathParts[pagesIndex + 1];
      }
      
      return null;
    } catch (error) {
      logger.error('Error extracting page ID from URL', { error, url });
      return null;
    }
  }
}
