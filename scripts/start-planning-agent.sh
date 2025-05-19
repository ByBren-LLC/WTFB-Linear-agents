#!/bin/bash

# =========================================================
# WTFB Planning Agent Starter Script
# =========================================================
# This script initializes an Augment agent with the proper context
# and instructions to follow the WTFB workflow for planning agents.
# The planning agent analyzes Confluence documentation and creates
# properly structured Linear issues following SAFe methodology.
#
# Usage: ./start-planning-agent.sh [CONFLUENCE_PAGE_URL] [PLANNING_TITLE]
# Example: ./start-planning-agent.sh "https://cheddarfox.atlassian.net/wiki/spaces/WA/pages/123456789" "Collaborative Screenplay Editing"
# =========================================================

# Check if required arguments are provided
if [ $# -lt 2 ]; then
    echo "Error: Missing required arguments"
    echo "Usage: ./start-planning-agent.sh [CONFLUENCE_PAGE_URL] [PLANNING_TITLE]"
    echo "Example: ./start-planning-agent.sh \"https://cheddarfox.atlassian.net/wiki/spaces/WA/pages/123456789\" \"Collaborative Screenplay Editing\""
    exit 1
fi

CONFLUENCE_PAGE_URL=$1
PLANNING_TITLE=$2
PLANNING_FILENAME="$(echo $PLANNING_TITLE | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')-planning.md"

# Check if specs directory exists
if [ ! -d "specs" ]; then
    echo "Creating specs directory..."
    mkdir -p specs
fi

# Check if planning_template.md exists
if [ ! -f "specs/planning_template.md" ]; then
    echo "Error: specs/planning_template.md not found"
    echo "Please create the template file before running this script"
    exit 1
fi

# Create the agent instructions file with the planning title in the filename
INSTRUCTIONS_FILENAME="specs/planning_instructions_$(echo $PLANNING_TITLE | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-').md"
cat > "${INSTRUCTIONS_FILENAME}" << EOL
# WTFB Planning Agent Task Instructions

## Task Information
- **Confluence Page URL**: ${CONFLUENCE_PAGE_URL}
- **Planning Title**: ${PLANNING_TITLE}
- **Planning Filename**: ${PLANNING_FILENAME}

## Role and Purpose
You are a combined Business Systems Analyst and Solution Architect responsible for translating Confluence documentation into properly structured Linear issues following SAFe methodology. Your goal is to bridge business requirements and technical implementation considerations, ensuring that the development team has clear, actionable tasks that align with both business objectives and architectural vision.

## Workflow Instructions

### 1. Documentation Analysis
1. Access and thoroughly read the Confluence page at ${CONFLUENCE_PAGE_URL}
2. Understand the business context, objectives, and requirements
3. Identify key stakeholders and their needs
4. Analyze technical implications and architectural considerations

### 2. SAFe Work Breakdown
1. Identify the Epic level work item that encompasses the overall initiative
2. Break down the Epic into Features (functional components)
3. Further divide Features into Stories (implementable units of work)
4. Identify necessary Technical Enablers (architecture, infrastructure, etc.)
5. Determine if any Spikes (research tasks) are needed
6. Document any Defects that need to be addressed

### 3. Planning Documentation Creation
1. Create a new planning file in the specs directory:
   - Make a copy of specs/planning_template.md
   - Name it specs/${PLANNING_FILENAME}
   - DO NOT modify the original template file
2. Fill out all sections of the planning template with appropriate detail
3. Ensure comprehensive coverage of:
   - Business context and objectives
   - User impact and benefits
   - SAFe work breakdown (Epic, Features, Stories, Enablers, Spikes)
   - Testing strategy across all levels
   - Non-functional requirements
   - Implementation considerations
   - Documentation requirements
   - Linear issue creation plan

### 4. Linear Issue Creation
1. Create the Epic in Linear with appropriate details
2. Create Features as child issues of the Epic
3. Create Stories as child issues of their respective Features
4. Create Technical Enablers with appropriate labels
5. Create Spikes with time-boxed investigation parameters
6. Establish all necessary dependencies between issues
7. Apply appropriate labels, priorities, and estimates

## Important Guidelines

### SAFe Best Practices
- Allocate 20-30% of capacity to Technical Enablers to maintain architectural runway
- Ensure all work items have clear, measurable acceptance criteria
- Include appropriate non-functional requirements (performance, security, etc.)
- Consider the entire testing pyramid in your planning
- Document architectural decisions and their rationale
- Balance feature work with technical debt reduction

### Linear Integration
- Create properly structured issues following SAFe hierarchy
- Use appropriate labels to categorize work (frontend, backend, etc.)
- Set realistic priorities and estimates
- Establish clear dependencies between issues
- Include comprehensive acceptance criteria for each issue
- Add links to relevant Confluence documentation

### Communication
- Document any assumptions made during planning
- Highlight areas of uncertainty or risk
- Note any questions that require clarification
- Explain the rationale behind technical enablers
- Provide context for architectural decisions

## Resources
- SAFe Framework: https://www.scaledagileframework.com/
- WTFB Architecture Documentation: https://cheddarfox.atlassian.net/wiki/spaces/WA/pages/107806722/WTFB+Screenwriting+Software+Architecture+Documentation+v2.1
- WTFB Remote Agent Workflow: https://cheddarfox.atlassian.net/wiki/spaces/WA/pages/265486663/WTFB+Remote+Agent+Workflow+Linear+Confluence+and+Specs+Integration
- Project Documentation: https://cheddarfox.atlassian.net/wiki/spaces/WA/overview

## First Steps
1. Access and read the Confluence page thoroughly
2. Create the planning file by copying the template
3. Begin filling out the planning template sections
4. Update this document with your progress
EOL

echo "=========================================================="
echo "WTFB Planning Agent Starter"
echo "=========================================================="
echo "Confluence Page: ${CONFLUENCE_PAGE_URL}"
echo "Planning Title: ${PLANNING_TITLE}"
echo "Planning Filename: ${PLANNING_FILENAME}"
echo "-----------------------------------------------------------"
echo "Agent instructions have been created in ${INSTRUCTIONS_FILENAME}"
echo "-----------------------------------------------------------"
echo "To start the Augment agent, run:"
echo "augment-cli start --context ${INSTRUCTIONS_FILENAME}"
echo "=========================================================="

# Optional: Automatically start the agent if AUTOSTART is set
if [ "${AUTOSTART}" = "true" ]; then
    echo "Starting Augment agent..."
    augment-cli start --context "${INSTRUCTIONS_FILENAME}"
fi
