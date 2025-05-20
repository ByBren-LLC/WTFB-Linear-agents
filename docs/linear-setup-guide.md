# Linear Setup Guide

This guide provides step-by-step instructions for setting up the Linear side of the Linear Planning Agent, including OAuth application registration, webhook configuration, and API access.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Creating a Linear OAuth Application](#creating-a-linear-oauth-application)
3. [Configuring Webhooks](#configuring-webhooks)
4. [Setting Up API Access](#setting-up-api-access)
5. [Environment Variables](#environment-variables)
6. [Testing the Integration](#testing-the-integration)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, make sure you have:

- A Linear account with admin access to your workspace
- A domain for your application (for OAuth redirect URIs)
- The Linear Planning Agent application deployed or running locally

## Creating a Linear OAuth Application

Linear uses OAuth 2.0 for authentication. Follow these steps to create a Linear OAuth application:

1. **Log in to Linear**:
   - Go to [Linear](https://linear.app/) and log in to your account.

2. **Access Developer Settings**:
   - Click on your profile picture in the bottom-left corner.
   - Select "Settings" from the dropdown menu.
   - In the left sidebar, click on "API" under the "Organization" section.

3. **Create OAuth Application**:
   - Click on the "OAuth applications" tab.
   - Click the "Create new" button.
   - Fill in the application details:
     - **Name**: Linear Planning Agent
     - **Description**: SAFe integration for Linear and Confluence
     - **Developer name**: Your name or organization
     - **Developer URL**: Your website URL
     - **Callback URLs**: Add your redirect URI (e.g., `https://your-domain.com/auth/callback` or `http://localhost:3000/auth/callback` for local development)
     - **Requested scopes**: Select the following scopes:
       - `read:issues`
       - `write:issues`
       - `read:teams`
       - `read:users`
       - `read:organizations`
       - `read:comments`
       - `write:comments`
       - `read:cycles`
       - `read:labels`
       - `write:labels`
       - `read:projects`
       - `write:projects`

4. **Save Application**:
   - Click "Create" to save your OAuth application.

5. **Get Credentials**:
   - After creating the application, you'll see your Client ID and Client Secret.
   - Copy these values and store them securely. You'll need them for your environment variables.

## Configuring Webhooks

Webhooks allow Linear to send real-time updates to your application when events occur. Follow these steps to set up webhooks:

1. **Access Webhook Settings**:
   - In Linear, go to Settings > API.
   - Click on the "Webhooks" tab.

2. **Create Webhook**:
   - Click the "Create new webhook" button.
   - Fill in the webhook details:
     - **URL**: The URL where Linear should send webhook events (e.g., `https://your-domain.com/webhook` or `http://localhost:3000/webhook` for local development)
     - **Resource types**: Select the resources you want to receive events for:
       - Issues
       - Comments
       - Projects
       - Cycles
       - Labels
     - **Team**: Select the team(s) you want to receive events for, or leave blank for all teams.

3. **Save Webhook**:
   - Click "Create webhook" to save your webhook configuration.

4. **Get Webhook Secret**:
   - After creating the webhook, you'll see your Webhook Secret.
   - Copy this value and store it securely. You'll need it for your environment variables.

## Setting Up API Access

The Linear Planning Agent uses the Linear API to interact with your Linear workspace. Follow these steps to set up API access:

1. **Get Team ID**:
   - In Linear, go to Settings > Teams.
   - Select the team you want to use with the Linear Planning Agent.
   - The team ID is in the URL: `https://linear.app/settings/teams/{team-id}`.
   - Copy the team ID for your environment variables.

2. **Get Organization ID**:
   - In Linear, go to Settings > Organization.
   - The organization ID is in the URL: `https://linear.app/settings/organization/{organization-id}`.
   - Copy the organization ID for your environment variables.

## Environment Variables

Update your `.env` file with the following Linear-related environment variables:

```
# Linear OAuth Application Credentials
LINEAR_CLIENT_ID=your_client_id
LINEAR_CLIENT_SECRET=your_client_secret
LINEAR_REDIRECT_URI=https://your-domain.com/auth/callback

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret

# Linear Organization and Team IDs
LINEAR_ORGANIZATION_ID=your_organization_id
LINEAR_TEAM_ID=your_team_id
```

Replace the placeholder values with your actual credentials and IDs.

## Testing the Integration

After setting up the Linear side of the integration, you can test it by following these steps:

1. **Start the Linear Planning Agent**:
   - If running locally: `npm run dev`
   - If using Docker: `docker-compose up -d`

2. **Authenticate with Linear**:
   - Open your browser and navigate to `https://your-domain.com/auth` or `http://localhost:3000/auth` for local development.
   - You'll be redirected to Linear to authorize the application.
   - After authorization, you'll be redirected back to your application.

3. **Test Webhook**:
   - Create or update an issue in Linear.
   - Check the logs of your application to see if the webhook event was received.

4. **Test Synchronization**:
   - Use the synchronization CLI to start synchronization:
     ```bash
     npm run sync:start -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id
     ```
   - Check the logs to see if the synchronization is working correctly.

## Troubleshooting

### OAuth Issues

- **Invalid Redirect URI**: Make sure the redirect URI in your Linear OAuth application matches the one in your application.
- **Missing Scopes**: Ensure you've selected all the required scopes for your OAuth application.
- **Authentication Errors**: Check that your client ID and client secret are correct in your environment variables.

### Webhook Issues

- **Webhook Not Receiving Events**: Verify that your webhook URL is accessible from the internet. You may need to use a service like ngrok for local development.
- **Invalid Webhook Signature**: Ensure your webhook secret is correct in your environment variables.
- **Missing Events**: Check that you've selected all the required resource types for your webhook.

### API Issues

- **Rate Limiting**: Linear has rate limits for API requests. If you're making too many requests, you may be rate-limited.
- **Permission Errors**: Ensure your OAuth application has the necessary scopes and that the authenticated user has the required permissions.
- **Invalid Team or Organization ID**: Verify that your team and organization IDs are correct in your environment variables.

### Common Error Messages

- **"Invalid client_id"**: Your client ID is incorrect or the OAuth application doesn't exist.
- **"Invalid redirect_uri"**: The redirect URI doesn't match the one registered with your OAuth application.
- **"Invalid webhook signature"**: The webhook secret is incorrect or the request has been tampered with.
- **"Resource not found"**: The requested resource (issue, team, etc.) doesn't exist or the authenticated user doesn't have access to it.

If you encounter any other issues, check the logs of your application for more detailed error messages.
