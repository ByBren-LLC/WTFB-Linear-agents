# Remote Agent Workflow: SAFe Implementation Process

This document outlines our proven workflow for deploying remote agents to implement SAFe components. It includes templates, process documentation, and references to our existing kickoff notes.

## Table of Contents

1. [Overview](#overview)
2. [Workflow Process](#workflow-process)
3. [Initial Agent Message Template](#initial-agent-message-template)
4. [Kickoff Note Template](#kickoff-note-template)
5. [Implementation Document Template](#implementation-document-template)
6. [PR Review Process](#pr-review-process)
7. [Existing Kickoff Notes](#existing-kickoff-notes)
8. [Lessons Learned](#lessons-learned)

## Overview

Our remote agent workflow follows a structured approach based on SAFe methodology. Each agent receives:

1. An **initial assignment message** with links to detailed documentation
2. A **kickoff note** with comprehensive task information
3. An **implementation document** with technical specifications

This three-tiered documentation approach ensures agents have both high-level context and detailed technical guidance, while the ARCHitect-in-the-IDE maintains architectural oversight.

## Workflow Process

1. **Preparation Phase**
   - Create implementation document for each component
   - Create kickoff note referencing the implementation document
   - Prepare initial agent message

2. **Assignment Phase**
   - Send initial message to remote agent
   - Ensure agent acknowledges and understands the task
   - Confirm agent has created Linear issue

3. **Implementation Phase**
   - Agent implements according to specifications
   - ARCHitect provides guidance as needed
   - Agent submits PR when complete

4. **Review Phase**
   - ARCHitect reviews PR against architectural standards
   - Feedback provided and changes requested if needed
   - PR merged when it meets all requirements

5. **Integration Phase**
   - ARCHitect handles cross-component integration
   - Conflicts resolved by ARCHitect
   - Final system validation

## Initial Agent Message Template

```markdown
# Remote Agent Assignment: [Task Name]

I'm assigning you to implement the [Task Name] [User Story/Technical Enabler/Spike] for our Linear Planning Agent project. This is a [priority level] component that will [brief description of purpose].

Please:
1. Pull the latest code from the dev branch of our repository: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Read your kickoff note: https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/[task_name]_kickoff.md
3. Create a Linear issue as instructed in the kickoff note
4. Study the implementation document referenced in the kickoff note
5. Implement the task according to the specifications
6. Create a branch named `feature/[branch-name]`
7. Submit a PR when complete

This is a [priority level] task [mention any dependencies if applicable]. Please let me know if you have any questions or need clarification on any aspect of the implementation.
```

## Kickoff Note Template

Our kickoff notes follow a consistent structure to ensure agents have all necessary information:

```markdown
# Kick-off: [Task Name]

## Assignment Overview
[Brief description of the task and its purpose in the overall system]

## Linear Project Information
- **Linear Project**: [Project Name and Link]
- **Linear Team**: [Team Name and Link]

## Linear Issue Creation
As part of this task, you should:
1. Create a new issue in the Linear project
2. Set the issue type to "[User Story/Technical Enabler/Spike]"
3. Set the priority to "[Priority]"
4. Title the issue "[Task Name]"
5. Include a brief description referencing this implementation document
6. Add the label "[appropriate label]"
7. Assign the issue to yourself

## Implementation Document
Your detailed implementation document is available in the repository:
[Link to Implementation Document]

## Project Context
[Description of how this task fits into the overall project]

Your task is to implement [specific description of what needs to be implemented]. This includes:
- [Key aspect 1]
- [Key aspect 2]
- [Key aspect 3]
- [Key aspect 4]

## Key Responsibilities
1. [Responsibility 1]
2. [Responsibility 2]
3. [Responsibility 3]
4. [Responsibility 4]
5. [Responsibility 5]
6. Write comprehensive tests for all components
7. Document the API with JSDoc comments

## Existing Codebase Context
The following files are relevant to your task:
- [Relevant file 1]: [Brief description]
- [Relevant file 2]: [Brief description]

## Definition of Done
Your task will be considered complete when:
- All acceptance criteria in the implementation document are met
- [Specific criterion 1]
- [Specific criterion 2]
- [Specific criterion 3]
- Code is well-documented with JSDoc comments
- Tests are comprehensive and passing
- Pull request is submitted and approved

## Branching and PR Guidelines
- Create a branch named `feature/[branch-name]`
- Make your changes in this branch
- Submit a PR to the `dev` branch when complete
- Include a detailed description of your changes in the PR

## Timeline
- Estimated effort: [X] story points
- Expected completion: Within [timeframe]

## Communication
- If you have questions or need clarification, please comment on your assigned Linear issue
- Provide regular updates on your progress
- Flag any blockers or dependencies as soon as possible

## Dependencies
[List any dependencies on other components or tasks]

---

Thank you for your contribution to the Linear Planning Agent project. Your work on [task name] is essential for [explain importance].

The ARCHitect will be available to answer questions and provide guidance throughout the implementation process.
```

## Implementation Document Template

Implementation documents provide detailed technical specifications and are referenced in the kickoff notes. They follow this structure:

```markdown
# [Task Name] - Implementation Document

## Overview
[Detailed description of the component and its purpose]

## User Story/Technical Enabler/Spike
As a [role], I need to [capability] so that [benefit].

## Acceptance Criteria
1. [Criterion 1]
2. [Criterion 2]
3. [Criterion 3]
...

## Technical Context
[Technical background and context for the implementation]

### Existing Code
- [Relevant existing code]

### Dependencies
- [Dependencies on other components]

## Implementation Plan
[Detailed step-by-step implementation plan with code examples]

### 1. [Implementation Step 1]
[Description and code examples]

### 2. [Implementation Step 2]
[Description and code examples]

...

## Testing Approach
[Description of how the component should be tested]

## Definition of Done
[Specific criteria that must be met for the task to be considered complete]

## Estimated Effort
[Story points and approximate time estimate]

## Resources
[Links to relevant documentation and resources]
```

## PR Review Process

The ARCHitect-in-the-IDE reviews all PRs using the following criteria:

1. **Architectural Alignment**
   - Does the implementation follow the architectural patterns established in the project?
   - Are the right abstractions used?
   - Is the code properly modularized?

2. **Code Quality**
   - Is the code well-structured and readable?
   - Are there appropriate comments and documentation?
   - Does the code follow project conventions?

3. **Testing**
   - Are there comprehensive tests?
   - Do the tests cover edge cases?
   - Are the tests meaningful and not just for coverage?

4. **Integration**
   - Does the code integrate well with other components?
   - Are there any conflicts with other implementations?
   - Are dependencies handled correctly?

5. **Requirements Fulfillment**
   - Does the implementation meet all acceptance criteria?
   - Does it fulfill the user story or technical enabler requirements?
   - Are there any gaps in functionality?

## Existing Kickoff Notes

Our repository contains kickoff notes for the following components:

1. [Parse Confluence Documents](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/parse_confluence_documents_kickoff.md)
2. [Confluence API Integration](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/confluence_api_integration_kickoff.md)
3. [Extract Planning Information](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/extract_planning_information_kickoff.md)
4. [Create Linear Issues from Planning Data](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/create_linear_issues_from_planning_data_kickoff.md)
5. [Maintain SAFe Hierarchy](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/maintain_safe_hierarchy_kickoff.md)
6. [Synchronize Linear with Confluence](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/synchronize_linear_with_confluence_kickoff.md)
7. [Planning Session State Management](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/planning_session_state_management_kickoff.md)
8. [Create Planning Session UI](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/create_planning_session_ui_kickoff.md)
9. [Linear API Error Handling](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/linear_api_error_handling_kickoff.md)
10. [Implement Token Management](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/implement_token_management_kickoff.md)
11. [Database Schema Design](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/database_schema_design_kickoff.md)
12. [SAFe Implementation in Linear](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/safe_implementation_in_linear_kickoff.md)
13. [Implement PI Planning Support](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/dev/specs/kickoff_notes/implement_pi_planning_support_kickoff.md)

## Lessons Learned

Our experience with remote agents has yielded several key insights:

1. **Clear Documentation is Essential**
   - Detailed kickoff notes and implementation documents significantly reduce questions and misunderstandings
   - The three-tiered documentation approach (message → kickoff → implementation) provides both context and details

2. **Architectural Oversight is Critical**
   - The ARCHitect-in-the-IDE role ensures consistency across components
   - Early architectural guidance prevents integration issues later

3. **Structured PR Reviews Maintain Quality**
   - Consistent review criteria ensure all components meet the same standards
   - Detailed feedback helps agents improve their implementations

4. **Explicit Dependencies Management**
   - Clearly documenting dependencies between components helps agents coordinate
   - The ARCHitect can help resolve dependency issues when needed

5. **Balance Between Autonomy and Guidance**
   - Agents need enough autonomy to implement creative solutions
   - But they also need clear boundaries and architectural guidance

By following this workflow, we've successfully deployed multiple remote agents to implement complex functionality while maintaining architectural integrity and code quality.
