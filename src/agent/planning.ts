import { LinearClient } from '@linear/sdk';
import { ConfluenceAPI } from '../integrations/confluence';
import * as logger from '../utils/logger';
import { SAFeLinearImplementation } from '../safe/safe_linear_implementation';
import { PIManager } from '../safe/pi-planning';
import { PIExtractor, ParsedElement, DocumentSection } from '../planning/pi-extractor';
import { ProgramIncrement, PIFeature, PIObjective, PIRisk } from '../safe/pi-model';
import { OperationalNotificationCoordinator } from '../utils/operational-notification-coordinator';

/**
 * Planning statistics interface for tracking planning operations
 */
export interface PlanningStatistics {
  planningTitle: string;
  confluencePageUrl: string;
  duration: number;
  epicCount: number;
  featureCount: number;
  storyCount: number;
  enablerCount: number;
  sourceDocument: string;
}

/**
 * PI creation statistics interface for tracking PI planning operations
 */
export interface PICreationStatistics {
  piName: string;
  confluencePageUrl: string;
  duration: number;
  featureCount: number;
  objectiveCount: number;
  riskCount: number;
  sourceDocument: string;
}

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
  private notificationCoordinator: OperationalNotificationCoordinator;

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

    // Initialize operational notification coordinator
    const coordinatorConfig = OperationalNotificationCoordinator.createDefaultConfig(
      (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development'
    );
    this.notificationCoordinator = OperationalNotificationCoordinator.getInstance(coordinatorConfig);
  }

  /**
   * Analyzes a Confluence page and creates Linear issues
   *
   * @param confluencePageUrl - URL of the Confluence page to analyze
   * @param planningTitle - Title for the planning session
   * @returns Result of the planning process
   */
  async planFromConfluence(confluencePageUrl: string, planningTitle: string) {
    const startTime = Date.now();

    try {
      logger.info('Starting planning process', { confluencePageUrl, planningTitle });

      // Send planning start notification
      await this.sendPlanningStartNotification(planningTitle, confluencePageUrl);

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
      const epic = await this.linearClient.createIssue({
        title: planningTitle,
        description: `Epic created from Confluence page: ${confluencePageUrl}`,
        teamId: team.id,
        // Add appropriate labels
        labelIds: []
      });

      if (!epic.success || !epic.issue) {
        throw new Error('Failed to create Epic');
      }

      const issue = await epic.issue;
      logger.info('Created Epic', { epicId: issue.id, title: planningTitle });

      // Collect planning statistics
      const statistics = this.collectPlanningStatistics(
        planningTitle,
        confluencePageUrl,
        startTime,
        confluencePage.title,
        1, // epicCount
        0, // featureCount - placeholder for now
        0, // storyCount - placeholder for now
        0  // enablerCount - placeholder for now
      );

      // Send planning completion notification
      await this.sendPlanningCompletionNotification(statistics);

      return {
        success: true,
        epicId: issue.id,
        message: `Created Epic: ${planningTitle}`
      };
    } catch (error) {
      logger.error('Error in planning process', { error, confluencePageUrl });

      // Send planning failure notification
      await this.sendPlanningFailureNotification(
        error as Error,
        planningTitle,
        confluencePageUrl
      );

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
    const startTime = Date.now();

    try {
      logger.info('Starting PI creation process', { confluencePageUrl, teamId });

      // Send PI planning start notification
      await this.sendPIPlanningStartNotification(confluencePageUrl);

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

      // Collect PI creation statistics
      const piStatistics = this.collectPICreationStatistics(
        pi.name,
        confluencePageUrl,
        startTime,
        confluencePage.title,
        features.length,
        objectives.length,
        risks.length
      );

      // Send PI creation completion notification
      await this.sendPICreationCompletionNotification(piStatistics);

      return pi;
    } catch (error) {
      logger.error('Error creating Program Increment from Confluence', { error, confluencePageUrl });

      // Send PI creation failure notification
      await this.sendPICreationFailureNotification(
        error as Error,
        confluencePageUrl
      );

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

  /**
   * Sends planning start notification
   */
  private async sendPlanningStartNotification(planningTitle: string, confluencePageUrl: string): Promise<void> {
    try {
      await this.notificationCoordinator.notifyWorkflowUpdate(
        'build',
        `Planning Started: ${planningTitle}`,
        `Planning process initiated for "${planningTitle}"`,
        'in-progress',
        confluencePageUrl
      );
    } catch (error) {
      logger.warn('Failed to send planning start notification', { error, planningTitle });
      // Don't throw - notification failures shouldn't affect planning operations
    }
  }

  /**
   * Sends planning completion notification with comprehensive statistics
   */
  private async sendPlanningCompletionNotification(statistics: PlanningStatistics): Promise<void> {
    try {
      await this.notificationCoordinator.notifyPlanningCompletion(
        statistics.planningTitle,
        statistics.epicCount,
        statistics.featureCount,
        statistics.storyCount,
        statistics.enablerCount,
        statistics.duration,
        statistics.sourceDocument,
        statistics.confluencePageUrl
      );
    } catch (error) {
      logger.warn('Failed to send planning completion notification', { error, statistics });
      // Don't throw - notification failures shouldn't affect planning operations
    }
  }

  /**
   * Sends planning failure notification with actionable guidance
   */
  private async sendPlanningFailureNotification(
    error: Error,
    planningTitle: string,
    confluencePageUrl: string
  ): Promise<void> {
    try {
      await this.notificationCoordinator.notifyWorkflowUpdate(
        'build',
        `Planning Failed: ${planningTitle}`,
        `Planning process failed: ${error.message}`,
        'failure',
        confluencePageUrl
      );
    } catch (notificationError) {
      logger.warn('Failed to send planning failure notification', {
        notificationError,
        originalError: error,
        planningTitle
      });
      // Don't throw - notification failures shouldn't affect planning operations
    }
  }

  /**
   * Sends PI planning start notification
   */
  private async sendPIPlanningStartNotification(confluencePageUrl: string): Promise<void> {
    try {
      await this.notificationCoordinator.notifyWorkflowUpdate(
        'build',
        'PI Planning Started',
        'Program Increment planning process initiated',
        'in-progress',
        confluencePageUrl
      );
    } catch (error) {
      logger.warn('Failed to send PI planning start notification', { error, confluencePageUrl });
      // Don't throw - notification failures shouldn't affect planning operations
    }
  }

  /**
   * Sends PI creation completion notification with comprehensive statistics
   */
  private async sendPICreationCompletionNotification(statistics: PICreationStatistics): Promise<void> {
    try {
      // Use workflow notification for PI creation completion
      await this.notificationCoordinator.notifyWorkflowUpdate(
        'deployment',
        `PI Created: ${statistics.piName}`,
        `Program Increment "${statistics.piName}" created successfully with ${statistics.featureCount} features, ${statistics.objectiveCount} objectives, and ${statistics.riskCount} risks. Duration: ${statistics.duration.toFixed(1)} minutes.`,
        'success',
        statistics.confluencePageUrl
      );
    } catch (error) {
      logger.warn('Failed to send PI creation completion notification', { error, statistics });
      // Don't throw - notification failures shouldn't affect planning operations
    }
  }

  /**
   * Sends PI creation failure notification
   */
  private async sendPICreationFailureNotification(
    error: Error,
    confluencePageUrl: string
  ): Promise<void> {
    try {
      await this.notificationCoordinator.notifyWorkflowUpdate(
        'deployment',
        'PI Creation Failed',
        `Program Increment creation failed: ${error.message}`,
        'failure',
        confluencePageUrl
      );
    } catch (notificationError) {
      logger.warn('Failed to send PI creation failure notification', {
        notificationError,
        originalError: error,
        confluencePageUrl
      });
      // Don't throw - notification failures shouldn't affect planning operations
    }
  }

  /**
   * Collects planning statistics for notification
   */
  private collectPlanningStatistics(
    planningTitle: string,
    confluencePageUrl: string,
    startTime: number,
    sourceDocument: string,
    epicCount: number,
    featureCount: number,
    storyCount: number,
    enablerCount: number
  ): PlanningStatistics {
    return {
      planningTitle,
      confluencePageUrl,
      duration: (Date.now() - startTime) / (1000 * 60), // Convert to minutes
      epicCount,
      featureCount,
      storyCount,
      enablerCount,
      sourceDocument
    };
  }

  /**
   * Collects PI creation statistics for notification
   */
  private collectPICreationStatistics(
    piName: string,
    confluencePageUrl: string,
    startTime: number,
    sourceDocument: string,
    featureCount: number,
    objectiveCount: number,
    riskCount: number
  ): PICreationStatistics {
    return {
      piName,
      confluencePageUrl,
      duration: (Date.now() - startTime) / (1000 * 60), // Convert to minutes
      featureCount,
      objectiveCount,
      riskCount,
      sourceDocument
    };
  }
}
