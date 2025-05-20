# Linear Planning Agent Setup Guide

This comprehensive guide provides step-by-step instructions for setting up the Linear Planning Agent, including Linear OAuth, Confluence API, database configuration, and application deployment.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Linear Setup](#linear-setup)
4. [Confluence Setup](#confluence-setup)
5. [Database Setup](#database-setup)
6. [Application Deployment](#application-deployment)
7. [Environment Variables](#environment-variables)
8. [Testing the Integration](#testing-the-integration)
9. [Troubleshooting](#troubleshooting)

## Overview

The Linear Planning Agent is a tool that integrates Linear with Confluence, enabling bidirectional synchronization between Linear issues and Confluence documents. It follows the SAFe (Scaled Agile Framework) methodology, maintaining the hierarchy of Epics, Features, Stories, and Enablers.

## Prerequisites

Before you begin, make sure you have:

- A Linear account with admin access to your workspace
- A Confluence account with admin access to your space
- Docker and Docker Compose installed (for containerized deployment)
- Node.js and npm installed (for local development)
- A domain for your application (for OAuth redirect URIs)

## Linear Setup

### Creating a Linear OAuth Application

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

### Configuring Webhooks

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

### Getting Team and Organization IDs

1. **Get Team ID**:
   - In Linear, go to Settings > Teams.
   - Select the team you want to use with the Linear Planning Agent.
   - The team ID is in the URL: `https://linear.app/settings/teams/{team-id}`.
   - Copy the team ID for your environment variables.

2. **Get Organization ID**:
   - In Linear, go to Settings > Organization.
   - The organization ID is in the URL: `https://linear.app/settings/organization/{organization-id}`.
   - Copy the organization ID for your environment variables.

## Confluence Setup

### Creating an API Token

1. **Log in to Atlassian Account**:
   - Go to [Atlassian Account Settings](https://id.atlassian.com/manage/api-tokens).
   - Log in with your Atlassian account.

2. **Create API Token**:
   - Click on "Create API token".
   - Enter a label for your token (e.g., "Linear Planning Agent").
   - Click "Create".
   - Copy the generated token and store it securely. You'll need it for your environment variables.

### Setting Up Page Structure

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
   - Use the template provided in the [Confluence Setup Guide](confluence-setup-guide.md#setting-up-page-structure).
   - Click "Publish" to save your planning page.
   - Copy the URL of the page. You'll need it for synchronization.

### Configuring Access Permissions

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

## Database Setup

The Linear Planning Agent uses both PostgreSQL and SQLite databases:

- **PostgreSQL**: For storing Linear and Confluence tokens, planning sessions, and other application data.
- **SQLite**: For storing synchronization state, including the last synchronization timestamp and conflicts.

### PostgreSQL Setup

1. **Using Docker**:
   - The PostgreSQL database is included in the Docker Compose configuration.
   - No additional setup is required if you're using Docker.

2. **Using a Separate PostgreSQL Instance**:
   - If you're using a separate PostgreSQL instance, create a new database:
     ```sql
     CREATE DATABASE linear_agent;
     CREATE USER linear_agent WITH PASSWORD 'your_password';
     GRANT ALL PRIVILEGES ON DATABASE linear_agent TO linear_agent;
     ```
   - Update the `DATABASE_URL` environment variable with your PostgreSQL connection string.

### SQLite Setup

1. **Using Docker**:
   - The SQLite database is stored in a Docker volume.
   - No additional setup is required if you're using Docker.

2. **Using Local Development**:
   - Create a `data` directory in the root of the project:
     ```bash
     mkdir -p data
     ```
   - Update the `SQLITE_DB_PATH` environment variable with the path to your SQLite database file.

## Application Deployment

### Using Docker (Recommended)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ByBren-LLC/WTFB-Linear-agents.git
   cd WTFB-Linear-agents
   ```

2. **Create Environment File**:
   - Copy the `.env.template` file to `.env`:
     ```bash
     cp .env.template .env
     ```
   - Update the `.env` file with your credentials and configuration.

3. **Build and Start the Containers**:
   ```bash
   docker-compose up --build -d
   ```

4. **View Logs**:
   ```bash
   docker-compose logs -f
   ```

### Using Local Development

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ByBren-LLC/WTFB-Linear-agents.git
   cd WTFB-Linear-agents
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Create Environment File**:
   - Copy the `.env.template` file to `.env`:
     ```bash
     cp .env.template .env
     ```
   - Update the `.env` file with your credentials and configuration.

4. **Start the Application**:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root of the project with the following variables:

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

# Confluence API Credentials
CONFLUENCE_USERNAME=your_atlassian_email
CONFLUENCE_API_TOKEN=your_api_token
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@db:5432/linear_agent
SQLITE_DB_PATH=/app/data/sync.db

# Server Configuration
PORT=3000
NODE_ENV=production

# Security
ENCRYPTION_KEY=generate_a_strong_random_key_at_least_32_chars
```

Replace the placeholder values with your actual credentials and configuration.

## Testing the Integration

After setting up the Linear Planning Agent, you can test it by following these steps:

1. **Authenticate with Linear**:
   - Open your browser and navigate to `https://your-domain.com/auth` or `http://localhost:3000/auth` for local development.
   - You'll be redirected to Linear to authorize the application.
   - After authorization, you'll be redirected back to your application.

2. **Parse Confluence Page**:
   - Use the planning agent to parse your Confluence page:
     ```bash
     ./scripts/start-planning-agent.sh "https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789" "Project Planning"
     ```
   - Check the logs to see if the page was parsed successfully.

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

For detailed troubleshooting information, refer to the following guides:

- [Linear Setup Guide](linear-setup-guide.md#troubleshooting)
- [Confluence Setup Guide](confluence-setup-guide.md#troubleshooting)

### Common Issues

1. **Authentication Errors**:
   - Verify that your Linear and Confluence credentials are correct in your environment variables.
   - Ensure that your OAuth redirect URI matches the one registered with your Linear OAuth application.

2. **Webhook Issues**:
   - Make sure your webhook URL is accessible from the internet.
   - Verify that your webhook secret is correct in your environment variables.

3. **Database Connection Issues**:
   - Check that your PostgreSQL and SQLite connection strings are correct.
   - Ensure that the databases exist and are accessible.

4. **Synchronization Issues**:
   - Verify that your Confluence page follows the expected structure.
   - Ensure that your Linear team and organization IDs are correct.
   - Check the logs for detailed error messages.

If you encounter any other issues, check the logs of your application for more detailed error messages.
