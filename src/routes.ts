/**
 * API Routes
 *
 * This module defines the API routes for the Linear Planning Agent.
 */
import express from 'express';
import syncRoutes from './api/sync';

const router = express.Router();

// Sync routes
router.use('/sync', syncRoutes);

export default router;
