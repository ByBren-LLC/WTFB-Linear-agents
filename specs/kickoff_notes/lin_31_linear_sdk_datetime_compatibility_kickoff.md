# Kick-off: Linear SDK DateTime Type Compatibility (LIN-31)

## Assignment Overview

You are implementing a critical Technical Enabler to fix Linear SDK v2.6.0 datetime type compatibility issues. This is a high priority Docker deployment blocker that prevents production builds from succeeding. Linear SDK now expects Date objects for startsAt/endsAt fields instead of ISO strings.

## Linear Project Information

- **Linear Project**: WTFB Linear Planning Agent
- **Linear Team**: LIN (Linear Integration Team)
- **Issue**: LIN-31 (assign to yourself)
- **Parent Issue**: LIN-27 (Sub-Issue C)

## Linear Issue Assignment

Please:
1. Navigate to Linear issue LIN-31
2. Assign the issue to yourself
3. Update the status to "In Progress" when you begin work
4. Add the "Bug" label if not already present
5. Reference your branch and PR in the issue comments

## Implementation Document

Your detailed implementation document is available in the repository:
[Linear SDK DateTime Type Compatibility Implementation Document](../implementation_docs/lin_31_linear_sdk_datetime_compatibility.md)

## Project Context

The WTFB Linear Planning Agent integrates Linear with Confluence to implement SAFe methodology. Linear SDK v2.6.0 introduced breaking changes in datetime field handling. The API now expects Date objects for startsAt/endsAt fields instead of ISO strings. Using toISOString() now causes TypeScript compilation errors in production code.

Your task is to implement focused Linear SDK datetime type corrections across SAFe cycle and planning files. This includes:
- Removing .toISOString() calls from date fields
- Passing Date objects directly to Linear API
- Preserving all existing date handling logic
- Ensuring Docker build compilation succeeds

## Key Responsibilities

1. Remove .toISOString() calls from startsAt/endsAt fields
2. Pass Date objects directly to Linear API instead of ISO strings
3. Test compilation after each file modification
4. Verify Linear SDK v2.6.0 datetime compatibility
5. Focus ONLY on datetime types (ignore response patterns/enum issues)
6. Preserve all existing date calculation and validation logic
7. Ensure timezone handling remains consistent
8. Document datetime type changes for future reference

## Existing Codebase Context

The following files contain broken Linear SDK datetime patterns:
- `src/safe/safe_linear_implementation.ts`: Core SAFe implementation (lines 225, 226)
- `src/safe/pi-planning.ts`: Program Increment planning (lines 315, 316)

## Definition of Done

Your task will be considered complete when:
- All .toISOString() calls removed from startsAt/endsAt fields
- Date objects passed directly to Linear API for datetime fields
- `npm run build` passes without TypeScript errors for affected files
- No Linear SDK datetime type errors remain in production code
- All existing date calculation and validation logic is preserved
- Docker build compilation succeeds (critical success criteria)
- Code is well-documented with JSDoc comments for datetime handling
- Tests compile and verify datetime fixes work correctly
- Pull request is submitted with clear datetime change documentation

## Branching and PR Guidelines

- Create a branch named `feature/lin-31-linear-sdk-datetime-compatibility`
- Make your changes in this branch
- Submit a PR to the `dev` branch when complete
- Include clear documentation of datetime type changes in your PR description
- Reference Linear SDK v2.6.0 datetime documentation

## Timeline

- Estimated effort: 1 story point
- Expected completion: Within 1 hour
- Priority: HIGH - Docker deployment blocker

## Communication

- If you have questions or need clarification, please comment on Linear issue LIN-31
- Provide regular updates on your progress in the issue
- Flag any unexpected complications immediately
- The ARCHitect-in-the-IDE is available for architectural guidance

## Dependencies

This task:
- Can start after LIN-28 (response patterns) and LIN-30 (enum corrections) are complete
- Blocks LIN-32 (constructor fixes)
- Is critical for Docker deployment pipeline

---

Thank you for your contribution to the Linear Planning Agent project. Your work on Linear SDK datetime compatibility is essential for maintaining API compatibility and Docker deployment success.

The ARCHitect will be available to answer questions and provide guidance throughout the implementation process.
