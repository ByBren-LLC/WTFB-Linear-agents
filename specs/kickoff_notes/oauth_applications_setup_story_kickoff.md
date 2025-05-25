# Kick-off: Create OAuth Applications and Validate Testing User Story

## Assignment Overview
You are assigned to implement the Create OAuth Applications and Validate Testing user story for the Linear Planning Agent project. This story is part of the OAuth Routes Integration Technical Enabler and focuses on creating OAuth applications in Linear and Atlassian Developer Console, then validating the complete OAuth flow in local Docker environment.

## Linear Project Information
- **Linear Project**: [SAFe Agents](https://linear.app/wordstofilmby/project/safe-agents-41505bde79df/overview)
- **Linear Team**: [Linear Agents](https://linear.app/wordstofilmby/team/LIN/all)

## Linear Issue Creation
As part of this task, you should:
1. Create a new issue in the Linear project
2. Set the issue type to "User Story"
3. Set the priority to "High"
4. Title the issue "Create OAuth Applications and Validate Testing"
5. Include a brief description: "As a developer implementing the Linear Planning Agent, I want to create OAuth applications in Linear and Atlassian Developer Console and validate the complete OAuth flow in local Docker environment, so that I can authenticate with both services and enable full planning agent functionality."
6. Add the labels "oauth", "testing", "validation", "applications"
7. Assign the issue to yourself
8. Set story points to 5
9. Link to the parent Technical Enabler issue
10. Link to dependent stories (OAuth Routes and Environment Configuration)
11. Link to any existing OAuth-related issues in the LIN team

## Implementation Document
Your detailed implementation document is available in the repository:
[OAuth Applications Setup Story Implementation](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/main/specs/oauth-applications-setup-story.md)

## Project Context
The Linear Planning Agent serves as a SAFe Technical Delivery Manager (TDM) within Linear.app, bridging high-level planning and task execution. This agent analyzes Confluence documentation, creates properly structured Linear issues, and maintains SAFe hierarchy and relationships.

Your task is the final step in completing the OAuth authentication system: creating the actual OAuth applications and validating that the entire system works end-to-end in a Docker environment.

## Key Deliverables
Your implementation should include:
- Linear OAuth application created with correct redirect URIs
- Atlassian OAuth application created with proper scopes and permissions
- Local Docker environment successfully completing Linear OAuth flow
- Local Docker environment successfully completing Confluence OAuth flow
- End-to-end authentication validation for both services
- OAuth tokens properly stored and retrieved from database
- Token refresh mechanisms working correctly
- Error scenarios handled gracefully
- Comprehensive documentation of OAuth application setup process

## OAuth Application Requirements
### Linear OAuth Application
- **Name**: Linear Planning Agent (Development)
- **Redirect URI**: `http://localhost:3000/auth/callback`
- **Scopes**: Read access to issues, teams, projects
- **Application Type**: Web application
- **Environment**: Development (local testing)

### Atlassian OAuth Application
- **Name**: Linear Planning Agent (Development)
- **Redirect URI**: `http://localhost:3000/auth/confluence/callback`
- **Scopes**: 
  - `read:confluence-content.all` (read Confluence content)
  - `read:confluence-space.summary` (read space information)
  - `read:confluence-user` (read user information)
- **Application Type**: OAuth 2.0 (3LO)
- **Environment**: Development (local testing)

## Dependencies
- **Requires**: Register Confluence OAuth Routes story (MUST be complete)
- **Requires**: Complete OAuth Environment Configuration story (MUST be complete)
- **Parent**: OAuth Routes Integration Technical Enabler
- **Enables**: All Confluence-dependent features and synchronization functionality

## Definition of Done
Your task will be considered complete when:
- All acceptance criteria in the implementation document are met
- Linear OAuth application is created and tested
- Atlassian OAuth application is created and tested
- Local Docker OAuth flows work end-to-end for both services
- Token storage and retrieval validated in database
- Error scenarios handled gracefully (OAuth denial, network errors, etc.)
- Documentation includes complete OAuth application setup instructions
- Testing procedures are documented and validated
- Security requirements are met
- Performance requirements are met
- Code follows project coding standards
- Pull request is submitted and approved

## Branching and PR Guidelines
- Create a branch named `feature/oauth-applications-setup`
- Make your changes in this branch
- Submit a PR to the `dev` branch when complete
- Include a detailed description of your changes in the PR following our template

## Timeline
- Estimated effort: 5 story points
- Expected completion: Within 1 week
- This is HIGH PRIORITY as it completes the critical OAuth enabler

## Communication
- If you have questions or need clarification, please comment on your assigned Linear issue
- Provide regular updates on your progress in the Linear issue
- Flag any blockers or dependencies as soon as possible
- Tag @scott for any architectural decisions or clarifications needed
- Document any OAuth application credentials securely (DO NOT commit to version control)

## Implementation Phases
### Phase 1: Create OAuth Applications (Days 1-2)
1. **Create Linear OAuth Application**
   - Log into Linear workspace as admin
   - Navigate to Settings > API > OAuth Applications
   - Create new OAuth application with specified settings
   - Copy client ID and client secret securely

2. **Create Atlassian OAuth Application**
   - Log into Atlassian Developer Console
   - Create new OAuth 2.0 (3LO) app with specified settings
   - Configure required scopes for Confluence access
   - Copy client ID and client secret securely

### Phase 2: Configure Environment (Day 3)
1. **Update .env file with OAuth credentials**
2. **Verify Docker configuration includes all variables**
3. **Test environment variable loading**

### Phase 3: Test OAuth Flows (Days 4-5)
1. **Test Linear OAuth Flow**
   - Start Docker environment
   - Navigate to `http://localhost:3000/auth`
   - Complete Linear authentication
   - Verify token storage in database
   - Test API call with stored token

2. **Test Confluence OAuth Flow**
   - Navigate to `http://localhost:3000/auth/confluence`
   - Complete Confluence authentication
   - Verify token storage in database
   - Test API call with stored token

### Phase 4: Validation and Documentation (Days 6-7)
1. **End-to-End Validation**
2. **Error Scenario Testing**
3. **Documentation Updates**
4. **Testing Procedure Documentation**

## Testing Requirements
### OAuth Application Testing
- Verify Linear OAuth application configuration
- Verify Atlassian OAuth application configuration
- Test redirect URIs work correctly
- Test scope permissions are sufficient

### Integration Testing
- Test complete Linear OAuth flow in Docker
- Test complete Confluence OAuth flow in Docker
- Test token storage and retrieval from database
- Test API calls with stored tokens
- Test token refresh mechanisms

### Error Scenario Testing
- Test OAuth denial/cancellation by user
- Test invalid credentials handling
- Test network errors during OAuth flow
- Test token expiration and refresh handling

### Manual Testing Checklist
- [ ] OAuth applications created successfully
- [ ] Environment variables configured correctly
- [ ] Docker environment starts without errors
- [ ] Linear OAuth flow completes successfully
- [ ] Confluence OAuth flow completes successfully
- [ ] Tokens stored correctly in database
- [ ] API calls work with stored tokens
- [ ] Error scenarios handled appropriately
- [ ] Documentation is accurate and complete

## Security Considerations
- OAuth applications configured for development only
- Client secrets must be kept secure and not committed to version control
- Redirect URIs must be exact matches
- Token storage must be encrypted in database
- Session management must be secure
- Follow OAuth security best practices

## Documentation Requirements
- Step-by-step OAuth application creation guide
- Environment configuration instructions
- Testing procedure documentation
- Troubleshooting guide for common OAuth issues
- Security best practices for OAuth setup
- Screenshots or examples where helpful

## Files You'll Be Working With
**Documentation files to update:**
- `docs/setup-guide.md` - Add OAuth application setup instructions
- `docs/oauth-setup.md` - Create comprehensive OAuth setup guide
- `README.md` - Update with OAuth setup references

**Configuration files to verify:**
- `.env.template` - Ensure all OAuth variables are documented
- `docker-compose.yml` - Verify environment variable passing

**Testing files:**
- Create test scripts for OAuth flow validation
- Document testing procedures

## Success Metrics
- Both OAuth applications work correctly
- Complete OAuth flows function end-to-end
- Token storage and retrieval work reliably
- Error handling is comprehensive
- Documentation is clear and complete
- Setup process can be followed by other developers

## Related Linear Issues
This story should be linked to:
- OAuth Routes Integration Technical Enabler (parent)
- Register Confluence OAuth Routes story (dependency)
- Complete OAuth Environment Configuration story (dependency)
- Any synchronization features that depend on OAuth
- Any existing OAuth-related issues in https://linear.app/wordstofilmby/team/LIN/all

## Important Notes
- **DO NOT** commit OAuth credentials to version control
- Use development/testing OAuth applications only
- Test thoroughly in Docker environment before marking complete
- Document any limitations or assumptions discovered during testing
- Follow OAuth security best practices throughout implementation
- Consider rate limiting and error handling in all OAuth interactions

---

Thank you for your contribution to the Linear Planning Agent project. Your work on creating OAuth applications and validating the complete authentication system is the final critical piece that will enable full functionality of the planning agent. This story directly enables all Confluence-dependent features and completes the architectural runway for the entire project.
