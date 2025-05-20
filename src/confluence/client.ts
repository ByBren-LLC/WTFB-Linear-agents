/**
 * Confluence API client
 *
 * This module provides a client for interacting with the Confluence API.
 * It handles authentication, rate limiting, and error handling.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as logger from '../utils/logger';
import { RateLimiter } from './rate-limiter';
import { handleConfluenceError } from './error-handler';
import { ConfluenceParser, ConfluenceDocument } from './parser';
import { ContentExtractor } from './content-extractor';
import { StructureAnalyzer, DocumentStructure } from './structure-analyzer';

/**
 * Confluence API client class
 */
export class ConfluenceClient {
  private baseUrl: string;
  private accessToken: string;
  private axiosInstance: AxiosInstance;
  private rateLimiter: RateLimiter;

  /**
   * Creates a new Confluence API client
   *
   * @param baseUrl The base URL of the Confluence instance (e.g., https://your-domain.atlassian.net)
   * @param accessToken The OAuth access token
   */
  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
    this.rateLimiter = new RateLimiter();

    // Create an axios instance with default configuration
    this.axiosInstance = axios.create({
      baseURL: `${this.baseUrl}/wiki/rest/api`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for rate limiting
    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.rateLimiter.acquire();
      return config;
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        throw handleConfluenceError(error);
      }
    );
  }

  /**
   * Gets a Confluence page by ID
   *
   * @param pageId The ID of the page to retrieve
   * @returns The page data
   */
  async getPage(pageId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/content/${pageId}`, {
        params: {
          expand: 'body.storage,version,space'
        }
      });

      logger.info('Retrieved Confluence page', { pageId });
      return response.data;
    } catch (error) {
      logger.error('Error retrieving Confluence page', { error, pageId });
      throw error;
    }
  }

  /**
   * Gets a Confluence page by URL
   *
   * @param url The URL of the page to retrieve
   * @returns The page data
   */
  async getPageByUrl(url: string): Promise<any> {
    try {
      // Extract the page ID from the URL
      const pageId = this.extractPageIdFromUrl(url);
      if (!pageId) {
        throw new Error(`Invalid Confluence URL: ${url}`);
      }

      return await this.getPage(pageId);
    } catch (error) {
      logger.error('Error retrieving Confluence page by URL', { error, url });
      throw error;
    }
  }

  /**
   * Gets attachments for a Confluence page
   *
   * @param pageId The ID of the page
   * @returns The attachments data
   */
  async getAttachments(pageId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/content/${pageId}/child/attachment`, {
        params: {
          expand: 'version'
        }
      });

      logger.info('Retrieved Confluence attachments', { pageId, count: response.data.results.length });
      return response.data;
    } catch (error) {
      logger.error('Error retrieving Confluence attachments', { error, pageId });
      throw error;
    }
  }

  /**
   * Downloads an attachment
   *
   * @param attachmentId The ID of the attachment
   * @returns The attachment binary data
   */
  async downloadAttachment(attachmentId: string): Promise<Buffer> {
    try {
      const response = await this.axiosInstance.get(`/content/${attachmentId}/download`, {
        responseType: 'arraybuffer'
      });

      logger.info('Downloaded Confluence attachment', { attachmentId });
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Error downloading Confluence attachment', { error, attachmentId });
      throw error;
    }
  }

  /**
   * Searches for Confluence content using CQL
   *
   * @param cql The Confluence Query Language (CQL) query
   * @param limit The maximum number of results to return
   * @param start The starting index for pagination
   * @returns The search results
   */
  async search(cql: string, limit: number = 25, start: number = 0): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/content/search', {
        params: {
          cql,
          limit,
          start,
          expand: 'space,version'
        }
      });

      logger.info('Searched Confluence content', {
        cql,
        limit,
        start,
        resultCount: response.data.results.length
      });

      return response.data;
    } catch (error) {
      logger.error('Error searching Confluence content', { error, cql });
      throw error;
    }
  }

  /**
   * Gets the content of a specific space
   *
   * @param spaceKey The key of the space
   * @param limit The maximum number of results to return
   * @param start The starting index for pagination
   * @returns The space content
   */
  async getSpaceContent(spaceKey: string, limit: number = 25, start: number = 0): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/space/${spaceKey}/content`, {
        params: {
          limit,
          start,
          expand: 'version'
        }
      });

      logger.info('Retrieved Confluence space content', {
        spaceKey,
        limit,
        start,
        resultCount: response.data.results.length
      });

      return response.data;
    } catch (error) {
      logger.error('Error retrieving Confluence space content', { error, spaceKey });
      throw error;
    }
  }

  /**
   * Extracts the page ID from a Confluence URL
   *
   * @param url The Confluence URL
   * @returns The page ID or null if not found
   */
  private extractPageIdFromUrl(url: string): string | null {
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
  }

  /**
   * Parses a Confluence page
   *
   * @param pageId The ID of the page to parse
   * @returns The parsed document
   */
  async parsePage(pageId: string): Promise<ConfluenceDocument> {
    try {
      // Get the page data
      const page = await this.getPage(pageId);

      // Parse the page content
      const parser = new ConfluenceParser(page.body.storage.value, page.title);
      const document = parser.parse();

      logger.info('Parsed Confluence page', { pageId });
      return document;
    } catch (error) {
      logger.error('Error parsing Confluence page', { error, pageId });
      throw error;
    }
  }

  /**
   * Parses a Confluence page by URL
   *
   * @param url The URL of the page to parse
   * @returns The parsed document
   */
  async parsePageByUrl(url: string): Promise<ConfluenceDocument> {
    try {
      // Extract the page ID from the URL
      const pageId = this.extractPageIdFromUrl(url);
      if (!pageId) {
        throw new Error(`Invalid Confluence URL: ${url}`);
      }

      return await this.parsePage(pageId);
    } catch (error) {
      logger.error('Error parsing Confluence page by URL', { error, url });
      throw error;
    }
  }

  /**
   * Analyzes the structure of a Confluence page
   *
   * @param pageId The ID of the page to analyze
   * @returns The document structure
   */
  async analyzePageStructure(pageId: string): Promise<DocumentStructure> {
    try {
      // Parse the page
      const document = await this.parsePage(pageId);

      // Analyze the document structure
      const analyzer = new StructureAnalyzer(document);
      const structure = analyzer.analyze();

      logger.info('Analyzed Confluence page structure', { pageId });
      return structure;
    } catch (error) {
      logger.error('Error analyzing Confluence page structure', { error, pageId });
      throw error;
    }
  }

  /**
   * Extracts content from a Confluence page
   *
   * @param pageId The ID of the page to extract content from
   * @returns The content extractor
   */
  async extractPageContent(pageId: string): Promise<ContentExtractor> {
    try {
      // Parse the page
      const document = await this.parsePage(pageId);

      // Create a content extractor
      const extractor = new ContentExtractor(document);

      logger.info('Created content extractor for Confluence page', { pageId });
      return extractor;
    } catch (error) {
      logger.error('Error extracting content from Confluence page', { error, pageId });
      throw error;
    }
  }
}
