# Kick-off: PlanningExtractor Constructor Signature Fix (LIN-32)

## Assignment Overview

You are implementing a focused Technical Enabler to fix PlanningExtractor constructor signature mismatch issues. This is a medium priority sync functionality fix that prevents TypeScript compilation in change detection code. The constructor expects 2 arguments but is being called with 1.

## Linear Project Information

- **Linear Project**: WTFB Linear Planning Agent
- **Linear Team**: LIN (Linear Integration Team)
- **Issue**: LIN-32 (assign to yourself)
- **Parent Issue**: LIN-27 (Sub-Issue D)

## Linear Issue Assignment

Please:
1. Navigate to Linear issue LIN-32
2. Assign the issue to yourself
3. Update the status to "In Progress" when you begin work
4. Add the "Bug" label if not already present
5. Reference your branch and PR in the issue comments

## Implementation Document

Your detailed implementation document is available in the repository:
[PlanningExtractor Constructor Fix Implementation Document](../implementation_docs/lin_32_planning_extractor_constructor.md)

## Project Context

The WTFB Linear Planning Agent integrates Linear with Confluence to implement SAFe methodology. The PlanningExtractor class is used in sync functionality to extract planning information from Confluence documents. There's a constructor signature mismatch where the constructor expects 2 arguments (document, sections) but is being called with only 1 argument (document).

Your task is to investigate and fix the PlanningExtractor constructor signature mismatch. This includes:
- Analyzing the PlanningExtractor constructor definition
- Determining the correct constructor signature
- Updating either the constructor call or constructor definition
- Ensuring sync functionality is preserved

## Key Responsibilities

1. Investigate PlanningExtractor constructor definition in src/planning/extractor.ts
2. Analyze the constructor call in src/sync/change-detector.ts line 332
3. Determine the correct approach (update call vs update definition)
4. Implement the appropriate fix to resolve signature mismatch
5. Test compilation after the fix
6. Verify sync functionality is preserved
7. Focus ONLY on constructor signature (ignore other TypeScript issues)
8. Document the constructor interface for future reference

## Existing Codebase Context

The following files are involved in this constructor signature issue:
- `src/sync/change-detector.ts`: Contains the constructor call (line 332)
- `src/planning/extractor.ts`: Contains the constructor definition
- Related planning and sync functionality files

## Definition of Done

Your task will be considered complete when:
- PlanningExtractor constructor signature is consistent between definition and usage
- Constructor call matches the constructor definition exactly
- `npm run build` passes without TypeScript errors for affected files
- No constructor signature mismatch errors remain
- All existing sync and planning functionality is preserved
- Code is well-documented with JSDoc comments for constructor interface
- Tests compile and verify constructor fix works correctly
- Pull request is submitted with clear explanation of the fix approach

## Branching and PR Guidelines

- Create a branch named `feature/lin-32-planning-extractor-constructor`
- Make your changes in this branch
- Submit a PR to the `dev` branch when complete
- Include detailed explanation of your fix approach in your PR description
- Document any interface changes or assumptions made

## Timeline

- Estimated effort: 1 story point
- Expected completion: Within 1 hour
- Priority: MEDIUM - Sync functionality (not Docker blocker)

## Communication

- If you have questions or need clarification, please comment on Linear issue LIN-32
- Provide regular updates on your progress in the issue
- Flag any unexpected complications immediately
- The ARCHitect-in-the-IDE is available for architectural guidance

## Dependencies

This task:
- Can start after LIN-28, LIN-30, LIN-31 (Docker blockers) are complete
- Does not block other critical functionality
- Improves sync functionality reliability

---

Thank you for your contribution to the Linear Planning Agent project. Your work on PlanningExtractor constructor consistency is essential for maintaining reliable sync functionality.

The ARCHitect will be available to answer questions and provide guidance throughout the implementation process.
