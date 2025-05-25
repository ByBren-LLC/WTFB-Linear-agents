# Technical Enabler Implementation: Database Schema Integration

## Enabler Information
- **Enabler ID**: LIN-23
- **Type**: Infrastructure
- **Story Points**: 5
- **Priority**: Medium

## Enabler Description
Resolve database schema conflicts and integration issues between the existing OAuth token management schema and the newly integrated planning session and synchronization schemas. Ensure all database models work together cohesively.

## Justification
The integration brought in database schemas for planning sessions, synchronization state, and additional token management that may conflict with existing schemas. These need to be harmonized to ensure:
- No table/column conflicts
- Proper foreign key relationships
- Consistent data types and constraints
- Unified migration strategy

## Acceptance Criteria
- [ ] All database schemas are compatible and non-conflicting
- [ ] Database migrations run successfully
- [ ] All database operations work correctly
- [ ] Foreign key relationships are properly established
- [ ] Data integrity constraints are maintained
- [ ] Both PostgreSQL and SQLite schemas are aligned
- [ ] Existing OAuth functionality continues to work

## Technical Context
### Existing Codebase Analysis
Key database-related files:
- `src/db/schema.sql` - Existing OAuth token schema
- `src/db/models.ts` - Database model functions
- `src/db/migrations/` - Database migration files
- `src/sync/sync-store.ts` - Synchronization state storage
- `src/planning/session-manager.ts` - Planning session storage
- `src/auth/tokens.ts` - Token management

### System Architecture Impact
Database schema integration will:
- Unify all data storage under consistent schemas
- Enable proper relationships between entities
- Support both OAuth and planning functionality
- Maintain data integrity across all operations

### Dependencies
- Should be started after Module Export Resolution (Agent 2)
- Can work in parallel with Type Definition Fixes (Agent 3)
- Requires Linear SDK Compatibility Layer (Agent 1) to be complete

### Technical Constraints
- Must maintain existing OAuth token functionality
- Must support both PostgreSQL and SQLite
- Cannot break existing data
- Must follow existing migration patterns

## Implementation Plan
### Files to Create/Modify
- `src/db/schema.sql` - Update with integrated schemas
- `src/db/migrations/` - Create migration files for new schemas
- `src/db/models.ts` - Update model functions for new schemas
- `src/sync/models.ts` - Database models for sync functionality
- `src/planning/models.ts` - Database models for planning sessions

### Key Components/Functions
1. **Schema Harmonization**
   - Merge planning session schema with existing schema
   - Add synchronization state tables
   - Ensure no naming conflicts
   - Establish proper foreign key relationships

2. **Migration Strategy**
   - Create migrations for new tables
   - Update existing tables if needed
   - Ensure backward compatibility
   - Support both PostgreSQL and SQLite

3. **Model Functions**
   - Update database model functions
   - Add new model functions for planning and sync
   - Ensure consistent error handling
   - Maintain transaction support

### Technical Design
```sql
-- Planning Sessions Table
CREATE TABLE planning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR(255) NOT NULL,
  confluence_document_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Synchronization State Table
CREATE TABLE sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR(255) NOT NULL,
  last_sync_timestamp TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'idle',
  conflict_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Linear Issues Cache Table
CREATE TABLE linear_issues_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linear_issue_id VARCHAR(255) UNIQUE NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
  issue_data JSONB,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

## Testing Approach
### Unit Tests
- Test database model functions
- Test schema validation
- Test migration scripts
- Test foreign key constraints

### Integration Tests
- Test full database operations
- Test with both PostgreSQL and SQLite
- Test migration rollback scenarios
- Test data integrity constraints

## Implementation Steps
1. Analyze existing database schema and identify conflicts
2. Design unified schema that supports all functionality
3. Create migration files for new tables and schema changes
4. Update database model functions for new schemas
5. Test migrations on both PostgreSQL and SQLite
6. Verify all existing functionality still works
7. Test new planning and sync functionality with database
8. Create comprehensive tests for all database operations
9. Document schema changes and migration strategy

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] Database schemas are compatible and non-conflicting
- [ ] Migrations run successfully on both PostgreSQL and SQLite
- [ ] All database operations work correctly
- [ ] Foreign key relationships are properly established
- [ ] Existing OAuth functionality continues to work
- [ ] Tests pass for all database operations
- [ ] Code reviewed and approved
- [ ] Documentation updated

## Notes for Implementation
- Carefully analyze existing schema before making changes
- Test migrations thoroughly on both database types
- Ensure backward compatibility with existing data
- Follow existing naming conventions and patterns
- Consider performance implications of new schemas
- Document any breaking changes clearly
