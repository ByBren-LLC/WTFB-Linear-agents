# WTFB Linear Agents

This repository contains the WTFB Linear Agents project, which implements custom Linear agents for SAFe Essentials workflow integration.

## Overview

The WTFB Linear Agents project provides custom Linear agents that help with planning, tracking, and managing work items in Linear following SAFe methodology. The agents integrate with Confluence for documentation and follow the WTFB workflow standards.

## Project Structure

- `/scripts`: Contains shell scripts for initializing and managing agents
- `/specs`: Contains templates and specifications for planning and implementation
- `/src`: Contains the source code for the Linear agent implementation

## Getting Started

### Prerequisites

- Node.js and npm installed
- Docker and Docker Compose installed (for local testing)
- Linear workspace with admin access
- Confluence access

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.template` to `.env` and fill in the required values
4. Run the agent locally: `npm run dev`

### Using the Planning Agent

To use the planning agent to analyze Confluence documentation and create Linear issues:

```bash
./scripts/start-planning-agent.sh [CONFLUENCE_PAGE_URL] [PLANNING_TITLE]
```

Example:

```bash
./scripts/start-planning-agent.sh "https://cheddarfox.atlassian.net/wiki/spaces/WA/pages/123456789" "Collaborative Screenplay Editing"
```

## Development

### Running with Docker

#### Production Mode

```bash
# Build and start the containers
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop the containers
docker-compose down
```

#### Development Mode

```bash
# Build and start the containers in development mode
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build -d

# View logs
docker-compose logs -f

# Stop the containers
docker-compose down
```

### Using the Synchronization CLI

The Linear Planning Agent includes a CLI for managing synchronization between Linear and Confluence:

```bash
# Start synchronization
npm run sync:start -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id

# Stop synchronization
npm run sync:stop -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id

# Get synchronization status
npm run sync:status -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id

# Manually trigger synchronization
npm run sync:trigger -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id
```

You can also run these commands inside the Docker container:

```bash
# Start synchronization
docker-compose exec app npm run sync:start -- --org-id=your-organization-id --team-id=your-linear-team-id --page-id=your-confluence-page-id
```

### Testing

```bash
npm test
```

## Resources

- [Linear Agent Development Guidelines](https://linear.app/developers/agents)
- [Linear OAuth 2.0 Authentication](https://linear.app/developers/oauth-2-0-authentication)
- [Linear Webhooks Documentation](https://linear.app/developers/webhooks)
- [SAFe Framework](https://www.scaledagileframework.com/)
All our Linear agents!
