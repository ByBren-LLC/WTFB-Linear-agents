# Program Increment (PI) Planning Support

This document describes the Program Increment (PI) Planning support in the Linear Planning Agent.

## Overview

Program Increment (PI) Planning is a critical component of the Scaled Agile Framework (SAFe) methodology. It is a face-to-face event where teams plan the next Program Increment, typically 8-12 weeks long, that provides a development cadence for Agile Release Trains (ARTs).

The Linear Planning Agent provides support for PI Planning by:

1. Creating and managing Program Increments in Linear
2. Assigning features to Program Increments
3. Tracking Program Increment progress
4. Extracting PI information from Confluence documents
5. Creating PI Objectives and Risks

## Implementation

The PI Planning support is implemented in the following components:

### PI Model

The `src/safe/pi-model.ts` file defines the data models for Program Increments and related concepts in SAFe methodology, including:

- `ProgramIncrement`: Represents a Program Increment
- `PIPlanning`: Represents a PI Planning event
- `PIIteration`: Represents an iteration within a PI
- `PIFeature`: Represents a feature assigned to a PI
- `PIObjective`: Represents a PI Objective
- `PIRisk`: Represents a risk identified during PI Planning

### PI Manager

The `src/safe/pi-planning.ts` file implements the `PIManager` class, which provides methods for:

- Creating Program Increments
- Assigning features to Program Increments
- Getting Program Increments
- Creating PI Iterations
- Creating PI Objectives
- Creating PI Risks

### PI Extractor

The `src/planning/pi-extractor.ts` file implements the `PIExtractor` class, which extracts PI information from Confluence documents, including:

- Program Increments
- Features
- Objectives
- Risks

### Database Models

The `src/db/models.ts` file defines the database models for storing PI information, including:

- `ProgramIncrementDB`: Represents a Program Increment in the database
- `PIFeatureDB`: Represents a feature assigned to a PI in the database
- `PIObjectiveDB`: Represents a PI Objective in the database
- `PIRiskDB`: Represents a PI Risk in the database

### API Endpoints

The `src/routes/pi-planning.ts` file implements API endpoints for PI Planning functionality, including:

- Creating Program Increments
- Getting Program Increments
- Updating Program Increments
- Deleting Program Increments
- Assigning features to Program Increments
- Creating Program Increments from Confluence documents

## Linear Implementation

In Linear, Program Increments are represented as cycles. This allows us to:

1. Assign issues (features, stories, etc.) to Program Increments
2. Track progress of Program Increments
3. Create iterations within Program Increments

PI Objectives and Risks are represented as issues with specific labels.

## Usage

### Creating a Program Increment

```typescript
const piManager = new PIManager(accessToken);

const pi = await piManager.createProgramIncrement(
  teamId,
  'PI-2023-Q1',
  new Date('2023-01-01'),
  new Date('2023-03-31'),
  'First Program Increment of 2023'
);
```

### Assigning Features to a Program Increment

```typescript
const piManager = new PIManager(accessToken);

const features = await piManager.assignFeaturesToPI(
  piId,
  ['feature-1', 'feature-2', 'feature-3']
);
```

### Creating a Program Increment from Confluence

```typescript
const planningAgent = new PlanningAgent(accessToken);

const pi = await planningAgent.createProgramIncrementFromConfluence(
  'https://confluence.example.com/pages/viewpage.action?pageId=123456',
  teamId
);
```

## API Endpoints

### Create a Program Increment

```
POST /api/pi-planning/program-increments
```

Request body:

```json
{
  "teamId": "team-123",
  "name": "PI-2023-Q1",
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-03-31T23:59:59Z",
  "description": "First Program Increment of 2023",
  "organizationId": "org-123"
}
```

### Get all Program Increments for an organization

```
GET /api/pi-planning/program-increments?organizationId=org-123
```

### Get a Program Increment by ID

```
GET /api/pi-planning/program-increments/123
```

### Update a Program Increment

```
PUT /api/pi-planning/program-increments/123
```

Request body:

```json
{
  "name": "PI-2023-Q1-Updated",
  "startDate": "2023-01-15T00:00:00Z",
  "endDate": "2023-04-15T23:59:59Z",
  "description": "Updated description",
  "status": "execution"
}
```

### Delete a Program Increment

```
DELETE /api/pi-planning/program-increments/123
```

### Assign features to a Program Increment

```
POST /api/pi-planning/program-increments/123/features
```

Request body:

```json
{
  "featureIds": ["feature-1", "feature-2", "feature-3"]
}
```

### Create a Program Increment from Confluence

```
POST /api/pi-planning/from-confluence
```

Request body:

```json
{
  "confluencePageUrl": "https://confluence.example.com/pages/viewpage.action?pageId=123456",
  "teamId": "team-123",
  "organizationId": "org-123"
}
```

## Future Enhancements

1. Support for PI Planning events
2. Support for PI dependencies
3. Support for PI capacity planning
4. Support for PI retrospectives
5. Integration with other SAFe tools
