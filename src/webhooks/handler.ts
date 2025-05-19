import { Request, Response } from 'express';
import { verifyWebhookSignature } from './verification';

/**
 * Handles incoming webhook events from Linear
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    // Verify the webhook signature
    const isValid = verifyWebhookSignature(
      req.headers['linear-signature'] as string,
      req.body
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process the webhook event
    const { type, action, data } = req.body;
    
    console.log(`Received webhook: ${type} - ${action}`);

    // Handle different event types
    switch (type) {
      case 'AppUserNotification':
        // Process app user notifications
        await processAppUserNotification(req.body);
        break;
      
      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    // Respond with success
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Process AppUserNotification events
 */
const processAppUserNotification = async (payload: any) => {
  const { action, notification } = payload;
  
  // TODO: Implement notification processing based on action type
  console.log(`Processing notification: ${action}`);
  
  // Example: Handle different notification types
  switch (action) {
    case 'issueMention':
      // Handle when the agent is mentioned in an issue
      console.log('Agent mentioned in issue:', notification);
      break;
      
    case 'issueCommentMention':
      // Handle when the agent is mentioned in a comment
      console.log('Agent mentioned in comment:', notification);
      break;
      
    case 'issueAssignedToYou':
      // Handle when an issue is assigned to the agent
      console.log('Issue assigned to agent:', notification);
      break;
      
    default:
      console.log(`Unhandled notification action: ${action}`);
  }
};
