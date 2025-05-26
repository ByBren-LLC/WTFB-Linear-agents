/**
 * Mock type definitions for Jest tests
 * Fixes TypeScript compilation errors with mock return values
 */

import { jest } from '@jest/globals';

// Generic mock function type that accepts any return value
export type MockFunction<T = any> = jest.MockedFunction<(...args: any[]) => T>;

// Mock return value helpers
export const mockResolvedValue = <T>(value: T) => jest.fn().mockResolvedValue(value) as MockFunction<Promise<T>>;
export const mockRejectedValue = (error: Error) => jest.fn().mockRejectedValue(error) as MockFunction<Promise<never>>;
export const mockReturnValue = <T>(value: T) => jest.fn().mockReturnValue(value) as MockFunction<T>;

// Common mock return types
export type MockPromise<T> = Promise<T>;
export type MockVoid = Promise<void>;
export type MockUndefined = Promise<undefined>;
export type MockNull = Promise<null>;
export type MockArray<T> = Promise<T[]>;
export type MockObject<T> = Promise<T>;

// Epic type for planning tests
export interface MockEpic {
  id: string;
  type: 'epic';
  title: string;
  description: string;
  features: any[];
  attributes: Record<string, any>;
}

// Feature type for planning tests
export interface MockFeature {
  id: string;
  type: 'feature';
  title: string;
  description: string;
  epicId: string;
  stories: any[];
  enablers: any[];
  attributes: Record<string, any>;
}

// Story type for planning tests
export interface MockStory {
  id: string;
  type: 'story';
  title: string;
  description: string;
  featureId: string;
  attributes: Record<string, any>;
}

// Enabler type for planning tests
export interface MockEnabler {
  id: string;
  type: 'enabler';
  title: string;
  description: string;
  attributes: Record<string, any>;
}

// Planning document type
export interface MockPlanningDocument {
  id: string;
  title: string;
  epics: MockEpic[];
  features: MockFeature[];
  stories: MockStory[];
  enablers: MockEnabler[];
}

// Mapping result type
export interface MockMappingResult {
  epics: Record<string, string>;
  features: Record<string, string>;
  stories: Record<string, string>;
  enablers: Record<string, string>;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  errors: any[];
}

// Conflict type
export interface MockConflict {
  id: string;
  type: string;
  source: string;
  target: string;
  data: any;
  createdAt: Date;
}

// Linear issue type
export interface MockLinearIssue {
  id: string;
  title: string;
  description?: string;
  state?: any;
  labels?: any;
}

// Linear query result type
export interface MockLinearQueryResult {
  nodes: MockLinearIssue[];
}

// Confluence element type
export interface MockConfluenceElement {
  type: string;
  content: string;
  attributes?: Record<string, any>;
  children?: MockConfluenceElement[];
}

// Confluence document type
export interface MockConfluenceDocument {
  elements: MockConfluenceElement[];
}
