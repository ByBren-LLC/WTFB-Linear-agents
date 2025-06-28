/**
 * SAFe (Scaled Agile Framework) Module Exports
 * 
 * This module exports all SAFe-related functionality including
 * story decomposition, hierarchy management, and API adapters.
 */

// Core Story Decomposition Engine (LIN-47 implementation)
export { StoryDecompositionEngine } from './story-decomposition-engine';

// API Adapter for Phase 2 Integration (LIN-55)
export { 
  DecompositionAPIAdapter,
  createDecompositionAPI 
} from './decomposition-api-adapter';

// Linear Integration
export { LinearStoryDecomposer } from './linear-story-decomposer';

// Hierarchy Management (if exists)
// TODO: Add hierarchy manager exports when available

// Re-export types for convenience
export type { 
  StoryDecompositionAPI,
  LargeStory,
  DecomposedStory,
  ValidationResult,
  BusinessValue
} from '../types/decomposition-api-types';

export type {
  DecompositionResult,
  DecompositionConfig,
  StoryAnalysis
} from '../types/decomposition-types';