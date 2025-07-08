# Kick-off: Jest Mock Type Infrastructure Fixes (LIN-70)

**Document Type:** Agent Kickoff Notes
**Author:** Auggie III, ARCHitect-in-the-IDE
**Date:** July 8, 2025
**Agent Assignment:** ARCHitect (Auggie III)
**Priority:** CRITICAL - Blocking all tests

## Assignment Overview

You are assigned to fix the Jest mock type infrastructure issues that are blocking all TypeScript compilation and testing. This is the foundation task that must be completed before the other 3 agents can proceed with their parallel work.

## Linear Project Information

- **Linear Issue**: [LIN-70](https://linear.app/wordstofilmby/issue/LIN-70/jest-mock-type-infrastructure-fixes)
- **Parent Issue**: [LIN-44](https://linear.app/wordstofilmby/issue/LIN-44/complete-jest-infrastructure-agent-process-improvements)
- **Linear Team**: [Linear agents](https://linear.app/wordstofilmby/team/LIN)
- **Priority**: Urgent (1)
- **Story Points**: 3
- **Labels**: technical-debt, infrastructure

## Root Cause Analysis Summary

**Primary Issue**: Jest + TypeScript 5.8.3 strict mode type inference conflicts
**Specific Problem**: Duplicate mock type systems causing conflicts
- `tests/types/test-types.ts` - Problematic duplicate functions
- `tests/types/mock-types.ts` - Working infrastructure (keep this)

**Error Pattern**:
```
error TS2345: Argument of type 'T' is not assignable to parameter of type 'never'
```

## Implementation Document

Your detailed implementation document is available in the repository:
[specs/implementation_docs/lin-70-jest-mock-infrastructure-implementation.md](../specs/implementation_docs/lin-70-jest-mock-infrastructure-implementation.md)

## Project Context

This task is the critical foundation for the 4-agent TypeScript strict mode compliance coordination. Your success unblocks 3 other agents who will work in parallel on:
- SAFe Model Type Completeness (LIN-71)
- Linear SDK v2.6.0 Compatibility (LIN-72)  
- Source Code Property Definitions (LIN-73)

## Key Responsibilities

1. **Remove conflicting mock functions** from `tests/types/test-types.ts`
2. **Standardize on existing `mock-types.ts`** infrastructure
3. **Update all test files** to use correct mock imports
4. **Fix Jest type inference issues** in test files
5. **Validate clean compilation** with `npm run build` and `npm test`
6. **Document the solution** for future reference
7. Write comprehensive tests for all components
8. Document the API with JSDoc comments

## Existing Codebase Context

The following files are relevant to your task:
- `tests/types/test-types.ts`: Contains problematic duplicate mock functions (REMOVE)
- `tests/types/mock-types.ts`: Working mock infrastructure (KEEP & USE)
- `tests/**/*.test.ts`: All test files using mock functions (UPDATE IMPORTS)
- `jest.config.js`: Jest configuration
- `tsconfig.json`: TypeScript strict mode configuration

## Definition of Done

Your task will be considered complete when:
- All conflicting mock functions removed from `test-types.ts`
- All test files use standardized `mock-types.ts` infrastructure
- Clean `npm run build` execution (zero TypeScript errors)
- Clean `npm test` execution (all tests passing)
- No Jest type inference errors
- Code is well-documented with JSDoc comments
- Tests are comprehensive and passing
- Pull request is submitted and approved

## Branching and PR Guidelines

- Create a branch named `fix/jest-mock-type-infrastructure`
- Make your changes in this branch
- Submit a PR to the `dev` branch when complete
- Include a detailed description of your changes in the PR

## Timeline

- Estimated effort: 3 story points
- Expected completion: Within 2-3 hours
- **CRITICAL**: This blocks other agents - prioritize completion

## Communication

- Update progress in Linear issue LIN-70
- Flag any blockers immediately
- Coordinate with Scott for any architectural questions

## Dependencies

**Upstream**: None - this is the foundation task
**Downstream**: Blocks LIN-71, LIN-72, LIN-73 until completion

---

**This is the critical foundation task for our 4-agent coordination. Your success enables parallel execution of the remaining TypeScript fixes and gets us to production-ready state in 3-4 hours total.**

The ARCHitect will execute this task with full ownership and architectural authority.
