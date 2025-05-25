# Kick-off: Register Confluence OAuth Routes User Story

## Assignment Overview
You are assigned to implement the Register Confluence OAuth Routes user story for the Linear Planning Agent project. This story is part of the OAuth Routes Integration Technical Enabler and focuses specifically on registering the missing Confluence OAuth routes in the Express server.

## Linear Project Information
- **Linear Project**: [SAFe Agents](https://linear.app/wordstofilmby/project/safe-agents-41505bde79df/overview)
- **Linear Team**: [Linear Agents](https://linear.app/wordstofilmby/team/LIN/all)

## Linear Issue Creation
As part of this task, you should:
1. Create a new issue in the Linear project
2. Set the issue type to "User Story"
3. Set the priority to "High"
4. Title the issue "Register Confluence OAuth Routes"
5. Include a brief description: "As a developer using the Linear Planning Agent, I want the Confluence OAuth routes to be properly registered in the Express server, so that I can authenticate with Confluence and access Confluence documents for planning workflows."
6. Add the labels "oauth", "routes", "confluence"
7. Assign the issue to yourself
8. Set story points to 3
9. Link to the parent Technical Enabler issue
10. Link to any existing OAuth-related issues in the LIN team

## Implementation Document
Your detailed implementation document is available in the repository:
[Confluence OAuth Routes Story Implementation](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/main/specs/confluence-oauth-routes-story.md)

## Project Context
The Linear Planning Agent serves as a SAFe Technical Delivery Manager (TDM) within Linear.app, bridging high-level planning and task execution. This agent analyzes Confluence documentation, creates properly structured Linear issues, and maintains SAFe hierarchy and relationships.

Your specific task is to register the Confluence OAuth routes in the Express server. The OAuth infrastructure is complete but not integrated:

**Current State in `src/index.ts`:**
```typescript
// Only Linear OAuth routes are registered
app.get('/auth', initiateOAuth);
app.get('/auth/callback', handleOAuthCallback);
```

**Your Goal:**
```typescript
// Both Linear and Confluence OAuth routes registered
app.get('/auth', initiateOAuth);
app.get('/auth/callback', handleOAuthCallback);
app.get('/auth/confluence', initiateConfluenceOAuth);        // ← ADD THIS
app.get('/auth/confluence/callback', handleConfluenceCallback); // ← ADD THIS
```

## Key Deliverables
Your implementation should include:
- Import statements for Confluence OAuth functions in `src/index.ts`
- Session middleware configuration for OAuth state management
- Registration of GET `/auth/confluence` route for OAuth initiation
- Registration of GET `/auth/confluence/callback` route for OAuth completion
- Comprehensive error handling for OAuth scenarios
- Verification that existing Linear OAuth functionality remains unaffected

## Technical Requirements
### Primary File to Modify
- **`src/index.ts`** - Main Express server file

### Required Imports
```typescript
import { initiateConfluenceOAuth, handleConfluenceCallback } from './auth/confluence-oauth';
import session from 'express-session';
```

### Session Middleware Configuration
```typescript
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));
```

### Route Registration
```typescript
// Confluence OAuth routes
app.get('/auth/confluence', initiateConfluenceOAuth);
app.get('/auth/confluence/callback', handleConfluenceCallback);
```

## Dependencies
- **Parent**: OAuth Routes Integration Technical Enabler
- **Requires**: Existing Confluence OAuth implementation (already complete)
- **Blocks**: Environment Configuration story and OAuth Applications Setup story
- **Must not break**: Existing Linear OAuth functionality

## Definition of Done
Your task will be considered complete when:
- All acceptance criteria in the implementation document are met
- Confluence OAuth routes are imported and registered in `src/index.ts`
- Session middleware is properly configured for OAuth state management
- Routes handle GET `/auth/confluence` for OAuth initiation
- Routes handle GET `/auth/confluence/callback` for OAuth completion
- Error handling is comprehensive for all OAuth scenarios
- Existing Linear OAuth functionality remains unaffected
- Server starts successfully with new routes registered
- Routes are accessible and respond appropriately
- Code follows project coding standards
- Unit tests are written and passing
- Integration tests validate OAuth route functionality
- Pull request is submitted and approved

## Branching and PR Guidelines
- Create a branch named `feature/confluence-oauth-routes`
- Make your changes in this branch
- Submit a PR to the `dev` branch when complete
- Include a detailed description of your changes in the PR following our template

## Timeline
- Estimated effort: 3 story points
- Expected completion: Within 3-4 days
- This is HIGH PRIORITY as part of critical OAuth enabler

## Communication
- If you have questions or need clarification, please comment on your assigned Linear issue
- Provide regular updates on your progress in the Linear issue
- Flag any blockers or dependencies as soon as possible
- Tag @scott for any architectural decisions or clarifications needed

## Testing Requirements
### Unit Tests
- Test route registration doesn't break existing routes
- Test middleware configuration is correct
- Test error handling for missing environment variables

### Integration Tests
- Test OAuth initiation redirects correctly
- Test OAuth callback processes tokens correctly
- Test session state management works properly
- Test existing Linear OAuth still functions

### Manual Testing Checklist
- [ ] Server starts without errors
- [ ] GET `/auth/confluence` returns redirect to Confluence
- [ ] GET `/auth/confluence/callback` processes OAuth response
- [ ] Session state is maintained during OAuth flow
- [ ] Existing Linear OAuth routes continue to work
- [ ] Error scenarios are handled gracefully
- [ ] Logs show appropriate OAuth events

## Security Considerations
- Session secret must be properly configured
- OAuth state parameter validation
- Secure cookie configuration for production
- Proper error handling to prevent information leakage
- Follow OAuth security best practices

## Files You'll Be Working With
**Primary file to modify:**
- `src/index.ts` - Add imports, session middleware, and route registration

**Reference files (DO NOT MODIFY):**
- `src/auth/confluence-oauth.ts` - Complete Confluence OAuth implementation
- `src/auth/oauth.ts` - Complete Linear OAuth implementation

**Package dependencies:**
- Verify `express-session` is installed, add if missing

## Implementation Steps
1. **Install express-session dependency (if not present)**
2. **Add imports to src/index.ts**
3. **Configure session middleware before routes**
4. **Register Confluence OAuth routes**
5. **Test server startup and route accessibility**
6. **Test OAuth flow functionality**
7. **Verify existing functionality is unaffected**

## Success Metrics
- Routes respond correctly to requests
- Session state is maintained during OAuth flows
- No regressions in existing functionality
- Error scenarios are handled gracefully
- Code quality meets project standards

## Related Linear Issues
This story should be linked to:
- OAuth Routes Integration Technical Enabler (parent)
- Environment Configuration story (sibling)
- OAuth Applications Setup story (dependent)
- Any existing OAuth-related issues in https://linear.app/wordstofilmby/team/LIN/all

---

Thank you for your contribution to the Linear Planning Agent project. Your work on registering the Confluence OAuth routes is a critical component that will enable developers to authenticate with Confluence and access planning documents. This story directly enables the core functionality of the planning agent.
