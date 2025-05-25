# Linear Planning Agent

A powerful CLI tool for integrating Linear with Confluence, implementing SAFe methodology, and automating planning workflows.

## Overview

The Linear Planning Agent is a command-line tool that:

1. **Parses Confluence documents** to extract planning information
2. **Creates Linear issues** following SAFe hierarchy (Epics, Features, Stories, Enablers)
3. **Maintains SAFe relationships** between issues
4. **Synchronizes bidirectionally** between Linear and Confluence
5. **Resolves conflicts** when changes occur in both systems

This agent is designed for automation and agent-to-agent workflows, making it perfect for integration into larger automated systems.

## Installation

### Prerequisites

- Node.js 16+ and npm installed
- Docker and Docker Compose (optional, for containerized deployment)
- Linear workspace with admin access
- Confluence access

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/ByBren-LLC/WTFB-Linear-agents.git
   cd WTFB-Linear-agents
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment
   ```bash
   cp .env.template .env
   # Edit .env with your credentials
   ```

   **⚠️ IMPORTANT**: OAuth setup is required! See [OAuth Setup Guide](docs/oauth-setup.md) for detailed instructions on creating OAuth applications in Linear and Atlassian Developer Console.

4. Build the CLI
   ```bash
   npm run cli:build
   ```

## CLI Usage

The Linear Planning Agent provides a unified CLI for all operations:

```bash
# Show help
npm run cli -- --help

# Parse a Confluence document
npm run parse -- --confluence-url="https://example.atlassian.net/wiki/spaces/PLAN/pages/123456"

# Create Linear issues from a Confluence document
npm run create -- --confluence-url="https://example.atlassian.net/wiki/spaces/PLAN/pages/123456" --org-id="your-org-id" --team-id="your-team-id"

# Start synchronization
npm run sync:start -- --org-id="your-org-id" --team-id="your-team-id" --confluence-url="https://example.atlassian.net/wiki/spaces/PLAN/pages/123456"

# Get synchronization status
npm run sync:status -- --org-id="your-org-id" --team-id="your-team-id" --confluence-url="https://example.atlassian.net/wiki/spaces/PLAN/pages/123456"

# Manually trigger synchronization
npm run sync:trigger -- --org-id="your-org-id" --team-id="your-team-id" --confluence-url="https://example.atlassian.net/wiki/spaces/PLAN/pages/123456"

# Stop synchronization
npm run sync:stop -- --org-id="your-org-id" --team-id="your-team-id" --confluence-url="https://example.atlassian.net/wiki/spaces/PLAN/pages/123456"
```

## Agent-to-Agent Workflow Examples

The CLI design enables powerful agent-to-agent workflows:

### Example 1: Automated Planning Pipeline

```bash
# Agent 1: Parse Confluence document and save planning data
npm run parse -- --confluence-url="https://example.atlassian.net/wiki/spaces/PLAN/pages/123456" --output=json > planning-data.json

# Agent 2: Create Linear issues from planning data
npm run create -- --confluence-url="https://example.atlassian.net/wiki/spaces/PLAN/pages/123456" --org-id="your-org-id" --team-id="your-team-id"

# Agent 3: Start synchronization to keep Linear and Confluence in sync
npm run sync:start -- --org-id="your-org-id" --team-id="your-team-id" --confluence-url="https://example.atlassian.net/wiki/spaces/PLAN/pages/123456"
```

### Example 2: Monitoring and Reporting

```bash
# Agent 1: Check synchronization status
STATUS=$(npm run sync:status -- --org-id="your-org-id" --team-id="your-team-id" --confluence-url="https://example.atlassian.net/wiki/spaces/PLAN/pages/123456" --output=json)

# Agent 2: Generate report based on status
echo $STATUS | report-generator --format=markdown > sync-report.md

# Agent 3: Publish report to Confluence
confluence-publisher --file=sync-report.md --space=PLAN --parent=123456
```

## Docker Deployment

### Production Mode

```bash
# Build and start the containers
docker-compose up --build -d

# Run CLI commands inside the container
docker-compose exec app npm run cli -- --help
```

### Development Mode

```bash
# Build and start the containers in development mode
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build -d
```

## Project Structure

- `/scripts`: Shell scripts for initializing and managing agents
- `/specs`: Templates and specifications for planning and implementation
- `/src`: Source code for the Linear Planning Agent
  - `/src/cli`: CLI implementation
  - `/src/confluence`: Confluence API integration
  - `/src/linear`: Linear API integration
  - `/src/planning`: Planning data extraction and processing
  - `/src/safe`: SAFe methodology implementation
  - `/src/sync`: Synchronization between Linear and Confluence

## Documentation

For detailed setup and usage instructions, see:

- [Linear Setup Guide](docs/linear-setup-guide.md)
- [Confluence Setup Guide](docs/confluence-setup-guide.md)
- [Synchronization Documentation](docs/synchronization.md)

## Resources

- [Linear API Documentation](https://linear.app/docs/api)
- [Linear OAuth 2.0 Authentication](https://linear.app/docs/oauth/authentication)
- [Confluence API Documentation](https://developer.atlassian.com/cloud/confluence/rest/v1/intro/)
- [SAFe Framework](https://www.scaledagileframework.com/)
