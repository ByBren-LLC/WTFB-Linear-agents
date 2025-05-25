/**
 * Planning API
 *
 * This module provides API endpoints for managing planning sessions.
 * It handles creating, retrieving, starting, and deleting planning sessions.
 */

import { Router } from 'express';
import * as logger from '../utils/logger';
import { planningSessionStateStore } from '../planning/state-store';
import { PlanningSession } from '../planning/state';
import { createPlanningSession as dbCreatePlanningSession } from '../db/models';
import { startPlanningProcess } from '../planning/process';

const router = Router();

/**
 * Create a new planning session
 *
 * POST /planning/sessions
 *
 * Request body:
 * - title: string - The title of the planning session
 * - confluencePageUrl: string - The URL of the Confluence page
 * - organizationId: string - The ID of the organization
 *
 * Response:
 * - 201: The created planning session
 * - 400: Missing required fields
 * - 500: Internal server error
 */
router.post('/sessions', async (req, res) => {
  try {
    const { title, confluencePageUrl, organizationId } = req.body;

    if (!title || !confluencePageUrl || !organizationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const session = await dbCreatePlanningSession(
      organizationId,
      confluencePageUrl,
      title
    );

    // Initialize the state
    const stateManager = await planningSessionStateStore.getStateManager(session.id.toString());
    await stateManager.initialize();

    return res.status(201).json(session);
  } catch (error) {
    logger.error('Error creating planning session', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a planning session
 *
 * GET /planning/sessions/:id
 *
 * Path parameters:
 * - id: string - The ID of the planning session
 *
 * Response:
 * - 200: The planning session state
 * - 500: Internal server error
 */
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const state = await planningSessionStateStore.getState(id);

    return res.json(state);
  } catch (error) {
    logger.error('Error getting planning session', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get planning sessions by organization
 *
 * GET /planning/sessions?organizationId=:organizationId
 *
 * Query parameters:
 * - organizationId: string - The ID of the organization
 *
 * Response:
 * - 200: An array of planning session states
 * - 400: Missing organizationId parameter
 * - 500: Internal server error
 */
router.get('/sessions', async (req, res) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organizationId parameter' });
    }

    const states = await planningSessionStateStore.getStatesByOrganization(organizationId as string);

    return res.json(states);
  } catch (error) {
    logger.error('Error getting planning sessions', { error, organizationId: req.query.organizationId });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Start a planning session
 *
 * POST /planning/sessions/:id/start
 *
 * Path parameters:
 * - id: string - The ID of the planning session
 *
 * Response:
 * - 200: The planning session was started
 * - 400: Planning session is not in pending status
 * - 500: Internal server error
 */
router.post('/sessions/:id/start', async (req, res) => {
  try {
    const { id } = req.params;

    const stateManager = await planningSessionStateStore.getStateManager(id);
    const state = await stateManager.getState();

    if (state.sessions.currentSession?.status !== 'planning') {
      return res.status(400).json({ error: 'Planning session is not in pending status' });
    }

    // Update the status to processing
    // Note: setStatus method needs to be implemented in state manager

    // Start the planning process in the background
    startPlanningProcess(id).catch(error => {
      logger.error('Error in planning process', { error, sessionId: id });
    });

    return res.json({ status: 'processing' });
  } catch (error) {
    logger.error('Error starting planning session', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a planning session
 *
 * DELETE /planning/sessions/:id
 *
 * Path parameters:
 * - id: string - The ID of the planning session
 *
 * Response:
 * - 200: The planning session was deleted
 * - 404: Planning session not found
 * - 500: Internal server error
 */
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await planningSessionStateStore.deleteState(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Planning session not found' });
    }

    return res.json({ status: 'deleted' });
  } catch (error) {
    logger.error('Error deleting planning session', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
