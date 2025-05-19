# WTFB Linear Agents Scripts

This directory contains scripts for the WTFB Linear Agents project.

## Available Scripts

### start-planning-agent.sh

This script initializes a planning agent with instructions to analyze Confluence documentation and create properly structured Linear issues following SAFe methodology.

#### Usage

```bash
./start-planning-agent.sh [CONFLUENCE_PAGE_URL] [PLANNING_TITLE]
```

#### Example

```bash
./start-planning-agent.sh "https://cheddarfox.atlassian.net/wiki/spaces/WA/pages/123456789" "Collaborative Screenplay Editing"
```

## Adding New Scripts

When adding new scripts to this directory, please:

1. Follow the naming convention: `start-[agent-type]-agent.sh`
2. Include detailed comments and usage instructions
3. Update this README with information about the new script
4. Ensure the script checks for required dependencies
