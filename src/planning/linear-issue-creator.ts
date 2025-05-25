/**
 * Linear Issue Creator from Planning Data
 *
 * This module provides functionality to create Linear issues from planning data.
 */
import { PlanningDocument } from './models';
import { PlanningIssueMapper, MappingResult } from '../linear/planning-issue-mapper';
import { ConfluenceClient } from '../confluence/client';
import { ConfluenceParser } from '../confluence/parser';
import { ContentExtractor } from '../confluence/content-extractor';
import { StructureAnalyzer } from '../confluence/structure-analyzer';
import { PlanningExtractor } from './extractor';
import * as logger from '../utils/logger';

/**
 * Options for creating Linear issues from planning data
 */
export interface LinearIssueCreationOptions {
  /** Linear API access token */
  linearAccessToken: string;
  /** Linear team ID */
  linearTeamId: string;
  /** Linear organization ID */
  linearOrganizationId: string;
  /** Confluence API access token */
  confluenceAccessToken: string;
  /** Confluence base URL */
  confluenceBaseUrl: string;
  /** Confluence page ID or URL */
  confluencePageIdOrUrl: string;
}

/**
 * Result of creating Linear issues from planning data
 */
export interface LinearIssueCreationResult extends MappingResult {
  /** Planning document that was processed */
  planningDocument: PlanningDocument;
}

/**
 * Creates Linear issues from planning data
 */
export class LinearIssueCreatorFromPlanning {
  private planningIssueMapper: PlanningIssueMapper;
  private confluenceClient: ConfluenceClient;
  private options: LinearIssueCreationOptions;

  /**
   * Creates a new LinearIssueCreatorFromPlanning
   *
   * @param options - Options for creating Linear issues from planning data
   */
  constructor(options: LinearIssueCreationOptions) {
    this.options = options;
    this.planningIssueMapper = new PlanningIssueMapper(
      options.linearAccessToken,
      options.linearTeamId,
      options.linearOrganizationId
    );
    this.confluenceClient = new ConfluenceClient(
      options.confluenceBaseUrl,
      options.confluenceAccessToken
    );
  }

  /**
   * Creates Linear issues from planning data in a Confluence page
   *
   * @returns Result of the issue creation process
   */
  async createIssuesFromConfluence(): Promise<LinearIssueCreationResult> {
    try {
      logger.info('Creating Linear issues from Confluence planning data', {
        confluencePageIdOrUrl: this.options.confluencePageIdOrUrl
      });

      // Parse the Confluence page
      const document = await this.parseConfluencePage();

      // Extract planning information
      const planningDocument = await this.extractPlanningInformation(document);

      // Map planning data to Linear issues
      const mappingResult = await this.planningIssueMapper.mapToLinear(planningDocument);

      logger.info('Finished creating Linear issues from Confluence planning data', {
        confluencePageIdOrUrl: this.options.confluencePageIdOrUrl,
        createdCount: mappingResult.createdCount,
        updatedCount: mappingResult.updatedCount,
        errorCount: mappingResult.errorCount
      });

      return {
        ...mappingResult,
        planningDocument
      };
    } catch (error) {
      logger.error('Error creating Linear issues from Confluence planning data', {
        error,
        confluencePageIdOrUrl: this.options.confluencePageIdOrUrl
      });
      throw error;
    }
  }

  /**
   * Creates Linear issues from a planning document
   *
   * @param planningDocument - Planning document containing the SAFe hierarchy
   * @returns Result of the issue creation process
   */
  async createIssuesFromPlanningDocument(planningDocument: PlanningDocument): Promise<LinearIssueCreationResult> {
    try {
      logger.info('Creating Linear issues from planning document', {
        planningDocumentId: planningDocument.id,
        title: planningDocument.title
      });

      // Map planning data to Linear issues
      const mappingResult = await this.planningIssueMapper.mapToLinear(planningDocument);

      logger.info('Finished creating Linear issues from planning document', {
        planningDocumentId: planningDocument.id,
        createdCount: mappingResult.createdCount,
        updatedCount: mappingResult.updatedCount,
        errorCount: mappingResult.errorCount
      });

      return {
        ...mappingResult,
        planningDocument
      };
    } catch (error) {
      logger.error('Error creating Linear issues from planning document', {
        error,
        planningDocumentId: planningDocument.id
      });
      throw error;
    }
  }

  /**
   * Parses a Confluence page
   *
   * @returns The parsed Confluence document
   */
  private async parseConfluencePage(): Promise<any> {
    try {
      // Check if the input is a URL or a page ID
      if (this.options.confluencePageIdOrUrl.startsWith('http')) {
        return await this.confluenceClient.parsePageByUrl(this.options.confluencePageIdOrUrl);
      } else {
        return await this.confluenceClient.parsePage(this.options.confluencePageIdOrUrl);
      }
    } catch (error) {
      logger.error('Error parsing Confluence page', {
        error,
        confluencePageIdOrUrl: this.options.confluencePageIdOrUrl
      });
      throw error;
    }
  }

  /**
   * Extracts planning information from a Confluence document
   *
   * @param document - Parsed Confluence document
   * @returns Planning document containing the SAFe hierarchy
   */
  private async extractPlanningInformation(document: any): Promise<PlanningDocument> {
    try {
      // Create a planning extractor
      const sections: any[] = []; // TODO: Extract sections from document
      const extractor = new PlanningExtractor(document.elements || [], sections);

      // Extract planning information
      const planningDocument = extractor.getPlanningDocument();

      logger.info('Extracted planning information', {
        title: planningDocument.title,
        epicCount: planningDocument.epics.length,
        featureCount: planningDocument.features?.length || 0,
        storyCount: planningDocument.stories?.length || 0,
        enablerCount: planningDocument.enablers?.length || 0
      });

      return planningDocument;
    } catch (error) {
      logger.error('Error extracting planning information', { error });
      throw error;
    }
  }
}
