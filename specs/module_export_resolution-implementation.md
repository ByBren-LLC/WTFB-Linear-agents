# Technical Enabler Implementation: Module Export Resolution

## Enabler Information
- **Enabler ID**: LIN-21
- **Type**: Technical Debt
- **Story Points**: 5
- **Priority**: High

## Enabler Description
Resolve missing module exports and import/export conflicts that are preventing TypeScript compilation. The integration of multiple branches has created situations where modules are importing functions/types that are not properly exported, causing 45+ compilation errors.

## Justification
The integrated codebase has several critical missing exports that prevent compilation:
- Planning state management modules are missing exports
- Database model functions are not properly exported
- Some modules have circular dependency issues
- Import paths are incorrect or pointing to non-existent modules

## Acceptance Criteria
- [ ] All missing module exports are resolved
- [ ] All import statements successfully resolve to exported functions/types
- [ ] No circular dependency issues remain
- [ ] TypeScript compilation succeeds for all affected files
- [ ] All existing functionality is preserved
- [ ] No breaking changes to existing working code

## Technical Context
### Existing Codebase Analysis
Key files with missing export issues:
- `src/planning/state.ts` - Missing PlanningSessionStatus export
- `src/db/models.ts` - Missing database function exports (getConfluenceAccessToken, getConfluenceToken, storeConfluenceToken, etc.)
- `src/planning/extractor.ts` - Import issues with planning models
- `src/sync/sync-store.ts` - Missing getDatabase export
- `src/api/planning.ts` - Cannot find planning state module

### System Architecture Impact
Resolving these exports will:
- Enable proper TypeScript compilation
- Restore module dependency relationships
- Allow proper testing of integrated functionality
- Enable other agents to proceed with their work

### Dependencies
- Must be completed after Linear SDK Compatibility Layer (Agent 1)
- Blocks Type Definition Fixes (Agent 3) and Database Schema Integration (Agent 4)

### Technical Constraints
- Cannot break existing working functionality
- Must maintain backward compatibility
- Should not introduce new circular dependencies
- Must follow existing export patterns in the codebase

## Implementation Plan
### Files to Create/Modify
- `src/planning/state.ts` - Create missing state management exports
- `src/db/models.ts` - Add missing database function exports
- `src/planning/models.ts` - Ensure all planning types are exported
- `src/sync/models.ts` - Add missing sync-related exports
- Various import statements across affected files

### Key Components/Functions
1. **Planning State Management**
   - Export PlanningSessionStatus enum/type
   - Export PlanningSessionState interface
   - Export state management functions

2. **Database Model Exports**
   - Export getConfluenceAccessToken function
   - Export getConfluenceToken function
   - Export storeConfluenceToken function
   - Export getDatabase function
   - Export ProgramIncrementDB type

3. **Planning Model Exports**
   - Ensure all Epic, Feature, Story, Enabler types are exported
   - Export planning document interfaces
   - Export extractor and session manager types

### Technical Design
```typescript
// src/planning/state.ts - Create comprehensive state exports
export enum PlanningSessionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface PlanningSessionState {
  id: string;
  status: PlanningSessionStatus;
  progress: number;
  errors: string[];
  // ... other state properties
}

// src/db/models.ts - Add missing database exports
export async function getConfluenceAccessToken(organizationId: string): Promise<string | null> {
  // Implementation
}

export async function getConfluenceToken(organizationId: string): Promise<any> {
  // Implementation  
}

export async function storeConfluenceToken(organizationId: string, token: any): Promise<void> {
  // Implementation
}

export function getDatabase(): Database {
  // Implementation
}

export interface ProgramIncrementDB {
  // Interface definition
}
```

## Testing Approach
### Unit Tests
- Test that all exports are accessible from importing modules
- Verify function signatures match expected interfaces
- Test that no circular dependencies exist

### Integration Tests
- Test that modules can successfully import and use exported functions
- Verify that existing functionality still works after export changes
- Test compilation succeeds for all affected files

## Implementation Steps
1. Audit all TypeScript compilation errors related to missing exports
2. Create missing state management exports in planning modules
3. Add missing database function exports to models.ts
4. Ensure all planning types and interfaces are properly exported
5. Fix import statements that reference non-existent exports
6. Resolve any circular dependency issues
7. Test compilation and fix any remaining import/export issues
8. Verify all existing functionality still works
9. Update any documentation affected by export changes

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] TypeScript compilation succeeds for all affected files
- [ ] All missing exports are resolved
- [ ] No circular dependency issues remain
- [ ] Existing functionality is preserved
- [ ] Tests pass for all affected modules
- [ ] Code reviewed and approved
- [ ] Documentation updated if needed

## Notes for Implementation
- Focus on creating the minimal exports needed to resolve compilation errors
- Don't over-export - only export what's actually needed by other modules
- Follow existing export patterns in the codebase
- Be careful not to introduce circular dependencies
- Test compilation frequently during implementation
- Preserve existing function signatures and interfaces
