# Confluence Setup Guide

This guide provides step-by-step instructions for setting up the Confluence side of the Linear Planning Agent, including API token generation, page structure, and access permissions.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Creating an API Token](#creating-an-api-token)
3. [Setting Up Page Structure](#setting-up-page-structure)
4. [Configuring Access Permissions](#configuring-access-permissions)
5. [Environment Variables](#environment-variables)
6. [Testing the Integration](#testing-the-integration)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, make sure you have:

- A Confluence account with admin access to your space
- The Linear Planning Agent application deployed or running locally

## Creating an API Token

Confluence uses API tokens for authentication. Follow these steps to create a Confluence API token:

1. **Log in to Atlassian Account**:
   - Go to [Atlassian Account Settings](https://id.atlassian.com/manage/api-tokens).
   - Log in with your Atlassian account.

2. **Create API Token**:
   - Click on "Create API token".
   - Enter a label for your token (e.g., "Linear Planning Agent").
   - Click "Create".
   - Copy the generated token and store it securely. You'll need it for your environment variables.

## Setting Up Page Structure

The Linear Planning Agent expects a specific structure for Confluence pages. Follow these steps to set up your page structure:

1. **Create a Space**:
   - In Confluence, click on "Spaces" in the top navigation.
   - Click "Create space".
   - Select "Blank space".
   - Enter a name and key for your space (e.g., "SAFe Planning", "SAFE").
   - Click "Create".

2. **Create a Planning Page**:
   - In your new space, click "Create" in the top navigation.
   - Select "Page".
   - Enter a title for your planning page (e.g., "Project Planning").
   - Use the following template for your page content:

```
h1. Project Planning

h2. Epics

h3. Epic 1: [Epic Title]
[Epic description]

h3. Epic 2: [Epic Title]
[Epic description]

h2. Features

h3. Feature 1: [Feature Title]
*Epic:* [Epic Title]
[Feature description]

h3. Feature 2: [Feature Title]
*Epic:* [Epic Title]
[Feature description]

h2. User Stories

h3. Story 1: [Story Title]
*Feature:* [Feature Title]
[Story description]

*Acceptance Criteria:*
* Criterion 1
* Criterion 2
* Criterion 3

h3. Story 2: [Story Title]
*Feature:* [Feature Title]
[Story description]

*Acceptance Criteria:*
* Criterion 1
* Criterion 2
* Criterion 3

h2. Enablers

h3. Enabler 1: [Enabler Title]
*Feature:* [Feature Title]
*Type:* [Architecture/Infrastructure/Exploration/Integration]
[Enabler description]

h3. Enabler 2: [Enabler Title]
*Feature:* [Feature Title]
*Type:* [Architecture/Infrastructure/Exploration/Integration]
[Enabler description]
```

3. **Publish the Page**:
   - Click "Publish" to save your planning page.
   - Copy the URL of the page. You'll need it for synchronization.

## Configuring Access Permissions

Ensure that the user associated with your API token has the necessary permissions to access and modify the planning page:

1. **Space Permissions**:
   - Go to your space.
   - Click on "Space settings" in the bottom-left corner.
   - Click on "Permissions".
   - Ensure that your user has "Space admin" or at least "Can edit" permission.

2. **Page Restrictions**:
   - Go to your planning page.
   - Click on "..." (More actions) in the top-right corner.
   - Select "Restrictions".
   - Ensure that your user has "Edit" permission for the page.

## Environment Variables

Update your `.env` file with the following Confluence-related environment variables:

```
# Confluence API Credentials
CONFLUENCE_USERNAME=your_atlassian_email
CONFLUENCE_API_TOKEN=your_api_token
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
```

Replace the placeholder values with your actual credentials and base URL.

## Testing the Integration

After setting up the Confluence side of the integration, you can test it by following these steps:

1. **Start the Linear Planning Agent**:
   - If running locally: `npm run dev`
   - If using Docker: `docker-compose up -d`

2. **Parse Confluence Page**:
   - Use the planning agent to parse your Confluence page:
     ```bash
     ./scripts/start-planning-agent.sh "https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789" "Project Planning"
     ```
   - Check the logs to see if the page was parsed successfully.

3. **Test Synchronization**:
   - Use the synchronization CLI to start synchronization:
     ```bash
     npm run sync:start -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id
     ```
   - Check the logs to see if the synchronization is working correctly.

## Troubleshooting

### API Token Issues

- **Invalid API Token**: Make sure your API token is correct in your environment variables.
- **Token Expiration**: API tokens don't expire, but they can be revoked. If your token stops working, create a new one.
- **Permission Errors**: Ensure the user associated with your API token has the necessary permissions.

### Page Structure Issues

- **Parsing Errors**: The Linear Planning Agent expects a specific structure for Confluence pages. Make sure your page follows the template provided.
- **Missing Elements**: Ensure that your page includes all the required elements (Epics, Features, Stories, Enablers).
- **Invalid References**: Make sure that references between elements are correct (e.g., a Story references an existing Feature).

### Access Issues

- **Space Not Found**: Verify that your Confluence base URL is correct in your environment variables.
- **Page Not Found**: Ensure that the page ID or URL is correct when starting synchronization.
- **Permission Denied**: Check that the user associated with your API token has the necessary permissions to access and modify the page.

### Common Error Messages

- **"Invalid credentials"**: Your username or API token is incorrect.
- **"Page not found"**: The page ID or URL is incorrect, or the user doesn't have access to the page.
- **"Parsing error"**: The page structure doesn't match the expected format.
- **"Network error"**: There's an issue with the connection to Confluence. Check your network and Confluence base URL.

If you encounter any other issues, check the logs of your application for more detailed error messages.
