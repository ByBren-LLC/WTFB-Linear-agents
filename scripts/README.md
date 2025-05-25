# WTFB Universal Agent Scripts

This directory contains scripts for WTFB projects using the universal agent naming convention.

## Universal Agent Naming Convention

All scripts and agents use the format: **`PROJECT-ROLE-NN-SN`**
- **PROJECT**: 3-4 letter project code (LIN, WOR, AUG, API, WEB, MOB)
- **ROLE**: Agent specialization (ARCH, DEBT, TYPE, INFRA, SDK, SYNC, AUTH, PLAN, TEST, DOC, SEC, PERF, UI, DATA)
- **NN**: Sequential number (01, 02, 03, etc.)
- **SN**: Sprint number (S01, S02, S03, etc.)

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
2. Include agent ID parameter: `[PROJECT]-[ROLE]-[NN]-S[N]`
3. Include detailed comments and usage instructions
4. Update this README with information about the new script
5. Ensure the script checks for required dependencies
6. Include agent ID validation and requirements

## Agent ID Requirements

All scripts must:
- Accept agent ID as a parameter
- Validate agent ID format: `PROJECT-ROLE-NN-SN`
- Include agent ID in all generated outputs
- Communicate agent ID requirements to agents
