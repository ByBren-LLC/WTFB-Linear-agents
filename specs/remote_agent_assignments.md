# Remote Agent Assignments

This file contains ready-to-use assignments for remote agents.

## LIN-ARCH-02-S01 - TypeScript & Linear SDK Specialist

**INITIAL AGENT MESSAGE (Following Template):**

```markdown
# Remote Agent Assignment: TypeScript & Linear SDK Compatibility Fixes

I'm assigning you to implement the TypeScript & Linear SDK Compatibility Fixes Technical Enabler for our Linear Planning Agent project. This is a HIGH PRIORITY component that will resolve Docker deployment blockers caused by Linear SDK v2.6.0 interface changes.

Please:
1. Pull the latest code from the dev branch of our repository: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Read your kickoff note: https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/main/specs/kickoff_notes/typescript_linear_sdk_fixes_kickoff.md
3. Create a Linear issue as instructed in the kickoff note (LIN-27 already exists - assign to yourself)
4. Study the implementation document referenced in the kickoff note
5. Implement the task according to the specifications
6. Create a branch named `feature/comprehensive-typescript-linear-sdk-fixes`
7. Submit a PR when complete

This is a HIGH PRIORITY task that blocks Docker deployment. Previous agents (LIN-22, LIN-23, LIN-24, LIN-25) completed successfully, and you are handling the remaining infrastructure issues.

Please let me know if you have any questions or need clarification on any aspect of the implementation.
```

**KICKOFF NOTE NEEDED:**

- Create: `specs/kickoff_notes/typescript_linear_sdk_fixes_kickoff.md`
- Reference: Implementation document with detailed TypeScript patterns

---

## URGENT: TypeScript Strict Mode Compliance - 4-Agent Coordinated Effort

### Agent #1: Jest Mock Type Infrastructure (LIN-39)

**INITIAL AGENT MESSAGE:**

```markdown
# Remote Agent Assignment: Jest Mock Type Infrastructure Fixes

I'm assigning you to fix Jest Mock Type Infrastructure issues as part of a coordinated 4-agent effort to resolve TypeScript strict mode compliance. This is URGENT - blocking all tests.

**Linear Issue:** LIN-39
**Branch:** fix/jest-mock-type-infrastructure
**Priority:** CRITICAL - Blocking all tests

## Context & Coordination
**REQUIRED READING:** Please read the coordination document first:
`specs/implementation_docs/typescript_strict_mode_coordination.md`

This explains how your work fits with 3 other agents working in parallel on different TypeScript issues.

## Setup Instructions
1. Pull latest from dev branch: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Create branch: fix/jest-mock-type-infrastructure
3. Run `npm test` to see the current failures (expect 25+ TypeScript errors)
4. Focus ONLY on Jest mock type issues (your isolated scope)

## Problem Analysis
**Root Cause:** Jest configuration now enforces TypeScript strict mode, exposing mock type inference issues that were previously ignored.

**Current Error Pattern:**
```

error TS2322: Type 'Mock<Promise<never>, [], any>' is not assignable to type 'Mock<Promise<any>, [any, any?], any>'

```

## Specific Technical Issues to Fix

### Issue 1: Mock Return Type Inference
**Problem:** `jest.fn().mockResolvedValue({})` inferred as `never` type
**Files:** All test files with mock functions
**Solution Pattern:**
```typescript
// BEFORE (broken):
mockFunction: jest.fn().mockResolvedValue({})

// AFTER (fixed):
mockFunction: jest.fn().mockResolvedValue({} as any)
// OR with proper typing:
mockFunction: jest.fn<Promise<ExpectedType>, [ParamType]>().mockResolvedValue(expectedValue)
```

### Issue 2: Mock Implementation Type Safety

**Problem:** Mock implementations not properly typed
**Solution Pattern:**

```typescript
// BEFORE:
(SomeClass as jest.Mock).mockImplementation(() => ({
  method: jest.fn().mockResolvedValue({})
}));

// AFTER:
(SomeClass as jest.Mock).mockImplementation(() => ({
  method: jest.fn().mockResolvedValue({} as any)
}));
```

## Key Files to Fix (Priority Order)

1. **tests/sync/change-detector.test.ts** - Primary test file with multiple mock issues
2. **tests/safe/safe_linear_implementation.test.ts** - SAFe implementation mocks
3. **tests/safe/hierarchy-manager.test.ts** - Hierarchy management mocks
4. **tests/safe/hierarchy-synchronizer.test.ts** - Synchronization mocks
5. **tests/safe/pi-planning.test.ts** - PI planning mocks

## Success Criteria

- [ ] All test files compile without TypeScript errors
- [ ] `npm test` runs without compilation failures
- [ ] Mock functions properly typed with return values
- [ ] No `never` type errors in any test file
- [ ] Tests still pass functionally (not just compile)

## Testing Your Work

```bash
# Verify TypeScript compilation
npm run build

# Run specific test to verify fixes
npm test -- tests/sync/change-detector.test.ts

# Run all tests to ensure no regressions
npm test
```

## Integration Notes

- Your work is isolated to test files only
- No conflicts expected with other agents (they work on source code)
- Submit PR when complete - I'll coordinate integration
- Include test results in PR description

This is part of a 4-agent parallel effort. Your work is independent and won't conflict with other agents.

```

### Agent #2: Linear SDK v2.6.0 Compatibility (LIN-40)

**INITIAL AGENT MESSAGE:**

```markdown
# Remote Agent Assignment: Linear SDK v2.6.0 Compatibility Fixes

I'm assigning you to fix Linear SDK v2.6.0 compatibility issues as part of a coordinated 4-agent effort.

**Linear Issue:** LIN-40
**Branch:** fix/linear-sdk-v2-6-0-compatibility
**Priority:** HIGH - SDK compatibility

## Context & Coordination
**REQUIRED READING:** Please read the coordination document first:
`specs/implementation_docs/typescript_strict_mode_coordination.md`

This explains how your work fits with 3 other agents working in parallel on different TypeScript issues.

## Setup Instructions
1. Pull latest from dev branch: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Create branch: fix/linear-sdk-v2-6-0-compatibility
3. Run `npm test` to see current failures (expect Linear SDK property errors)
4. Focus ONLY on Linear SDK compatibility issues (your isolated scope)

## Problem Analysis
**Root Cause:** Linear SDK v2.6.0 changed property access patterns from direct properties to getter methods, breaking existing code.

**Current Error Patterns:**
```typescript
error TS2551: Property 'parentId' does not exist on type 'Issue'. Did you mean 'parent'?
error TS2551: Property 'cycleId' does not exist on type 'Issue'. Did you mean 'cycle'?
error TS2339: Property 'cycleCreate' does not exist on type 'Mocked<LinearClient>'
```

## Specific Technical Issues to Fix

### Issue 1: Property Access Pattern Changes

**Problem:** Direct property access changed to getter methods
**Solution Pattern:**

```typescript
// BEFORE (broken):
expect(feature?.parentId).toBe('epic-id');
expect(features[0].cycleId).toBe('pi-id');

// AFTER (fixed):
expect(feature?.parent?.id).toBe('epic-id');
expect(features[0].cycle?.id).toBe('pi-id');
```

### Issue 2: Missing Linear Client Methods

**Problem:** Test mocks reference methods that don't exist in current SDK
**Solution Pattern:**

```typescript
// BEFORE (broken):
mockLinearClient.cycleCreate = jest.fn().mockResolvedValue({...});
mockLinearClient.issueUpdate = jest.fn().mockResolvedValue({...});

// AFTER (fixed):
// Use actual SDK methods or create proper mock interfaces
mockLinearClient.cycles = {
  create: jest.fn().mockResolvedValue({...})
};
mockLinearClient.issues = {
  update: jest.fn().mockResolvedValue({...})
};
```

### Issue 3: Type Assertion for Complex Objects

**Problem:** Mock objects don't match Linear SDK types
**Solution Pattern:**

```typescript
// BEFORE (broken):
const mockCycle = { id: 'cycle-123', name: 'Test' } as Cycle;

// AFTER (fixed):
const mockCycle = {
  id: 'cycle-123',
  name: 'Test',
  // Add required properties or use partial type
} as Partial<Cycle> | unknown as Cycle;
```

## Key Files to Fix (Priority Order)

1. **src/safe/safe_linear_implementation.test.ts** - Main Linear SDK usage
2. **src/safe/pi-planning.test.ts** - PI planning with cycles
3. **Any source files** with Linear SDK property access errors

## Success Criteria

- [ ] All Linear SDK property access errors resolved
- [ ] Mock Linear client methods properly implemented
- [ ] Tests compile without Linear SDK type errors
- [ ] Tests still pass functionally
- [ ] No breaking changes to actual Linear SDK integration

## Testing Your Work

```bash
# Check specific Linear SDK errors
npm test -- src/safe/safe_linear_implementation.test.ts

# Verify PI planning functionality
npm test -- src/safe/pi-planning.test.ts

# Full test suite
npm test
```

## Integration Notes

- Your work focuses on Linear SDK compatibility only
- No conflicts expected with other agents (different scopes)
- Submit PR when complete - I'll coordinate integration
- Include before/after examples in PR description

This is part of a 4-agent parallel effort. Your work is independent and won't conflict with other agents.

```

### Agent #3: SAFe Model Type Completeness (LIN-41)

**INITIAL AGENT MESSAGE:**

```markdown
# Remote Agent Assignment: SAFe Model Type Completeness Fixes

I'm assigning you to fix SAFe Model Type Completeness issues as part of a coordinated 4-agent effort.

**Linear Issue:** LIN-41
**Branch:** fix/safe-model-type-completeness
**Priority:** HIGH - Type safety

## Context & Coordination
**REQUIRED READING:** Please read the coordination document first:
`specs/implementation_docs/typescript_strict_mode_coordination.md`

This explains how your work fits with 3 other agents working in parallel on different TypeScript issues.

## Setup Instructions
1. Pull latest from dev branch: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Create branch: fix/safe-model-type-completeness
3. Run `npm test` to see current failures (expect SAFe model type errors)
4. Focus ONLY on SAFe model type definitions (your isolated scope)

## Problem Analysis
**Root Cause:** SAFe model types (Epic, Feature, Story, Enabler) are incomplete, causing TypeScript strict mode to reject test objects that don't match the full type definitions.

**Current Error Patterns:**
```typescript
error TS2739: Type '{ id: string; title: string; description: string; }' is missing the following properties from type 'Epic': type, features, attributes
error TS2820: Type '"Architecture"' is not assignable to type '"architecture" | "infrastructure" | "technical_debt" | "research"'
error TS2322: Type 'string' is not assignable to type 'Feature'
```

## Specific Technical Issues to Fix

### Issue 1: Missing Required Properties

**Problem:** Test objects don't include all required properties from type definitions
**Solution Pattern:**

```typescript
// BEFORE (broken):
const epic: Epic = { id: 'epic1', title: 'Epic 1', description: 'Epic 1 description' };

// AFTER (fixed):
const epic: Epic = {
  id: 'epic1',
  title: 'Epic 1',
  description: 'Epic 1 description',
  type: 'epic',
  features: [],
  attributes: {}
};
```

### Issue 2: Enum Value Mismatches

**Problem:** Enum values use wrong case (Architecture vs architecture)
**Solution Pattern:**

```typescript
// BEFORE (broken):
enablerType: 'Architecture'

// AFTER (fixed):
enablerType: 'architecture'
```

### Issue 3: Array Type Relationships

**Problem:** Arrays contain strings instead of proper object types
**Solution Pattern:**

```typescript
// BEFORE (broken):
const epic: Epic = { features: ['feature1'] };

// AFTER (fixed):
const epic: Epic = {
  features: [{
    id: 'feature1',
    title: 'Feature 1',
    type: 'feature',
    // ... other required properties
  }]
};
```

## Key Files to Fix (Priority Order)

1. **src/planning/models.ts** - Core SAFe type definitions
2. **tests/safe/hierarchy-manager.test.ts** - Hierarchy management tests
3. **tests/safe/hierarchy-synchronizer.test.ts** - Synchronization tests

## Success Criteria

- [ ] All SAFe model types have complete required properties
- [ ] Enum values match expected patterns (lowercase)
- [ ] Array relationships use proper object types
- [ ] Test objects conform to type definitions
- [ ] No SAFe model type errors in any test file

## Testing Your Work

```bash
# Check specific SAFe model errors
npm test -- tests/safe/hierarchy-manager.test.ts

# Verify synchronization functionality
npm test -- tests/safe/hierarchy-synchronizer.test.ts

# Full test suite
npm test
```

## Integration Notes

- Your work focuses on SAFe model types only
- No conflicts expected with other agents (different scopes)
- Submit PR when complete - I'll coordinate integration
- Include type definition improvements in PR description

This is part of a 4-agent parallel effort. Your work is independent and won't conflict with other agents.

```

### Agent #4: Source Code Property Access (LIN-42)

**INITIAL AGENT MESSAGE:**

```markdown
# Remote Agent Assignment: Source Code Property Access Fixes

I'm assigning you to fix Source Code Property Access issues as part of a coordinated 4-agent effort.

**Linear Issue:** LIN-42
**Branch:** fix/source-code-property-access
**Priority:** MEDIUM - Property definitions

## Context & Coordination
**REQUIRED READING:** Please read the coordination document first:
`specs/implementation_docs/typescript_strict_mode_coordination.md`

This explains how your work fits with 3 other agents working in parallel on different TypeScript issues.

## Setup Instructions
1. Pull latest from dev branch: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Create branch: fix/source-code-property-access
3. Run `npm test` to see current failures (expect property access errors)
4. Focus ONLY on source code property access issues (your isolated scope)

## Problem Analysis
**Root Cause:** TypeScript strict mode now enforces that all property access must be defined in type interfaces, exposing missing property definitions in core source files.

**Current Error Patterns:**
```typescript
error TS2339: Property 'intervalMinutes' does not exist on type 'SyncOptions'
```

## Specific Technical Issues to Fix

### Issue 1: Missing SyncOptions Properties

**Problem:** SyncOptions interface missing intervalMinutes property
**File:** src/sync/sync-manager.ts
**Solution Pattern:**

```typescript
// Find the SyncOptions interface and add missing properties:
interface SyncOptions {
  // existing properties...
  intervalMinutes?: number; // Add this property
}
```

### Issue 2: Property Access Validation

**Problem:** Code accessing properties that aren't defined in interfaces
**Solution Pattern:**

```typescript
// BEFORE (broken):
this.options.intervalMinutes || 60

// AFTER (fixed - if property should exist):
this.options.intervalMinutes || 60  // After adding to interface

// OR (if property is optional):
(this.options as any).intervalMinutes || 60  // Temporary fix
```

## Key Files to Fix (Priority Order)

1. **src/sync/sync-manager.ts** - Primary file with intervalMinutes issue
2. **Any other source files** with property access errors (check test output)

## Success Criteria

- [ ] All property access errors in source code resolved
- [ ] Type interfaces include all accessed properties
- [ ] Source code compiles without TypeScript errors
- [ ] No breaking changes to existing functionality
- [ ] Property access patterns are type-safe

## Testing Your Work

```bash
# Check specific property access errors
npm run build

# Verify sync manager functionality
npm test -- src/sync/

# Full test suite
npm test
```

## Integration Notes

- Your work focuses on source code property definitions only
- Smallest scope of all 4 agents (likely quickest to complete)
- No conflicts expected with other agents (different scopes)
- Submit PR when complete - I'll coordinate integration

This is part of a 4-agent parallel effort. Your work is independent and won't conflict with other agents.

```
- Linear Issue: LIN-27 (already created)

**IMPLEMENTATION DOCUMENT NEEDED:**
- Create: `specs/implementation_docs/typescript_linear_sdk_fixes.md`
- Include: Specific Linear SDK v2.6.0 patterns and fixes
- Detail: Production code priority, test code secondary

## ASSIGNMENT HISTORY

### Completed Agents:
- LIN-QA-04-S01: OAuth test timeouts (LIN-25) - ✅ MERGED
- LIN-QA-02-S01: Database model tests (LIN-23) - ✅ MERGED
- LIN-QA-01-S01: Jest timer mocking (LIN-22) - ✅ MERGED
- LIN-QA-03-S01: TypeScript test types (LIN-24) - ⚠️ CONFLICTS (superseded by LIN-27)

### Active Assignments:
- LIN-ARCH-02-S01: TypeScript & Linear SDK fixes (LIN-27) - ⚠️ BROKEN DOWN INTO SUB-ISSUES

## LIN-28: Linear SDK Response Pattern Fixes

**AGENT**: LIN-ARCH-03-S01 (Linear SDK Response Specialist)

**INITIAL AGENT MESSAGE:**

```markdown
# Remote Agent Assignment: Linear SDK Response Pattern Fixes (LIN-28)

I'm assigning you to implement the Linear SDK Response Pattern Fixes Technical Enabler for our Linear Planning Agent project. This is a HIGH PRIORITY Docker deployment blocker that fixes Linear SDK v2.6.0 response object compatibility.

Please:
1. Pull the latest code from the dev branch of our repository: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Read your kickoff note: https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/main/specs/kickoff_notes/lin_28_linear_sdk_response_patterns_kickoff.md
3. Assign Linear issue LIN-28 to yourself
4. Study the implementation document referenced in the kickoff note
5. Implement the task according to the specifications
6. Create a branch named `feature/lin-28-linear-sdk-response-patterns`
7. Submit a PR when complete

This is a HIGH PRIORITY Docker deployment blocker. Focus ONLY on response patterns (.error → .success). Estimated: 2-3 hours.

Please let me know if you have any questions or need clarification on any aspect of the implementation.
```

## LIN-30: Linear SDK Enum Value Corrections

**AGENT**: LIN-ARCH-04-S01 (Linear SDK Enum Specialist)

**INITIAL AGENT MESSAGE:**

```markdown
# Remote Agent Assignment: Linear SDK Enum Value Corrections (LIN-30)

I'm assigning you to implement the Linear SDK Enum Value Corrections Technical Enabler for our Linear Planning Agent project. This is a HIGH PRIORITY Docker deployment blocker that fixes Linear SDK v2.6.0 enum compatibility.

Please:
1. Pull the latest code from the dev branch of our repository: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Read your kickoff note: https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/main/specs/kickoff_notes/lin_30_linear_sdk_enum_corrections_kickoff.md
3. Assign Linear issue LIN-30 to yourself
4. Study the implementation document referenced in the kickoff note
5. Implement the task according to the specifications
6. Create a branch named `feature/lin-30-linear-sdk-enum-corrections`
7. Submit a PR when complete

This is a HIGH PRIORITY Docker deployment blocker. Focus ONLY on enum values ('blocks' → IssueRelationType.Blocks). Estimated: 1-2 hours.

Please let me know if you have any questions or need clarification on any aspect of the implementation.
```

## LIN-31: Linear SDK DateTime Type Compatibility

**AGENT**: LIN-ARCH-05-S01 (Linear SDK DateTime Specialist)

**INITIAL AGENT MESSAGE:**

```markdown
# Remote Agent Assignment: Linear SDK DateTime Type Compatibility (LIN-31)

I'm assigning you to implement the Linear SDK DateTime Type Compatibility Technical Enabler for our Linear Planning Agent project. This is a HIGH PRIORITY Docker deployment blocker that fixes Linear SDK v2.6.0 datetime compatibility.

Please:
1. Pull the latest code from the dev branch of our repository: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Read your kickoff note: https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/main/specs/kickoff_notes/lin_31_linear_sdk_datetime_compatibility_kickoff.md
3. Assign Linear issue LIN-31 to yourself
4. Study the implementation document referenced in the kickoff note
5. Implement the task according to the specifications
6. Create a branch named `feature/lin-31-linear-sdk-datetime-compatibility`
7. Submit a PR when complete

This is a HIGH PRIORITY Docker deployment blocker. Focus ONLY on datetime types (toISOString() → Date objects). Estimated: 1 hour.

Please let me know if you have any questions or need clarification on any aspect of the implementation.
```

## LIN-32: PlanningExtractor Constructor Fix

**AGENT**: LIN-ARCH-06-S01 (Interface Signature Specialist)

**INITIAL AGENT MESSAGE:**

```markdown
# Remote Agent Assignment: PlanningExtractor Constructor Fix (LIN-32)

I'm assigning you to implement the PlanningExtractor Constructor Fix Technical Enabler for our Linear Planning Agent project. This is a MEDIUM PRIORITY sync functionality fix that resolves constructor signature mismatch.

Please:
1. Pull the latest code from the dev branch of our repository: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Read your kickoff note: https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/main/specs/kickoff_notes/lin_32_planning_extractor_constructor_kickoff.md
3. Assign Linear issue LIN-32 to yourself
4. Study the implementation document referenced in the kickoff note
5. Implement the task according to the specifications
6. Create a branch named `feature/lin-32-planning-extractor-constructor`
7. Submit a PR when complete

This is a MEDIUM PRIORITY sync functionality fix. Focus ONLY on constructor signature (2 args vs 1 arg). Estimated: 1 hour.

Please let me know if you have any questions or need clarification on any aspect of the implementation.
```
