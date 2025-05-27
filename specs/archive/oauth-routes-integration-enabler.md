# Technical Enabler Implementation: OAuth Routes Integration

## Enabler Information
- **Enabler ID**: TBD (to be assigned in Linear)
- **Type**: Architecture
- **Story Points**: 5
- **Priority**: High

## Enabler Description
Complete the OAuth authentication system by integrating missing Confluence OAuth routes into the Express server and ensuring proper environment configuration for both Linear and Confluence OAuth flows. This enabler addresses a critical gap where Confluence OAuth handlers exist but are not registered in the main server, preventing full OAuth functionality.

## Justification
The Linear Planning Agent currently has complete OAuth implementations for both Linear and Confluence, but the Confluence OAuth routes are not registered in the main Express server (`src/index.ts`). This prevents users from authenticating with Confluence, blocking the core functionality of the planning agent. Without this enabler:
- Users cannot authenticate with Confluence
- Bidirectional synchronization cannot function
- The planning agent cannot access Confluence documents
- The system remains incomplete despite having all the underlying OAuth code

## Acceptance Criteria
- [ ] Confluence OAuth routes are properly registered in `src/index.ts`
- [ ] Session middleware is configured for OAuth state management
- [ ] Environment template includes all required OAuth variables
- [ ] Docker configuration supports OAuth environment variables
- [ ] Local Docker testing validates complete OAuth flow
- [ ] Both Linear and Confluence authentication work end-to-end
- [ ] Error handling is comprehensive for all OAuth scenarios
- [ ] Documentation is updated to reflect OAuth setup process

## Technical Context
### Existing Codebase Analysis
The codebase has complete OAuth implementations but missing integration:

**Implemented Components:**
- `src/auth/oauth.ts`: Complete Linear OAuth flow
- `src/auth/confluence-oauth.ts`: Complete Confluence OAuth flow  
- `src/auth/tokens.ts`: Token management and refresh
- `src/db/models.ts`: Database schema for token storage
- Database migrations for `linear_tokens` and `confluence_tokens` tables

**Missing Integration:**
- Confluence OAuth routes not registered in `src/index.ts`
- Session middleware not configured
- Environment variables incomplete in templates

### System Architecture Impact
This enabler completes the authentication layer of the Linear Planning Agent architecture:
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Linear API    │    │  Express Server  │    │ Confluence API  │
│                 │    │                  │    │                 │
│ OAuth ✅        │◄──►│ Missing Routes ❌│◄──►│ OAuth ✅        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Dependencies
- Depends on existing OAuth implementations (already complete)
- Required for all downstream features that need Confluence access
- Blocks synchronization functionality
- Prerequisite for end-to-end testing

### Technical Constraints
- Must maintain existing OAuth security patterns
- Cannot break existing Linear OAuth functionality
- Must work in both local development and Docker environments
- Session management must be stateless for scalability

## Implementation Plan
### Files to Create/Modify
1. **`src/index.ts`** (MODIFY)
   - Import Confluence OAuth functions
   - Register Confluence OAuth routes
   - Add session middleware configuration

2. **`.env.template`** (MODIFY)
   - Add missing Confluence OAuth environment variables
   - Add APP_URL for OAuth callbacks

3. **`docker-compose.yml`** (MODIFY)
   - Add new environment variables to container configuration

4. **`docs/setup-guide.md`** (MODIFY)
   - Update OAuth setup instructions
   - Add Confluence OAuth app creation steps

### Key Components/Functions
- **Route Registration**: Add `/auth/confluence` and `/auth/confluence/callback` routes
- **Session Middleware**: Configure express-session for OAuth state management
- **Environment Configuration**: Complete OAuth environment variable setup
- **Error Handling**: Ensure comprehensive error handling for OAuth flows

### Technical Design
The implementation follows the existing OAuth pattern:

```typescript
// Current Linear OAuth (working)
app.get('/auth', initiateOAuth);
app.get('/auth/callback', handleOAuthCallback);

// Missing Confluence OAuth (to be added)
app.get('/auth/confluence', initiateConfluenceOAuth);
app.get('/auth/confluence/callback', handleConfluenceCallback);
```

### Technology Choices
- **Express.js**: Existing server framework (no change)
- **express-session**: For OAuth state management
- **Existing OAuth libraries**: Maintain current implementation patterns

### Configuration Changes
Environment variables to add:
```bash
# Confluence OAuth
CONFLUENCE_CLIENT_ID=your_confluence_client_id
CONFLUENCE_CLIENT_SECRET=your_confluence_client_secret
APP_URL=http://localhost:3000  # For OAuth callbacks

# Session management
SESSION_SECRET=generate_a_random_session_secret
```

## Testing Approach
### Unit Tests
- Test route registration and middleware configuration
- Test OAuth flow error handling
- Test environment variable validation

### Integration Tests
- Test complete Linear OAuth flow
- Test complete Confluence OAuth flow
- Test OAuth state management
- Test token storage and retrieval

### End-to-End Tests
- Test OAuth flow in Docker environment
- Test authentication with real Linear and Confluence instances
- Test error scenarios and recovery

### Test Data Requirements
- Mock OAuth responses for unit tests
- Test Linear and Confluence OAuth applications
- Local Docker environment for integration testing

## Implementation Steps
1. **Add session middleware to Express server**
2. **Import Confluence OAuth functions in src/index.ts**
3. **Register Confluence OAuth routes**
4. **Update .env.template with missing variables**
5. **Update docker-compose.yml with new environment variables**
6. **Test OAuth flows in local development**
7. **Test OAuth flows in Docker environment**
8. **Update documentation with setup instructions**
9. **Create comprehensive tests**
10. **Validate end-to-end functionality**

## SAFe Considerations
This technical enabler:
- **Enables Feature Development**: Unblocks all Confluence-dependent features
- **Reduces Technical Debt**: Completes partially implemented OAuth system
- **Supports Architectural Runway**: Provides foundation for synchronization features
- **Follows SAFe Principles**: Addresses infrastructure needs before feature development

## Security Considerations
- OAuth tokens stored securely in database with encryption
- Session secrets must be properly configured
- Redirect URIs must be validated
- HTTPS required for production OAuth flows
- Token refresh mechanisms must be secure

## Performance Considerations
- Session middleware should be lightweight
- OAuth flows should have appropriate timeouts
- Token refresh should be efficient
- Database queries for tokens should be optimized

## Documentation Requirements
- Update setup guide with OAuth app creation steps
- Document environment variable requirements
- Create troubleshooting guide for OAuth issues
- Update API documentation with OAuth endpoints

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] Code follows project coding standards
- [ ] Unit tests are written and passing
- [ ] Integration tests are written and passing
- [ ] End-to-end tests validate OAuth flows
- [ ] Code is reviewed and approved
- [ ] Documentation is updated
- [ ] No new technical debt is introduced
- [ ] Performance requirements are met
- [ ] Security requirements are met
- [ ] Docker environment supports OAuth flows
- [ ] Local development environment supports OAuth flows

## Notes for Implementation
- Follow existing OAuth patterns in the codebase
- Maintain consistency with Linear OAuth implementation
- Ensure proper error handling and logging
- Test thoroughly in both development and Docker environments
- Consider OAuth security best practices
- Document any assumptions or limitations

## Related Linear Issues
This enabler should be linked to:
- Any existing OAuth-related issues in https://linear.app/wordstofilmby/team/LIN/all
- Synchronization feature issues that depend on Confluence authentication
- Planning agent issues that require Confluence access
- Any blocked issues waiting for OAuth completion

## Next Steps After Completion
1. Create OAuth applications in Linear and Atlassian Developer Console
2. Test complete OAuth flows with real applications
3. Implement dependent features that require Confluence authentication
4. Enable bidirectional synchronization functionality
