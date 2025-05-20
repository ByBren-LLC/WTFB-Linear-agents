# SAFe Implementation in Linear - Research Findings

## Executive Summary

This document presents the findings of our research on implementing SAFe (Scaled Agile Framework) methodology in Linear. The research focused on mapping SAFe concepts to Linear entities, establishing naming conventions, labeling strategies, and relationship management. We evaluated different approaches for representing SAFe hierarchy, managing relationships, labeling and categorization, and implementing Program Increments in Linear.

Our research found that Linear can effectively support SAFe methodology with some adaptations. The recommended approach uses a combination of Projects, Issues, and parent-child relationships to represent the SAFe hierarchy, with a consistent labeling system to identify SAFe work item types. This approach provides the best balance of completeness, usability, maintainability, and scalability.

## Table of Contents

1. [Introduction](#introduction)
2. [SAFe Methodology Overview](#safe-methodology-overview)
3. [Linear Capabilities Overview](#linear-capabilities-overview)
4. [Mapping SAFe to Linear](#mapping-safe-to-linear)
5. [Implementation Approaches](#implementation-approaches)
6. [Recommended Approach](#recommended-approach)
7. [Implementation Guidelines](#implementation-guidelines)
8. [Examples and Code Snippets](#examples-and-code-snippets)
9. [Best Practices](#best-practices)
10. [Next Steps](#next-steps)
11. [Conclusion](#conclusion)

## Introduction

The Linear Planning Agent project aims to create an agent that serves as a SAFe Technical Delivery Manager (TDM) within Linear.app, bridging high-level planning and task execution. This research was conducted to determine the optimal approach for implementing SAFe methodology in Linear, which will guide the development of the Planning Agent.

### Research Objectives

- Map SAFe concepts (Epics, Features, Stories, Enablers) to Linear entities
- Establish naming conventions, labeling strategies, and relationship management
- Document best practices for maintaining SAFe compliance in Linear
- Provide guidelines for implementing SAFe hierarchy in the Planning Agent

### Research Methodology

Our research involved:
1. Reviewing SAFe documentation to understand core concepts and requirements
2. Exploring Linear API capabilities for creating and managing issues, projects, and relationships
3. Testing different approaches for representing SAFe hierarchy, managing relationships, and implementing Program Increments
4. Evaluating each approach against criteria of completeness, usability, maintainability, and scalability

## SAFe Methodology Overview

### Core Concepts

SAFe (Scaled Agile Framework) is a set of organization and workflow patterns intended to guide enterprises in scaling lean and agile practices. It provides a structured approach to organizing work at various levels:

#### SAFe Hierarchy

SAFe organizes work in a hierarchical structure:

1. **Epic**: Large initiatives that deliver significant business value
   - Business Epics: Deliver value directly to external customers
   - Enabler Epics: Support future business functionality

2. **Feature**: Specific functionality that delivers business value
   - Business Features: Deliver value directly to users
   - Enabler Features: Support future business functionality

3. **Story**: Small, independent pieces of work that can be completed in a sprint
   - User Stories: Deliver value to users
   - Enabler Stories: Support future business functionality

4. **Technical Enablers**: Work that supports future functionality
   - Architecture Enablers
   - Infrastructure Enablers
   - Technical Debt Enablers
   - Research Enablers

#### Program Increments (PIs)

Program Increments are time-boxed planning intervals, typically 8-12 weeks long, that provide a development cadence for Agile Release Trains (ARTs). PIs include:
- PI Planning
- Execution Iterations (typically 4-5 iterations)
- Innovation and Planning (IP) Iteration
- System Demo
- Retrospective

#### Agile Release Trains (ARTs)

ARTs are long-lived teams of agile teams, typically 50-125 people, that develop and deliver solutions incrementally. ARTs align teams to a common mission and provide the necessary governance and coordination.

### SAFe Workflows

SAFe includes several key workflows:
1. **Portfolio Kanban**: Manages the flow of Epics
2. **Program Kanban**: Manages the flow of Features
3. **Team Kanban**: Manages the flow of Stories

### SAFe Roles

SAFe defines several roles, including:
- Release Train Engineer (RTE)
- Product Manager
- System Architect
- Business Owners
- Product Owner
- Scrum Master
- Development Team

## Linear Capabilities Overview

### Linear Data Model

Linear's data model includes the following key entities:

1. **Issues**: The basic unit of work in Linear
   - Can have parent-child relationships
   - Can be assigned to team members
   - Can have labels, priorities, and statuses
   - Can be part of projects and cycles

2. **Projects**: Groups of related issues
   - Can have a lead, team members, and a timeline
   - Can track progress and status

3. **Cycles**: Time-boxed periods for completing work (similar to sprints)
   - Typically 1-2 weeks long
   - Can include issues from multiple projects

4. **Teams**: Groups of users working together
   - Have their own workflows and issue tracking
   - Can have custom states and labels

5. **Labels**: Tags that can be applied to issues
   - Can be used for categorization and filtering
   - Can be team-specific or organization-wide

6. **Roadmaps**: Visual representations of planned work over time
   - Can include projects and issues
   - Can be used for long-term planning

### Linear Relationships

Linear supports the following relationships:
1. **Parent-Child**: Issues can have parent-child relationships
2. **Project-Issue**: Issues can be part of projects
3. **Cycle-Issue**: Issues can be assigned to cycles
4. **Team-Issue**: Issues belong to teams
5. **User-Issue**: Issues can be assigned to users

### Linear API Capabilities

The Linear API provides comprehensive access to Linear's data model and functionality:
- GraphQL API for querying and mutating data
- TypeScript SDK for strongly typed access
- Webhooks for real-time updates
- Support for creating, updating, and deleting all entities
- Support for managing relationships between entities

### Linear Limitations

Linear has some limitations that affect SAFe implementation:
- No built-in concept of Epics, Features, or Stories (only Issues)
- No built-in support for Program Increments
- Limited support for custom fields
- No built-in support for SAFe workflows
- No built-in support for SAFe roles

## Mapping SAFe to Linear

### Mapping Approach

Our approach to mapping SAFe to Linear focuses on leveraging Linear's existing capabilities while maintaining SAFe's core concepts and relationships. The mapping needs to be:
- **Complete**: Support all SAFe concepts
- **Intuitive**: Easy to understand and use
- **Maintainable**: Sustainable over time
- **Scalable**: Work with large numbers of work items
- **API-Friendly**: Supported by the Linear API

### Mapping Options

We evaluated several options for mapping SAFe concepts to Linear entities:

#### Option 1: Projects and Issues

- **Epics**: Represented as Projects
- **Features**: Represented as Issues (parent issues)
- **Stories**: Represented as Issues (child issues)
- **Enablers**: Represented as Issues with labels

#### Option 2: Parent-Child Issues

- **Epics**: Represented as top-level Issues with labels
- **Features**: Represented as child Issues of Epics
- **Stories**: Represented as child Issues of Features
- **Enablers**: Represented as Issues with labels

#### Option 3: Labels Only

- **All work items**: Represented as Issues
- **Hierarchy level**: Indicated by Labels (Epic, Feature, Story, Enabler)
- **Relationships**: Managed through parent-child relationships

### Evaluation of Mapping Options

| Criteria | Option 1: Projects and Issues | Option 2: Parent-Child Issues | Option 3: Labels Only |
|----------|-------------------------------|-------------------------------|------------------------|
| Completeness | Medium (Projects have limited metadata) | High (All concepts represented as Issues) | High (All concepts represented as Issues) |
| Usability | High (Clear visual separation) | Medium (Requires understanding parent-child) | Low (Relies heavily on labels) |
| Maintainability | Medium (Projects and Issues managed separately) | High (Consistent approach for all items) | Medium (Relies on consistent labeling) |
| Scalability | Medium (Projects can become unwieldy) | High (Linear handles large numbers of issues well) | High (Linear handles large numbers of issues well) |
| API Support | Medium (Different APIs for Projects and Issues) | High (Consistent API for all items) | High (Consistent API for all items) |

## Implementation Approaches

We tested several implementation approaches for key aspects of SAFe in Linear:

### Approach 1: SAFe Hierarchy Representation

#### Using Projects for Epics and Issues for Features/Stories

**Implementation:**
- Create a Project for each Epic
- Create parent Issues for Features
- Create child Issues for Stories
- Use Labels to identify Enablers

**Pros:**
- Clear visual separation between Epics and Features/Stories
- Projects provide a good overview of Epic progress
- Linear's project view works well for Epic management

**Cons:**
- Projects have limited metadata compared to Issues
- Different APIs for Projects and Issues
- Limited relationship management between Projects

#### Using parent-child relationships between Issues

**Implementation:**
- Create top-level Issues for Epics with "Epic" label
- Create child Issues for Features with "Feature" label
- Create grandchild Issues for Stories
- Use additional Labels to identify Enablers

**Pros:**
- Consistent approach for all work items
- Full support for metadata on all items
- Strong relationship management
- Consistent API for all items

**Cons:**
- Requires understanding of parent-child relationships
- May be less visually intuitive than Projects for Epics
- Requires careful management of labels

#### Using Labels to indicate hierarchy level

**Implementation:**
- Create Issues for all work items
- Use Labels to indicate hierarchy level (Epic, Feature, Story)
- Use parent-child relationships to manage hierarchy
- Use additional Labels to identify Enablers

**Pros:**
- Simple implementation
- Flexible approach
- Consistent API for all items

**Cons:**
- Relies heavily on consistent labeling
- Less intuitive for users
- Requires discipline to maintain

### Approach 2: Relationship Management

#### Using Linear's built-in parent-child relationships

**Implementation:**
- Use parent-child relationships to represent SAFe hierarchy
- Epics are parents of Features
- Features are parents of Stories

**Pros:**
- Native support in Linear
- Good UI for managing relationships
- API support for creating and managing relationships

**Cons:**
- Limited to two levels of hierarchy in the UI (though API supports more)
- No visual distinction between different types of relationships

#### Using custom fields to store relationships

**Implementation:**
- Create custom fields to store relationships
- Use field values to reference related items

**Pros:**
- Flexible approach
- Can represent different types of relationships

**Cons:**
- No native support in Linear
- Requires custom implementation
- Limited API support for custom fields

#### Using descriptions or comments to reference related items

**Implementation:**
- Include references to related items in descriptions or comments
- Use markdown links to create clickable references

**Pros:**
- Simple implementation
- No special features required

**Cons:**
- Manual maintenance
- No automated relationship management
- Prone to errors and inconsistencies

### Approach 3: Labeling and Categorization

#### Using Labels for SAFe levels

**Implementation:**
- Create Labels for SAFe levels (Epic, Feature, Story, Enabler)
- Apply appropriate Labels to Issues

**Pros:**
- Simple implementation
- Clear visual indication of SAFe level
- Good filtering capabilities

**Cons:**
- Limited to one label per concept
- May conflict with other labeling needs

#### Using Labels for SAFe categories

**Implementation:**
- Create Labels for SAFe categories (Business, Enabler, etc.)
- Apply appropriate Labels to Issues

**Pros:**
- Clear categorization
- Good filtering capabilities
- Compatible with other labeling approaches

**Cons:**
- Adds complexity to labeling system
- May require many labels

#### Using custom fields for SAFe metadata

**Implementation:**
- Create custom fields for SAFe metadata
- Use field values to store SAFe-specific information

**Pros:**
- Separates SAFe metadata from other metadata
- Can store structured data

**Cons:**
- Limited support in Linear
- Limited API support
- May not be visible in all views

### Approach 4: Program Increment Implementation

#### Using Roadmaps for Program Increments

**Implementation:**
- Create a Roadmap for each Program Increment
- Add Features to the Roadmap
- Use timeline to represent PI schedule

**Pros:**
- Visual representation of PI schedule
- Good for planning and tracking
- Native support in Linear

**Cons:**
- Limited metadata
- Limited API support
- Not designed specifically for PIs

#### Using Projects for Program Increments

**Implementation:**
- Create a Project for each Program Increment
- Add Features to the Project
- Use Project timeline to represent PI schedule

**Pros:**
- Good organization of Features
- Progress tracking
- Timeline visualization

**Cons:**
- Conflicts with using Projects for Epics
- Limited metadata
- Not designed specifically for PIs

#### Using Cycles for Program Increments

**Implementation:**
- Create a Cycle for each Program Increment
- Add Features and Stories to the Cycle
- Use Cycle dates to represent PI schedule

**Pros:**
- Native time-boxing
- Good for tracking completion
- Compatible with other approaches

**Cons:**
- Cycles are typically shorter than PIs
- Limited metadata
- Not designed specifically for PIs

## Recommended Approach

Based on our evaluation, we recommend the following approach for implementing SAFe in Linear:

### SAFe Hierarchy Representation

**Recommendation: Use parent-child relationships between Issues**

- Create top-level Issues for Epics with "Epic" label
- Create child Issues for Features with "Feature" label
- Create grandchild Issues for Stories
- Use additional Labels to identify Enablers

**Rationale:**
- Provides a consistent approach for all work items
- Supports full metadata on all items
- Enables strong relationship management
- Offers a consistent API for all items
- Scales well to large numbers of work items

### Relationship Management

**Recommendation: Use Linear's built-in parent-child relationships**

- Use parent-child relationships to represent SAFe hierarchy
- Epics are parents of Features
- Features are parents of Stories

**Rationale:**
- Native support in Linear
- Good UI for managing relationships
- Strong API support
- Consistent with recommended hierarchy representation

### Labeling and Categorization

**Recommendation: Use a combination of Labels for SAFe levels and categories**

- Create Labels for SAFe levels (Epic, Feature, Story)
- Create Labels for Enabler types (Architecture, Infrastructure, Technical Debt, Research)
- Create Labels for Business/Enabler distinction
- Apply appropriate Labels to Issues

**Rationale:**
- Provides clear visual indication of SAFe level and type
- Enables powerful filtering and reporting
- Compatible with parent-child hierarchy
- Well-supported by the Linear API

### Program Increment Implementation

**Recommendation: Use Cycles for Program Increments**

- Create a Cycle for each Program Increment
- Add Features and Stories to the Cycle
- Use Cycle dates to represent PI schedule
- Use Cycle name to indicate PI number (e.g., "PI-2023-Q1")

**Rationale:**
- Native time-boxing aligns with PI concept
- Good for tracking completion
- Compatible with recommended hierarchy and relationship approaches
- Well-supported by the Linear API

## Implementation Guidelines

### Naming Conventions

#### Issues

- **Epics**: `[EPIC] <Epic Name>`
- **Features**: `[FEATURE] <Feature Name>`
- **Stories**: `<Story Name>`
- **Enablers**: `[ENABLER] <Enabler Name>`

#### Labels

- **SAFe Levels**: Epic, Feature, Story
- **Enabler Types**: Architecture, Infrastructure, Technical Debt, Research
- **SAFe Categories**: Business, Enabler
- **Additional Labels**: As needed for specific contexts

#### Cycles

- **Program Increments**: `PI-<Year>-<Quarter>` (e.g., "PI-2023-Q1")
- **Iterations**: `<PI Name>-I<Iteration Number>` (e.g., "PI-2023-Q1-I1")

### Workflow States

We recommend configuring Linear workflow states to align with SAFe:

- **Backlog**: Items that are not yet ready for implementation
- **Refinement**: Items that are being refined and estimated
- **Ready**: Items that are ready for implementation
- **In Progress**: Items that are being implemented
- **In Review**: Items that are being reviewed
- **Done**: Items that are complete
- **Canceled**: Items that have been canceled

### Priority Levels

We recommend using Linear's priority levels as follows:

- **Urgent**: Critical items that must be addressed immediately
- **High**: Important items for the current PI
- **Medium**: Normal priority items
- **Low**: Items that can be deferred if necessary
- **No Priority**: Items that have not yet been prioritized

## Examples and Code Snippets

### Creating an Epic

```typescript
import { LinearClient } from '@linear/sdk';

async function createEpic(
  linearClient: LinearClient,
  teamId: string,
  title: string,
  description: string
) {
  // Get the Epic label ID
  const labels = await linearClient.issueLabels();
  const epicLabel = labels.nodes.find(label => label.name === 'Epic');
  
  if (!epicLabel) {
    throw new Error('Epic label not found');
  }
  
  // Create the Epic
  const response = await linearClient.issueCreate({
    teamId,
    title: `[EPIC] ${title}`,
    description,
    labelIds: [epicLabel.id]
  });
  
  if (!response.success) {
    throw new Error(`Failed to create Epic: ${response.error}`);
  }
  
  return response.issue;
}
```

### Creating a Feature as a child of an Epic

```typescript
import { LinearClient } from '@linear/sdk';

async function createFeature(
  linearClient: LinearClient,
  teamId: string,
  epicId: string,
  title: string,
  description: string
) {
  // Get the Feature label ID
  const labels = await linearClient.issueLabels();
  const featureLabel = labels.nodes.find(label => label.name === 'Feature');
  
  if (!featureLabel) {
    throw new Error('Feature label not found');
  }
  
  // Create the Feature
  const response = await linearClient.issueCreate({
    teamId,
    title: `[FEATURE] ${title}`,
    description,
    labelIds: [featureLabel.id],
    parentId: epicId
  });
  
  if (!response.success) {
    throw new Error(`Failed to create Feature: ${response.error}`);
  }
  
  return response.issue;
}
```

### Creating a Story as a child of a Feature

```typescript
import { LinearClient } from '@linear/sdk';

async function createStory(
  linearClient: LinearClient,
  teamId: string,
  featureId: string,
  title: string,
  description: string
) {
  // Create the Story
  const response = await linearClient.issueCreate({
    teamId,
    title,
    description,
    parentId: featureId
  });
  
  if (!response.success) {
    throw new Error(`Failed to create Story: ${response.error}`);
  }
  
  return response.issue;
}
```

### Creating an Enabler

```typescript
import { LinearClient } from '@linear/sdk';

type EnablerType = 'Architecture' | 'Infrastructure' | 'Technical Debt' | 'Research';

async function createEnabler(
  linearClient: LinearClient,
  teamId: string,
  parentId: string | null,
  title: string,
  description: string,
  enablerType: EnablerType
) {
  // Get the Enabler label ID
  const labels = await linearClient.issueLabels();
  const enablerLabel = labels.nodes.find(label => label.name === 'Enabler');
  const typeLabel = labels.nodes.find(label => label.name === enablerType);
  
  if (!enablerLabel) {
    throw new Error('Enabler label not found');
  }
  
  const labelIds = [enablerLabel.id];
  
  if (typeLabel) {
    labelIds.push(typeLabel.id);
  }
  
  // Create the Enabler
  const response = await linearClient.issueCreate({
    teamId,
    title: `[ENABLER] ${title}`,
    description,
    labelIds,
    ...(parentId ? { parentId } : {})
  });
  
  if (!response.success) {
    throw new Error(`Failed to create Enabler: ${response.error}`);
  }
  
  return response.issue;
}
```

### Creating a Program Increment (Cycle)

```typescript
import { LinearClient } from '@linear/sdk';

async function createProgramIncrement(
  linearClient: LinearClient,
  teamId: string,
  name: string,
  startDate: Date,
  endDate: Date
) {
  // Create the Cycle
  const response = await linearClient.cycleCreate({
    teamId,
    name,
    startsAt: startDate.toISOString(),
    endsAt: endDate.toISOString()
  });
  
  if (!response.success) {
    throw new Error(`Failed to create Program Increment: ${response.error}`);
  }
  
  return response.cycle;
}
```

### Assigning Features to a Program Increment

```typescript
import { LinearClient } from '@linear/sdk';

async function assignFeaturesToPI(
  linearClient: LinearClient,
  cycleId: string,
  featureIds: string[]
) {
  const results = [];
  
  for (const featureId of featureIds) {
    const response = await linearClient.issueUpdate(featureId, {
      cycleId
    });
    
    if (!response.success) {
      console.warn(`Failed to assign feature ${featureId} to PI ${cycleId}: ${response.error}`);
    } else {
      results.push(response.issue);
    }
  }
  
  return results;
}
```

## Best Practices

### Maintaining SAFe Compliance

1. **Consistent Labeling**: Always apply the appropriate SAFe level and category labels to issues.
2. **Proper Hierarchy**: Maintain the correct parent-child relationships between Epics, Features, and Stories.
3. **Regular Refinement**: Regularly refine and update the backlog to ensure it reflects current priorities.
4. **PI Planning**: Conduct PI planning sessions and assign Features to PIs.
5. **Enabler Allocation**: Ensure that 20-30% of capacity is allocated to Enablers.

### Using Linear Effectively

1. **Views and Filters**: Create saved views and filters for different SAFe perspectives (e.g., Epic view, Feature view, PI view).
2. **Automation**: Use Linear's automation features to streamline workflows.
3. **Templates**: Create issue templates for Epics, Features, Stories, and Enablers.
4. **Integrations**: Leverage Linear's integrations with other tools to enhance the SAFe implementation.
5. **API**: Use the Linear API to automate repetitive tasks and ensure consistency.

### Planning Agent Implementation

1. **Entity Mapping**: Implement the recommended entity mapping in the Planning Agent.
2. **Relationship Management**: Ensure the Planning Agent maintains proper relationships between SAFe entities.
3. **Labeling**: Implement consistent labeling in the Planning Agent.
4. **PI Planning**: Support PI planning in the Planning Agent.
5. **Enabler Management**: Ensure the Planning Agent properly manages Enablers.

## Next Steps

1. **Create Required Labels**: Set up the necessary labels in Linear for SAFe implementation.
2. **Configure Workflow States**: Configure Linear workflow states to align with SAFe.
3. **Create Templates**: Develop templates for Epics, Features, Stories, and Enablers.
4. **Implement Planning Agent**: Develop the Planning Agent based on the recommendations in this document.
5. **Train Users**: Provide training on the SAFe implementation in Linear.
6. **Monitor and Adjust**: Regularly review the implementation and make adjustments as needed.

## Conclusion

Linear can effectively support SAFe methodology with some adaptations. The recommended approach uses a combination of Issues with parent-child relationships to represent the SAFe hierarchy, with a consistent labeling system to identify SAFe work item types. This approach provides the best balance of completeness, usability, maintainability, and scalability.

By following the guidelines and best practices outlined in this document, the Planning Agent can successfully implement SAFe methodology in Linear, providing a powerful tool for managing complex projects at scale.

---

## Appendix: SAFe Glossary

- **Agile Release Train (ART)**: A long-lived team of Agile teams that develops and delivers solutions incrementally.
- **Epic**: A significant initiative that requires portfolio-level oversight due to its scale and impact.
- **Feature**: A service that fulfills a stakeholder need and is delivered by a single ART.
- **Story**: A short description of a small piece of desired functionality.
- **Enabler**: Work that supports the activities needed to extend the Architectural Runway.
- **Program Increment (PI)**: A timebox during which an ART delivers incremental value.
- **PI Planning**: A cadence-based event where all teams on the ART plan and commit to a set of objectives for the upcoming PI.
- **Architectural Runway**: The existing code, components, and technical infrastructure needed to implement near-term features without excessive redesign and delay.
