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

```bash
npm run docker:build
npm run docker:up
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
