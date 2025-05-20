/**
 * Synchronization API for Linear Planning Agent
 *
 * This module provides API endpoints for managing synchronization between Linear and Confluence.
 */

import { Router } from 'express';
import * as logger from '../utils/logger';
import { SynchronizationManager } from '../sync/manager';
import { SyncConfig, SyncDirection, SyncFrequency } from '../sync/models';
import {
  createSyncConfig,
  getSyncConfig,
  getSyncConfigsByOrganization,
  getSyncConfigsByTeam,
  updateSyncConfig,
  deleteSyncConfig,
  getSyncHistoryByConfig
} from '../db/models';

const router = Router();

/**
 * Create a new sync configuration
 */
router.post('/configs', async (req, res) => {
  try {
    const { organizationId, teamId, confluencePageUrl, direction, frequency, enabled } = req.body;
    
    if (!organizationId || !teamId || !confluencePageUrl || !direction || !frequency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate direction
    if (!Object.values(SyncDirection).includes(direction)) {
      return res.status(400).json({ error: 'Invalid direction' });
    }
    
    // Validate frequency
    if (!Object.values(SyncFrequency).includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency' });
    }
    
    const config = await createSyncConfig({
      organizationId,
      teamId,
      confluencePageUrl,
      direction,
      frequency,
      enabled: enabled !== false
    });
    
    return res.status(201).json(config);
  } catch (error) {
    logger.error('Error creating sync configuration', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a sync configuration by ID
 */
router.get('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = await getSyncConfig(parseInt(id, 10));
    
    if (!config) {
      return res.status(404).json({ error: 'Sync configuration not found' });
    }
    
    return res.json(config);
  } catch (error) {
    logger.error('Error getting sync configuration', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get sync configurations by organization or team
 */
router.get('/configs', async (req, res) => {
  try {
    const { organizationId, teamId } = req.query;
    
    if (!organizationId && !teamId) {
      return res.status(400).json({ error: 'Missing organizationId or teamId parameter' });
    }
    
    let configs;
    if (organizationId) {
      configs = await getSyncConfigsByOrganization(organizationId as string);
    } else {
      configs = await getSyncConfigsByTeam(teamId as string);
    }
    
    return res.json(configs);
  } catch (error) {
    logger.error('Error getting sync configurations', { error, query: req.query });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update a sync configuration
 */
router.put('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { confluencePageUrl, direction, frequency, enabled } = req.body;
    
    const config = await getSyncConfig(parseInt(id, 10));
    
    if (!config) {
      return res.status(404).json({ error: 'Sync configuration not found' });
    }
    
    // Validate direction if provided
    if (direction && !Object.values(SyncDirection).includes(direction)) {
      return res.status(400).json({ error: 'Invalid direction' });
    }
    
    // Validate frequency if provided
    if (frequency && !Object.values(SyncFrequency).includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency' });
    }
    
    const updatedConfig = await updateSyncConfig(parseInt(id, 10), {
      confluencePageUrl,
      direction,
      frequency,
      enabled
    });
    
    return res.json(updatedConfig);
  } catch (error) {
    logger.error('Error updating sync configuration', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a sync configuration
 */
router.delete('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await deleteSyncConfig(parseInt(id, 10));
    
    if (!deleted) {
      return res.status(404).json({ error: 'Sync configuration not found' });
    }
    
    return res.json({ status: 'deleted' });
  } catch (error) {
    logger.error('Error deleting sync configuration', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Synchronize now
 */
router.post('/sync/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = await getSyncConfig(parseInt(id, 10));
    
    if (!config) {
      return res.status(404).json({ error: 'Sync configuration not found' });
    }
    
    const syncManager = new SynchronizationManager(config.organization_id, config.team_id);
    const result = await syncManager.synchronize({
      id: config.id,
      organizationId: config.organization_id,
      teamId: config.team_id,
      confluencePageUrl: config.confluence_page_url,
      direction: config.direction as SyncDirection,
      frequency: config.frequency as SyncFrequency,
      lastSyncTime: config.last_sync_time,
      enabled: config.enabled
    });
    
    // Update last sync time
    await updateSyncConfig(parseInt(id, 10), {
      lastSyncTime: new Date()
    });
    
    return res.json(result);
  } catch (error) {
    logger.error('Error synchronizing', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get sync history for a configuration
 */
router.get('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;
    
    const config = await getSyncConfig(parseInt(id, 10));
    
    if (!config) {
      return res.status(404).json({ error: 'Sync configuration not found' });
    }
    
    const history = await getSyncHistoryByConfig(
      config.id,
      limit ? parseInt(limit as string, 10) : undefined
    );
    
    return res.json(history);
  } catch (error) {
    logger.error('Error getting sync history', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
