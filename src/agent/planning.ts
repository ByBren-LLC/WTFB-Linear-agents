import { LinearClient } from '@linear/sdk';
import { ConfluenceAPI } from '../integrations/confluence';
import * as logger from '../utils/logger';
import { SAFeLinearImplementation } from '../safe/safe_linear_implementation';
import { PIManager } from '../safe/pi-planning';
import { PIExtractor, ParsedElement, DocumentSection } from '../planning/pi-extractor';
import { ProgramIncrement, PIFeature, PIObjective, PIRisk } from '../safe/pi-model';

/**
 * Planning Agent implementation
 *
 * This agent is responsible for analyzing Confluence documentation
 * and creating properly structured Linear issues following SAFe methodology.
 */
export class PlanningAgent {
  private linearClient: LinearClient;
  private confluenceApi: ConfluenceAPI;
  private safeImplementation: SAFeLinearImplementation;
  private piManager: PIManager;

  /**
   * Creates a new PlanningAgent instance
   *
   * @param accessToken - Linear API access token
   */
  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.confluenceApi = new ConfluenceAPI();
    this.safeImplementation = new SAFeLinearImplementation(accessToken);
    this.piManager = new PIManager(accessToken);
  }

  /**
   * Analyzes a Confluence page and creates Linear issues
   *
   * @param confluencePageUrl - URL of the Confluence page to analyze
   * @param planningTitle - Title for the planning session
   * @returns Result of the planning process
   */
  async planFromConfluence(confluencePageUrl: string, planningTitle: string) {
    try {
      logger.info('Starting planning process', { confluencePageUrl, planningTitle });

      // Fetch the Confluence page
      const confluencePage = await this.confluenceApi.getPageByUrl(confluencePageUrl);

      if (!confluencePage) {
        throw new Error(`Could not fetch Confluence page: ${confluencePageUrl}`);
      }

      logger.info('Fetched Confluence page', {
        pageId: confluencePage.id,
        title: confluencePage.title
      });

      // TODO: Implement the actual planning logic
      // 1. Parse the Confluence page content
      // 2. Identify Epic, Features, Stories, etc.
      // 3. Create the issues in Linear

      // For now, just create a placeholder Epic
      const team = await this.getDefaultTeam();

      if (!team) {
        throw new Error('Could not find a team to create issues in');
      }

      // Create the Epic
      const epic = await this.linearClient.issueCreate({
        title: planningTitle,
        description: `Epic created from Confluence page: ${confluencePageUrl}`,
        teamId: team.id,
        // Add appropriate labels
        labelIds: []
      });

      logger.info('Created Epic', { epicId: epic.issue?.id, title: planningTitle });

      return {
        success: true,
        epicId: epic.issue?.id,
        message: `Created Epic: ${planningTitle}`
      };
    } catch (error) {
      logger.error('Error in planning process', { error, confluencePageUrl });
      throw error;
    }
  }

  /**
   * Creates a Program Increment from a Confluence page
   *
   * @param confluencePageUrl - URL of the Confluence page containing PI information
   * @param teamId - ID of the team the PI belongs to
   * @returns The created Program Increment
   */
  async createProgramIncrementFromConfluence(confluencePageUrl: string, teamId: string): Promise<ProgramIncrement> {
    try {
      logger.info('Starting PI creation process', { confluencePageUrl, teamId });

      // Fetch the Confluence page
      const confluencePage = await this.confluenceApi.getPageByUrl(confluencePageUrl);

      if (!confluencePage) {
        throw new Error(`Could not fetch Confluence page: ${confluencePageUrl}`);
      }

      logger.info('Fetched Confluence page', {
        pageId: confluencePage.id,
        title: confluencePage.title
      });

      // Parse the Confluence page content
      // Note: This is a placeholder. In a real implementation, you would use a proper parser.
      const parsedContent: ParsedElement[] = [
        {
          type: 'heading',
          content: confluencePage.title,
          level: 1
        },
        {
          type: 'paragraph',
          content: confluencePage.body.storage.value
        }
      ];

      // Create document sections
      // Note: This is a placeholder. In a real implementation, you would use a proper structure analyzer.
      const sections: DocumentSection[] = [
        {
          title: confluencePage.title,
          level: 1,
          content: parsedContent,
          subsections: []
        }
      ];

      // Extract PI information
      const piExtractor = new PIExtractor(parsedContent, sections);
      const pis = piExtractor.extractProgramIncrements();

      if (pis.length === 0) {
        throw new Error('No Program Increment information found in the Confluence page');
      }

      // Use the first PI found
      const piInfo = pis[0];

      // Create the PI in Linear
      const pi = await this.piManager.createProgramIncrement(
        teamId,
        piInfo.name,
        piInfo.startDate,
        piInfo.endDate,
        piInfo.description
      );

      logger.info('Created Program Increment', {
        piId: pi.id,
        name: pi.name
      });

      // Extract and create features
      const features = piExtractor.extractPIFeatures(pi.id);

      if (features.length > 0) {
        // Create features in Linear
        for (const featureInfo of features) {
          // Create a feature in Linear
          const feature = await this.safeImplementation.createFeature(
            teamId,
            '', // No epic ID for now
            featureInfo.featureId, // Using the temporary ID as the title
            'Feature extracted from Confluence',
            ['Feature'], // Labels
            true // Business feature
          );

          if (feature) {
            // Assign the feature to the PI
            await this.piManager.assignFeaturesToPI(pi.id, [feature.id]);

            logger.info('Created and assigned feature to PI', {
              piId: pi.id,
              featureId: feature.id
            });
          }
        }
      }

      // Extract and create objectives
      const objectives = piExtractor.extractPIObjectives(pi.id, teamId);

      if (objectives.length > 0) {
        // Create objectives in Linear
        for (const objectiveInfo of objectives) {
          await this.piManager.createPIObjective(
            pi.id,
            teamId,
            objectiveInfo.description,
            objectiveInfo.businessValue,
            objectiveInfo.features
          );

          logger.info('Created PI Objective', {
            piId: pi.id,
            description: objectiveInfo.description
          });
        }
      }

      // Extract and create risks
      const risks = piExtractor.extractPIRisks(pi.id);

      if (risks.length > 0) {
        // Create risks in Linear
        for (const riskInfo of risks) {
          await this.piManager.createPIRisk(
            pi.id,
            teamId,
            riskInfo.description,
            riskInfo.impact,
            riskInfo.likelihood,
            riskInfo.mitigationPlan
          );

          logger.info('Created PI Risk', {
            piId: pi.id,
            description: riskInfo.description
          });
        }
      }

      return pi;
    } catch (error) {
      logger.error('Error creating Program Increment from Confluence', { error, confluencePageUrl });
      throw error;
    }
  }

  /**
   * Gets the default team to create issues in
   *
   * @returns The default team, or null if no teams are found
   */
  private async getDefaultTeam() {
    try {
      const teams = await this.linearClient.teams();

      if (!teams.nodes.length) {
        throw new Error('No teams found in Linear workspace');
      }

      // For now, just use the first team
      // In a real implementation, you might want to specify the team
      return teams.nodes[0];
    } catch (error) {
      logger.error('Error getting default team', { error });
      throw error;
    }
  }
}
