import express from 'express';
import dotenv from 'dotenv';
import { initiateOAuth, handleOAuthCallback } from './auth/oauth';
import { handleWebhook } from './webhooks/handler';

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

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`OAuth callback URL: ${process.env.LINEAR_REDIRECT_URI}`);
});
