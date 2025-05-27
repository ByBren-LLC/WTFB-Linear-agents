# Confluence API Integration - Implementation Document

## Overview
This technical enabler will implement the integration with the Confluence API to enable the Linear Planning Agent to read planning documents from Confluence. This is a foundational component that will allow the agent to extract planning information from Confluence pages.

## User Story
As a Linear Planning Agent, I need to be able to connect to and interact with the Confluence API so that I can read planning documents and extract information for creating Linear issues.

## Acceptance Criteria
1. The agent can authenticate with the Confluence API using OAuth
2. The agent can retrieve a Confluence page by URL or ID
3. The agent can retrieve attachments from a Confluence page
4. The agent can search for Confluence pages using CQL
5. The agent handles API rate limits appropriately
6. The agent handles API errors gracefully
7. The integration is well-tested with unit and integration tests
8. The integration is well-documented with JSDoc comments

## Technical Context
The Linear Planning Agent needs to read planning documents from Confluence to extract information about epics, features, stories, and enablers. This information will then be used to create issues in Linear with the appropriate hierarchy and relationships.

### Existing Code
- `src/auth/tokens.ts`: Token management for Linear OAuth
- `src/db/models.ts`: Database models for storing tokens and planning sessions
- `src/utils/encryption.ts`: Utilities for encrypting sensitive data

### Dependencies
- Confluence API: https://developer.atlassian.com/cloud/confluence/rest/v1/intro/
- Atlassian OAuth: https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/

## Implementation Plan

### 1. Set Up Confluence API Client
- Create a new directory `src/confluence` for Confluence-related code
- Implement a Confluence API client class that handles authentication and API requests
- Implement methods for retrieving pages, attachments, and searching

```typescript
// src/confluence/client.ts
import axios from 'axios';
import * as logger from '../utils/logger';

export class ConfluenceClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  async getPage(pageId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/wiki/rest/api/content/${pageId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          expand: 'body.storage,version,space'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error retrieving Confluence page', { error, pageId });
      throw error;
    }
  }

  // Additional methods for retrieving attachments, searching, etc.
}
```

### 2. Implement Confluence OAuth
- Implement OAuth flow for Confluence authentication
- Store Confluence tokens securely in the database
- Implement token refresh functionality

```typescript
// src/auth/confluence-oauth.ts
import axios from 'axios';
import * as logger from '../utils/logger';
import { storeConfluenceToken, getConfluenceToken } from '../db/models';

export const initiateConfluenceOAuth = (req, res) => {
  // Implementation details
};

export const handleConfluenceCallback = async (req, res) => {
  // Implementation details
};

export const refreshConfluenceToken = async (organizationId: string): Promise<string | null> => {
  // Implementation details
};
```

### 3. Implement Database Models for Confluence Tokens
- Update database schema to store Confluence tokens
- Implement CRUD operations for Confluence tokens

```typescript
// Update src/db/migrations/001_initial_schema.sql
CREATE TABLE IF NOT EXISTS confluence_tokens (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  site_url TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id) REFERENCES linear_tokens(organization_id)
);
```

### 4. Implement Rate Limiting and Error Handling
- Implement rate limiting to respect Confluence API limits
- Implement error handling for API errors
- Implement retry logic for transient errors

```typescript
// src/confluence/rate-limiter.ts
export class RateLimiter {
  // Implementation details
}

// src/confluence/error-handler.ts
export const handleConfluenceError = (error: any): Error => {
  // Implementation details
};
```

### 5. Implement Utility Functions
- Implement utility functions for common Confluence operations
- Implement functions for extracting content from Confluence pages

```typescript
// src/confluence/utils.ts
export const extractPageContent = (page: any): string => {
  // Implementation details
};

export const getPageIdFromUrl = (url: string): string => {
  // Implementation details
};
```

### 6. Write Tests
- Write unit tests for all components
- Write integration tests for Confluence API integration
- Write mock tests for error handling and rate limiting

```typescript
// tests/confluence/client.test.ts
describe('ConfluenceClient', () => {
  // Test cases
});

// tests/auth/confluence-oauth.test.ts
describe('Confluence OAuth', () => {
  // Test cases
});
```

### 7. Document the API
- Add JSDoc comments to all functions and classes
- Create a README.md file for the Confluence integration
- Document usage examples and error handling

## Testing Approach
- Unit tests for all components
- Integration tests for Confluence API integration
- Mock tests for error handling and rate limiting
- Manual testing with a real Confluence instance

## Definition of Done
- All acceptance criteria are met
- All tests are passing
- Code is well-documented with JSDoc comments
- A README.md file is created for the Confluence integration
- The implementation is reviewed and approved by the team

## Estimated Effort
- 3 story points (approximately 3 days of work)

## Resources
- [Confluence REST API Documentation](https://developer.atlassian.com/cloud/confluence/rest/v1/intro/)
- [Atlassian OAuth Documentation](https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/)
- [Axios Documentation](https://axios-http.com/docs/intro)
