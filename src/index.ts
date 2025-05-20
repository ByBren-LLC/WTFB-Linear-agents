import express from 'express';
import dotenv from 'dotenv';
import { initiateOAuth, handleOAuthCallback } from './auth/oauth';
import { handleWebhook } from './webhooks/handler';
import { initializeDatabase } from './db/models';
import * as logger from './utils/logger';
import planningRoutes from './api/planning';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('WTFB Linear Planning Agent is running');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// OAuth routes
app.get('/auth', initiateOAuth);
app.get('/auth/callback', handleOAuthCallback);

// Webhook endpoint
app.post('/webhook', handleWebhook);

// Planning API routes
app.use('/api/planning', planningRoutes);

// Initialize the database and start the server
(async () => {
  try {
    // Initialize the database
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Start the server
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`OAuth callback URL: ${process.env.LINEAR_REDIRECT_URI}`);
    });
  } catch (error) {
    logger.error('Failed to initialize the application', { error });
    process.exit(1);
  }
})();
