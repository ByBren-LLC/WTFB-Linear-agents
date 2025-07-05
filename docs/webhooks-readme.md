# Linear Webhook System Documentation

## Overview

The SAFe PULSE Linear webhook system enables intelligent, context-aware interactions between Linear users and the SAFe PULSE agent through mentions, assignments, and other events. This system forms the foundation for AI-powered Agile Release Train (ART) planning directly within Linear.

## Features

### 🎯 Core Capabilities
- **Mention Recognition**: Responds to `@saafepulse` mentions in issues and comments
- **Assignment Handling**: Acknowledges assignments with automatic status updates
- **Status Tracking**: Monitors workflow progress with intelligent feedback
- **Reaction Processing**: Engages with emoji reactions contextually
- **Comment Monitoring**: Provides proactive assistance on relevant discussions

### 🚀 Advanced Features
- **Context Awareness**: Analyzes conversation history and issue state
- **Command Processing**: Supports `/estimate`, `/breakdown`, `/help` commands
- **Smart Filtering**: Reduces notification noise while maintaining visibility
- **Dual-Channel Output**: Simultaneous Linear comments and Slack notifications
- **Enterprise Error Handling**: User-visible error messages and recovery

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Linear    │────▶│   Webhook    │────▶│   Processor     │
│  Workspace  │     │   Handler    │     │   Selection     │
└─────────────┘     └──────────────┘     └─────────────────┘
                            │                      │
                            ▼                      ▼
                    ┌──────────────┐     ┌─────────────────┐
                    │  Signature   │     │ Event-Specific  │
                    │ Verification │     │   Processor     │
                    └──────────────┘     └─────────────────┘
                                                  │
                                    ┌─────────────┴─────────────┐
                                    ▼                           ▼
                          ┌─────────────────┐         ┌─────────────────┐
                          │ Linear Comment  │         │Slack Notification│
                          │    Creation     │         │     Delivery     │
                          └─────────────────┘         └─────────────────┘
```

## Quick Start

### 1. Prerequisites
- Linear workspace with admin access
- Node.js 18+ environment
- PostgreSQL database
- Slack workspace (optional)

### 2. Installation
```bash
# Clone repository
git clone https://github.com/your-org/wtfb-linear-agents.git
cd wtfb-linear-agents

# Install dependencies
npm install

# Set up environment
cp .env.template .env
# Edit .env with your credentials

# Run migrations
npm run db:migrate

# Start application
npm start
```

### 3. Configure Linear Webhook
See [Webhook Setup Guide](./webhook-setup-guide.md) for detailed instructions.

### 4. Test Integration
```markdown
1. Create a test issue
2. Add to description: Hey @saafepulse, can you help?
3. Verify response within 2 seconds
```

## Processor Documentation

### Available Processors

| Processor | Event Type | Purpose |
|-----------|------------|---------|
| [IssueMentionProcessor](./api/webhook-processors.md#issuementionprocessor) | `issueMention` | Initial contact and onboarding |
| [IssueCommentMentionProcessor](./api/webhook-processors.md#issuecommentmentionprocessor) | `issueCommentMention` | Ongoing conversations |
| [IssueAssignmentProcessor](./api/webhook-processors.md#issueassignmentprocessor) | `issueAssignedToYou` | Work acknowledgment |
| [IssueStatusChangeProcessor](./api/webhook-processors.md#issuestatuschangeprocessor) | `issueStatusChanged` | Progress tracking |
| [IssueReactionProcessor](./api/webhook-processors.md#issuereactionprocessor) | `issueEmojiReaction` | Engagement monitoring |
| [IssueNewCommentProcessor](./api/webhook-processors.md#issuenewcommentprocessor) | `issueNewComment` | Proactive assistance |

### Response Examples
See [Response Examples Catalog](./webhook-response-examples.md) for comprehensive examples.

## Development

### Project Structure
```
src/webhooks/
├── handler.ts              # Main webhook handler
├── verification.ts         # Signature verification
└── processors/
    ├── base-processor.ts   # Abstract base class
    ├── index.ts           # Processor exports
    └── *.processor.ts     # Individual processors
```

### Creating New Processors

1. **Extend BaseWebhookProcessor**
```typescript
export class MyNewProcessor extends BaseWebhookProcessor {
  async process(notification: AppUserNotification): Promise<void> {
    // Implementation
  }
}
```

2. **Add to Index**
```typescript
export { MyNewProcessor } from './my-new.processor';
```

3. **Update Handler**
```typescript
case 'myNewEvent':
  const processor = new MyNewProcessor(linearClient, notificationCoordinator);
  await processor.process(payload);
  break;
```

4. **Write Tests**
```typescript
describe('MyNewProcessor', () => {
  // Comprehensive test suite
});
```

### Testing

```bash
# Run all webhook tests
npm test -- tests/webhooks/

# Run specific processor tests
npm test -- tests/webhooks/processors/issue-mention.processor.test.ts

# Run with coverage
npm test -- tests/webhooks/ --coverage
```

### Code Quality Standards
- 100% test coverage for processors
- TypeScript strict mode
- Comprehensive error handling
- Structured logging
- Professional response tone

## Configuration

### Environment Variables
```bash
# Required
LINEAR_WEBHOOK_SECRET=xxx      # From Linear webhook settings
LINEAR_AGENT_ID=xxx           # Linear user ID for agent
LINEAR_ACCESS_TOKEN=xxx       # Linear API token
LINEAR_ORGANIZATION_ID=xxx    # Your Linear org ID

# Optional
SLACK_BOT_TOKEN=xxx          # For Slack notifications
SLACK_NOTIFICATION_CHANNEL=xxx # Channel for updates
WEBHOOK_DEBUG=true           # Enable debug logging
```

### Advanced Configuration
```typescript
// Custom response templates
const TEMPLATES = {
  greeting: "Custom greeting",
  help: "Custom help text"
};

// Feature flags
const FEATURES = {
  autoAssignment: true,
  smartRouting: true,
  aiResponses: false
};
```

## Performance

### Metrics
- **Response Time**: <2 seconds target
- **Success Rate**: >99.5%
- **Throughput**: 1000+ webhooks/minute
- **Memory Usage**: <500MB per instance

### Optimization
See [Performance Optimization Guide](./performance-optimization.md) for detailed analysis.

## Troubleshooting

### Common Issues
1. [Agent not responding](./troubleshooting-webhooks.md#1-agent-not-responding-to-mentions)
2. [Duplicate responses](./troubleshooting-webhooks.md#2-duplicate-responses)
3. [Wrong status updates](./troubleshooting-webhooks.md#3-wrong-status-updates)
4. [Missing Slack notifications](./troubleshooting-webhooks.md#4-slack-notifications-not-appearing)
5. [Performance issues](./troubleshooting-webhooks.md#5-performance-issues)

### Debug Mode
```bash
export DEBUG=webhooks:*
export LOG_LEVEL=debug
npm run dev:debug
```

## Security

### Best Practices
- ✅ Always verify webhook signatures
- ✅ Use HTTPS endpoints only
- ✅ Rotate secrets periodically
- ✅ Implement rate limiting
- ✅ Sanitize user input
- ✅ Log security events

### Webhook Verification
```typescript
const isValid = verifyWebhookSignature(
  req.headers['linear-signature'],
  req.body
);
```

## Monitoring

### Health Checks
- `/health/webhooks` - Overall webhook health
- `/health/processors` - Individual processor status
- `/health/linear` - Linear API connectivity
- `/health/slack` - Slack integration status

### Metrics Collection
```typescript
// Prometheus metrics
webhook_requests_total
webhook_response_time_seconds
webhook_errors_total
linear_api_calls_total
slack_notifications_sent_total
```

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook-processor
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: safepulse/webhooks:latest
        env:
        - name: LINEAR_WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: linear-secrets
              key: webhook-secret
```

## Contributing

### Guidelines
1. Follow TypeScript best practices
2. Maintain test coverage above 80%
3. Use structured logging
4. Document new features
5. Submit PRs with clear descriptions

### Code Style
- ESLint configuration provided
- Prettier for formatting
- Conventional commits

## Support

### Resources
- [API Documentation](./api/webhook-processors.md)
- [Setup Guide](./webhook-setup-guide.md)
- [Response Examples](./webhook-response-examples.md)
- [Troubleshooting](./troubleshooting-webhooks.md)
- [Performance Guide](./performance-optimization.md)

### Contact
- GitHub Issues: Report bugs and feature requests
- Email: support@safepulse.ai
- Slack: #safepulse-support

## License

[License information]

---

Built with ❤️ for Agile teams by the SAFe PULSE team