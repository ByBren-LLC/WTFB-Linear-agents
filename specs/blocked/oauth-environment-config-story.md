# User Story Implementation: Complete OAuth Environment Configuration

## Story Information
- **Story ID**: TBD (to be assigned in Linear)
- **Parent Feature**: OAuth Routes Integration Technical Enabler
- **Story Points**: 2
- **Priority**: High

## Story Description
As a developer setting up the Linear Planning Agent, I want complete environment variable templates and Docker configuration for OAuth, so that I can easily configure both Linear and Confluence OAuth applications for local development and production deployment.

## Acceptance Criteria
- [ ] `.env.template` includes all required OAuth environment variables
- [ ] Docker Compose configuration includes new environment variables
- [ ] Environment variables are properly documented with examples
- [ ] Both local development and Docker environments support OAuth
- [ ] Missing variables are clearly identified in documentation
- [ ] Environment validation provides helpful error messages

## Technical Context
### Existing Codebase Analysis
Current environment configuration is incomplete for OAuth:

**Current `.env.template` OAuth Variables:**
```bash
# Linear OAuth (Complete)
LINEAR_CLIENT_ID=your_client_id
LINEAR_CLIENT_SECRET=your_client_secret
LINEAR_REDIRECT_URI=http://localhost:3000/auth/callback

# Confluence (Incomplete - missing OAuth variables)
CONFLUENCE_USERNAME=your_confluence_username
CONFLUENCE_API_TOKEN=your_confluence_api_token
CONFLUENCE_BASE_URL=https://cheddarfox.atlassian.net/wiki
```

**Missing OAuth Variables:**
- `CONFLUENCE_CLIENT_ID`
- `CONFLUENCE_CLIENT_SECRET`
- `APP_URL` (for OAuth callback construction)
- `SESSION_SECRET` (for OAuth state management)

**Docker Configuration Gap:**
- New environment variables not included in `docker-compose.yml`

### Dependencies
- Depends on OAuth route implementation
- Required for OAuth applications setup
- Needed for local Docker testing

### Technical Constraints
- Must maintain backward compatibility
- Cannot break existing environment setup
- Must work in both development and production
- Should provide clear guidance for setup

## Implementation Plan
### Files to Create/Modify
1. **`.env.template`** (MODIFY)
   - Add missing Confluence OAuth variables
   - Add APP_URL for callback construction
   - Add SESSION_SECRET for session management
   - Improve documentation and examples

2. **`docker-compose.yml`** (MODIFY)
   - Add new environment variables to app service
   - Ensure proper variable passing

3. **`docs/setup-guide.md`** (MODIFY)
   - Update environment variable documentation
   - Add OAuth application setup instructions

### Key Components/Functions
1. **Environment Variable Additions**
   - Confluence OAuth credentials
   - Application URL configuration
   - Session management secrets

2. **Docker Configuration Updates**
   - Environment variable mapping
   - Proper variable inheritance

3. **Documentation Enhancements**
   - Clear setup instructions
   - OAuth application creation guides

### Technical Design
Complete environment configuration structure:

```bash
# Linear OAuth Application Credentials
LINEAR_CLIENT_ID=your_linear_client_id
LINEAR_CLIENT_SECRET=your_linear_client_secret
LINEAR_REDIRECT_URI=http://localhost:3000/auth/callback

# Confluence OAuth Application Credentials
CONFLUENCE_CLIENT_ID=your_confluence_client_id
CONFLUENCE_CLIENT_SECRET=your_confluence_client_secret

# Application Configuration
APP_URL=http://localhost:3000
SESSION_SECRET=generate_a_random_session_secret

# Legacy Confluence API (for backward compatibility)
CONFLUENCE_USERNAME=your_confluence_username
CONFLUENCE_API_TOKEN=your_confluence_api_token
CONFLUENCE_BASE_URL=https://cheddarfox.atlassian.net/wiki
```

## Testing Approach
### Unit Tests
- Test environment variable validation
- Test configuration loading
- Test error handling for missing variables

### Integration Tests
- Test Docker environment variable passing
- Test local development configuration
- Test OAuth configuration validation

### Manual Testing
- Verify `.env` file creation from template
- Test Docker Compose with new variables
- Validate OAuth setup instructions

### Test Data Requirements
- Sample OAuth application credentials
- Test environment configurations
- Docker test environment

## Implementation Steps
1. **Update .env.template**
   - Add missing Confluence OAuth variables
   - Add APP_URL configuration
   - Add SESSION_SECRET
   - Improve variable documentation

2. **Update docker-compose.yml**
   - Add CONFLUENCE_CLIENT_ID environment variable
   - Add CONFLUENCE_CLIENT_SECRET environment variable
   - Add APP_URL environment variable
   - Add SESSION_SECRET environment variable

3. **Update documentation**
   - Document new environment variables
   - Add OAuth application setup instructions
   - Update setup checklist

4. **Test configuration**
   - Test local development setup
   - Test Docker environment setup
   - Verify all variables are properly passed

5. **Validate setup process**
   - Follow setup instructions from scratch
   - Identify any missing steps
   - Update documentation as needed

## SAFe Considerations
- Enables infrastructure for OAuth features
- Reduces setup complexity for developers
- Provides clear configuration guidance
- Supports both development and production environments

## Security Considerations
- Session secrets must be properly generated
- OAuth credentials must be kept secure
- Environment variables should not be committed to version control
- Production configurations should use HTTPS

## Performance Considerations
- Environment variable loading should be efficient
- Configuration validation should be fast
- No impact on runtime performance
- Minimal Docker image size impact

## Documentation Requirements
- Clear environment variable descriptions
- OAuth application setup instructions
- Troubleshooting guide for configuration issues
- Examples for different deployment scenarios

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] .env.template includes all required variables
- [ ] Docker configuration supports new variables
- [ ] Documentation is comprehensive and clear
- [ ] Setup process is validated end-to-end
- [ ] Code follows project standards
- [ ] No breaking changes to existing setup
- [ ] OAuth applications can be configured successfully

## Notes for Implementation
- Maintain backward compatibility with existing configurations
- Provide clear examples and documentation
- Consider different deployment scenarios
- Test setup process thoroughly
- Follow security best practices for credential management

## Related Issues
This story should be linked to:
- OAuth Routes Integration Technical Enabler (parent)
- Confluence OAuth Routes story (sibling)
- OAuth application setup stories
- Docker configuration issues

## Environment Variables to Add

### .env.template additions:
```bash
# Confluence OAuth Application Credentials
CONFLUENCE_CLIENT_ID=your_confluence_client_id
CONFLUENCE_CLIENT_SECRET=your_confluence_client_secret

# Application Configuration for OAuth
APP_URL=http://localhost:3000

# Session Management
SESSION_SECRET=generate_a_random_session_secret_at_least_32_chars
```

### docker-compose.yml additions:
```yaml
environment:
  - CONFLUENCE_CLIENT_ID=${CONFLUENCE_CLIENT_ID}
  - CONFLUENCE_CLIENT_SECRET=${CONFLUENCE_CLIENT_SECRET}
  - APP_URL=${APP_URL}
  - SESSION_SECRET=${SESSION_SECRET}
```

## Verification Steps
1. Copy .env.template to .env and fill in values
2. Start application locally - no environment errors
3. Start Docker Compose - all variables passed correctly
4. OAuth routes can access required environment variables
5. Error messages are helpful for missing variables
6. Documentation accurately reflects setup process
