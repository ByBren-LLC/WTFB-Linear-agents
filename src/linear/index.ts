/**
 * Linear Module Index
 *
 * This module exports the Linear SDK compatibility layer and related utilities.
 */

// Export the compatibility layer as the main Linear client
export {
  LinearCompatibilityClient as LinearClient,
  LinearCompatibilityClient as LinearClientWrapper,
  createLinearClient,
  IssueCreateInput,
  IssueUpdateInput,
  CommentCreateInput,
  IssueLabelCreateInput,
  CycleCreateInput,
  MilestoneCreateInput,
  IssueRelationCreateInput,
  CompatibleLinearFetch
} from './compatibility-layer';

// Export the original wrapper for backward compatibility
export { LinearClientWrapper as OriginalLinearClientWrapper } from './client';

// Export error handling
export * from './errors';
export * from './error-handler';

// Export utilities
export * from './rate-limiter';
export * from './retry';
