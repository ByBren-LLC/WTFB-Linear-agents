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
