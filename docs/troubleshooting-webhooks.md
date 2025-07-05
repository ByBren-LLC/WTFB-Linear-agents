# Webhook Troubleshooting Guide

This guide helps diagnose and resolve common issues with the SAFe PULSE Linear webhook integration.

## Common Issues

### 1. Agent Not Responding to Mentions

#### Symptoms
- `@saafepulse` mentions ignored
- No response within 2 seconds
- No Slack notifications

#### Diagnostic Steps

1. **Check Linear Webhook Status**
   ```bash
   # In Linear UI
   Settings → API → Webhooks → [Your webhook]
   Check "Recent Deliveries" for failures
   ```

2. **Verify Environment Variables**
   ```bash
   # Check required vars
   echo $LINEAR_WEBHOOK_SECRET
   echo $LINEAR_AGENT_ID
   echo $LINEAR_ACCESS_TOKEN
   ```

3. **Check Logs**
   ```bash
   # Application logs
   npm run logs:webhooks
   
   # Look for:
   # - "Invalid webhook signature"
   # - "Missing Linear credentials"
   # - API errors
   ```

4. **Test Webhook Endpoint**
   ```bash
   curl -X POST https://your-domain.com/api/webhooks/linear \
     -H "Content-Type: application/json" \
     -H "Linear-Signature: test" \
     -d '{"type":"test"}'
   ```

#### Solutions

**Invalid Signature**
- Verify `LINEAR_WEBHOOK_SECRET` matches Linear configuration
- Check for extra whitespace in environment variable
- Regenerate webhook secret if needed

**Missing Credentials**
```bash
# Set required environment variables
export LINEAR_AGENT_ID="your-agent-user-id"
export LINEAR_ACCESS_TOKEN="your-api-token"
export LINEAR_ORGANIZATION_ID="your-org-id"
```

**Network Issues**
- Ensure webhook endpoint is publicly accessible
- Check firewall rules
- Verify SSL certificate is valid

### 2. Duplicate Responses

#### Symptoms
- Multiple identical comments
- Repeated Slack notifications
- Same response posted 2-3 times

#### Diagnostic Steps

1. **Check Webhook Configuration**
   - Ensure only ONE webhook points to your endpoint
   - Verify no duplicate webhook subscriptions

2. **Review Logs for Retries**
   ```bash
   grep "Received webhook" logs/webhooks.log | \
     awk '{print $5}' | sort | uniq -c | sort -nr
   ```

3. **Check Response Times**
   - Linear retries if response >5 seconds
   - Check for slow API calls

#### Solutions

**Implement Deduplication**
```typescript
// Add to webhook handler
const processedWebhooks = new Set();

if (processedWebhooks.has(notification.id)) {
  logger.info('Duplicate webhook ignored', { id: notification.id });
  return res.status(200).json({ success: true });
}

processedWebhooks.add(notification.id);
// Clean up old entries after 5 minutes
```

**Optimize Response Time**
- Return 200 immediately after validation
- Process webhook asynchronously
- Implement queue-based processing

### 3. Wrong Status Updates

#### Symptoms
- Issues not moving to "In Progress"
- Incorrect workflow states
- Status update failures

#### Diagnostic Steps

1. **Verify Workflow States**
   ```typescript
   // Add debug logging
   logger.info('Available workflow states', {
     states: workflowStates.map(s => ({
       name: s.name,
       type: s.type,
       id: s.id
     }))
   });
   ```

2. **Check Team Configuration**
   - Verify agent has permission to update issues
   - Check workflow state names in Linear

3. **Test State Discovery**
   ```bash
   # Check the state discovery logic
   npm run test -- tests/webhooks/processors/issue-assignment.processor.test.ts
   ```

#### Solutions

**Custom Workflow Names**
- Update state discovery strategies
- Add team-specific mappings
- Configure fallback states

**Permission Issues**
- Ensure agent user has edit permissions
- Add agent to team with appropriate role
- Check project-specific permissions

### 4. Slack Notifications Not Appearing

#### Symptoms
- Linear responses work, but no Slack messages
- Notification errors in logs
- Missing channel messages

#### Diagnostic Steps

1. **Verify Slack Configuration**
   ```bash
   echo $SLACK_BOT_TOKEN
   echo $SLACK_NOTIFICATION_CHANNEL
   ```

2. **Test Slack Connection**
   ```bash
   # Test Slack API
   curl -X POST https://slack.com/api/auth.test \
     -H "Authorization: Bearer $SLACK_BOT_TOKEN"
   ```

3. **Check Channel Permissions**
   - Bot must be invited to channel
   - Channel ID vs channel name

#### Solutions

**Bot Not in Channel**
```bash
# Invite bot to channel
/invite @safepulse
```

**Invalid Token**
- Regenerate bot token in Slack admin
- Update environment variable
- Restart application

**Channel Format**
```bash
# Use channel ID, not name
SLACK_NOTIFICATION_CHANNEL="C1234567890"  # Correct
SLACK_NOTIFICATION_CHANNEL="#general"     # Incorrect
```

### 5. Performance Issues

#### Symptoms
- Slow response times (>2 seconds)
- Timeouts
- High memory usage

#### Diagnostic Steps

1. **Monitor Response Times**
   ```typescript
   const start = Date.now();
   await processor.process(notification);
   const duration = Date.now() - start;
   logger.info('Processing time', { duration, processor: type });
   ```

2. **Check Resource Usage**
   ```bash
   # Monitor CPU and memory
   top -p $(pgrep -f "node.*webhook")
   
   # Check for memory leaks
   node --inspect dist/server.js
   ```

3. **Analyze API Calls**
   - Count Linear API calls per webhook
   - Check for unnecessary queries
   - Monitor rate limit usage

#### Solutions

**Optimize Processing**
```typescript
// Parallel API calls
await Promise.all([
  this.createLinearComment(issueId, response),
  this.notifySlack(...)
]);
```

**Implement Caching**
- Cache Linear API responses
- Store workflow states in memory
- Use Redis for distributed cache

**Scale Horizontally**
- Deploy multiple instances
- Use load balancer
- Implement queue processing

## Debug Mode

Enable comprehensive debugging:

```bash
# Set debug environment variables
export DEBUG=webhooks:*
export LOG_LEVEL=debug
export WEBHOOK_DEBUG=true

# Run with debugging
npm run dev:debug
```

## Logging Best Practices

### What to Log
```typescript
// Good: Structured logging with context
logger.info('Processing webhook', {
  processor: 'IssueMentionProcessor',
  issueId: issue.id,
  issueIdentifier: issue.identifier,
  userId: actor?.id,
  duration: processingTime
});

// Bad: Unstructured logging
console.log('Processing webhook for issue ' + issue.id);
```

### Log Levels
- **ERROR**: Failures requiring intervention
- **WARN**: Degraded functionality
- **INFO**: Normal operations
- **DEBUG**: Detailed troubleshooting

## Health Checks

### Webhook Health Endpoint
```bash
curl https://your-domain.com/health/webhooks
```

Expected response:
```json
{
  "status": "healthy",
  "webhook": {
    "processed": 1234,
    "failed": 2,
    "avgResponseTime": 234
  },
  "linear": {
    "connected": true,
    "rateLimit": "350/400"
  },
  "slack": {
    "connected": true,
    "channel": "verified"
  }
}
```

## Emergency Procedures

### Webhook Storm (High Volume)
1. Implement rate limiting
2. Enable circuit breaker
3. Queue overflow handling

### Complete Failure
1. Check Linear webhook deliveries
2. Verify all credentials
3. Restart application
4. Check error logs
5. Roll back if needed

### Data Recovery
- Webhook payloads logged for 7 days
- Replay failed webhooks
- Manual intervention tools

## Contact Support

If issues persist:
1. Collect diagnostic information
2. Include webhook ID and timestamp
3. Share relevant logs
4. Contact: support@safepulse.ai

## Appendix: Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| WH001 | Invalid signature | Check webhook secret |
| WH002 | Missing credentials | Set environment variables |
| WH003 | Rate limit exceeded | Implement backoff |
| WH004 | Network timeout | Check connectivity |
| WH005 | Invalid payload | Update Linear API version |
| WH006 | Permission denied | Check agent permissions |
| WH007 | Duplicate webhook | Implement deduplication |
| WH008 | Processing error | Check logs for details |