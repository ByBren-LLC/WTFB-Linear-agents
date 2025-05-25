# Kick-off: Complete OAuth Environment Configuration User Story

## Assignment Overview
You are assigned to implement the Complete OAuth Environment Configuration user story for the Linear Planning Agent project. This story is part of the OAuth Routes Integration Technical Enabler and focuses on completing the environment variable templates and Docker configuration for OAuth functionality.

## Linear Project Information
- **Linear Project**: [SAFe Agents](https://linear.app/wordstofilmby/project/safe-agents-41505bde79df/overview)
- **Linear Team**: [Linear Agents](https://linear.app/wordstofilmby/team/LIN/all)

## Linear Issue Creation
As part of this task, you should:
1. Create a new issue in the Linear project
2. Set the issue type to "User Story"
3. Set the priority to "High"
4. Title the issue "Complete OAuth Environment Configuration"
5. Include a brief description: "As a developer setting up the Linear Planning Agent, I want complete environment variable templates and Docker configuration for OAuth, so that I can easily configure both Linear and Confluence OAuth applications for local development and production deployment."
6. Add the labels "oauth", "environment", "docker", "configuration"
7. Assign the issue to yourself
8. Set story points to 2
9. Link to the parent Technical Enabler issue
10. Link to any existing configuration-related issues in the LIN team

## Implementation Document
Your detailed implementation document is available in the repository:
[OAuth Environment Configuration Story Implementation](https://github.com/ByBren-LLC/WTFB-Linear-agents/blob/main/specs/oauth-environment-config-story.md)

## Project Context
The Linear Planning Agent serves as a SAFe Technical Delivery Manager (TDM) within Linear.app, bridging high-level planning and task execution. This agent analyzes Confluence documentation, creates properly structured Linear issues, and maintains SAFe hierarchy and relationships.

Your specific task is to complete the environment configuration for OAuth functionality. Currently, the environment configuration is incomplete:

**Current `.env.template` OAuth Variables (Incomplete):**
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

**Your Goal - Complete OAuth Configuration:**
```bash
# Linear OAuth (Complete)
LINEAR_CLIENT_ID=your_client_id
LINEAR_CLIENT_SECRET=your_client_secret
LINEAR_REDIRECT_URI=http://localhost:3000/auth/callback

# Confluence OAuth (ADD THESE)
CONFLUENCE_CLIENT_ID=your_confluence_client_id
CONFLUENCE_CLIENT_SECRET=your_confluence_client_secret

# Application Configuration (ADD THESE)
APP_URL=http://localhost:3000
SESSION_SECRET=generate_a_random_session_secret

# Legacy Confluence API (Keep for backward compatibility)
CONFLUENCE_USERNAME=your_confluence_username
CONFLUENCE_API_TOKEN=your_confluence_api_token
CONFLUENCE_BASE_URL=https://cheddarfox.atlassian.net/wiki
```

## Key Deliverables
Your implementation should include:
- Updated `.env.template` with all required OAuth environment variables
- Updated `docker-compose.yml` with new environment variable mappings
- Improved documentation and examples for environment variables
- Updated setup guide with OAuth configuration instructions
- Validation that both local development and Docker environments support OAuth

## Technical Requirements
### Files to Modify
1. **`.env.template`** - Add missing OAuth environment variables
2. **`docker-compose.yml`** - Add environment variable mappings
3. **`docs/setup-guide.md`** - Update documentation

### Environment Variables to Add
```bash
# Add to .env.template
CONFLUENCE_CLIENT_ID=your_confluence_client_id
CONFLUENCE_CLIENT_SECRET=your_confluence_client_secret
APP_URL=http://localhost:3000
SESSION_SECRET=generate_a_random_session_secret_at_least_32_chars
```

### Docker Configuration Updates
```yaml
# Add to docker-compose.yml environment section
- CONFLUENCE_CLIENT_ID=${CONFLUENCE_CLIENT_ID}
- CONFLUENCE_CLIENT_SECRET=${CONFLUENCE_CLIENT_SECRET}
- APP_URL=${APP_URL}
- SESSION_SECRET=${SESSION_SECRET}
```

## Dependencies
- **Parent**: OAuth Routes Integration Technical Enabler
- **Sibling**: Register Confluence OAuth Routes story
- **Enables**: OAuth Applications Setup story
- **Requires**: No dependencies - can be implemented independently

## Definition of Done
Your task will be considered complete when:
- All acceptance criteria in the implementation document are met
- `.env.template` includes all required OAuth environment variables
- Docker Compose configuration includes new environment variables
- Environment variables are properly documented with examples
- Both local development and Docker environments support OAuth
- Missing variables are clearly identified in documentation
- Environment validation provides helpful error messages
- Code follows project coding standards
- Documentation is comprehensive and clear
- Setup process is validated end-to-end
- No breaking changes to existing setup
- OAuth applications can be configured successfully

## Branching and PR Guidelines
- Create a branch named `feature/oauth-environment-config`
- Make your changes in this branch
- Submit a PR to the `dev` branch when complete
- Include a detailed description of your changes in the PR following our template

## Timeline
- Estimated effort: 2 story points
- Expected completion: Within 2-3 days
- This is HIGH PRIORITY as part of critical OAuth enabler

## Communication
- If you have questions or need clarification, please comment on your assigned Linear issue
- Provide regular updates on your progress in the Linear issue
- Flag any blockers or dependencies as soon as possible
- Tag @scott for any architectural decisions or clarifications needed

## Testing Requirements
### Configuration Testing
- Test `.env` file creation from template
- Test Docker Compose with new variables
- Validate OAuth configuration loading
- Test environment variable validation

### Documentation Testing
- Follow setup instructions from scratch
- Verify all steps are accurate and complete
- Test different deployment scenarios
- Validate troubleshooting guidance

### Manual Testing Checklist
- [ ] Copy `.env.template` to `.env` and fill in values
- [ ] Start application locally - no environment errors
- [ ] Start Docker Compose - all variables passed correctly
- [ ] OAuth routes can access required environment variables
- [ ] Error messages are helpful for missing variables
- [ ] Documentation accurately reflects setup process

## Security Considerations
- Session secrets must be properly generated (minimum 32 characters)
- OAuth credentials must be kept secure
- Environment variables should not be committed to version control
- Production configurations should use HTTPS
- Provide guidance on secure credential management

## Documentation Requirements
- Clear environment variable descriptions with examples
- OAuth application setup instructions
- Troubleshooting guide for configuration issues
- Examples for different deployment scenarios (local, Docker, production)
- Security best practices for credential management

## Files You'll Be Working With
**Primary files to modify:**
- `.env.template` - Add missing OAuth environment variables
- `docker-compose.yml` - Add environment variable mappings
- `docs/setup-guide.md` - Update setup documentation

**Reference files:**
- Existing OAuth implementations for understanding required variables
- Current environment configuration for maintaining compatibility

## Implementation Steps
1. **Update .env.template**
   - Add missing Confluence OAuth variables
   - Add APP_URL configuration
   - Add SESSION_SECRET with guidance
   - Improve variable documentation and examples

2. **Update docker-compose.yml**
   - Add new environment variables to app service
   - Ensure proper variable inheritance from .env file

3. **Update documentation**
   - Document new environment variables in setup guide
   - Add OAuth application setup instructions
   - Update setup checklist and troubleshooting guide

4. **Test configuration**
   - Test local development setup process
   - Test Docker environment setup process
   - Verify all variables are properly passed and accessible

5. **Validate setup process**
   - Follow setup instructions from scratch
   - Identify any missing steps or unclear instructions
   - Update documentation based on testing

## Success Metrics
- Environment setup process is clear and complete
- All OAuth variables are properly configured
- Docker environment works correctly
- Documentation is accurate and helpful
- No breaking changes to existing setup

## Related Linear Issues
This story should be linked to:
- OAuth Routes Integration Technical Enabler (parent)
- Register Confluence OAuth Routes story (sibling)
- OAuth Applications Setup story (enables)
- Any existing configuration or Docker-related issues in https://linear.app/wordstofilmby/team/LIN/all

---

Thank you for your contribution to the Linear Planning Agent project. Your work on completing the OAuth environment configuration is essential for enabling developers to easily set up and configure the planning agent with proper OAuth authentication for both Linear and Confluence services.
