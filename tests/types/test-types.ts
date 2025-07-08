/**
 * Comprehensive TypeScript type definitions for test suite
 * Ensures type safety and maintainability across all test files
 * 
 * @fileoverview Enterprise-grade type definitions for Jest mocks and test data
 * @author Auggie III (ARCHitect-in-the-IDE)
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import { Epic, Feature, Story, Enabler, PlanningDocument } from '../../src/planning/models';

// =============================================================================
// CORE MOCK TYPES
// =============================================================================

/**
 * Generic mock function with proper typing
 * Replaces jest.fn() with type-safe alternatives
 */
export type TypedMockFunction<TArgs extends any[] = any[], TReturn = any> = 
  jest.MockedFunction<(...args: TArgs) => TReturn>;

/**
 * Promise-based mock function for async operations
 */
export type AsyncMockFunction<TArgs extends any[] = any[], TReturn = any> = 
  jest.MockedFunction<(...args: TArgs) => Promise<TReturn>>;

// =============================================================================
// SAFE EPIC HIERARCHY TYPES
// =============================================================================

/**
 * Epic type definition following SAFe methodology
 * Ensures proper type safety for planning documents
 */
export interface SafeEpic {
  readonly id: string;
  readonly type: 'epic';
  readonly title: string;
  readonly description: string;
  readonly features: SafeFeature[];
  readonly attributes: Record<string, unknown>;
}

/**
 * Feature type definition following SAFe methodology
 */
export interface SafeFeature {
  readonly id: string;
  readonly type: 'feature';
  readonly title: string;
  readonly description: string;
  readonly epicId: string;
  readonly stories: SafeStory[];
  readonly enablers: SafeEnabler[];
  readonly attributes: Record<string, unknown>;
}

/**
 * Story type definition following SAFe methodology
 */
export interface SafeStory {
  readonly id: string;
  readonly type: 'story';
  readonly title: string;
  readonly description: string;
  readonly featureId: string;
  readonly acceptanceCriteria: string[];
  readonly attributes: Record<string, unknown>;
}

/**
 * Enabler type definition following SAFe methodology
 */
export interface SafeEnabler {
  readonly id: string;
  readonly type: 'enabler';
  readonly title: string;
  readonly description: string;
  readonly enablerType: 'architecture' | 'infrastructure' | 'technical_debt' | 'research';
  readonly acceptanceCriteria?: string[];
  readonly attributes: Record<string, unknown>;
}

/**
 * Complete planning document structure
 * Represents a full SAFe planning increment
 */
export interface SafePlanningDocument {
  readonly id: string;
  readonly title: string;
  readonly epics: SafeEpic[];
  readonly features: SafeFeature[];
  readonly stories: SafeStory[];
  readonly enablers: SafeEnabler[];
}

// =============================================================================
// LINEAR INTEGRATION TYPES
// =============================================================================

/**
 * Linear issue representation
 * Matches Linear API response structure
 */
export interface LinearIssue {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly state?: {
    readonly id: string;
    readonly name: string;
  };
  readonly labels?: {
    readonly nodes: Array<{
      readonly id: string;
      readonly name: string;
    }>;
  };
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/**
 * Linear GraphQL query result structure
 */
export interface LinearQueryResult {
  readonly nodes: LinearIssue[];
}

/**
 * Planning to Linear mapping result
 * Tracks creation and update operations
 */
export interface PlanningMappingResult {
  readonly epics: Record<string, string>;
  readonly features: Record<string, string>;
  readonly stories: Record<string, string>;
  readonly enablers: Record<string, string>;
  readonly createdCount: number;
  readonly updatedCount: number;
  readonly errorCount: number;
  readonly errors: Error[];
}

// =============================================================================
// CONFLUENCE INTEGRATION TYPES
// =============================================================================

/**
 * Confluence element types enumeration
 */
export enum ConfluenceElementType {
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  LIST = 'list',
  LIST_ITEM = 'list_item',
  TABLE = 'table',
  TABLE_ROW = 'table_row',
  TABLE_CELL = 'table_cell',
  LINK = 'link',
  MACRO = 'macro'
}

/**
 * Confluence document element
 * Recursive structure for nested content
 */
export interface ConfluenceElement {
  readonly type: ConfluenceElementType;
  readonly content: string;
  readonly attributes?: Record<string, unknown>;
  readonly children?: ConfluenceElement[];
}

/**
 * Complete Confluence document structure
 */
export interface ConfluenceDocument {
  readonly elements: ConfluenceElement[];
}

// =============================================================================
// SYNC AND CONFLICT TYPES
// =============================================================================

/**
 * Sync conflict representation
 * Tracks conflicts between Linear and Confluence
 */
export interface SyncConflict {
  readonly id: string;
  readonly type: string;
  readonly source: string;
  readonly target: string;
  readonly data: Record<string, unknown>;
  readonly createdAt: Date;
  readonly resolvedAt?: Date;
}

/**
 * Sync store interface
 * Defines contract for sync operations
 */
export interface SyncStore {
  storeConflict(conflict: SyncConflict): Promise<void>;
  storeResolvedConflict(conflict: SyncConflict): Promise<void>;
  getUnresolvedConflicts(): Promise<SyncConflict[]>;
  getResolvedConflicts(): Promise<SyncConflict[]>;
  getLastSyncTimestamp(): Promise<number | null>;
}

// =============================================================================
// MOCK FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates a properly typed mock function with return value
 */
export function createMockReturnValue<T>(value: T): TypedMockFunction<any[], T> {
  return jest.fn().mockReturnValue(value) as TypedMockFunction<any[], T>;
}

// =============================================================================
// TEST OBJECT FACTORIES
// =============================================================================

/**
 * Creates a valid Epic object for testing
 */
export function createTestEpic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: 'epic-test-1',
    type: 'epic',
    title: 'Test Epic',
    description: 'Test epic description',
    attributes: {},
    features: [],
    ...overrides
  };
}

/**
 * Creates a valid Feature object for testing
 */
export function createTestFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feature-test-1',
    type: 'feature',
    title: 'Test Feature',
    description: 'Test feature description',
    attributes: {},
    stories: [],
    enablers: [],
    ...overrides
  };
}

/**
 * Creates a valid Story object for testing
 */
export function createTestStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'story-test-1',
    type: 'story',
    title: 'Test Story',
    description: 'Test story description',
    attributes: {},
    acceptanceCriteria: ['Test acceptance criteria'],
    storyPoints: 3,
    priority: 2,
    ...overrides
  };
}

/**
 * Creates a valid Enabler object for testing
 */
export function createTestEnabler(overrides: Partial<Enabler> = {}): Enabler {
  return {
    id: 'enabler-test-1',
    type: 'enabler',
    title: 'Test Enabler',
    description: 'Test enabler description',
    attributes: {},
    enablerType: 'architecture',
    acceptanceCriteria: ['Test enabler criteria'],
    ...overrides
  };
}

/**
 * Creates a valid PlanningDocument object for testing
 */
export function createTestPlanningDocument(overrides: Partial<PlanningDocument> = {}): PlanningDocument {
  return {
    id: 'planning-doc-test-1',
    title: 'Test Planning Document',
    epics: [],
    features: [],
    stories: [],
    enablers: [],
    ...overrides
  };
}
