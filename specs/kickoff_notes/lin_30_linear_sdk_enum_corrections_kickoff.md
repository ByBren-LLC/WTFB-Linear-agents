# Kick-off: Linear SDK Enum Value Corrections (LIN-30)

## Assignment Overview

You are implementing a critical Technical Enabler to fix Linear SDK v2.6.0 enum value compatibility issues. This is a high priority Docker deployment blocker that prevents production builds from succeeding. Linear SDK now requires enum constants instead of string literals for issue relationship types.

## Linear Project Information

- **Linear Project**: WTFB Linear Planning Agent
- **Linear Team**: LIN (Linear Integration Team)
- **Issue**: LIN-30 (assign to yourself)
- **Parent Issue**: LIN-27 (Sub-Issue B)

## Linear Issue Assignment

Please:
1. Navigate to Linear issue LIN-30
2. Assign the issue to yourself
3. Update the status to "In Progress" when you begin work
4. Add the "Bug" label if not already present
5. Reference your branch and PR in the issue comments

## Implementation Document

Your detailed implementation document is available in the repository:
[Linear SDK Enum Value Corrections Implementation Document](../implementation_docs/lin_30_linear_sdk_enum_corrections.md)

## Project Context

The WTFB Linear Planning Agent integrates Linear with Confluence to implement SAFe methodology. Linear SDK v2.6.0 introduced breaking changes requiring enum constants instead of string literals for issue relationship types. String literals like 'blocks' and 'relates' now cause TypeScript compilation errors in production code.

Your task is to implement focused Linear SDK enum value corrections across SAFe relationship management files. This includes:
- Replacing 'blocks' string literals with IssueRelationType.Blocks
- Replacing 'relates' string literals with IssueRelationType.Related
- Adding proper IssueRelationType imports
- Ensuring Docker build compilation succeeds

## Key Responsibilities

1. Add IssueRelationType import to affected files
2. Replace 'blocks' string literals with IssueRelationType.Blocks enum constants
3. Replace 'relates' string literals with IssueRelationType.Related enum constants
4. Test compilation after each file modification
5. Verify Linear SDK v2.6.0 enum compatibility
6. Focus ONLY on enum values (ignore response patterns/datetime issues)
7. Preserve all existing relationship functionality
8. Document enum constant usage for future reference

## Existing Codebase Context

The following files contain broken Linear SDK enum patterns:
- `src/safe/relationship-updater.ts`: Issue relationship management (lines 118, 158)
- `src/safe/pi-planning.ts`: Program Increment planning (line 430)

## Definition of Done

Your task will be considered complete when:
- IssueRelationType import added to all affected files
- All 'blocks' string literals replaced with IssueRelationType.Blocks
- All 'relates' string literals replaced with IssueRelationType.Related
- `npm run build` passes without TypeScript errors for affected files
- No Linear SDK enum-related errors remain in production code
- All existing relationship functionality is preserved
- Docker build compilation succeeds (critical success criteria)
- Code is well-documented with JSDoc comments for enum usage
- Tests compile and verify enum corrections work
- Pull request is submitted with clear enum change documentation

## Branching and PR Guidelines

- Create a branch named `feature/lin-30-linear-sdk-enum-corrections`
- Make your changes in this branch
- Submit a PR to the `dev` branch when complete
- Include clear documentation of enum changes in your PR description
- Reference Linear SDK v2.6.0 enum documentation

## Timeline

- Estimated effort: 2 story points
- Expected completion: Within 1-2 hours
- Priority: HIGH - Docker deployment blocker

## Communication

- If you have questions or need clarification, please comment on Linear issue LIN-30
- Provide regular updates on your progress in the issue
- Flag any unexpected complications immediately
- The ARCHitect-in-the-IDE is available for architectural guidance

## Dependencies

This task:
- Can start after LIN-28 (response patterns) is complete
- Blocks LIN-31 (datetime fixes) and LIN-32 (constructor fixes)
- Is critical for Docker deployment pipeline

---

Thank you for your contribution to the Linear Planning Agent project. Your work on Linear SDK enum corrections is essential for maintaining type safety and Docker deployment compatibility.

The ARCHitect will be available to answer questions and provide guidance throughout the implementation process.
