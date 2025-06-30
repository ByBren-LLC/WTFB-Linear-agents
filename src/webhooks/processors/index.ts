/**
 * Webhook Processors Index
 * 
 * Exports all webhook event processors for easy import.
 */

export { BaseWebhookProcessor, AppUserNotification } from './base-processor';
export { IssueMentionProcessor } from './issue-mention.processor';

// Future processors will be added here as they are implemented:
// export { IssueCommentMentionProcessor } from './issue-comment-mention.processor';
// export { IssueAssignmentProcessor } from './issue-assignment.processor';
// export { IssueStatusChangeProcessor } from './issue-status-change.processor';
// export { IssueReactionProcessor } from './issue-reaction.processor';