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

Please:
1. Pull latest from dev branch: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Create branch: fix/jest-mock-type-infrastructure
3. Fix all Jest mock type inference issues in test files
4. Focus on resolving `never` type errors in mock functions
5. Ensure all test files pass TypeScript strict mode
6. Submit PR when complete

**Key Files to Fix:**
- tests/sync/change-detector.test.ts
- tests/safe/safe_linear_implementation.test.ts
- tests/safe/hierarchy-manager.test.ts
- tests/safe/hierarchy-synchronizer.test.ts
- tests/safe/pi-planning.test.ts

**Specific Issues:**
- Jest mock functions being inferred as `never` type
- `mockResolvedValue({})` causing type errors
- Need proper type annotations for mock return values

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

Please:
1. Pull latest from dev branch: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Create branch: fix/linear-sdk-v2-6-0-compatibility
3. Fix all Linear SDK property access patterns
4. Update missing method implementations
5. Submit PR when complete

**Key Issues:**
- `parentId` should be `parent` property access
- `cycleId` should be `cycle` property access
- Missing methods like `cycleCreate`, `issueUpdate`
- Linear SDK v2.6.0 interface changes

**Files to Fix:**
- src/safe/safe_linear_implementation.test.ts
- src/safe/pi-planning.test.ts
- Any source files with Linear SDK usage

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

Please:
1. Pull latest from dev branch: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Create branch: fix/safe-model-type-completeness
3. Fix all SAFe model type definitions and enum mismatches
4. Ensure complete type coverage for Epic, Feature, Story, Enabler
5. Submit PR when complete

**Key Issues:**
- Missing required properties in Epic, Feature, Story, Enabler types
- Enum mismatches: "Architecture" vs "architecture"
- Array relationships: features should be Feature[] not string[]
- Type completeness for test and production usage

**Files to Fix:**
- src/planning/models.ts
- tests/safe/hierarchy-manager.test.ts
- tests/safe/hierarchy-synchronizer.test.ts

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

Please:
1. Pull latest from dev branch: https://github.com/ByBren-LLC/WTFB-Linear-agents
2. Create branch: fix/source-code-property-access
3. Fix missing property definitions in core source files
4. Ensure all property access patterns work correctly
5. Submit PR when complete

**Key Issues:**
- SyncOptions.intervalMinutes property missing
- Property access errors in source code
- Type definitions need missing properties

**Files to Fix:**
- src/sync/sync-manager.ts
- Any other source files with property access errors

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
