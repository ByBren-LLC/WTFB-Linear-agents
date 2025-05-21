#!/usr/bin/env node

/**
 * CLI for Linear-Confluence synchronization
 *
 * This script provides a command-line interface for managing Linear-Confluence synchronization.
 */
import { program } from 'commander';
import dotenv from 'dotenv';
import { SyncManager, SyncOptions } from '../sync/sync-manager';
import { getAccessToken, getConfluenceAccessToken, getConfluenceToken } from '../db/models';
import * as logger from '../utils/logger';

// Load environment variables
dotenv.config();

// Define common options
const addCommonOptions = (command: any) => {
  return command
    .requiredOption('--org-id <id>', 'Linear organization ID')
    .requiredOption('--team-id <id>', 'Linear team ID')
    .requiredOption('--page-id <id>', 'Confluence page ID or URL');
};

// Create a synchronization manager
const createSyncManager = async (options: any): Promise<SyncManager> => {
  const { orgId, teamId, pageId, interval, autoResolve } = options;

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
    confluencePageIdOrUrl: pageId,
    syncIntervalMs: interval ? parseInt(interval) : 5 * 60 * 1000, // Default: 5 minutes
    autoResolveConflicts: autoResolve === 'true'
  };

  // Create synchronization manager
  return new SyncManager(syncOptions);
};

// Define the CLI program
program
  .name('sync')
  .description('CLI for Linear-Confluence synchronization')
  .version('1.0.0');

// Start synchronization command
addCommonOptions(
  program
    .command('start')
    .description('Start synchronization')
    .option('--interval <ms>', 'Synchronization interval in milliseconds', '300000')
    .option('--auto-resolve <boolean>', 'Whether to automatically resolve conflicts', 'false')
)
  .action(async (options) => {
    try {
      const syncManager = await createSyncManager({
        orgId: options.orgId,
        teamId: options.teamId,
        pageId: options.pageId,
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
addCommonOptions(
  program
    .command('stop')
    .description('Stop synchronization')
)
  .action(async (options) => {
    try {
      const syncManager = await createSyncManager({
        orgId: options.orgId,
        teamId: options.teamId,
        pageId: options.pageId
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
addCommonOptions(
  program
    .command('status')
    .description('Get synchronization status')
)
  .action(async (options) => {
    try {
      const syncManager = await createSyncManager({
        orgId: options.orgId,
        teamId: options.teamId,
        pageId: options.pageId
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
addCommonOptions(
  program
    .command('trigger')
    .description('Manually trigger synchronization')
)
  .action(async (options) => {
    try {
      const syncManager = await createSyncManager({
        orgId: options.orgId,
        teamId: options.teamId,
        pageId: options.pageId
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
