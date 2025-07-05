# Webhook Processors Implementation - Story Specification

**Story ID**: TBD (to be created in Linear)  
**Epic**: Linear Agent Interactive Capabilities  
**Story Points**: 5  
**Priority**: High (1)  
**Type**: Technical Enabler

## 📋 **USER STORY**

**As a** Linear workspace user  
**I want** the SAFe PULSE agent to respond to mentions and assignments  
**So that** I can interact with the agent directly within Linear issues and comments

## 🎯 **PROBLEM STATEMENT**

The SAFe PULSE agent currently has webhook infrastructure but **no actual processors** for Linear `AppUserNotification` events. Users cannot interact with the agent through mentions (@saafepulse) or assignments, making the sophisticated ART planning capabilities inaccessible within Linear.

**Current State**: Webhooks received but only logged, no responses generated  
**Desired State**: Agent responds to mentions, assignments, and reactions with appropriate actions

## ✅ **ACCEPTANCE CRITERIA**

### **Core Webhook Processing**
- [ ] **Issue Mention Processor**: Responds when @saafepulse is mentioned in issue description or title
- [ ] **Comment Mention Processor**: Responds when @saafepulse is mentioned in issue comments
- [ ] **Issue Assignment Processor**: Acknowledges when issues are assigned to the agent
- [ ] **Issue Unassignment Processor**: Acknowledges when issues are unassigned from the agent
- [ ] **New Comment Processor**: Processes new comments on issues where agent is involved
- [ ] **Status Change Processor**: Tracks status changes on assigned issues
- [ ] **Emoji Reaction Processor**: Responds to emoji reactions on agent comments
- [ ] **Comment Reaction Processor**: Processes reactions to agent's comments

### **Response Requirements**
- [ ] **Immediate Acknowledgment**: Agent responds within 2 seconds of mention
- [ ] **Context Awareness**: Responses consider issue type, status, and content
- [ ] **Error Handling**: Graceful handling of API failures and malformed webhooks
- [ ] **Rate Limiting**: Respects Linear API rate limits and implements backoff
- [ ] **Logging**: Comprehensive logging of all webhook processing activities

### **Integration Requirements**
- [ ] **Slack Notifications**: Webhook processing triggers Slack notifications via existing system
- [ ] **Database Logging**: All interactions logged to database for analytics
- [ ] **Command Detection**: Basic command detection for future command parser integration
- [ ] **Status Updates**: Agent updates issue status when assigned and work begins

## 🔧 **TECHNICAL IMPLEMENTATION**

### **Processor Architecture**
```typescript
// src/webhooks/processors/base-processor.ts
export abstract class BaseWebhookProcessor {
  abstract process(notification: AppUserNotification): Promise<void>;
  
  protected async createResponse(
    issueId: string, 
    message: string, 
    type: 'comment' | 'reaction'
  ): Promise<void> {
    // Common response creation logic
  }
  
  protected async notifySlack(event: string, details: any): Promise<void> {
    // Integration with OperationalNotificationCoordinator
  }
}

// src/webhooks/processors/issue-mention.processor.ts
export class IssueMentionProcessor extends BaseWebhookProcessor {
  async process(notification: AppUserNotification): Promise<void> {
    const { issue, actor } = notification;
    
    // Extract mention context
    const mentionContext = this.extractMentionContext(issue);
    
    // Detect potential commands
    const hasCommand = this.detectCommand(mentionContext);
    
    // Generate appropriate response
    const response = hasCommand 
      ? this.createCommandResponse(mentionContext)
      : this.createAcknowledgmentResponse(actor.name);
    
    // Create Linear comment
    await this.createResponse(issue.id, response, 'comment');
    
    // Notify Slack
    await this.notifySlack('agent_mentioned', {
      issueId: issue.id,
      issueTitle: issue.title,
      actorName: actor.name,
      hasCommand
    });
  }
}
```

### **Processor Factory**
```typescript
// src/webhooks/processors/processor-factory.ts
export class ProcessorFactory {
  static create(action: NotificationType): BaseWebhookProcessor {
    switch (action) {
      case 'issueMention':
        return new IssueMentionProcessor();
      case 'issueCommentMention':
        return new IssueCommentMentionProcessor();
      case 'issueAssignedToYou':
        return new IssueAssignedProcessor();
      case 'issueUnassignedFromYou':
        return new IssueUnassignedProcessor();
      case 'issueNewComment':
        return new IssueNewCommentProcessor();
      case 'issueStatusChanged':
        return new IssueStatusChangedProcessor();
      case 'issueEmojiReaction':
        return new IssueEmojiReactionProcessor();
      case 'issueCommentReaction':
        return new IssueCommentReactionProcessor();
      default:
        return new DefaultProcessor();
    }
  }
}
```

### **Enhanced Webhook Handler**
```typescript
// src/webhooks/handler.ts (enhanced)
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    // Existing signature verification (✅ already implemented)
    const isValid = verifyWebhookSignature(
      req.headers['linear-signature'] as string,
      req.body
    );

    if (!isValid) {
      logger.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { type, action, data } = req.body;
    logger.info(`Received webhook: ${type} - ${action}`, { type, action });

    switch (type) {
      case 'AppUserNotification':
        // NEW: Route to specific processor
        const processor = ProcessorFactory.create(action);
        await processor.process(req.body);
        break;

      default:
        logger.info(`Unhandled webhook type: ${type}`, { type, action });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error processing webhook', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

## 📊 **IMPLEMENTATION DETAILS**

### **File Structure**
```
src/webhooks/processors/
├── base-processor.ts                    # Abstract base class
├── processor-factory.ts                 # Processor creation factory
├── issue-mention.processor.ts           # @saafepulse mentions in issues
├── issue-comment-mention.processor.ts   # @saafepulse mentions in comments
├── issue-assigned.processor.ts          # Issue assignments to agent
├── issue-unassigned.processor.ts        # Issue unassignments from agent
├── issue-new-comment.processor.ts       # New comments on agent issues
├── issue-status-changed.processor.ts    # Status changes on agent issues
├── issue-emoji-reaction.processor.ts    # Emoji reactions on issues
├── issue-comment-reaction.processor.ts  # Reactions to agent comments
└── default.processor.ts                 # Fallback for unknown events
```

### **Response Templates**
```typescript
// src/agent/response-templates.ts (enhanced)
export class ResponseTemplates {
  static mentionAcknowledgment(userName: string): string {
    return `Hi @${userName}! 👋 I'm the SAFe PULSE agent. I can help with ART planning, story decomposition, and value delivery analysis. What can I do for you?`;
  }
  
  static assignmentAcknowledgment(userName: string, issueTitle: string): string {
    return `Thanks @${userName}! I've been assigned to "${issueTitle}". I'll start working on this and update the status. 🚀`;
  }
  
  static commandDetected(command: string): string {
    return `I detected a command: "${command}". Processing now... ⚡`;
  }
  
  static helpResponse(): string {
    return `## SAFe PULSE Agent Commands 🤖

**ART Planning:**
- \`@saafepulse plan this PI\` - Execute ART iteration planning
- \`@saafepulse analyze value delivery\` - Analyze value delivery for current iteration
- \`@saafepulse optimize ART\` - Run ART readiness optimization

**Story Management:**
- \`@saafepulse decompose this story\` - Break down large stories
- \`@saafepulse map dependencies\` - Identify and map dependencies

**Status & Help:**
- \`@saafepulse status\` - Show current ART status
- \`@saafepulse help\` - Show this help message

Need something else? Just ask! 💬`;
  }
}
```

## 🧪 **TESTING STRATEGY**

### **Unit Tests**
```typescript
// tests/webhooks/processors/issue-mention.processor.test.ts
describe('IssueMentionProcessor', () => {
  it('should respond to mentions with acknowledgment', async () => {
    const processor = new IssueMentionProcessor();
    const mockNotification = createMockNotification('issueMention');
    
    await processor.process(mockNotification);
    
    expect(mockLinearClient.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: mockNotification.issue.id,
        body: expect.stringContaining('Hi @')
      })
    );
  });
  
  it('should detect commands in mentions', async () => {
    const processor = new IssueMentionProcessor();
    const mockNotification = createMockNotificationWithCommand('@saafepulse help');
    
    await processor.process(mockNotification);
    
    expect(mockLinearClient.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('SAFe PULSE Agent Commands')
      })
    );
  });
});
```

### **Integration Tests**
```typescript
// tests/webhooks/webhook-integration.test.ts
describe('Webhook Integration', () => {
  it('should process real webhook payloads', async () => {
    const webhookPayload = loadRealWebhookPayload('issueMention');
    
    const response = await request(app)
      .post('/webhook')
      .set('linear-signature', generateValidSignature(webhookPayload))
      .send(webhookPayload)
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
```

## 📈 **SUCCESS METRICS**

### **Technical Metrics**
- **Response Time**: <2 seconds from webhook receipt to Linear comment creation
- **Success Rate**: >99% successful webhook processing
- **Error Rate**: <1% failed webhook processing
- **Coverage**: 100% of Linear AppUserNotification event types handled

### **Functional Metrics**
- **Mention Response**: 100% of @saafepulse mentions receive acknowledgment
- **Assignment Response**: 100% of issue assignments receive acknowledgment
- **Command Detection**: >90% accuracy in detecting commands vs. casual mentions
- **User Satisfaction**: Positive feedback on agent responsiveness

## 🔄 **INTEGRATION POINTS**

### **Existing Systems**
- **Linear Client**: Uses existing `LinearClientWrapper` for API calls
- **Slack Notifications**: Integrates with `OperationalNotificationCoordinator`
- **Database**: Logs interactions using existing database models
- **Error Handling**: Uses existing logging and error handling patterns

### **Future Integration**
- **Command Parser**: Processors will route detected commands to future command parser
- **Autonomous Behaviors**: Status change processor will trigger autonomous actions
- **Analytics**: Interaction data will feed into agent effectiveness analytics

## 🚀 **DEPLOYMENT PLAN**

### **Phase 1: Core Processors (Day 1-2)**
- Implement `IssueMentionProcessor` and `IssueCommentMentionProcessor`
- Basic acknowledgment responses
- Integration with existing webhook handler

### **Phase 2: Assignment Handling (Day 3)**
- Implement `IssueAssignedProcessor` and `IssueUnassignedProcessor`
- Status update automation
- Slack notification integration

### **Phase 3: Advanced Interactions (Day 4-5)**
- Implement remaining processors (reactions, status changes, new comments)
- Command detection enhancement
- Comprehensive testing and error handling

**This implementation provides the foundation for all future agent interactions and makes the sophisticated ART planning capabilities accessible through Linear mentions.** 🎯
