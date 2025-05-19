# Technical Enabler Implementation: Database Schema Design

## Enabler Information
- **Enabler ID**: TE-1
- **Type**: Architecture
- **Story Points**: 3
- **Priority**: High

## Enabler Description
Design and implement the database schema for the Linear Planning Agent. This includes tables for storing OAuth tokens, planning sessions, and other state information required by the agent.

## Justification
A well-designed database schema is necessary for storing tokens, planning sessions, and other state information. Without proper data persistence, the agent would not be able to maintain state across restarts or scale horizontally.

## Acceptance Criteria
- [ ] Schema design is complete with all necessary tables
- [ ] Tables are created with proper relationships
- [ ] Indexes are created for performance
- [ ] Migrations are implemented for future changes
- [ ] Database connection is properly configured
- [ ] Basic CRUD operations are implemented for each table

## Technical Context
### Existing Codebase Analysis
The current implementation has a basic database connection set up in `src/db/connection.ts` using PostgreSQL. There's also a placeholder for database models in `src/db/models.ts`. The OAuth implementation in `src/auth/oauth.ts` and token management in `src/auth/tokens.ts` currently use in-memory storage but need to be updated to use the database.

Key files:
- `src/db/connection.ts`: Sets up the database connection using the `pg` package
- `src/db/models.ts`: Should contain database models but is currently minimal
- `src/auth/tokens.ts`: Uses in-memory storage for tokens
- `src/auth/oauth.ts`: Implements OAuth flow but doesn't store tokens in a database

The current database connection is set up as follows:
```typescript
import { Pool } from 'pg';
import * as logger from '../utils/logger';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Error connecting to database', { error: err });
  } else {
    logger.info('Database connection successful', { timestamp: res.rows[0].now });
  }
});
```

### System Architecture Impact
The database schema is a foundational component of the system architecture. It will impact:
- How data is stored and retrieved
- Performance of database operations
- Scalability of the application
- Security of sensitive data like tokens

### Dependencies
- PostgreSQL database must be available
- Environment variables for database connection must be configured
- Database user must have appropriate permissions

### Technical Constraints
- Must use PostgreSQL as the database
- Must support encryption for sensitive data
- Must be designed for performance and scalability
- Must include proper indexes for frequently queried fields
- Must include timestamps for auditing and debugging

## Implementation Plan
### Files to Create/Modify
- `src/db/models.ts`: Define database models and interfaces
- `src/db/migrations/`: Create a new directory for database migrations
- `src/db/migrations/001_initial_schema.sql`: Create initial schema migration
- `src/db/migrations/index.ts`: Create migration runner

### Key Components/Functions
1. **Database Models**: Define TypeScript interfaces for database tables
2. **Migration System**: Implement a system for running migrations
3. **CRUD Operations**: Implement basic CRUD operations for each table
4. **Connection Management**: Enhance connection management for better performance

### Technical Design
The database schema will include the following tables:

1. **linear_tokens**
```sql
CREATE TABLE linear_tokens (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  app_user_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

2. **planning_sessions**
```sql
CREATE TABLE planning_sessions (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL,
  confluence_page_url TEXT NOT NULL,
  planning_title TEXT NOT NULL,
  epic_id TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id) REFERENCES linear_tokens(organization_id)
);
```

3. **planning_features**
```sql
CREATE TABLE planning_features (
  id SERIAL PRIMARY KEY,
  planning_session_id INTEGER NOT NULL,
  feature_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (planning_session_id) REFERENCES planning_sessions(id)
);
```

4. **planning_stories**
```sql
CREATE TABLE planning_stories (
  id SERIAL PRIMARY KEY,
  planning_feature_id INTEGER NOT NULL,
  story_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (planning_feature_id) REFERENCES planning_features(id)
);
```

5. **planning_enablers**
```sql
CREATE TABLE planning_enablers (
  id SERIAL PRIMARY KEY,
  planning_session_id INTEGER NOT NULL,
  enabler_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  enabler_type TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (planning_session_id) REFERENCES planning_sessions(id)
);
```

### Technology Choices
- **PostgreSQL**: Chosen for its reliability, features, and support for JSON data
- **node-postgres (pg)**: Chosen for its performance and wide adoption
- **SQL Migrations**: Chosen for simplicity and direct control over schema changes

### Configuration Changes
- Add `DATABASE_URL` environment variable to `.env` file
- Add database configuration to `docker-compose.yml`
- Update `Dockerfile` to include database migration step

## Testing Approach
### Unit Tests
- Test database connection and error handling
- Test CRUD operations for each table
- Test migration system

### Integration Tests
- Test database schema with actual PostgreSQL instance
- Test relationships between tables
- Test performance with realistic data volumes

### Performance Tests
- Test connection pool under load
- Test query performance with large datasets
- Test concurrent operations

## Implementation Steps
1. Create the migration system
   - Create `src/db/migrations/` directory
   - Create `src/db/migrations/001_initial_schema.sql` with table definitions
   - Create `src/db/migrations/index.ts` to run migrations

2. Update database models
   - Define TypeScript interfaces for each table in `src/db/models.ts`
   - Implement CRUD operations for each table

3. Enhance connection management
   - Implement connection pooling optimizations
   - Add error handling and retry logic

4. Update existing code to use the database
   - Update `src/auth/tokens.ts` to use the database
   - Update `src/auth/oauth.ts` to store tokens in the database

5. Add indexes for performance
   - Add indexes to frequently queried fields
   - Add composite indexes for common query patterns

6. Implement database utilities
   - Add transaction support
   - Add batch operation support
   - Add query logging for debugging

## SAFe Considerations
- This enabler supports the SAFe principle of "Build incrementally with fast, integrated learning cycles" by establishing a solid foundation for data persistence.
- It contributes to architectural runway by providing a well-designed database schema that other features can build upon.
- It follows the SAFe practice of "Develop on Cadence, Release on Demand" by implementing a migration system that allows for incremental schema changes.

## Security Considerations
- Sensitive data like tokens must be encrypted
- Database connection string must be secured
- Database user should have minimal required permissions
- Prepared statements must be used to prevent SQL injection
- Error messages should not expose sensitive information

## Performance Considerations
- Connection pooling must be properly configured
- Indexes must be created for frequently queried fields
- Queries should be optimized for performance
- Large result sets should be paginated
- Long-running transactions should be avoided

## Documentation Requirements
- Document the database schema with entity-relationship diagrams
- Document the migration system and how to create new migrations
- Document the CRUD operations and how to use them
- Document the security measures implemented
- Add inline code comments explaining complex logic

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] Schema design is complete and implemented
- [ ] Migrations are implemented and tested
- [ ] CRUD operations are implemented and tested
- [ ] Indexes are created for performance
- [ ] Documentation is complete
- [ ] Code follows project coding standards
- [ ] Security considerations are addressed
- [ ] Performance considerations are addressed

## Notes for Implementation
- Consider using a migration library like `node-pg-migrate` if the custom migration system becomes too complex
- Be careful with index creation, as too many indexes can slow down write operations
- Consider using PostgreSQL's JSON capabilities for flexible data storage where appropriate
- Make sure to handle database connection errors gracefully
- Consider implementing a retry mechanism for transient database errors
