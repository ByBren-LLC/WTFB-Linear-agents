# Planning Session State Management

This module provides state management for planning sessions in the Linear Planning Agent. It tracks the state of planning sessions, including progress, errors, and results, and provides a clean API for updating and querying the state.

## Components

### State Models (`state.ts`)

Defines the interfaces and types for planning session state management:

- `PlanningSessionStatus`: Enum representing the possible states of a planning session (pending, processing, completed, failed)
- `PlanningSessionError`: Interface representing an error that occurred during a planning session
- `PlanningSessionWarning`: Interface representing a warning that occurred during a planning session
- `PlanningSessionResult`: Interface representing the results of a planning session (created issues)
- `PlanningSessionState`: Interface representing the complete state of a planning session
- `PlanningSessionUpdate`: Interface representing an update to a planning session state

### State Manager (`state-manager.ts`)

Provides a class for managing the state of planning sessions:

- `PlanningSessionStateManager`: Class for managing the state of a planning session
  - `initialize()`: Initializes the planning session state from the database
  - `getState()`: Gets the current state of the planning session
  - `updateState()`: Updates the planning session state
  - `setProgress()`: Sets the progress of the planning session
  - `setStatus()`: Sets the status of the planning session
  - `addError()`: Adds an error to the planning session
  - `addWarning()`: Adds a warning to the planning session
  - `setResult()`: Sets the result of the planning session

### State Store (`state-store.ts`)

Provides a class for storing and retrieving planning session state:

- `PlanningSessionStateStore`: Class for storing and retrieving planning session state
  - `getStateManager()`: Gets a state manager for a planning session
  - `getState()`: Gets the state of a planning session
  - `getStatesByOrganization()`: Gets the states of all planning sessions for an organization
  - `deleteState()`: Deletes a planning session

### Process Manager (`process.ts`)

Provides a function for starting and managing the planning process:

- `startPlanningProcess()`: Starts the planning process for a planning session

## API Endpoints (`api/planning.ts`)

Provides API endpoints for managing planning sessions:

- `POST /planning/sessions`: Create a new planning session
- `GET /planning/sessions/:id`: Get a planning session
- `GET /planning/sessions?organizationId=:organizationId`: Get planning sessions by organization
- `POST /planning/sessions/:id/start`: Start a planning session
- `DELETE /planning/sessions/:id`: Delete a planning session

## Usage

### Creating a Planning Session

```typescript
import { createPlanningSession } from '../db/models';
import { planningSessionStateStore } from '../planning/state-store';

// Create a planning session in the database
const session = await createPlanningSession(
  organizationId,
  confluencePageUrl,
  title
);

// Initialize the state
const stateManager = await planningSessionStateStore.getStateManager(session.id.toString());
await stateManager.initialize();
```

### Getting a Planning Session State

```typescript
import { planningSessionStateStore } from '../planning/state-store';

// Get the state of a planning session
const state = await planningSessionStateStore.getState(sessionId);
```

### Updating a Planning Session State

```typescript
import { planningSessionStateStore } from '../planning/state-store';
import { PlanningSessionStatus } from '../planning/state';

// Get a state manager for a planning session
const stateManager = await planningSessionStateStore.getStateManager(sessionId);

// Update the status
await stateManager.setStatus(PlanningSessionStatus.PROCESSING);

// Update the progress
await stateManager.setProgress(50, 'Processing');

// Add an error
await stateManager.addError('Something went wrong', 'ERROR_CODE', { details: 'Additional details' });

// Add a warning
await stateManager.addWarning('Something might be wrong', 'WARNING_CODE', { details: 'Additional details' });

// Set the result
await stateManager.setResult({
  epics: { 'epic-1': 'linear-epic-1' },
  features: { 'feature-1': 'linear-feature-1' },
  stories: { 'story-1': 'linear-story-1' },
  enablers: { 'enabler-1': 'linear-enabler-1' }
});
```

### Starting a Planning Process

```typescript
import { startPlanningProcess } from '../planning/process';

// Start the planning process
await startPlanningProcess(sessionId);
```

## Testing

The module includes comprehensive tests for all components:

- `tests/planning/state-manager.test.ts`: Tests for the `PlanningSessionStateManager` class
- `tests/planning/state-store.test.ts`: Tests for the `PlanningSessionStateStore` class

Run the tests with:

```bash
npm test
```
