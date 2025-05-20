/**
 * Program Increment (PI) Planning API
 * 
 * This module provides API endpoints for PI Planning functionality.
 */
import { Router, Request, Response } from 'express';
import { PIManager } from '../safe/pi-planning';
import { PlanningAgent } from '../agent/planning';
import * as logger from '../utils/logger';
import * as db from '../db/models';

// Create router
const router = Router();

/**
 * Create a Program Increment
 * 
 * POST /api/pi-planning/program-increments
 */
router.post('/program-increments', async (req: Request, res: Response) => {
  try {
    const { teamId, name, startDate, endDate, description, organizationId } = req.body;
    
    // Validate required fields
    if (!teamId || !name || !startDate || !endDate || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: teamId, name, startDate, endDate, organizationId'
      });
    }
    
    // Get Linear access token from request
    const accessToken = req.headers.authorization?.split(' ')[1];
    
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'No access token provided'
      });
    }
    
    // Create PI Manager
    const piManager = new PIManager(accessToken);
    
    // Create Program Increment in Linear
    const pi = await piManager.createProgramIncrement(
      teamId,
      name,
      new Date(startDate),
      new Date(endDate),
      description
    );
    
    // Store Program Increment in database
    const dbPi = await db.createProgramIncrement(
      organizationId,
      pi.id,
      pi.name,
      pi.startDate,
      pi.endDate,
      pi.description,
      pi.status
    );
    
    logger.info('Created Program Increment', { piId: pi.id, name: pi.name });
    
    return res.status(201).json({
      success: true,
      programIncrement: {
        id: pi.id,
        name: pi.name,
        startDate: pi.startDate,
        endDate: pi.endDate,
        description: pi.description,
        status: pi.status,
        dbId: dbPi.id
      }
    });
  } catch (error) {
    logger.error('Error creating Program Increment', { error });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get all Program Increments for an organization
 * 
 * GET /api/pi-planning/program-increments?organizationId={organizationId}
 */
router.get('/program-increments', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.query;
    
    // Validate required fields
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: organizationId'
      });
    }
    
    // Get Program Increments from database
    const programIncrements = await db.getProgramIncrementsByOrganization(organizationId as string);
    
    return res.status(200).json({
      success: true,
      programIncrements
    });
  } catch (error) {
    logger.error('Error getting Program Increments', { error });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get a Program Increment by ID
 * 
 * GET /api/pi-planning/program-increments/:id
 */
router.get('/program-increments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get Program Increment from database
    const programIncrement = await db.getProgramIncrement(parseInt(id, 10));
    
    if (!programIncrement) {
      return res.status(404).json({
        success: false,
        error: `Program Increment with ID ${id} not found`
      });
    }
    
    // Get features for this Program Increment
    const features = await db.getPIFeaturesByProgramIncrement(programIncrement.id);
    
    return res.status(200).json({
      success: true,
      programIncrement,
      features
    });
  } catch (error) {
    logger.error('Error getting Program Increment', { error });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update a Program Increment
 * 
 * PUT /api/pi-planning/program-increments/:id
 */
router.put('/program-increments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, description, status } = req.body;
    
    // Get Program Increment from database
    const programIncrement = await db.getProgramIncrement(parseInt(id, 10));
    
    if (!programIncrement) {
      return res.status(404).json({
        success: false,
        error: `Program Increment with ID ${id} not found`
      });
    }
    
    // Update Program Increment in database
    const updates: Partial<db.ProgramIncrementDB> = {};
    
    if (name) updates.name = name;
    if (startDate) updates.start_date = new Date(startDate);
    if (endDate) updates.end_date = new Date(endDate);
    if (description !== undefined) updates.description = description;
    if (status) updates.status = status;
    
    const updatedPi = await db.updateProgramIncrement(programIncrement.id, updates);
    
    // Get Linear access token from request
    const accessToken = req.headers.authorization?.split(' ')[1];
    
    if (accessToken && updatedPi) {
      // Update Program Increment in Linear
      // Note: This is a simplified implementation. In a real implementation,
      // you would need to handle the case where the Linear cycle might have been deleted.
      const piManager = new PIManager(accessToken);
      
      // TODO: Implement update functionality in PIManager
      // For now, we'll just log a message
      logger.info('Program Increment updated in database but not in Linear', {
        piId: programIncrement.pi_id,
        name: updatedPi.name
      });
    }
    
    return res.status(200).json({
      success: true,
      programIncrement: updatedPi
    });
  } catch (error) {
    logger.error('Error updating Program Increment', { error });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete a Program Increment
 * 
 * DELETE /api/pi-planning/program-increments/:id
 */
router.delete('/program-increments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get Program Increment from database
    const programIncrement = await db.getProgramIncrement(parseInt(id, 10));
    
    if (!programIncrement) {
      return res.status(404).json({
        success: false,
        error: `Program Increment with ID ${id} not found`
      });
    }
    
    // Delete Program Increment from database
    const deleted = await db.deleteProgramIncrement(programIncrement.id);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: `Failed to delete Program Increment with ID ${id}`
      });
    }
    
    // Get Linear access token from request
    const accessToken = req.headers.authorization?.split(' ')[1];
    
    if (accessToken) {
      // Delete Program Increment in Linear
      // Note: This is a simplified implementation. In a real implementation,
      // you would need to handle the case where the Linear cycle might have been deleted.
      const piManager = new PIManager(accessToken);
      
      // TODO: Implement delete functionality in PIManager
      // For now, we'll just log a message
      logger.info('Program Increment deleted in database but not in Linear', {
        piId: programIncrement.pi_id,
        name: programIncrement.name
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Program Increment with ID ${id} deleted successfully`
    });
  } catch (error) {
    logger.error('Error deleting Program Increment', { error });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Assign features to a Program Increment
 * 
 * POST /api/pi-planning/program-increments/:id/features
 */
router.post('/program-increments/:id/features', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { featureIds } = req.body;
    
    // Validate required fields
    if (!featureIds || !Array.isArray(featureIds) || featureIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: featureIds (array)'
      });
    }
    
    // Get Program Increment from database
    const programIncrement = await db.getProgramIncrement(parseInt(id, 10));
    
    if (!programIncrement) {
      return res.status(404).json({
        success: false,
        error: `Program Increment with ID ${id} not found`
      });
    }
    
    // Get Linear access token from request
    const accessToken = req.headers.authorization?.split(' ')[1];
    
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'No access token provided'
      });
    }
    
    // Create PI Manager
    const piManager = new PIManager(accessToken);
    
    // Assign features to Program Increment in Linear
    const piFeatures = await piManager.assignFeaturesToPI(
      programIncrement.pi_id,
      featureIds
    );
    
    // Store features in database
    const dbFeatures = [];
    
    for (const feature of piFeatures) {
      const dbFeature = await db.createPIFeature(
        programIncrement.id,
        feature.featureId,
        feature.teamId,
        feature.status,
        feature.confidence
      );
      
      dbFeatures.push(dbFeature);
    }
    
    logger.info('Assigned features to Program Increment', {
      piId: programIncrement.pi_id,
      featureCount: piFeatures.length
    });
    
    return res.status(200).json({
      success: true,
      features: dbFeatures
    });
  } catch (error) {
    logger.error('Error assigning features to Program Increment', { error });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create a Program Increment from a Confluence page
 * 
 * POST /api/pi-planning/from-confluence
 */
router.post('/from-confluence', async (req: Request, res: Response) => {
  try {
    const { confluencePageUrl, teamId, organizationId } = req.body;
    
    // Validate required fields
    if (!confluencePageUrl || !teamId || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: confluencePageUrl, teamId, organizationId'
      });
    }
    
    // Get Linear access token from request
    const accessToken = req.headers.authorization?.split(' ')[1];
    
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'No access token provided'
      });
    }
    
    // Create Planning Agent
    const planningAgent = new PlanningAgent(accessToken);
    
    // Create Program Increment from Confluence
    const pi = await planningAgent.createProgramIncrementFromConfluence(
      confluencePageUrl,
      teamId
    );
    
    // Store Program Increment in database
    const dbPi = await db.createProgramIncrement(
      organizationId,
      pi.id,
      pi.name,
      pi.startDate,
      pi.endDate,
      pi.description,
      pi.status
    );
    
    logger.info('Created Program Increment from Confluence', {
      piId: pi.id,
      name: pi.name,
      confluencePageUrl
    });
    
    return res.status(201).json({
      success: true,
      programIncrement: {
        id: pi.id,
        name: pi.name,
        startDate: pi.startDate,
        endDate: pi.endDate,
        description: pi.description,
        status: pi.status,
        dbId: dbPi.id
      }
    });
  } catch (error) {
    logger.error('Error creating Program Increment from Confluence', { error });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
