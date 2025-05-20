# Database Schema Design

This directory contains the database schema design for the Linear Planning Agent. The schema is designed to store OAuth tokens, planning sessions, and relationships between planning entities (Epics, Features, Stories, Enablers).

## Database Schema

The database schema consists of the following tables:

### linear_tokens

Stores OAuth tokens for Linear authentication.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| organization_id | TEXT | Linear organization ID (unique) |
| access_token | TEXT | OAuth access token |
| refresh_token | TEXT | OAuth refresh token |
| app_user_id | TEXT | Linear app user ID |
| expires_at | TIMESTAMP | Token expiration timestamp |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

### planning_sessions

Stores planning session information.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| organization_id | TEXT | Linear organization ID (foreign key to linear_tokens) |
| confluence_page_url | TEXT | URL of the Confluence page used for planning |
| planning_title | TEXT | Title of the planning session |
| epic_id | TEXT | Linear epic ID (optional) |
| status | TEXT | Planning session status (e.g., 'pending', 'in_progress', 'completed') |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

### planning_features

Stores features created during planning sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| planning_session_id | INTEGER | Planning session ID (foreign key to planning_sessions) |
| feature_id | TEXT | Linear feature ID |
| title | TEXT | Feature title |
| description | TEXT | Feature description (optional) |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

### planning_stories

Stores stories associated with features.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| planning_feature_id | INTEGER | Planning feature ID (foreign key to planning_features) |
| story_id | TEXT | Linear story ID |
| title | TEXT | Story title |
| description | TEXT | Story description (optional) |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

### planning_enablers

Stores enablers created during planning sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| planning_session_id | INTEGER | Planning session ID (foreign key to planning_sessions) |
| enabler_id | TEXT | Linear enabler ID |
| title | TEXT | Enabler title |
| description | TEXT | Enabler description (optional) |
| enabler_type | TEXT | Enabler type (e.g., 'architecture', 'infrastructure', 'compliance') |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

## Entity Relationship Diagram

```
linear_tokens
    ↑
    | (1:N)
planning_sessions
    ↑
    | (1:N)
    ├── planning_features
    |       ↑
    |       | (1:N)
    |       └── planning_stories
    |
    └── planning_enablers
```

## Migration System

The database schema is managed using a migration system. Migrations are stored in the `migrations` directory and are applied in order based on their filenames.

To add a new migration:

1. Create a new SQL file in the `migrations` directory with a name like `002_add_new_table.sql`.
2. Add the SQL statements to create or modify tables, indexes, etc.
3. The migration will be automatically applied when the application starts.

## Usage

The database schema is initialized when the application starts. The `initializeDatabase` function in `src/db/index.ts` is responsible for running migrations and setting up the database.

```typescript
import { initializeDatabase } from './db';

// Initialize the database
await initializeDatabase();
```

## CRUD Operations

CRUD operations for each table are implemented in `src/db/models.ts`. These functions provide a type-safe way to interact with the database.

Example usage:

```typescript
import { 
  storeLinearToken, 
  getLinearToken, 
  createPlanningSession,
  getPlanningSessionsByOrganization 
} from './db/models';

// Store a token
await storeLinearToken(
  organizationId,
  accessToken,
  refreshToken,
  appUserId,
  expiresAt
);

// Get a token
const token = await getLinearToken(organizationId);

// Create a planning session
const session = await createPlanningSession(
  organizationId,
  confluencePageUrl,
  planningTitle
);

// Get all planning sessions for an organization
const sessions = await getPlanningSessionsByOrganization(organizationId);
```
