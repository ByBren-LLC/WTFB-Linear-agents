# User Story Implementation: Register Confluence OAuth Routes

## Story Information
- **Story ID**: TBD (to be assigned in Linear)
- **Parent Feature**: OAuth Routes Integration Technical Enabler
- **Story Points**: 3
- **Priority**: High

## Story Description
As a developer using the Linear Planning Agent, I want the Confluence OAuth routes to be properly registered in the Express server, so that I can authenticate with Confluence and access Confluence documents for planning workflows.

## Acceptance Criteria
- [ ] Confluence OAuth routes are imported and registered in `src/index.ts`
- [ ] Session middleware is properly configured for OAuth state management
- [ ] Routes handle GET `/auth/confluence` for OAuth initiation
- [ ] Routes handle GET `/auth/confluence/callback` for OAuth completion
- [ ] Error handling is comprehensive for all OAuth scenarios
- [ ] Existing Linear OAuth functionality remains unaffected
- [ ] Server starts successfully with new routes registered
- [ ] Routes are accessible and respond appropriately

## Technical Context
### Existing Codebase Analysis
The OAuth infrastructure is complete but not integrated:

**Current State in `src/index.ts`:**
```typescript
// Only Linear OAuth routes are registered
app.get('/auth', initiateOAuth);
app.get('/auth/callback', handleOAuthCallback);
```

**Available but Unused:**
- `src/auth/confluence-oauth.ts` contains complete implementation
- `initiateConfluenceOAuth` function ready for use
- `handleConfluenceCallback` function ready for use
- Database schema supports Confluence tokens

**Missing Integration:**
- Import statements for Confluence OAuth functions
- Route registration for Confluence OAuth endpoints
- Session middleware configuration

### Dependencies
- Requires `express-session` package for OAuth state management
- Depends on existing Confluence OAuth implementation
- Must not interfere with existing Linear OAuth routes

### Technical Constraints
- Must maintain existing server architecture
- Cannot break existing functionality
- Must work in both development and production environments
- Session configuration must be secure

## Implementation Plan
### Files to Create/Modify
1. **`src/index.ts`** (PRIMARY MODIFICATION)
   - Add import for Confluence OAuth functions
   - Add express-session middleware configuration
   - Register Confluence OAuth routes
   - Ensure proper error handling

2. **`package.json`** (CHECK/MODIFY IF NEEDED)
   - Verify express-session dependency exists
   - Add if missing

### Key Components/Functions
1. **Import Statements**
   ```typescript
   import { initiateConfluenceOAuth, handleConfluenceCallback } from './auth/confluence-oauth';
   import session from 'express-session';
   ```

2. **Session Middleware Configuration**
   ```typescript
   app.use(session({
     secret: process.env.SESSION_SECRET || 'fallback-secret',
     resave: false,
     saveUninitialized: false,
     cookie: { secure: false } // Set to true in production with HTTPS
   }));
   ```

3. **Route Registration**
   ```typescript
   // Confluence OAuth routes
   app.get('/auth/confluence', initiateConfluenceOAuth);
   app.get('/auth/confluence/callback', handleConfluenceCallback);
   ```

### Technical Design
The implementation follows the established pattern:

```
Express Server Routes:
├── GET /auth (Linear OAuth initiation)
├── GET /auth/callback (Linear OAuth callback)
├── GET /auth/confluence (Confluence OAuth initiation) ← NEW
└── GET /auth/confluence/callback (Confluence OAuth callback) ← NEW
```

### Error Handling Strategy
- Validate environment variables on server startup
- Handle OAuth errors gracefully with user-friendly messages
- Log OAuth events for debugging
- Ensure session errors don't crash the server

## Testing Approach
### Unit Tests
- Test route registration doesn't break existing routes
- Test middleware configuration is correct
- Test error handling for missing environment variables

### Integration Tests
- Test OAuth initiation redirects correctly
- Test OAuth callback processes tokens correctly
- Test session state management works properly
- Test existing Linear OAuth still functions

### Manual Testing
- Start server and verify routes are accessible
- Test OAuth flow with mock Confluence application
- Verify error scenarios are handled gracefully

### Test Data Requirements
- Mock Confluence OAuth application for testing
- Test environment variables
- Session configuration for testing

## Implementation Steps
1. **Install express-session dependency (if not present)**
   ```bash
   npm install express-session @types/express-session
   ```

2. **Add imports to src/index.ts**
   - Import Confluence OAuth functions
   - Import express-session

3. **Configure session middleware**
   - Add session configuration before routes
   - Use environment variable for session secret

4. **Register Confluence OAuth routes**
   - Add GET /auth/confluence route
   - Add GET /auth/confluence/callback route

5. **Test server startup**
   - Verify no errors on server start
   - Verify routes are accessible

6. **Test OAuth flow**
   - Test initiation redirects to Confluence
   - Test callback processes correctly

7. **Verify existing functionality**
   - Ensure Linear OAuth still works
   - Ensure other routes are unaffected

## SAFe Considerations
- This story enables the architectural runway for Confluence integration
- Follows incremental development by adding one capability at a time
- Maintains system stability by not modifying existing functionality
- Provides foundation for dependent features

## Security Considerations
- Session secret must be properly configured
- OAuth state parameter validation
- Secure cookie configuration for production
- Proper error handling to prevent information leakage

## Performance Considerations
- Session middleware should be lightweight
- OAuth redirects should be fast
- Memory usage for session storage should be minimal
- No impact on existing route performance

## Documentation Requirements
- Update inline code comments
- Document new environment variables needed
- Update API documentation with new routes
- Create troubleshooting guide for OAuth issues

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] Code follows project coding standards
- [ ] Unit tests are written and passing
- [ ] Integration tests are written and passing
- [ ] Manual testing confirms OAuth routes work
- [ ] Code is reviewed and approved
- [ ] Documentation is updated
- [ ] No regressions in existing functionality
- [ ] Server starts successfully with new configuration
- [ ] OAuth flow can be initiated and completed

## Notes for Implementation
- Follow existing code patterns in src/index.ts
- Maintain consistency with Linear OAuth implementation
- Ensure proper TypeScript types are used
- Test thoroughly before submitting PR
- Consider OAuth security best practices
- Document any assumptions made during implementation

## Related Issues
This story should be linked to:
- OAuth Routes Integration Technical Enabler (parent)
- Any Confluence authentication issues
- Synchronization features that depend on Confluence access
- Environment configuration stories

## Verification Steps
1. Server starts without errors
2. GET /auth/confluence returns redirect to Confluence
3. GET /auth/confluence/callback processes OAuth response
4. Session state is maintained during OAuth flow
5. Existing Linear OAuth routes continue to work
6. Error scenarios are handled gracefully
7. Logs show appropriate OAuth events
