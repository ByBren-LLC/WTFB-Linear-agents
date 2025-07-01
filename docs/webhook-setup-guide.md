# Linear Webhook Setup Guide

This guide explains how to configure Linear webhooks to enable the SAFe PULSE agent to respond to mentions, assignments, and other events in your Linear workspace.

## Prerequisites

- Linear workspace admin access
- Deployed SAFe PULSE instance with public webhook endpoint
- Linear API key for the agent

## Step 1: Create Webhook in Linear

1. Navigate to your Linear workspace settings
2. Go to **API** → **Webhooks**
3. Click **Create webhook**
4. Configure the webhook:
   - **Name**: SAFe PULSE Agent Webhook
   - **URL**: `https://your-domain.com/api/webhooks/linear`
   - **Secret**: Generate a secure secret and save it

## Step 2: Configure Event Types

Select the following AppUserNotification event types:

### Core Events (Required)
- [x] `issueMention` - When @saafepulse is mentioned in issue descriptions
- [x] `issueCommentMention` - When @saafepulse is mentioned in comments
- [x] `issueAssignedToYou` - When issues are assigned to the agent
- [x] `issueUnassignedFromYou` - When issues are unassigned from the agent

### Enhanced Events (Recommended)
- [x] `issueStatusChanged` - Track workflow progress on assigned issues
- [x] `issueEmojiReaction` - Engagement tracking and contextual responses
- [x] `issueCommentReaction` - Monitor discussion engagement
- [x] `issueNewComment` - Proactive assistance on agent-involved issues

## Step 3: Environment Configuration

Add the following environment variables to your SAFe PULSE deployment:

```bash
# Webhook Configuration
LINEAR_WEBHOOK_SECRET=your-webhook-secret-from-step-1

# Agent Configuration
LINEAR_AGENT_ID=your-linear-agent-user-id
LINEAR_ACCESS_TOKEN=your-linear-api-token
LINEAR_ORGANIZATION_ID=your-org-id

# Slack Integration (Optional)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_NOTIFICATION_CHANNEL=#linear-agent-updates
```

## Step 4: Create Linear Agent User

1. Create a dedicated Linear user for the agent (e.g., "SAFe PULSE")
2. Note the user ID (found in the user's profile URL)
3. Add this user to relevant teams and projects

## Step 5: Test the Integration

### Test Mention Response
1. Create a test issue
2. Add `@saafepulse` to the description
3. Verify the agent responds within 2 seconds

### Test Assignment
1. Assign an issue to the SAFe PULSE user
2. Verify:
   - Agent acknowledges assignment
   - Issue status updates to "In Progress" (if applicable)
   - Slack notification is sent

### Test Status Tracking
1. Change status of an assigned issue
2. Verify agent provides contextual feedback

## Webhook Event Flow

```mermaid
graph LR
    A[Linear Event] --> B[Webhook Handler]
    B --> C{Event Type}
    C --> D[Issue Mention]
    C --> E[Comment Mention]
    C --> F[Assignment]
    C --> G[Status Change]
    C --> H[Reaction]
    C --> I[New Comment]
    
    D --> J[Create Response]
    E --> J
    F --> J
    G --> J
    H --> K{Should Respond?}
    I --> K
    
    K -->|Yes| J
    K -->|No| L[Track Only]
    
    J --> M[Linear Comment]
    J --> N[Slack Notification]
    L --> N
```

## Response Examples

### Issue Mention
```
👋 Hello @username!

I'm SAFe PULSE, your AI-powered planning assistant. I can help you with:
• Breaking down stories into manageable tasks
• Estimating story points using SAFe guidelines
• Managing dependencies and blockers
• Tracking PI objectives and progress

To get started, just describe what you need help with!
```

### Assignment Acknowledgment
```
🎯 I've been assigned to LIN-123: Implement feature X

I'll help guide this work through our SAFe process. The issue has been moved to In Progress.

Next steps:
• Review acceptance criteria
• Identify dependencies
• Break down if needed (13 points is large)

Let me know how I can assist!
```

### Status Change Feedback
```
🎉 Great news @developer!

LIN-456: Feature Y has been marked as Done. Excellent work on completing this task!

📊 Work Summary
• Story Points: 5
• Final Status: Done

Keep up the great work!
```

## Troubleshooting

### Agent Not Responding

1. Check webhook logs in Linear settings
2. Verify environment variables are set correctly
3. Ensure webhook endpoint is publicly accessible
4. Check agent user has appropriate permissions

### Duplicate Responses

- Ensure only one webhook is configured per workspace
- Check that webhook deduplication is working

### Missing Slack Notifications

1. Verify Slack bot token is valid
2. Check bot has channel access
3. Review notification coordinator logs

## Security Considerations

- Always use HTTPS for webhook endpoints
- Verify webhook signatures to prevent spoofing
- Rotate webhook secrets periodically
- Use least-privilege principle for agent permissions

## Rate Limits

- Linear API: 400 requests per minute
- Response time target: <2 seconds
- Concurrent webhook processing: 10 requests

## Monitoring

Monitor the following metrics:
- Webhook response times
- Success/failure rates
- Linear API quota usage
- Slack notification delivery

## Support

For issues or questions:
- Check logs: `npm run logs:webhooks`
- Review webhook history in Linear settings
- Contact support with webhook ID and timestamp