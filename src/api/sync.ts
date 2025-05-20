/**
 * Synchronization API
 *
 * This module provides API endpoints for synchronizing Linear issues with Confluence documents.
 */
import express from 'express';
import { SyncManager, SyncOptions, SyncResult } from '../sync/sync-manager';
import { getAccessToken } from '../db/models';
import { getConfluenceAccessToken } from '../db/models';
import * as logger from '../utils/logger';

const router = express.Router();

/**
 * Start synchronization
 *
 * POST /api/sync/start
 */
router.post('/start', async (req, res) => {
  try {
    const { organizationId, linearTeamId, confluencePageIdOrUrl, syncIntervalMs, autoResolveConflicts } = req.body;

    if (!organizationId || !linearTeamId || !confluencePageIdOrUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: organizationId, linearTeamId, confluencePageIdOrUrl'
      });
    }

    // Get access tokens
    const linearAccessToken = await getAccessToken(organizationId);
    const confluenceAccessToken = await getConfluenceAccessToken(organizationId);

    if (!linearAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'Linear access token not found for organization'
      });
    }

    if (!confluenceAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'Confluence access token not found for organization'
      });
    }

    // Get Confluence base URL from the token
    const confluenceToken = await getConfluenceAccessToken(organizationId);
    const confluenceBaseUrl = confluenceToken?.site_url || '';

    if (!confluenceBaseUrl) {
      return res.status(401).json({
        success: false,
        error: 'Confluence base URL not found for organization'
      });
    }

    // Create synchronization options
    const options: SyncOptions = {
      linearAccessToken,
      linearTeamId,
      linearOrganizationId: organizationId,
      confluenceAccessToken,
      confluenceBaseUrl,
      confluencePageIdOrUrl,
      syncIntervalMs: syncIntervalMs || 5 * 60 * 1000, // Default: 5 minutes
      autoResolveConflicts: autoResolveConflicts || false
    };

    // Create synchronization manager
    const syncManager = new SyncManager(options);

    // Start synchronization
    await syncManager.start();

    // Get synchronization status
    const status = await syncManager.getStatus();

    return res.status(200).json({
      success: true,
      message: 'Synchronization started successfully',
      status
    });
  } catch (error) {
    logger.error('Error starting synchronization', { error });
    return res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Stop synchronization
 *
 * POST /api/sync/stop
 */
router.post('/stop', async (req, res) => {
  try {
    const { organizationId, linearTeamId, confluencePageIdOrUrl } = req.body;

    if (!organizationId || !linearTeamId || !confluencePageIdOrUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: organizationId, linearTeamId, confluencePageIdOrUrl'
      });
    }

    // Get access tokens
    const linearAccessToken = await getAccessToken(organizationId);
    const confluenceAccessToken = await getConfluenceAccessToken(organizationId);

    if (!linearAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'Linear access token not found for organization'
      });
    }

    if (!confluenceAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'Confluence access token not found for organization'
      });
    }

    // Get Confluence base URL from the token
    const confluenceToken = await getConfluenceAccessToken(organizationId);
    const confluenceBaseUrl = confluenceToken?.site_url || '';

    if (!confluenceBaseUrl) {
      return res.status(401).json({
        success: false,
        error: 'Confluence base URL not found for organization'
      });
    }

    // Create synchronization options
    const options: SyncOptions = {
      linearAccessToken,
      linearTeamId,
      linearOrganizationId: organizationId,
      confluenceAccessToken,
      confluenceBaseUrl,
      confluencePageIdOrUrl
    };

    // Create synchronization manager
    const syncManager = new SyncManager(options);

    // Stop synchronization
    syncManager.stop();

    return res.status(200).json({
      success: true,
      message: 'Synchronization stopped successfully'
    });
  } catch (error) {
    logger.error('Error stopping synchronization', { error });
    return res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Get synchronization status
 *
 * GET /api/sync/status
 */
router.get('/status', async (req, res) => {
  try {
    const { organizationId, linearTeamId, confluencePageIdOrUrl } = req.query;

    if (!organizationId || !linearTeamId || !confluencePageIdOrUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: organizationId, linearTeamId, confluencePageIdOrUrl'
      });
    }

    // Get access tokens
    const linearAccessToken = await getAccessToken(organizationId as string);
    const confluenceAccessToken = await getConfluenceAccessToken(organizationId as string);

    if (!linearAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'Linear access token not found for organization'
      });
    }

    if (!confluenceAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'Confluence access token not found for organization'
      });
    }

    // Get Confluence base URL from the token
    const confluenceToken = await getConfluenceAccessToken(organizationId as string);
    const confluenceBaseUrl = confluenceToken?.site_url || '';

    if (!confluenceBaseUrl) {
      return res.status(401).json({
        success: false,
        error: 'Confluence base URL not found for organization'
      });
    }

    // Create synchronization options
    const options: SyncOptions = {
      linearAccessToken,
      linearTeamId: linearTeamId as string,
      linearOrganizationId: organizationId as string,
      confluenceAccessToken,
      confluenceBaseUrl,
      confluencePageIdOrUrl: confluencePageIdOrUrl as string
    };

    // Create synchronization manager
    const syncManager = new SyncManager(options);

    // Get synchronization status
    const status = await syncManager.getStatus();

    return res.status(200).json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Error getting synchronization status', { error });
    return res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Manually trigger synchronization
 *
 * POST /api/sync/trigger
 */
router.post('/trigger', async (req, res) => {
  try {
    const { organizationId, linearTeamId, confluencePageIdOrUrl } = req.body;

    if (!organizationId || !linearTeamId || !confluencePageIdOrUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: organizationId, linearTeamId, confluencePageIdOrUrl'
      });
    }

    // Get access tokens
    const linearAccessToken = await getAccessToken(organizationId);
    const confluenceAccessToken = await getConfluenceAccessToken(organizationId);

    if (!linearAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'Linear access token not found for organization'
      });
    }

    if (!confluenceAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'Confluence access token not found for organization'
      });
    }

    // Get Confluence base URL from the token
    const confluenceToken = await getConfluenceAccessToken(organizationId);
    const confluenceBaseUrl = confluenceToken?.site_url || '';

    if (!confluenceBaseUrl) {
      return res.status(401).json({
        success: false,
        error: 'Confluence base URL not found for organization'
      });
    }

    // Create synchronization options
    const options: SyncOptions = {
      linearAccessToken,
      linearTeamId,
      linearOrganizationId: organizationId,
      confluenceAccessToken,
      confluenceBaseUrl,
      confluencePageIdOrUrl
    };

    // Create synchronization manager
    const syncManager = new SyncManager(options);

    // Trigger synchronization
    const result: SyncResult = await syncManager.sync();

    return res.status(200).json({
      success: true,
      message: 'Synchronization triggered successfully',
      result
    });
  } catch (error) {
    logger.error('Error triggering synchronization', { error });
    return res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;
