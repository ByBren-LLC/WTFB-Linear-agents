# User Story Implementation: Create OAuth Applications and Validate Testing

## Story Information
- **Story ID**: TBD (to be assigned in Linear)
- **Parent Feature**: OAuth Routes Integration Technical Enabler
- **Story Points**: 5
- **Priority**: High

## Story Description
As a developer implementing the Linear Planning Agent, I want to create OAuth applications in Linear and Atlassian Developer Console and validate the complete OAuth flow in local Docker environment, so that I can authenticate with both services and enable full planning agent functionality.

## Acceptance Criteria
- [ ] Linear OAuth application is created with correct redirect URIs
- [ ] Atlassian OAuth application is created with proper scopes and permissions
- [ ] Local Docker environment successfully completes Linear OAuth flow
- [ ] Local Docker environment successfully completes Confluence OAuth flow
- [ ] End-to-end authentication works for both services
- [ ] OAuth tokens are properly stored and retrieved from database
- [ ] Token refresh mechanisms work correctly
- [ ] Error scenarios are handled gracefully
- [ ] Documentation includes OAuth application setup instructions

## Technical Context
### OAuth Application Requirements

**Linear OAuth Application:**
- **Redirect URI**: `http://localhost:3000/auth/callback`
- **Scopes**: Read access to issues, teams, projects
- **Application Type**: Web application
- **Environment**: Development (local testing)

**Atlassian OAuth Application:**
- **Redirect URI**: `http://localhost:3000/auth/confluence/callback`
- **Scopes**: `read:confluence-content.all`, `read:confluence-space.summary`, `read:confluence-user`
- **Application Type**: OAuth 2.0 (3LO)
- **Environment**: Development (local testing)

### Dependencies
- Requires OAuth routes implementation (previous story)
- Requires environment configuration (previous story)
- Depends on existing OAuth handler implementations
- Needs Docker environment setup

### Technical Constraints
- Must work with local Docker ports (localhost:3000)
- OAuth applications must be configured for development environment
- Token storage must work with existing database schema
- Must handle OAuth errors gracefully

## Implementation Plan
### OAuth Applications to Create
1. **Linear OAuth Application**
   - Create in Linear workspace settings
   - Configure redirect URI for local development
   - Obtain client ID and client secret
   - Test authorization flow

2. **Atlassian OAuth Application**
   - Create in Atlassian Developer Console
   - Configure OAuth 2.0 (3LO) application
   - Set appropriate scopes for Confluence access
   - Configure redirect URI for local development
   - Obtain client ID and client secret

### Testing Environment Setup
1. **Local Docker Environment**
   - Configure environment variables with OAuth credentials
   - Start application in Docker container
   - Verify OAuth routes are accessible
   - Test complete authentication flows

2. **Database Validation**
   - Verify token storage in PostgreSQL
   - Test token retrieval and refresh
   - Validate token encryption/decryption

### Key Components/Functions
1. **OAuth Flow Testing**
   - Linear authentication initiation and completion
   - Confluence authentication initiation and completion
   - Token storage and retrieval validation
   - Error handling verification

2. **Integration Validation**
   - API calls using stored tokens
   - Token refresh when expired
   - Cross-service authentication state

## Testing Approach
### OAuth Application Testing
- Test Linear OAuth application configuration
- Test Atlassian OAuth application configuration
- Verify redirect URIs work correctly
- Test scope permissions are sufficient

### Integration Testing
- Test complete Linear OAuth flow in Docker
- Test complete Confluence OAuth flow in Docker
- Test token storage and retrieval
- Test API calls with stored tokens
- Test token refresh mechanisms

### Error Scenario Testing
- Test OAuth denial/cancellation
- Test invalid credentials
- Test network errors during OAuth
- Test token expiration handling

### Test Data Requirements
- Valid Linear workspace for OAuth testing
- Valid Atlassian/Confluence instance for OAuth testing
- Test user accounts for authentication
- Docker environment with proper configuration

## Implementation Steps
### Phase 1: Create OAuth Applications
1. **Create Linear OAuth Application**
   - Log into Linear workspace as admin
   - Navigate to Settings > API > OAuth Applications
   - Create new OAuth application
   - Set name: "Linear Planning Agent (Development)"
   - Set redirect URI: `http://localhost:3000/auth/callback`
   - Copy client ID and client secret

2. **Create Atlassian OAuth Application**
   - Log into Atlassian Developer Console
   - Create new OAuth 2.0 (3LO) app
   - Set name: "Linear Planning Agent (Development)"
   - Set redirect URI: `http://localhost:3000/auth/confluence/callback`
   - Configure scopes: `read:confluence-content.all`, `read:confluence-space.summary`, `read:confluence-user`
   - Copy client ID and client secret

### Phase 2: Configure Environment
1. **Update .env file**
   - Add Linear OAuth credentials
   - Add Confluence OAuth credentials
   - Set APP_URL to `http://localhost:3000`
   - Generate and set SESSION_SECRET

2. **Verify Docker Configuration**
   - Ensure docker-compose.yml includes all OAuth environment variables
   - Test environment variable passing to container

### Phase 3: Test OAuth Flows
1. **Start Docker Environment**
   ```bash
   docker-compose up --build
   ```

2. **Test Linear OAuth Flow**
   - Navigate to `http://localhost:3000/auth`
   - Complete Linear authentication
   - Verify token storage in database
   - Test API call with stored token

3. **Test Confluence OAuth Flow**
   - Navigate to `http://localhost:3000/auth/confluence`
   - Complete Confluence authentication
   - Verify token storage in database
   - Test API call with stored token

4. **Test Error Scenarios**
   - Test OAuth cancellation
   - Test invalid credentials
   - Test network errors
   - Verify error handling

### Phase 4: Validation and Documentation
1. **End-to-End Validation**
   - Verify both OAuth flows work completely
   - Test token refresh mechanisms
   - Validate database token storage
   - Test API integration with stored tokens

2. **Update Documentation**
   - Document OAuth application creation process
   - Update setup guide with OAuth configuration
   - Create troubleshooting guide for OAuth issues
   - Document testing procedures

## SAFe Considerations
- Enables complete authentication capability for planning agent
- Validates architectural runway for OAuth integration
- Provides foundation for all Confluence-dependent features
- Demonstrates end-to-end system functionality

## Security Considerations
- OAuth applications configured for development only
- Client secrets must be kept secure
- Redirect URIs must be exact matches
- Token storage must be encrypted
- Session management must be secure

## Performance Considerations
- OAuth flows should complete within reasonable time
- Token storage should be efficient
- API calls with tokens should be fast
- Database queries for tokens should be optimized

## Documentation Requirements
- OAuth application creation step-by-step guide
- Environment configuration instructions
- Testing procedure documentation
- Troubleshooting guide for common OAuth issues
- Security best practices for OAuth setup

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] Linear OAuth application created and tested
- [ ] Atlassian OAuth application created and tested
- [ ] Local Docker OAuth flows work end-to-end
- [ ] Token storage and retrieval validated
- [ ] Error scenarios handled gracefully
- [ ] Documentation is comprehensive and accurate
- [ ] Testing procedures are documented
- [ ] Security requirements are met
- [ ] Performance requirements are met

## Notes for Implementation
- Use development/testing OAuth applications only
- Keep OAuth credentials secure and not in version control
- Test thoroughly in Docker environment
- Document any limitations or assumptions
- Follow OAuth security best practices
- Consider rate limiting and error handling

## Related Issues
This story should be linked to:
- OAuth Routes Integration Technical Enabler (parent)
- Confluence OAuth Routes story (dependency)
- Environment Configuration story (dependency)
- Any synchronization features that depend on OAuth

## OAuth Application Configuration Details

### Linear OAuth Application Settings:
- **Name**: Linear Planning Agent (Development)
- **Description**: Development OAuth app for Linear Planning Agent
- **Redirect URI**: `http://localhost:3000/auth/callback`
- **Scopes**: Default (read access to workspace data)

### Atlassian OAuth Application Settings:
- **Name**: Linear Planning Agent (Development)
- **Description**: Development OAuth app for Confluence integration
- **App type**: OAuth 2.0 (3LO)
- **Redirect URI**: `http://localhost:3000/auth/confluence/callback`
- **Scopes**: 
  - `read:confluence-content.all` (read Confluence content)
  - `read:confluence-space.summary` (read space information)
  - `read:confluence-user` (read user information)

## Verification Steps
1. OAuth applications created successfully
2. Environment variables configured correctly
3. Docker environment starts without errors
4. Linear OAuth flow completes successfully
5. Confluence OAuth flow completes successfully
6. Tokens stored correctly in database
7. API calls work with stored tokens
8. Error scenarios handled appropriately
9. Documentation is accurate and complete
