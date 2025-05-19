import { LinearClient } from '@linear/sdk';
import { ConfluenceAPI } from '../integrations/confluence';
import * as logger from '../utils/logger';

/**
 * Planning Agent implementation
 * 
 * This agent is responsible for analyzing Confluence documentation
 * and creating properly structured Linear issues following SAFe methodology.
 */
export class PlanningAgent {
  private linearClient: LinearClient;
  private confluenceApi: ConfluenceAPI;
  
  constructor(accessToken: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.confluenceApi = new ConfluenceAPI();
  }
  
  /**
   * Analyzes a Confluence page and creates Linear issues
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
      // 1. Analyze the Confluence page content
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
   * Gets the default team to create issues in
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
