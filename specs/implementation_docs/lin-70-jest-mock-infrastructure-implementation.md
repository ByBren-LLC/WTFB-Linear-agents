# Jest Mock Type Infrastructure Fixes - Implementation Document (LIN-70)

**Document Type:** Technical Implementation Specification
**Author:** Auggie III, ARCHitect-in-the-IDE
**Date:** July 8, 2025
**Linear Issue:** [LIN-70](https://linear.app/wordstofilmby/issue/LIN-70/jest-mock-type-infrastructure-fixes)
**Priority:** CRITICAL - Foundation for 4-agent coordination

## Overview

Fix Jest mock type infrastructure issues blocking all TypeScript compilation and testing. The root cause is duplicate mock type systems causing type inference conflicts in TypeScript 5.8.3 strict mode.

## Technical Enabler

As an ARCHitect, I need to consolidate duplicate mock type systems so that all tests can compile and execute cleanly, enabling the 4-agent parallel coordination strategy.

## Acceptance Criteria

1. ✅ Remove conflicting mock functions from `tests/types/test-types.ts`
2. ✅ Standardize all test files on existing `tests/types/mock-types.ts` infrastructure
3. ✅ Achieve clean `npm run build` execution (zero TypeScript errors)
4. ✅ Achieve clean `npm test` execution (all tests passing)
5. ✅ Fix all Jest type inference issues in test files
6. ✅ Update import statements in all affected test files
7. ✅ Document the solution and architectural decision

## Technical Context

### Root Cause Analysis

**Primary Issue**: Jest + TypeScript 5.8.3 strict mode type inference conflicts
**Specific Problem**: Two competing mock type systems:

1. **Working System** (`tests/types/mock-types.ts`):
   ```typescript
   export const mockResolvedValue = <T>(value: T) => {
     const mockFn = jest.fn() as jest.MockedFunction<(...args: any[]) => Promise<T>>;
     mockFn.mockResolvedValue(value);
     return mockFn;
   };
   ```

2. **Problematic System** (`tests/types/test-types.ts`):
   ```typescript
   export function createMockResolvedValue<T>(value: T): any {
     return jest.fn().mockResolvedValue(value);
   }
   ```

**Error Pattern**:
```
error TS2345: Argument of type 'T' is not assignable to parameter of type 'never'
```

### Existing Code

- `tests/types/mock-types.ts`: ✅ Working mock infrastructure (KEEP)
- `tests/types/test-types.ts`: ❌ Conflicting mock functions (REMOVE)
- `tests/**/*.test.ts`: 🔄 Mixed usage (STANDARDIZE)

### Dependencies

- Jest 29.7.0
- TypeScript 5.8.3 with strict mode
- ts-jest 29.4.0

## Implementation Plan

### 1. Audit Current Mock Usage

**Objective**: Identify all files using problematic mock functions

**Actions**:
```bash
# Find all usages of problematic functions
grep -r "createMockResolvedValue\|createMockRejectedValue" tests/
grep -r "from.*test-types" tests/
```

**Expected Files**:
- `tests/integration/safe/art-planning-integration.test.ts`
- `tests/confluence/parser.test.ts`
- Any other test files importing from `test-types.ts`

### 2. Remove Conflicting Mock Functions

**File**: `tests/types/test-types.ts`

**Remove These Functions**:
```typescript
// REMOVE - These cause type inference conflicts
export function createMockResolvedValue<T>(value: T): any {
  return jest.fn().mockResolvedValue(value);
}

export function createMockRejectedValue(error: Error): any {
  return jest.fn().mockRejectedValue(error);
}
```

**Keep**: All other type definitions and factory functions

### 3. Update Test File Imports

**Pattern**: Replace problematic imports with working ones

**Before**:
```typescript
import { createMockResolvedValue } from '../../types/test-types';
```

**After**:
```typescript
import { mockResolvedValue } from '../../types/mock-types';
```

### 4. Update Mock Function Usage

**Before**:
```typescript
const mockFn = createMockResolvedValue(expectedValue);
```

**After**:
```typescript
const mockFn = mockResolvedValue(expectedValue);
```

### 5. Fix Specific Test Files

**File**: `tests/integration/safe/art-planning-integration.test.ts`
- Update import statements
- Replace function calls
- Ensure enum imports are correct

**File**: `tests/confluence/parser.test.ts`
- Add optional chaining for undefined properties
- Update mock usage

### 6. Validate Solution

**Commands**:
```bash
# Clean TypeScript compilation
npx tsc --noEmit

# Clean Jest execution  
npm test

# Full build pipeline
npm run build
```

**Success Criteria**:
- Zero TypeScript compilation errors
- All tests passing
- No Jest type inference warnings

## Testing Approach

### Unit Testing
- Verify mock functions work correctly
- Test type inference with various return types
- Validate Jest integration

### Integration Testing
- Run full test suite
- Verify no regressions in existing functionality
- Test with TypeScript strict mode

### Performance Testing
- Measure compilation time improvement
- Verify test execution time remains acceptable

## Definition of Done

1. ✅ All conflicting mock functions removed
2. ✅ All test files use standardized mock infrastructure
3. ✅ Clean `npm run build` execution
4. ✅ Clean `npm test` execution
5. ✅ No TypeScript compilation errors
6. ✅ All existing tests still pass
7. ✅ Documentation updated
8. ✅ PR submitted and approved

## Estimated Effort

**Story Points**: 3
**Time Estimate**: 2-3 hours
**Complexity**: Medium (architectural cleanup)

## Resources

- [Jest Documentation](https://jestjs.io/docs/mock-functions)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [ts-jest Configuration](https://kulshekhar.github.io/ts-jest/)

## Architectural Decision

**Decision**: Standardize on `mock-types.ts` infrastructure
**Rationale**: Proven working solution with proper TypeScript integration
**Impact**: Enables 4-agent parallel coordination strategy
**Alternatives Considered**: Fix `test-types.ts` functions (rejected - too complex)

---

**This implementation unblocks the entire 4-agent coordination strategy and restores our build pipeline to production-ready state.**
