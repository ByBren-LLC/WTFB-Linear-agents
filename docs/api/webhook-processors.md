# Webhook Processors API Documentation

## Overview

The SAFe PULSE webhook processors handle Linear AppUserNotification events, providing intelligent responses and proactive assistance. All processors extend the `BaseWebhookProcessor` class and implement consistent patterns for error handling, logging, and dual-channel output.

## Architecture

```typescript
// Base processor interface
abstract class BaseWebhookProcessor {
  protected linearClient: LinearClientWrapper;
  protected notificationCoordinator: OperationalNotificationCoordinator;
  
  abstract process(notification: AppUserNotification): Promise<void>;
  
  protected createLinearComment(issueId: string, content: string): Promise<void>;
  protected notifySlack(type: string, title: string, message: string, url: string, user?: string): Promise<void>;
  protected extractMentionText(text: string): string | null;
}
```

## Processor Reference

### IssueMentionProcessor

Handles `@saafepulse` mentions in issue descriptions.

#### Trigger Event
```json
{
  "action": "issueMention",
  "type": "AppUserNotification",
  "notification": {
    "issue": {
      "id": "issue-id",
      "identifier": "LIN-123",
      "title": "Issue title",
      "description": "Hey @saafepulse can you help?"
    }
  }
}
```

#### Response Behavior
- Acknowledges mention with professional greeting
- Provides capability overview
- Offers specific command suggestions
- Adapts tone for urgent issues

#### Example Usage
```typescript
const processor = new IssueMentionProcessor(linearClient, notificationCoordinator);
await processor.process(notification);
```

### IssueCommentMentionProcessor

Handles `@saafepulse` mentions in issue comments with context awareness.

#### Trigger Event
```json
{
  "action": "issueCommentMention",
  "type": "AppUserNotification",
  "notification": {
    "issue": { /* issue data */ },
    "comment": {
      "id": "comment-id",
      "body": "@saafepulse help estimate this"
    }
  }
}
```

#### Advanced Features
- Conversation history analysis
- Previous mention detection
- Urgency assessment
- Command parsing for:
  - `/estimate` - Story point estimation
  - `/breakdown` - Task decomposition
  - `/dependencies` - Dependency mapping
  - `/help` - Help menu

#### Context Analysis
```typescript
interface ConversationContext {
  isFollowUp: boolean;
  previousMentions: number;
  topicShift: boolean;
  urgency: 'low' | 'normal' | 'high';
}
```

### IssueAssignmentProcessor

Dual-mode processor for assignment and unassignment events.

#### Trigger Events
- `issueAssignedToYou`
- `issueUnassignedFromYou`

#### Assignment Features
- Automatic status updates (Backlog/Todo → In Progress)
- Intelligent workflow state discovery
- Story size analysis
- Sprint tracking integration

#### Workflow State Discovery
```typescript
// 7-strategy fallback system for international teams
1. type === 'started' && name includes 'progress'
2. name exact match 'In Progress'
3. type === 'started' && name includes 'develop'
4. type === 'started' && name includes 'work'
5. name includes 'doing' or 'active'
6. type === 'started' && position check
7. type === 'started' (fallback)
```

### IssueStatusChangeProcessor

Tracks status transitions on assigned issues.

#### Trigger Event
```json
{
  "action": "issueStatusChanged",
  "type": "AppUserNotification",
  "notification": {
    "issue": {
      "state": {
        "name": "Done",
        "type": "completed"
      }
    }
  }
}
```

#### Transition Analysis
```typescript
type TransitionType = 'progress' | 'completion' | 'blocking' | 'restart' | 'other';

interface StatusAnalysis {
  transitionType: TransitionType;
  isPositive: boolean;
  requiresAction: boolean;
  suggestedActions: string[];
}
```

#### Smart Suggestions
- Large story breakdown (>8 points)
- Blocker resolution strategies
- Urgent issue escalation
- Work summary on completion

### IssueReactionProcessor

Handles emoji reactions with intelligent filtering.

#### Trigger Events
- `issueEmojiReaction`
- `issueCommentReaction`

#### Response Logic
```typescript
// Only respond in meaningful contexts:
1. High priority issues (P1)
2. Comments containing questions
3. Issues assigned to agent
4. Agent mentioned in issue
```

#### Filtering Strategy
- Prevents notification spam
- Tracks all events in Slack
- Context-aware engagement

### IssueNewCommentProcessor

Monitors new comments for proactive assistance.

#### Trigger Event
```json
{
  "action": "issueNewComment",
  "type": "AppUserNotification",
  "notification": {
    "comment": {
      "body": "Comment text"
    }
  }
}
```

#### Comment Analysis
```typescript
interface CommentAnalysis {
  hasQuestion: boolean;
  hasRequest: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[]; // ['testing', 'deployment', 'blockers', etc.]
}
```

#### Smart Response Triggers
- Direct @saafepulse mentions
- Questions in assigned issues
- Requests for help
- Blocker notifications

## Integration Points

### Linear API Integration
```typescript
// All processors use LinearClientWrapper
linearClient.createComment(issueId, content);
linearClient.updateIssue({ id, stateId });
```

### Slack Notification Integration
```typescript
// Consistent notification format
notificationCoordinator.notifyAgentUpdate(
  source: 'linear-agent',
  environment: 'remote',
  status: 'assigned',
  title: string,
  message: string,
  link: string,
  user?: string
);
```

### Error Handling Pattern
```typescript
try {
  // Process logic
} catch (error) {
  logger.error('Failed to process', { error, context });
  
  // User-visible error notification
  await this.createLinearComment(
    issueId,
    `⚠️ I encountered an error: ${error.message}`
  );
  
  // Slack error tracking
  await this.notifySlack('error', title, message, url, 'System');
  
  throw error; // Propagate for webhook retry
}
```

## Performance Characteristics

### Response Times
- Target: <2 seconds
- Parallel Slack + Linear operations
- Optimized decision logic

### Rate Limiting
- Linear API: 400 req/min
- Built-in retry logic
- Exponential backoff

### Concurrency
- Stateless processors
- Horizontal scaling ready
- Queue-based processing

## Testing

### Unit Test Pattern
```typescript
describe('ProcessorName', () => {
  let processor: ProcessorClass;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;
  let mockNotificationCoordinator: jest.Mocked<OperationalNotificationCoordinator>;
  
  beforeEach(() => {
    // Setup mocks
  });
  
  it('should handle event correctly', async () => {
    const notification = { /* test data */ };
    await processor.process(notification);
    
    expect(mockLinearClient.createComment).toHaveBeenCalledWith(
      'issue-id',
      expect.stringContaining('expected text')
    );
  });
});
```

### Test Coverage Requirements
- Minimum 80% line coverage
- All error paths tested
- Edge cases documented
- Integration tests for handler

## Configuration

### Required Environment Variables
```bash
LINEAR_WEBHOOK_SECRET=xxx
LINEAR_AGENT_ID=xxx
LINEAR_ACCESS_TOKEN=xxx
LINEAR_ORGANIZATION_ID=xxx
SLACK_BOT_TOKEN=xxx
SLACK_NOTIFICATION_CHANNEL=xxx
```

### Feature Flags
```typescript
// Future enhancement
ENABLE_AI_RESPONSES=true
ENABLE_AUTO_ASSIGNMENT=true
ENABLE_SMART_ROUTING=true
```

## Extensibility

### Creating New Processors
1. Extend `BaseWebhookProcessor`
2. Implement `process()` method
3. Add to processor index
4. Update webhook handler
5. Add comprehensive tests

### Hook Points
- Pre-processing validation
- Response generation
- Post-processing actions
- Analytics tracking

## Monitoring

### Key Metrics
- Webhook processing rate
- Response time percentiles
- Error rates by processor
- Slack delivery success

### Logging
```typescript
logger.info('Processing event', {
  processor: 'IssueMentionProcessor',
  issueId: issue.id,
  issueIdentifier: issue.identifier,
  actorName: actor?.name
});
```

### Health Checks
- Webhook endpoint: `/health/webhooks`
- Processor status: `/health/processors`
- Linear connectivity: `/health/linear`
- Slack connectivity: `/health/slack`