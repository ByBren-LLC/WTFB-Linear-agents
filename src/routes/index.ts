/**
 * API Routes
 * 
 * This module exports all API routes.
 */
import { Router } from 'express';
import piPlanningRoutes from './pi-planning';

// Create router
const router = Router();

// Register routes
router.use('/pi-planning', piPlanningRoutes);

export default router;
