# WTFB Linear Planning Agent Implementation
> This document outlines the comprehensive implementation plan for the Linear Planning Agent, which will serve as a SAFe Technical Delivery Manager (TDM) within Linear.app, bridging high-level planning and task execution.

## Documentation Analysis

### Source Documentation
- **Confluence Page**: [Planning Agent Implementation](https://cheddarfox.atlassian.net/wiki/spaces/WA/pages/251756570/Planning+Agent+Implementation)
- **Additional References**: 
  - [Linear Agent Development Guidelines](https://linear.app/developers/agents)
  - [Linear OAuth 2.0 Authentication](https://linear.app/developers/oauth-2-0-authentication)
  - [Linear Webhooks Documentation](https://linear.app/developers/webhooks)
  - [SAFe Framework](https://www.scaledagileframework.com/)
  - [Coolify Documentation](https://coolify.io/docs)

### Business Context
- The Linear Planning Agent will be our first proof of concept for the Linear.app Agents SAFe Essentials workflow, functioning as a SAFe Technical Delivery Manager (TDM) or Technical Program Manager (TPM) within Linear.
- Key stakeholders include development teams using Linear for project management, product managers, and SAFe practitioners who need to ensure proper methodology implementation.
- The business value includes improved adherence to SAFe methodology, more consistent planning processes, reduced manual effort in planning activities, and better integration between planning documentation and task execution.

### User Impact
- **Development Teams**: Will receive properly structured work items with clear acceptance criteria, proper relationships, and SAFe-compliant organization.
- **Product Managers**: Will have better visibility into work breakdown and planning processes, with consistent application of SAFe methodology.
- **SAFe Practitioners**: Will have automated assistance in maintaining SAFe best practices across Linear projects.
- **Technical Architects**: Will see improved tracking of technical enablers and architectural runway maintenance.

## SAFe Work Breakdown

### Epic
- **Title**: Linear Planning Agent Implementation
- **Description**: Implement a Linear Planning Agent that serves as a bridge between high-level planning and task execution in Linear, following SAFe methodology. The agent will analyze Confluence documentation, create properly structured Linear issues, and maintain SAFe hierarchy and relationships.
- **Business Outcomes**: Improved adherence to SAFe methodology, more consistent planning processes, reduced manual effort, and better integration between documentation and execution.
- **KPIs/Metrics**: 
  - Reduction in planning time by 30%
  - 90% adherence to SAFe methodology in Linear projects
  - User satisfaction rating of 4/5 or higher
  - Successful processing of 95% of planning requests
- **Dependencies**: 
  - Linear API access
  - Confluence API access
  - Coolify.io infrastructure

### Features
1. **Feature 1**:
   - **Title**: OAuth Authentication and Authorization
   - **Description**: Implement OAuth authentication flow with Linear, including token management and security.
   - **Acceptance Criteria**:
     - [ ] OAuth flow successfully authenticates with Linear API using `actor=app` parameter
     - [ ] Access tokens are securely stored in the database with encryption
     - [ ] Token refresh works correctly when tokens expire
     - [ ] Error handling is robust and user-friendly
   - **Dependencies**: Linear API access
   - **Estimated Effort**: M

2. **Feature 2**:
   - **Title**: Webhook Integration
   - **Description**: Implement webhook handling for the Linear Planning Agent, ensuring it correctly processes and responds to Linear events.
   - **Acceptance Criteria**:
     - [ ] Webhook endpoint correctly verifies signatures
     - [ ] All relevant notification types are handled (`issueMention`, `issueCommentMention`, `issueAssignedToYou`, etc.)
     - [ ] Agent responds appropriately to mentions and assignments
     - [ ] Error handling is robust for webhook processing
   - **Dependencies**: Linear API access, OAuth Authentication
   - **Estimated Effort**: M

3. **Feature 3**:
   - **Title**: SAFe Planning Capabilities
   - **Description**: Implement core planning capabilities following SAFe methodology, including epic decomposition, feature creation, and relationship management.
   - **Acceptance Criteria**:
     - [ ] Epic decomposition works correctly
     - [ ] Feature creation follows SAFe guidelines
     - [ ] Story creation includes proper acceptance criteria
     - [ ] Technical enablers are properly identified and labeled
     - [ ] Relationships between issues are correctly established
   - **Dependencies**: Linear API access, OAuth Authentication
   - **Estimated Effort**: L

4. **Feature 4**:
   - **Title**: External Service Integration
   - **Description**: Implement integration with external services like Confluence and Slack.
   - **Acceptance Criteria**:
     - [ ] Confluence integration correctly fetches and processes documentation
     - [ ] Slack notifications are sent for important updates
     - [ ] Error handling is robust for external service failures
     - [ ] Authentication with external services is secure
   - **Dependencies**: Confluence API access, Slack webhook URL
   - **Estimated Effort**: M

5. **Feature 5**:
   - **Title**: Deployment and Infrastructure
   - **Description**: Set up deployment infrastructure on Coolify.io and configure monitoring and logging.
   - **Acceptance Criteria**:
     - [ ] Docker container is properly configured
     - [ ] Coolify.io deployment is set up
     - [ ] Health checks and monitoring are configured
     - [ ] Logging is comprehensive and useful for debugging
   - **Dependencies**: Coolify.io access
   - **Estimated Effort**: M

### User Stories
1. **Story 1** (Related to Feature 1: OAuth Authentication and Authorization):
   - **Title**: Implement OAuth Flow
   - **User Story**: As a developer, I want to implement the OAuth flow with Linear, so that the agent can authenticate and interact with the Linear API.
   - **Acceptance Criteria**:
     - [ ] OAuth authorization URL correctly includes `actor=app` parameter
     - [ ] Authorization redirects to the correct callback URL
     - [ ] Access token is successfully obtained and stored
     - [ ] Agent ID is retrieved and stored alongside the token
     - [ ] Error cases are handled gracefully
   - **Technical Notes**: Use the Linear TypeScript SDK for API interactions. Store tokens securely in the database with encryption.
   - **Dependencies**: Linear API access
   - **Estimated Story Points**: 5

2. **Story 2** (Related to Feature 1: OAuth Authentication and Authorization):
   - **Title**: Implement Token Management
   - **User Story**: As a developer, I want to implement token management, so that tokens are securely stored and refreshed when needed.
   - **Acceptance Criteria**:
     - [ ] Tokens are stored securely in the database with encryption
     - [ ] Token refresh works when access token expires
     - [ ] Error handling for failed token refresh
     - [ ] Token revocation is handled correctly
   - **Technical Notes**: Use PostgreSQL for token storage with proper encryption. Implement automatic token refresh.
   - **Dependencies**: Database setup
   - **Estimated Story Points**: 3

3. **Story 3** (Related to Feature 2: Webhook Integration):
   - **Title**: Implement Webhook Endpoint
   - **User Story**: As a developer, I want to implement a webhook endpoint, so that the agent can receive and process events from Linear.
   - **Acceptance Criteria**:
     - [ ] Webhook endpoint is set up with proper security
     - [ ] Signature verification works correctly
     - [ ] Timestamp validation prevents replay attacks
     - [ ] Error handling is robust
   - **Technical Notes**: Use Express.js for the webhook endpoint. Implement signature verification using the Linear-Signature header.
   - **Dependencies**: OAuth Authentication
   - **Estimated Story Points**: 5

4. **Story 4** (Related to Feature 2: Webhook Integration):
   - **Title**: Implement Notification Processors
   - **User Story**: As a developer, I want to implement processors for different notification types, so that the agent can respond appropriately to each type.
   - **Acceptance Criteria**:
     - [ ] Processor for `issueMention` events
     - [ ] Processor for `issueCommentMention` events
     - [ ] Processor for `issueAssignedToYou` events
     - [ ] Processor for other relevant notification types
   - **Technical Notes**: Create a separate processor for each notification type to keep the code modular and maintainable.
   - **Dependencies**: Webhook Endpoint
   - **Estimated Story Points**: 8

5. **Story 5** (Related to Feature 3: SAFe Planning Capabilities):
   - **Title**: Implement SAFe Hierarchy Management
   - **User Story**: As a developer, I want to implement SAFe hierarchy management, so that the agent can maintain proper Epic -> Feature -> Story hierarchy.
   - **Acceptance Criteria**:
     - [ ] Epic creation works correctly
     - [ ] Feature creation as child of Epic works correctly
     - [ ] Story creation as child of Feature works correctly
     - [ ] Relationships are properly established
   - **Technical Notes**: Use the Linear TypeScript SDK for issue creation and relationship management.
   - **Dependencies**: OAuth Authentication
   - **Estimated Story Points**: 8

6. **Story 6** (Related to Feature 3: SAFe Planning Capabilities):
   - **Title**: Implement Technical Enabler Management
   - **User Story**: As a developer, I want to implement technical enabler management, so that the agent can identify and track technical enablers.
   - **Acceptance Criteria**:
     - [ ] Technical enabler creation works correctly
     - [ ] Enablers are properly labeled and categorized
     - [ ] Enablers are linked to appropriate parent issues
     - [ ] Enabler justification is included
   - **Technical Notes**: Create a separate module for technical enabler management to keep the code modular.
   - **Dependencies**: SAFe Hierarchy Management
   - **Estimated Story Points**: 5

7. **Story 7** (Related to Feature 4: External Service Integration):
   - **Title**: Implement Confluence Integration
   - **User Story**: As a developer, I want to implement Confluence integration, so that the agent can fetch and process documentation.
   - **Acceptance Criteria**:
     - [ ] Confluence API authentication works correctly
     - [ ] Page content is correctly fetched and parsed
     - [ ] Error handling for unavailable pages
     - [ ] Error handling for authentication failures
   - **Technical Notes**: Use Axios for HTTP requests to the Confluence API.
   - **Dependencies**: Confluence API access
   - **Estimated Story Points**: 5

8. **Story 8** (Related to Feature 4: External Service Integration):
   - **Title**: Implement Slack Notifications
   - **User Story**: As a developer, I want to implement Slack notifications, so that important updates are sent to Slack.
   - **Acceptance Criteria**:
     - [ ] Slack webhook integration works correctly
     - [ ] Notifications are sent for important events
     - [ ] Error handling for failed notifications
     - [ ] Notification format is clear and useful
   - **Technical Notes**: Use Axios for HTTP requests to the Slack webhook URL.
   - **Dependencies**: Slack webhook URL
   - **Estimated Story Points**: 3

9. **Story 9** (Related to Feature 5: Deployment and Infrastructure):
   - **Title**: Configure Docker Container
   - **User Story**: As a developer, I want to configure a Docker container for the agent, so that it can be deployed consistently.
   - **Acceptance Criteria**:
     - [ ] Dockerfile is properly configured
     - [ ] Docker Compose file is set up for local testing
     - [ ] Container builds successfully
     - [ ] Container runs correctly with all dependencies
   - **Technical Notes**: Use Node.js 18 Alpine as the base image for a smaller footprint.
   - **Dependencies**: None
   - **Estimated Story Points**: 3

10. **Story 10** (Related to Feature 5: Deployment and Infrastructure):
    - **Title**: Set Up Coolify Deployment
    - **User Story**: As a developer, I want to set up deployment on Coolify.io, so that the agent can be deployed to production.
    - **Acceptance Criteria**:
      - [ ] Coolify service is created
      - [ ] GitHub repository is connected
      - [ ] Environment variables are configured
      - [ ] Automatic deployments are set up
      - [ ] Health checks and monitoring are configured
    - **Technical Notes**: Follow the Coolify documentation for setting up a new service.
    - **Dependencies**: Docker Container Configuration
    - **Estimated Story Points**: 5

### Technical Enablers
1. **Enabler 1**:
   - **Title**: Database Schema Design
   - **Type**: Architecture
   - **Description**: Design and implement the database schema for the Linear Planning Agent.
   - **Justification**: A well-designed database schema is necessary for storing tokens, planning sessions, and other state information.
   - **Acceptance Criteria**:
     - [ ] Schema design is complete
     - [ ] Tables are created with proper relationships
     - [ ] Indexes are created for performance
     - [ ] Migrations are implemented for future changes
   - **Dependencies**: None
   - **Estimated Story Points**: 3

2. **Enabler 2**:
   - **Title**: Security Implementation
   - **Type**: Infrastructure
   - **Description**: Implement security measures for the Linear Planning Agent.
   - **Justification**: Security is critical for protecting tokens, webhook signatures, and other sensitive information.
   - **Acceptance Criteria**:
     - [ ] Token encryption is implemented
     - [ ] Webhook signature verification is robust
     - [ ] Rate limiting is implemented
     - [ ] HTTPS is configured for all endpoints
   - **Dependencies**: None
   - **Estimated Story Points**: 5

3. **Enabler 3**:
   - **Title**: Logging and Monitoring Setup
   - **Type**: Infrastructure
   - **Description**: Set up logging and monitoring for the Linear Planning Agent.
   - **Justification**: Proper logging and monitoring are necessary for debugging and ensuring the agent is functioning correctly.
   - **Acceptance Criteria**:
     - [ ] Structured logging is implemented
     - [ ] Error tracking is set up
     - [ ] Performance monitoring is configured
     - [ ] Alerting is set up for critical issues
   - **Dependencies**: None
   - **Estimated Story Points**: 3

4. **Enabler 4**:
   - **Title**: Linear API Research
   - **Type**: Research
   - **Description**: Research the Linear API to understand its capabilities and limitations.
   - **Justification**: A thorough understanding of the Linear API is necessary for implementing the agent correctly.
   - **Acceptance Criteria**:
     - [ ] API documentation is reviewed
     - [ ] Key endpoints are identified
     - [ ] Rate limits and quotas are understood
     - [ ] Authentication flow is documented
   - **Dependencies**: None
   - **Estimated Story Points**: 2

### Spikes
1. **Spike 1**:
   - **Title**: Linear Agent Development Best Practices
   - **Question to Answer**: What are the best practices for developing a Linear agent?
   - **Time-Box**: 2 days
   - **Expected Outcomes**: 
     - Documentation of best practices
     - Examples of successful Linear agents
     - Recommendations for our implementation
   - **Dependencies**: None

2. **Spike 2**:
   - **Title**: SAFe Implementation in Linear
   - **Question to Answer**: How can we best implement SAFe methodology in Linear?
   - **Time-Box**: 2 days
   - **Expected Outcomes**:
     - Mapping of SAFe concepts to Linear entities
     - Recommendations for labels, statuses, and relationships
     - Examples of SAFe workflows in Linear
   - **Dependencies**: None

## Testing Strategy

### Unit Testing Requirements
- Implement comprehensive unit tests for all components with a minimum of 80% code coverage.
- Use Jest as the primary testing framework for TypeScript code.
- Implement mock objects for external dependencies (Linear API, Confluence API, database, etc.).
- Critical components requiring thorough unit testing:
  - OAuth authentication flow
  - Webhook signature verification
  - Token management
  - SAFe hierarchy management
  - Planning logic

### Integration Testing Requirements
- Implement integration tests for all interactions between components and external services.
- Use a combination of real and mock services depending on the test requirements.
- Key integration points to test:
  - Linear API integration
  - Confluence API integration
  - Database interactions
  - Webhook processing
- Use Supertest for API endpoint testing and Nock for HTTP request mocking.

### End-to-End Testing Requirements
- Implement end-to-end tests for critical user flows and agent interactions.
- Test the complete flow from receiving a webhook to completing the requested action.
- Critical user flows to test:
  - Agent mentioned in an issue
  - Agent assigned an issue
  - Agent processing a planning request
  - Agent creating Linear issues based on Confluence documentation
- Use a dedicated test Linear workspace and Confluence space for E2E testing.

### Performance Testing Requirements
- Measure response time for webhook processing under various loads.
- Benchmark API call performance and optimize where necessary.
- Set performance thresholds:
  - Webhook processing: < 2 seconds
  - Linear API calls: < 5 seconds
  - Confluence API calls: < 5 seconds
- Identify and test potential bottlenecks:
  - Database operations
  - External API calls
  - Webhook processing under high load

### Security Testing Requirements
- Implement security tests for authentication, authorization, and data protection.
- Verify secure handling of tokens and sensitive data.
- Test for common vulnerabilities:
  - Injection attacks
  - Cross-site scripting
  - Insecure direct object references
  - Sensitive data exposure

## Non-Functional Requirements

### Performance
- The Linear Planning Agent must respond to webhook events within 2 seconds under normal load.
- API calls to Linear and Confluence must complete within 5 seconds.
- The agent must be able to handle at least 10 concurrent webhook events.
- Database operations must complete within 100ms.

### Security
- All authentication tokens must be stored securely using encryption at rest.
- Webhook signatures must be verified to prevent unauthorized requests.
- Sensitive data must not be logged or exposed in error messages.
- The agent must use HTTPS for all external communications.
- OAuth flows must follow security best practices.
- The agent must implement rate limiting to prevent abuse.

### Scalability
- The agent must be able to scale to handle increased webhook volume as usage grows.
- The database must be designed to handle growth in token storage and state management.
- The agent must be deployable across multiple instances for load balancing.

### Reliability
- The agent must have 99.9% uptime for webhook processing.
- The agent must implement retry mechanisms for transient failures.
- Failed operations must be logged for troubleshooting.
- The agent must gracefully handle API errors and service unavailability.

### Usability
- The agent must provide clear and helpful responses to users.
- Error messages must be user-friendly and actionable.
- The agent must follow a consistent communication style.
- The agent must provide progress updates for long-running operations.

## Implementation Considerations

### Architectural Impact
- The Linear Planning Agent will be implemented as a standalone service that integrates with Linear and Confluence.
- The agent will follow a modular architecture with clear separation of concerns.
- Components that will be affected:
  - Linear workspace and team structure
  - Confluence documentation process
  - Planning workflow
- Architectural decisions to be made:
  - Database schema design
  - Authentication and authorization approach
  - Webhook processing architecture
  - Integration strategy for external services

### Technical Debt Considerations
- Potential technical debt that might be introduced:
  - Incomplete error handling
  - Insufficient test coverage
  - Hardcoded values or magic strings
  - Tight coupling between components
- Mitigation strategies:
  - Implement comprehensive error handling from the start
  - Maintain high test coverage
  - Use constants and configuration for values
  - Follow SOLID principles for loose coupling

### Deployment Strategy
- The agent will be deployed as a Docker container on Coolify.io.
- Continuous integration and deployment will be set up for automatic deployments.
- Feature toggles will be used for gradual rollout of new capabilities.
- Backward compatibility will be maintained for API changes.
- Deployment steps:
  1. Build and test the Docker image
  2. Deploy to staging environment
  3. Run automated tests
  4. Deploy to production
  5. Monitor for issues

### Monitoring and Observability
- Implement structured logging for all operations.
- Collect metrics on webhook processing time, API call latency, and error rates.
- Set up health check endpoints for monitoring.
- Configure alerts for critical failures.
- Log all external service interactions for debugging.

## Documentation Requirements

### API Documentation
- Document all API endpoints with request and response formats.
- Include authentication requirements and error responses.
- Provide examples for common use cases.
- Key endpoints to document:
  - Webhook endpoint
  - OAuth callback endpoint
  - Health check endpoint

### User Documentation
- Create documentation for setting up and using the Linear Planning Agent.
- Include step-by-step instructions for installation and configuration.
- Provide examples of common interactions with the agent.
- Document troubleshooting steps for common issues.

### Architecture Documentation
- Document the overall architecture of the Linear Planning Agent.
- Create diagrams showing component interactions.
- Document database schema and relationships.
- Document integration points with external services.
- Document security measures and considerations.

## Linear Issue Creation Plan

### Epic Structure
- **Epic Title**: Linear Planning Agent Implementation
- **Epic Description**: Implement a Linear Planning Agent that serves as a bridge between high-level planning and task execution in Linear, following SAFe methodology.
- **Epic Labels**: planning-agent, safe, implementation
- **Epic Priority**: High

### Feature Breakdown
1. **Feature 1**:
   - **Title**: OAuth Authentication and Authorization
   - **Description**: Implement OAuth authentication flow with Linear, including token management and security.
   - **Labels**: authentication, security
   - **Priority**: High
   - **Parent Epic**: Linear Planning Agent Implementation

2. **Feature 2**:
   - **Title**: Webhook Integration
   - **Description**: Implement webhook handling for the Linear Planning Agent, ensuring it correctly processes and responds to Linear events.
   - **Labels**: webhooks, integration
   - **Priority**: High
   - **Parent Epic**: Linear Planning Agent Implementation

3. **Feature 3**:
   - **Title**: SAFe Planning Capabilities
   - **Description**: Implement core planning capabilities following SAFe methodology, including epic decomposition, feature creation, and relationship management.
   - **Labels**: safe, planning
   - **Priority**: High
   - **Parent Epic**: Linear Planning Agent Implementation

4. **Feature 4**:
   - **Title**: External Service Integration
   - **Description**: Implement integration with external services like Confluence and Slack.
   - **Labels**: integration, confluence, slack
   - **Priority**: Medium
   - **Parent Epic**: Linear Planning Agent Implementation

5. **Feature 5**:
   - **Title**: Deployment and Infrastructure
   - **Description**: Set up deployment infrastructure on Coolify.io and configure monitoring and logging.
   - **Labels**: deployment, infrastructure
   - **Priority**: Medium
   - **Parent Epic**: Linear Planning Agent Implementation

### Story/Task Breakdown
1. **Story/Task 1**:
   - **Title**: Implement OAuth Flow
   - **Description**: Implement the OAuth flow with Linear, including the actor=app parameter.
   - **Labels**: authentication, oauth
   - **Priority**: High
   - **Parent Feature**: OAuth Authentication and Authorization
   - **Estimated Points**: 5

2. **Story/Task 2**:
   - **Title**: Implement Token Management
   - **Description**: Implement secure token storage and refresh.
   - **Labels**: authentication, security
   - **Priority**: High
   - **Parent Feature**: OAuth Authentication and Authorization
   - **Estimated Points**: 3

3. **Story/Task 3**:
   - **Title**: Implement Webhook Endpoint
   - **Description**: Set up a secure webhook endpoint with signature verification.
   - **Labels**: webhooks, security
   - **Priority**: High
   - **Parent Feature**: Webhook Integration
   - **Estimated Points**: 5

4. **Story/Task 4**:
   - **Title**: Database Schema Design
   - **Description**: Design and implement the database schema for the Linear Planning Agent.
   - **Labels**: database, architecture, enabler
   - **Priority**: High
   - **Parent Feature**: Linear Planning Agent Implementation
   - **Estimated Points**: 3

## Planning Agent Notes
- The implementation will follow a phased approach as outlined in the Confluence page, with basic setup in Week 1, core functionality in Week 2, advanced features in Week 3, and testing and refinement in Week 4.
- The agent will be designed to work with any planning source, whether it's an Augment Remote agent, a human planner, or another AI system.
- The agent will follow Linear's interaction recommendations, including immediate acknowledgment and status updates.
- The agent will maintain a professional but approachable communication style, using SAFe terminology and structured responses.
- The implementation will leverage the existing repository structure and code that has already been set up.
