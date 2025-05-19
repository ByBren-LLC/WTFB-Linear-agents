# Webhook Event Processors

This directory contains processors for different webhook event types from Linear.

Each processor is responsible for handling a specific type of event and taking appropriate actions.

## Event Types

- `issueMention`: When the agent is mentioned in an issue
- `issueCommentMention`: When the agent is mentioned in a comment
- `issueAssignedToYou`: When an issue is assigned to the agent
- `issueUnassignedFromYou`: When an issue is unassigned from the agent
- `issueNewComment`: When a new comment is added to an issue the agent is involved with
- `issueStatusChanged`: When the status of an issue the agent is involved with changes
- `issueEmojiReaction`: When someone reacts to an issue the agent is involved with
- `issueCommentReaction`: When someone reacts to a comment the agent made

## Adding New Processors

When adding new processors to this directory, please:

1. Follow the naming convention: `[event-type].processor.ts`
2. Include detailed comments and documentation
3. Ensure proper error handling
4. Add tests for the processor
