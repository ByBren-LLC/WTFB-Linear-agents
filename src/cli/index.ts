#!/usr/bin/env node

/**
 * Linear Planning Agent CLI
 *
 * This is the main entry point for the Linear Planning Agent CLI.
 */
import { program } from 'commander';
import dotenv from 'dotenv';
import { SyncManager, SyncOptions } from '../sync/sync-manager';
import { getAccessToken, getConfluenceAccessToken, getConfluenceToken } from '../db/models';
import { PlanningExtractor } from '../planning/extractor';
import { ConfluenceClient } from '../confluence/client';
import { LinearIssueCreatorFromPlanning } from '../planning/linear-issue-creator';
import * as logger from '../utils/logger';

// Load environment variables
dotenv.config();

// Define the CLI program
program
  .name('linear-planning-agent')
  .description('CLI for the Linear Planning Agent')
  .version('1.0.0');

// Common options for authentication
const addAuthOptions = (command: any) => {
  return command
    .option('--org-id <id>', 'Linear organization ID')
    .option('--team-id <id>', 'Linear team ID');
};

// Common options for Confluence
const addConfluenceOptions = (command: any) => {
  return command
    .option('--confluence-url <url>', 'Confluence page URL')
    .option('--confluence-id <id>', 'Confluence page ID');
};

// Create a synchronization manager
const createSyncManager = async (options: any): Promise<SyncManager> => {
  const { orgId, teamId, confluenceUrl, confluenceId, interval, autoResolve } = options;

  // Get access tokens
  const linearAccessToken = await getAccessToken(orgId);
  if (!linearAccessToken) {
    throw new Error(`Linear access token not found for organization: ${orgId}`);
  }

  const confluenceAccessToken = await getConfluenceAccessToken(orgId);
  if (!confluenceAccessToken) {
    throw new Error(`Confluence access token not found for organization: ${orgId}`);
  }

  // Get Confluence base URL
  const confluenceToken = await getConfluenceToken(orgId);
  if (!confluenceToken) {
    throw new Error(`Confluence token not found for organization: ${orgId}`);
  }

  const confluenceBaseUrl = confluenceToken.site_url;
  if (!confluenceBaseUrl) {
    throw new Error(`Confluence base URL not found for organization: ${orgId}`);
  }

  // Create synchronization options
  const syncOptions: SyncOptions = {
    linearAccessToken,
    linearTeamId: teamId,
    linearOrganizationId: orgId,
    confluenceAccessToken,
    confluenceBaseUrl,
    confluencePageIdOrUrl: confluenceUrl || confluenceId,
    syncIntervalMs: interval ? parseInt(interval) : 5 * 60 * 1000, // Default: 5 minutes
    autoResolveConflicts: autoResolve === 'true'
  };

  // Create synchronization manager
  return new SyncManager(syncOptions);
};

// Parse command
program
  .command('parse')
  .description('Parse a Confluence document')
  .requiredOption('--confluence-url <url>', 'Confluence page URL')
  .option('--output <format>', 'Output format (json, yaml)', 'json')
  .action(async (options: any) => {
    try {
      // Get Confluence credentials from environment variables
      const username = process.env.CONFLUENCE_USERNAME;
      const apiToken = process.env.CONFLUENCE_API_TOKEN;
      const baseUrl = process.env.CONFLUENCE_BASE_URL;

      if (!username || !apiToken || !baseUrl) {
        console.error('Error: Confluence credentials not found in environment variables');
        process.exit(1);
      }

      // Create Confluence client
      const confluenceClient = new ConfluenceClient(baseUrl, apiToken);

      // Parse the Confluence page
      const document = await confluenceClient.parsePageByUrl(options.confluenceUrl);

      // Extract planning information
      const extractor = new PlanningExtractor(document);
      const planningDocument = extractor.getPlanningDocument();

      // Output the planning document
      if (options.output === 'json') {
        console.log(JSON.stringify(planningDocument, null, 2));
      } else if (options.output === 'yaml') {
        // Simple YAML output
        const yaml = Object.entries(planningDocument)
          .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
          .join('\n');
        console.log(yaml);
      }

      process.exit(0);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

// Create command
program
  .command('create')
  .description('Create Linear issues from a Confluence document')
  .requiredOption('--confluence-url <url>', 'Confluence page URL')
  .requiredOption('--org-id <id>', 'Linear organization ID')
  .requiredOption('--team-id <id>', 'Linear team ID')
  .option('--dry-run', 'Dry run (do not create issues)', false)
  .action(async (options: any) => {
    try {
      // Get access tokens
      const linearAccessToken = await getAccessToken(options.orgId);
      if (!linearAccessToken) {
        throw new Error(`Linear access token not found for organization: ${options.orgId}`);
      }

      const confluenceAccessToken = await getConfluenceAccessToken(options.orgId);
      if (!confluenceAccessToken) {
        throw new Error(`Confluence access token not found for organization: ${options.orgId}`);
      }

      // Create issue creator
      const issueCreator = new LinearIssueCreatorFromPlanning({
        linearAccessToken,
        linearTeamId: options.teamId,
        linearOrganizationId: options.orgId,
        confluenceAccessToken,
        confluenceBaseUrl: process.env.CONFLUENCE_BASE_URL || '',
        confluencePageIdOrUrl: options.confluenceUrl
      });

      // Create issues
      if (options.dryRun) {
        console.log('Dry run - no issues will be created');
        // TODO: Add extractPlanningDocument method to LinearIssueCreatorFromPlanning
        console.log('Dry run mode not yet implemented');
      } else {
        const result = await issueCreator.createIssuesFromConfluence();
        console.log(JSON.stringify(result, null, 2));
      }

      process.exit(0);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

// Sync commands
const syncCommand = program
  .command('sync')
  .description('Synchronize Linear issues with Confluence documents');

// Start synchronization command
addConfluenceOptions(
  addAuthOptions(
    syncCommand
      .command('start')
      .description('Start synchronization')
      .option('--interval <ms>', 'Synchronization interval in milliseconds', '300000')
      .option('--auto-resolve <boolean>', 'Whether to automatically resolve conflicts', 'false')
  )
)
  .action(async (options: any) => {
    try {
      const syncManager = await createSyncManager({
        orgId: options.orgId,
        teamId: options.teamId,
        confluenceUrl: options.confluenceUrl,
        confluenceId: options.confluenceId,
        interval: options.interval,
        autoResolve: options.autoResolve
      });

      await syncManager.start();
      const status = await syncManager.getStatus();

      logger.info('Synchronization started successfully', { status });
      console.log(JSON.stringify({ success: true, status }, null, 2));

      // Keep the process running
      process.stdin.resume();
    } catch (error) {
      logger.error('Error starting synchronization', { error });
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

// Stop synchronization command
addConfluenceOptions(
  addAuthOptions(
    syncCommand
      .command('stop')
      .description('Stop synchronization')
  )
)
  .action(async (options: any) => {
    try {
      const syncManager = await createSyncManager({
        orgId: options.orgId,
        teamId: options.teamId,
        confluenceUrl: options.confluenceUrl,
        confluenceId: options.confluenceId
      });

      syncManager.stop();

      logger.info('Synchronization stopped successfully');
      console.log(JSON.stringify({ success: true, message: 'Synchronization stopped successfully' }, null, 2));
      process.exit(0);
    } catch (error) {
      logger.error('Error stopping synchronization', { error });
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

// Get synchronization status command
addConfluenceOptions(
  addAuthOptions(
    syncCommand
      .command('status')
      .description('Get synchronization status')
  )
)
  .action(async (options: any) => {
    try {
      const syncManager = await createSyncManager({
        orgId: options.orgId,
        teamId: options.teamId,
        confluenceUrl: options.confluenceUrl,
        confluenceId: options.confluenceId
      });

      const status = await syncManager.getStatus();

      logger.info('Synchronization status', { status });
      console.log(JSON.stringify({ success: true, status }, null, 2));
      process.exit(0);
    } catch (error) {
      logger.error('Error getting synchronization status', { error });
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

// Manually trigger synchronization command
addConfluenceOptions(
  addAuthOptions(
    syncCommand
      .command('trigger')
      .description('Manually trigger synchronization')
  )
)
  .action(async (options: any) => {
    try {
      const syncManager = await createSyncManager({
        orgId: options.orgId,
        teamId: options.teamId,
        confluenceUrl: options.confluenceUrl,
        confluenceId: options.confluenceId
      });

      const result = await syncManager.sync();

      logger.info('Synchronization triggered successfully', { result });
      console.log(JSON.stringify({ success: true, result }, null, 2));
      process.exit(0);
    } catch (error) {
      logger.error('Error triggering synchronization', { error });
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

// Parse command-line arguments
program.parse(process.argv);

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
